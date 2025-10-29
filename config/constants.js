/**
 * 应用常量定义
 * 统一管理所有魔法数字和字符串
 */

const appConfig = require('./app.config');

// 事件名称常量
const EVENTS = {
  // IPC 通信事件
  IPC: {
    SELECT_DIRECTORY: 'select-directory',
    SELECT_FILE: 'select-file',
    DB_QUERY: 'db-query',
    DB_RUN: 'db-run',
    DB_TRANSACTION: 'db-transaction',
    BACKUP_DATABASE: 'backup-database',
    GET_DATABASE_BACKUPS: 'get-database-backups',
    RESTORE_DATABASE: 'restore-database',
    SCHEDULE_TASK: 'schedule-task',
    UNSCHEDULE_TASK: 'unschedule-task',
    EXECUTE_BACKUP: 'execute-backup',
    GET_SYSTEM_INFO: 'get-system-info',
    GET_CACHE_SIZE: 'get-cache-size',
    CLEAN_CACHE: 'clean-cache',
    SET_AUTO_LAUNCH: 'set-auto-launch',
    GET_AUTO_LAUNCH: 'get-auto-launch',
    SHOW_NOTIFICATION: 'show-notification',
    UPDATE_TRAY_MENU: 'update-tray-menu'
  },

  // 窗口事件
  WINDOW: {
    SHOW: 'window-show',
    HIDE: 'window-hide',
    MINIMIZE: 'window-minimize',
    MAXIMIZE: 'window-maximize',
    RESTORE: 'window-restore',
    FOCUS: 'window-focus',
    BLUR: 'window-blur'
  },

  // 备份事件
  BACKUP: {
    START: 'backup-start',
    PROGRESS: 'backup-progress',
    SUCCESS: 'backup-success',
    FAILED: 'backup-failed',
    CANCELLED: 'backup-cancelled'
  }
};

// 数据库表名
const TABLES = {
  BACKUP_TASKS: 'backup_tasks',
  BACKUP_LOGS: 'backup_logs',
  SYSTEM_CONFIG: 'system_config'
};

// 配置键名
const CONFIG_KEYS = {
  CACHE_DIR: 'cache_dir',
  CACHE_MAX_SIZE: 'cache_max_size',
  LOG_RETENTION_DAYS: 'log_retention_days',
  LOG_LEVEL: 'log_level',
  CLOSE_TO_TRAY: 'close_to_tray',
  FIRST_MINIMIZE_TIP: 'first_minimize_tip',
  AUTO_LAUNCH: 'auto_launch',
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATION_ENABLED: 'notification_enabled'
};

// 存储类型
const STORAGE_TYPES = {
  LOCAL: {
    value: 'local',
    label: '本地存储',
    icon: 'folder',
    requiresConfig: true
  },
  ALIYUN_OSS: {
    value: 'aliyun_oss',
    label: '阿里云OSS',
    icon: 'cloud',
    requiresConfig: true
  },
  ALIYUN_DRIVE: {
    value: 'aliyun_drive',
    label: '阿里云盘',
    icon: 'cloud-upload',
    requiresConfig: true
  }
};

// 备份策略
const BACKUP_STRATEGIES = {
  DAILY: {
    value: 'daily',
    label: '每日备份',
    description: '每天凌晨2点执行',
    cron: '0 2 * * *'
  },
  WEEKLY: {
    value: 'weekly',
    label: '每周备份',
    description: '每周日凌晨2点执行',
    cron: '0 2 * * 0'
  },
  MONTHLY: {
    value: 'monthly',
    label: '每月备份',
    description: '每月1号凌晨2点执行',
    cron: '0 2 1 * *'
  },
  CUSTOM: {
    value: 'cron',
    label: '自定义',
    description: '使用Cron表达式自定义',
    cron: null
  }
};

// 任务状态
const TASK_STATUS = {
  WAITING: {
    value: 'waiting',
    label: '等待中',
    color: 'default',
    icon: 'time'
  },
  RUNNING: {
    value: 'running',
    label: '运行中',
    color: 'info',
    icon: 'refresh'
  },
  SUCCESS: {
    value: 'success',
    label: '成功',
    color: 'success',
    icon: 'checkmark-circle'
  },
  FAILED: {
    value: 'failed',
    label: '失败',
    color: 'error',
    icon: 'close-circle'
  },
  PAUSED: {
    value: 'paused',
    label: '已暂停',
    color: 'warning',
    icon: 'pause-circle'
  }
};

// 日志级别
const LOG_LEVELS = {
  DEBUG: {
    value: 'DEBUG',
    label: '调试',
    color: 'default',
    priority: 0
  },
  INFO: {
    value: 'INFO',
    label: '信息',
    color: 'info',
    priority: 1
  },
  WARN: {
    value: 'WARN',
    label: '警告',
    color: 'warning',
    priority: 2
  },
  ERROR: {
    value: 'ERROR',
    label: '错误',
    color: 'error',
    priority: 3
  }
};

// 错误代码
const ERROR_CODES = {
  // 数据库错误 (1000-1999)
  DB_CONNECTION_FAILED: { code: 1000, message: '数据库连接失败' },
  DB_QUERY_FAILED: { code: 1001, message: '数据库查询失败' },
  DB_TRANSACTION_FAILED: { code: 1002, message: '数据库事务失败' },
  DB_BACKUP_FAILED: { code: 1003, message: '数据库备份失败' },
  
  // 文件系统错误 (2000-2999)
  FILE_NOT_FOUND: { code: 2000, message: '文件不存在' },
  DIRECTORY_NOT_FOUND: { code: 2001, message: '目录不存在' },
  FILE_ACCESS_DENIED: { code: 2002, message: '文件访问被拒绝' },
  DISK_SPACE_INSUFFICIENT: { code: 2003, message: '磁盘空间不足' },
  
  // 备份错误 (3000-3999)
  BACKUP_TASK_NOT_FOUND: { code: 3000, message: '备份任务不存在' },
  BACKUP_SOURCE_INVALID: { code: 3001, message: '备份源无效' },
  BACKUP_COMPRESSION_FAILED: { code: 3002, message: '文件压缩失败' },
  BACKUP_ENCRYPTION_FAILED: { code: 3003, message: '文件加密失败' },
  BACKUP_UPLOAD_FAILED: { code: 3004, message: '文件上传失败' },
  
  // 存储错误 (4000-4999)
  STORAGE_AUTH_FAILED: { code: 4000, message: '存储认证失败' },
  STORAGE_UPLOAD_FAILED: { code: 4001, message: '存储上传失败' },
  STORAGE_DOWNLOAD_FAILED: { code: 4002, message: '存储下载失败' },
  STORAGE_DELETE_FAILED: { code: 4003, message: '存储删除失败' },
  STORAGE_LIST_FAILED: { code: 4004, message: '存储列表失败' },
  
  // 网络错误 (5000-5999)
  NETWORK_TIMEOUT: { code: 5000, message: '网络请求超时' },
  NETWORK_DISCONNECTED: { code: 5001, message: '网络连接断开' },
  NETWORK_ERROR: { code: 5002, message: '网络错误' },
  
  // 配置错误 (6000-6999)
  CONFIG_INVALID: { code: 6000, message: '配置无效' },
  CONFIG_MISSING: { code: 6001, message: '配置缺失' },
  
  // 系统错误 (9000-9999)
  UNKNOWN_ERROR: { code: 9000, message: '未知错误' },
  PERMISSION_DENIED: { code: 9001, message: '权限不足' },
  OPERATION_CANCELLED: { code: 9002, message: '操作已取消' }
};

// 文件大小单位
const FILE_SIZE_UNITS = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024
};

// 时间格式
const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'MM-DD HH:mm',
  FILENAME: 'YYYYMMDD_HHmmss',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
};

// 正则表达式
const REGEX = {
  CRON: /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([012]?\d|3[01])) (\*|([0]?\d|1[0-2])) (\*|([0-6]))$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  IP: /^(\d{1,3}\.){3}\d{1,3}$/,
  PATH_WINDOWS: /^[a-zA-Z]:\\.+/,
  PATH_UNIX: /^\/.*$/
};

// 快捷键
const SHORTCUTS = {
  REFRESH: 'CommandOrControl+R',
  SETTINGS: 'CommandOrControl+,',
  QUIT: 'CommandOrControl+Q',
  TOGGLE_DEVTOOLS: 'CommandOrControl+Shift+I',
  NEW_TASK: 'CommandOrControl+N',
  SEARCH: 'CommandOrControl+F'
};

// 数据库备份原因
const DB_BACKUP_REASONS = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  CONFIG_UPDATED: 'config_updated',
  CONFIGS_UPDATED: 'configs_updated',
  MANUAL: 'manual',
  AUTO: 'auto',
  BEFORE_RESTORE: 'before_restore'
};

// 通知类型
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// 路由路径
const ROUTES = {
  DASHBOARD: '/dashboard',
  TASKS: '/tasks',
  LOGS: '/logs',
  SETTINGS: '/settings'
};

// 导出所有常量
module.exports = {
  APP_CONFIG: appConfig,
  EVENTS,
  TABLES,
  CONFIG_KEYS,
  STORAGE_TYPES,
  BACKUP_STRATEGIES,
  TASK_STATUS,
  LOG_LEVELS,
  ERROR_CODES,
  FILE_SIZE_UNITS,
  DATE_FORMATS,
  REGEX,
  SHORTCUTS,
  DB_BACKUP_REASONS,
  NOTIFICATION_TYPES,
  ROUTES
};
