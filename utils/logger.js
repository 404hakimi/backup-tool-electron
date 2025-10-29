/**
 * 日志管理工具
 * 统一管理应用日志，支持文件和控制台输出
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { APP_CONFIG, LOG_LEVELS } = require('../config/constants');

class Logger {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), APP_CONFIG.logging.dir);
    this.currentLevel = APP_CONFIG.logging.defaultLevel;
    this.logFile = null;
    this.currentDate = null;
    
    this.init();
  }

  init() {
    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.rotateLog();
    this.startCleanupSchedule();
  }

  /**
   * 日志轮转
   */
  rotateLog() {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.currentDate !== today) {
      this.currentDate = today;
      this.logFile = path.join(this.logDir, `${APP_CONFIG.app.name}-${today}.log`);
    }
  }

  /**
   * 获取时间戳
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').split('.')[0];
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, context = {}) {
    const timestamp = this.getTimestamp();
    const contextStr = Object.keys(context).length > 0 
      ? ` | ${JSON.stringify(context)}` 
      : '';
    
    return `[${timestamp}] [${level}] ${message}${contextStr}\n`;
  }

  /**
   * 写入日志文件
   */
  writeToFile(message) {
    try {
      this.rotateLog();
      fs.appendFileSync(this.logFile, message, 'utf8');
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  shouldLog(level) {
    const currentPriority = LOG_LEVELS[this.currentLevel]?.priority ?? 1;
    const messagePriority = LOG_LEVELS[level]?.priority ?? 1;
    return messagePriority >= currentPriority;
  }

  /**
   * 通用日志方法
   */
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);
    
    // 输出到控制台
    const consoleMethod = level === 'ERROR' ? 'error' 
      : level === 'WARN' ? 'warn' 
      : 'log';
    console[consoleMethod](formattedMessage.trim());
    
    // 写入文件
    this.writeToFile(formattedMessage);
  }

  /**
   * DEBUG 级别日志
   */
  debug(message, context = {}) {
    this.log('DEBUG', message, context);
  }

  /**
   * INFO 级别日志
   */
  info(message, context = {}) {
    this.log('INFO', message, context);
  }

  /**
   * WARN 级别日志
   */
  warn(message, context = {}) {
    this.log('WARN', message, context);
  }

  /**
   * ERROR 级别日志
   */
  error(message, error = null, context = {}) {
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    } : context;

    this.log('ERROR', message, errorContext);
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    if (LOG_LEVELS[level]) {
      this.currentLevel = level;
      this.info(`日志级别已设置为: ${level}`);
    }
  }

  /**
   * 获取日志文件列表
   */
  getLogFiles() {
    try {
      const files = fs.readdirSync(this.logDir);
      return files
        .filter(f => f.endsWith('.log'))
        .map(f => {
          const filePath = path.join(this.logDir, f);
          const stat = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            size: stat.size,
            modifiedTime: stat.mtime
          };
        })
        .sort((a, b) => b.modifiedTime - a.modifiedTime);
    } catch (error) {
      this.error('获取日志文件列表失败', error);
      return [];
    }
  }

  /**
   * 清理旧日志
   */
  cleanOldLogs() {
    try {
      const retentionDays = APP_CONFIG.logging.retentionDays;
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      const files = this.getLogFiles();
      let deletedCount = 0;
      let deletedSize = 0;

      for (const file of files) {
        if (file.modifiedTime.getTime() < cutoffTime) {
          fs.unlinkSync(file.path);
          deletedCount++;
          deletedSize += file.size;
        }
      }

      if (deletedCount > 0) {
        this.info(`清理旧日志: ${deletedCount} 个文件，释放 ${this.formatSize(deletedSize)}`);
      }
    } catch (error) {
      this.error('清理旧日志失败', error);
    }
  }

  /**
   * 启动清理定时任务
   */
  startCleanupSchedule() {
    // 每天凌晨3点清理
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 3 && now.getMinutes() === 0) {
        this.cleanOldLogs();
      }
    }, 60000); // 每分钟检查一次
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

  /**
   * 导出日志
   */
  exportLogs(targetPath) {
    try {
      const files = this.getLogFiles();
      const exportData = [];

      for (const file of files) {
        const content = fs.readFileSync(file.path, 'utf8');
        exportData.push({
          file: file.name,
          content: content
        });
      }

      fs.writeFileSync(
        targetPath,
        JSON.stringify(exportData, null, 2),
        'utf8'
      );

      this.info(`日志已导出到: ${targetPath}`);
      return true;
    } catch (error) {
      this.error('导出日志失败', error);
      return false;
    }
  }
}

// 创建单例
const logger = new Logger();

module.exports = logger;
