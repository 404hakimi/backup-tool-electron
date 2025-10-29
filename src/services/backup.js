// src/services/backup.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const OSS = require('ali-oss');
const axios = require('axios');
const { ipcRenderer } = window.require('electron');
const db = require('./database');

class BackupService {
  constructor() {
    this.cacheDir = '';
    this.init();
  }

  async init() {
    const configs = await db.getAllConfigs();
    this.cacheDir = configs.cache_dir;
    
    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * 执行备份任务
   */
  async executeBackup(taskId) {
    const startTime = Date.now();
    const task = await db.getTask(taskId);
    
    if (!task || !task.enabled) {
      throw new Error('任务不存在或未启用');
    }

    const log = {
      taskId: task.id,
      taskName: task.task_name,
      level: 'INFO',
      status: 'running'
    };

    try {
      console.log(`开始执行备份任务: ${task.task_name}`);
      
      // 更新任务状态
      await db.updateTaskStatus(
        task.id,
        'running',
        new Date().toISOString(),
        null
      );

      // 1. 检查源目录
      if (!fs.existsSync(task.source_dir)) {
        throw new Error(`源目录不存在: ${task.source_dir}`);
      }

      // 2. 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFileName = `${task.task_name}_${timestamp}`;
      
      // 3. 压缩文件
      let backupFile;
      if (task.compressed) {
        backupFile = path.join(this.cacheDir, `${backupFileName}.zip`);
        await this.compressDirectory(task.source_dir, backupFile);
        log.details = '已压缩';
      } else {
        backupFile = path.join(this.cacheDir, `${backupFileName}.tar`);
        await this.copyDirectory(task.source_dir, backupFile);
        log.details = '未压缩';
      }

      log.fileSize = fs.statSync(backupFile).size;

      // 4. 加密文件
      if (task.encrypted && task.encrypt_password) {
        const encryptedFile = path.join(this.cacheDir, `${backupFileName}.enc`);
        await this.encryptFile(backupFile, encryptedFile, task.encrypt_password);
        fs.unlinkSync(backupFile);
        backupFile = encryptedFile;
        log.details += ', 已加密';
      }

      // 5. 上传到存储
      const storageConfig = JSON.parse(task.storage_config);
      const remotePath = await this.uploadToStorage(
        task.storage_type,
        storageConfig,
        backupFile,
        task.task_name
      );

      log.backupPath = remotePath;

      // 6. 清理临时文件
      fs.unlinkSync(backupFile);

      // 7. 清理旧备份
      if (task.retention_count > 0) {
        await this.cleanOldBackups(
          task.storage_type,
          storageConfig,
          task.task_name,
          task.retention_count
        );
      }

      // 记录成功
      log.status = 'success';
      log.duration = Math.floor((Date.now() - startTime) / 1000);
      
      await db.createLog(log);
      await db.updateTaskStatus(task.id, 'success', new Date().toISOString(), null);

      console.log(`备份任务完成: ${task.task_name}, 耗时: ${log.duration}秒`);
      
      return { success: true, log };

    } catch (error) {
      console.error(`备份任务失败: ${task.task_name}`, error);
      
      log.status = 'failed';
      log.level = 'ERROR';
      log.errorMsg = error.message;
      log.duration = Math.floor((Date.now() - startTime) / 1000);
      
      await db.createLog(log);
      await db.updateTaskStatus(task.id, 'failed', new Date().toISOString(), null);

      throw error;
    }
  }

  /**
   * 压缩目录
   */
  compressDirectory(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => {
        console.log(`压缩完成: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * 复制目录
   */
  async copyDirectory(sourceDir, outputPath) {
    // 简化实现：直接打包整个目录
    const archive = archiver('tar');
    const output = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * 加密文件
   */
  encryptFile(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
      try {
        // 生成密钥
        const key = crypto.scryptSync(password, 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const input = fs.createReadStream(inputPath);
        const output = fs.createWriteStream(outputPath);

        // 写入IV
        output.write(iv);

        input.pipe(cipher).pipe(output);

        output.on('finish', () => {
          console.log('文件加密完成');
          resolve();
        });

        output.on('error', reject);
        input.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 解密文件
   */
  decryptFile(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
      try {
        const key = crypto.scryptSync(password, 'salt', 32);
        
        const input = fs.createReadStream(inputPath);
        const output = fs.createWriteStream(outputPath);

        let iv;
        input.once('readable', () => {
          iv = input.read(16);
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          input.pipe(decipher).pipe(output);
        });

        output.on('finish', resolve);
        output.on('error', reject);
        input.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 上传到存储
   */
  async uploadToStorage(storageType, config, filePath, taskName) {
    const fileName = path.basename(filePath);
    const remotePath = `/backups/${taskName}/${fileName}`;

    switch (storageType) {
      case 'aliyun_oss':
        return await this.uploadToOSS(config, filePath, remotePath);
      
      case 'aliyun_drive':
        return await this.uploadToAliyunDrive(config, filePath, remotePath);
      
      case 'local':
        return await this.uploadToLocal(config, filePath, remotePath);
      
      default:
        throw new Error(`不支持的存储类型: ${storageType}`);
    }
  }

  /**
   * 上传到阿里云OSS
   */
  async uploadToOSS(config, filePath, remotePath) {
    const client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucketName
    });

    const objectKey = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
    
    const result = await client.put(objectKey, filePath);
    console.log('OSS上传成功:', result.url);
    
    return remotePath;
  }

  /**
   * 上传到阿里云盘 - 参考AList实现
   */
  async uploadToAliyunDrive(config, filePath, remotePath) {
    // 1. 刷新token
    const tokenUrl = 'https://auth.aliyundrive.com/v2/account/token';
    const tokenRes = await axios.post(tokenUrl, {
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token'
    });

    const accessToken = tokenRes.data.access_token;
    const driveId = tokenRes.data.default_drive_id;

    // 2. 创建文件
    const createUrl = 'https://api.aliyundrive.com/adrive/v2/file/createWithFolders';
    const fileSize = fs.statSync(filePath).size;
    const fileName = path.basename(remotePath);

    const createRes = await axios.post(createUrl, {
      drive_id: driveId,
      parent_file_id: config.rootFolderId || 'root',
      name: fileName,
      type: 'file',
      check_name_mode: 'auto_rename',
      size: fileSize
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const fileId = createRes.data.file_id;
    const uploadUrl = createRes.data.part_info_list[0].upload_url;

    // 3. 上传文件内容
    const fileStream = fs.createReadStream(filePath);
    await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    // 4. 完成上传
    const completeUrl = 'https://api.aliyundrive.com/v2/file/complete';
    await axios.post(completeUrl, {
      drive_id: driveId,
      file_id: fileId,
      upload_id: ''
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('阿里云盘上传成功');
    return remotePath;
  }

  /**
   * 上传到本地存储
   */
  async uploadToLocal(config, filePath, remotePath) {
    const targetPath = path.join(config.rootPath, remotePath);
    const targetDir = path.dirname(targetPath);

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 复制文件
    fs.copyFileSync(filePath, targetPath);
    console.log('本地存储上传成功:', targetPath);

    return remotePath;
  }

  /**
   * 清理旧备份
   */
  async cleanOldBackups(storageType, config, taskName, retentionCount) {
    // 实现清理逻辑
    console.log(`清理旧备份: ${taskName}, 保留 ${retentionCount} 份`);
  }

  /**
   * 获取缓存大小
   */
  getCacheSize() {
    if (!fs.existsSync(this.cacheDir)) {
      return 0;
    }

    const files = fs.readdirSync(this.cacheDir);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        totalSize += stat.size;
      }
    }

    return totalSize;
  }

  /**
   * 清理缓存
   */
  async cleanCache() {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);
    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        deletedSize += stat.size;
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    console.log(`缓存清理完成: ${deletedCount} 个文件, ${this.formatSize(deletedSize)}`);
    return { deletedCount, deletedSize };
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }
}

export default new BackupService();
