/**
 * 应用配置文件
 * 统一管理应用名称、版本、配置等信息
 */

module.exports = {
  // 应用基本信息
  app: {
    name: 'AutoBackup',
    displayName: '自动备份工具',
    version: '1.0.0',
    description: '支持多种云存储的自动备份工具',
    author: 'AutoBackup Team',
    homepage: 'https://github.com/autobackup/autobackup',
    bugsUrl: 'https://github.com/autobackup/autobackup/issues',
    copyright: `Copyright © ${new Date().getFullYear()} AutoBackup Team`
  },

  // 窗口配置
  window: {
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#18181c',
    titleBarStyle: 'hidden', // 隐藏原生标题栏 (macOS)
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    minimizable: true
  },

  // 数据库配置
  database: {
    name: 'backup.db',
    backupDir: 'backup_history',
    maxBackups: 30, // 最多保留30个备份
    pragma: {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: 10000,
      temp_store: 'MEMORY',
      mmap_size: 30000000000 // 30GB
    }
  },

  // 缓存配置
  cache: {
    defaultDir: 'cache',
    defaultMaxSize: 1024, // MB
    cleanInterval: 3600000, // 1小时（毫秒）
    tempFileMaxAge: 86400000 // 24小时（毫秒）
  },

  // 日志配置
  logging: {
    dir: 'logs',
    maxSize: '10m',
    maxFiles: 30,
    levels: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
    defaultLevel: 'INFO',
    format: 'YYYY-MM-DD HH:mm:ss',
    retentionDays: 30
  },

  // 备份配置
  backup: {
    defaultRetentionCount: 7,
    defaultStrategy: 'daily',
    compressionLevel: 9,
    encryptionAlgorithm: 'aes-256-cbc',
    chunkSize: 8192, // 8KB
    maxConcurrentUploads: 3,
    retryAttempts: 3,
    retryDelay: 5000 // 5秒
  },

  // 存储类型
  storageTypes: {
    LOCAL: 'local',
    ALIYUN_OSS: 'aliyun_oss',
    ALIYUN_DRIVE: 'aliyun_drive'
  },

  // 备份策略
  backupStrategies: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CUSTOM: 'cron'
  },

  // 定时任务 Cron 表达式
  cronExpressions: {
    daily: '0 2 * * *',      // 每天凌晨2点
    weekly: '0 2 * * 0',     // 每周日凌晨2点
    monthly: '0 2 1 * *'     // 每月1号凌晨2点
  },

  // 任务状态
  taskStatus: {
    WAITING: 'waiting',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    PAUSED: 'paused'
  },

  // 日志级别
  logLevels: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  },

  // UI主题配置
  theme: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
    errorColor: '#d03050',
    warningColor: '#f0a020',
    successColor: '#18a058',
    infoColor: '#2080f0'
  },

  // 性能配置
  performance: {
    enableVirtualScroll: true,
    tablePageSize: 20,
    logPageSize: 50,
    maxMemoryUsage: 512, // MB
    gcInterval: 300000 // 5分钟（毫秒）
  },

  // 网络配置
  network: {
    timeout: 60000, // 60秒
    maxRetries: 3,
    retryDelay: 5000,
    userAgent: 'AutoBackup/1.0.0'
  },

  // 通知配置
  notification: {
    showOnSuccess: true,
    showOnFailure: true,
    showOnStart: false,
    duration: 5000 // 5秒
  },

  // 系统托盘配置
  tray: {
    enabled: true,
    showBalloon: true,
    balloonDuration: 3000 // 3秒
  },

  // 自动启动配置
  autoLaunch: {
    enabled: false,
    openAsHidden: true,
    minimizeToTray: true
  },

  // 开发配置
  development: {
    devServerUrl: 'http://localhost:5173',
    devToolsEnabled: true,
    hotReload: true,
    verboseLogging: true
  },

  // API 配置（如果需要）
  api: {
    aliyunDrive: {
      authUrl: 'https://auth.aliyundrive.com/v2/account/token',
      apiBaseUrl: 'https://api.aliyundrive.com'
    }
  },

  // 文件大小限制
  limits: {
    maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
    maxFilesPerTask: 100000,
    maxTaskNameLength: 100,
    maxPathLength: 260
  },

  // 安全配置
  security: {
    encryptSensitiveData: true,
    saltRounds: 10,
    tokenExpirationTime: 7200000 // 2小时（毫秒）
  }
};
