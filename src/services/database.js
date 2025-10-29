// src/services/database.js
const { ipcRenderer } = window.require('electron');

class DatabaseService {
  /**
   * 执行查询
   */
  async query(sql, params = []) {
    const result = await ipcRenderer.invoke('db-query', sql, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * 执行更新/插入/删除
   */
  async run(sql, params = []) {
    const result = await ipcRenderer.invoke('db-run', sql, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * 执行事务
   */
  async transaction(operations) {
    const result = await ipcRenderer.invoke('db-transaction', operations);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * 备份数据库
   */
  async backup(reason = 'manual') {
    const result = await ipcRenderer.invoke('backup-database', reason);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * 获取数据库备份列表
   */
  async getBackups() {
    const result = await ipcRenderer.invoke('get-database-backups');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  /**
   * 恢复数据库
   */
  async restore(backupPath) {
    const result = await ipcRenderer.invoke('restore-database', backupPath);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  // ==================== 备份任务相关 ====================
  
  /**
   * 获取所有任务
   */
  async getTasks() {
    return this.query('SELECT * FROM backup_tasks ORDER BY create_time DESC');
  }

  /**
   * 获取单个任务
   */
  async getTask(id) {
    const tasks = await this.query('SELECT * FROM backup_tasks WHERE id = ?', [id]);
    return tasks[0];
  }

  /**
   * 创建任务
   */
  async createTask(task) {
    const result = await this.run(`
      INSERT INTO backup_tasks (
        task_name, source_dir, storage_type, storage_config,
        backup_strategy, cron_expression, enabled, encrypted,
        encrypt_password, compressed, retention_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.taskName,
      task.sourceDir,
      task.storageType,
      JSON.stringify(task.storageConfig),
      task.backupStrategy,
      task.cronExpression,
      task.enabled ? 1 : 0,
      task.encrypted ? 1 : 0,
      task.encryptPassword,
      task.compressed ? 1 : 0,
      task.retentionCount
    ]);
    
    // 备份数据库（策略变更）
    await this.backup('task_created');
    
    return result.lastInsertRowid;
  }

  /**
   * 更新任务
   */
  async updateTask(id, task) {
    await this.run(`
      UPDATE backup_tasks SET
        task_name = ?,
        source_dir = ?,
        storage_type = ?,
        storage_config = ?,
        backup_strategy = ?,
        cron_expression = ?,
        enabled = ?,
        encrypted = ?,
        encrypt_password = ?,
        compressed = ?,
        retention_count = ?,
        update_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      task.taskName,
      task.sourceDir,
      task.storageType,
      JSON.stringify(task.storageConfig),
      task.backupStrategy,
      task.cronExpression,
      task.enabled ? 1 : 0,
      task.encrypted ? 1 : 0,
      task.encryptPassword,
      task.compressed ? 1 : 0,
      task.retentionCount,
      id
    ]);
    
    // 备份数据库（策略变更）
    await this.backup('task_updated');
  }

  /**
   * 删除任务
   */
  async deleteTask(id) {
    await this.run('DELETE FROM backup_tasks WHERE id = ?', [id]);
    // 备份数据库（策略变更）
    await this.backup('task_deleted');
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(id, status, lastExecuteTime, nextExecuteTime) {
    await this.run(`
      UPDATE backup_tasks SET
        status = ?,
        last_execute_time = ?,
        next_execute_time = ?,
        update_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, lastExecuteTime, nextExecuteTime, id]);
  }

  // ==================== 备份日志相关 ====================

  /**
   * 获取日志列表
   */
  async getLogs(taskId = null, limit = 100) {
    if (taskId) {
      return this.query(`
        SELECT * FROM backup_logs 
        WHERE task_id = ? 
        ORDER BY create_time DESC 
        LIMIT ?
      `, [taskId, limit]);
    } else {
      return this.query(`
        SELECT * FROM backup_logs 
        ORDER BY create_time DESC 
        LIMIT ?
      `, [limit]);
    }
  }

  /**
   * 创建日志
   */
  async createLog(log) {
    return this.run(`
      INSERT INTO backup_logs (
        task_id, task_name, level, file_size, backup_path,
        status, duration, error_msg, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      log.taskId,
      log.taskName,
      log.level,
      log.fileSize,
      log.backupPath,
      log.status,
      log.duration,
      log.errorMsg,
      log.details
    ]);
  }

  /**
   * 清理旧日志
   */
  async cleanOldLogs(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.run(`
      DELETE FROM backup_logs 
      WHERE create_time < datetime(?, 'unixepoch')
    `, [Math.floor(cutoffDate.getTime() / 1000)]);
  }

  // ==================== 系统配置相关 ====================

  /**
   * 获取配置
   */
  async getConfig(key) {
    const configs = await this.query(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      [key]
    );
    return configs[0]?.config_value;
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs() {
    const configs = await this.query('SELECT * FROM system_config');
    return configs.reduce((acc, item) => {
      acc[item.config_key] = item.config_value;
      return acc;
    }, {});
  }

  /**
   * 设置配置
   */
  async setConfig(key, value) {
    await this.run(`
      INSERT OR REPLACE INTO system_config (config_key, config_value, update_time)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [key, value]);
    
    // 备份数据库（配置变更）
    await this.backup('config_updated');
  }

  /**
   * 批量设置配置
   */
  async setConfigs(configs) {
    const operations = Object.entries(configs).map(([key, value]) => ({
      type: 'run',
      sql: `INSERT OR REPLACE INTO system_config (config_key, config_value, update_time)
            VALUES (?, ?, CURRENT_TIMESTAMP)`,
      params: [key, value]
    }));

    await this.transaction(operations);
    
    // 备份数据库（配置变更）
    await this.backup('configs_updated');
  }
}

export default new DatabaseService();
