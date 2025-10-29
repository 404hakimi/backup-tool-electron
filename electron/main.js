/**
 * Electron 主进程 - 完整修复版
 * 修复了单实例锁、GPU缓存、模块导入时机等问题
 */

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const schedule = require('node-schedule');

// ===== 修复1: GPU缓存问题 =====
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

// ===== 修复2: 单实例锁 =====
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('应用已在运行，退出当前实例');
  app.quit();
  process.exit(0);  // 关键：立即退出进程
}

// ===== 修复3: 延迟导入模块 =====
let APP_CONFIG, EVENTS, TABLES, CONFIG_KEYS, DB_BACKUP_REASONS, DATE_FORMATS;
let logger, errorHandler, ensureDir, formatDate;

// 全局变量
let mainWindow = null;
let tray = null;
let db = null;
const scheduledJobs = new Map();

// 路径配置（延迟初始化）
let userDataPath;
let dbPath;
let dbBackupPath;
let cachePath;
let logPath;

/**
 * 初始化配置和工具
 * 必须在 app.ready 之后调用
 */
function initConfig() {
  try {
    console.log('开始初始化配置...');

    const constants = require(path.join(__dirname, '../config/constants'));
    APP_CONFIG = constants.APP_CONFIG;
    EVENTS = constants.EVENTS;
    TABLES = constants.TABLES;
    CONFIG_KEYS = constants.CONFIG_KEYS;
    DB_BACKUP_REASONS = constants.DB_BACKUP_REASONS;
    DATE_FORMATS = constants.DATE_FORMATS;

    logger = require(path.join(__dirname, '../utils/logger'));
    const errorHandlerModule = require(path.join(__dirname, '../utils/errorHandler'));
    errorHandler = errorHandlerModule.errorHandler;
    const commonUtils = require(path.join(__dirname, '../utils/common'));
    ensureDir = commonUtils.ensureDir;
    formatDate = commonUtils.formatDate;

    userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, APP_CONFIG.database.name);
    dbBackupPath = path.join(userDataPath, APP_CONFIG.database.backupDir);
    cachePath = path.join(userDataPath, APP_CONFIG.cache.defaultDir);
    logPath = path.join(userDataPath, APP_CONFIG.logging.dir);

    ensureDir(dbBackupPath);
    ensureDir(cachePath);
    ensureDir(logPath);

    logger.info(`${APP_CONFIG.app.displayName} v${APP_CONFIG.app.version} 启动`);
    logger.info(`用户数据目录: ${userDataPath}`);

    console.log('配置初始化完成');
  } catch (error) {
    console.error('配置初始化失败:', error);
    throw error;
  }
}

app.on('second-instance', () => {
  console.log('检测到第二个实例');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

function createWindow() {
  logger.info('创建主窗口');

  const windowConfig = APP_CONFIG.window;

  mainWindow = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    minWidth: windowConfig.minWidth,
    minHeight: windowConfig.minHeight,
    backgroundColor: windowConfig.backgroundColor,
    show: false,
    frame: windowConfig.frame,
    autoHideMenuBar: windowConfig.autoHideMenuBar,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true
    },
    icon: getAppIcon(),
    title: APP_CONFIG.app.displayName
  });

  Menu.setApplicationMenu(null);

  const startUrl = process.env.NODE_ENV === 'development'
      ? APP_CONFIG.development.devServerUrl
      : `file://${path.join(__dirname, '../dist/index.html')}`;

  logger.info(`加载URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    logger.info('窗口内容已加载');
    mainWindow.show();
    logger.info('主窗口已显示');

    if (process.argv.includes('--hidden')) {
      mainWindow.hide();
      logger.info('后台启动');
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('页面加载失败', null, { errorCode, errorDescription });
    console.error('页面加载失败:', errorCode, errorDescription);
  });

  mainWindow.on('close', async (event) => {
    try {
      const closeToTray = await getSystemConfig(CONFIG_KEYS.CLOSE_TO_TRAY);

      if (closeToTray === 'true' && !app.isQuiting) {
        event.preventDefault();
        mainWindow.hide();

        const isFirstTime = await getSystemConfig(CONFIG_KEYS.FIRST_MINIMIZE_TIP);
        if (isFirstTime !== 'false') {
          showTrayBalloon(APP_CONFIG.app.displayName, '程序已最小化到托盘');
          await setSystemConfig(CONFIG_KEYS.FIRST_MINIMIZE_TIP, 'false');
        }
        return false;
      }
    } catch (error) {
      logger.error('窗口关闭失败', error);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function getAppIcon() {
  const iconPath = path.join(__dirname, '../resources/icon.png');
  return fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : createDefaultIcon();
}

function createDefaultIcon() {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const dx = x - size / 2;
      const dy = y - size / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < size / 2 - 1) {
        buffer[index] = 24;
        buffer[index + 1] = 160;
        buffer[index + 2] = 88;
        buffer[index + 3] = 255;
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray() {
  const iconPath = path.join(__dirname, '../resources/tray-icon.png');
  let trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : createDefaultIcon();

  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  updateTrayMenu();
  tray.setToolTip(APP_CONFIG.app.displayName);
  tray.on('double-click', showWindow);
  if (process.platform === 'win32') tray.on('click', toggleWindow);
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: showWindow },
    { label: '立即执行所有任务', click: executeAllTasks },
    { type: 'separator' },
    { label: '开机自启', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (m) => setAutoLaunch(m.checked) },
    { label: '关闭到托盘', type: 'checkbox', checked: true, click: async (m) => await setSystemConfig(CONFIG_KEYS.CLOSE_TO_TRAY, m.checked.toString()) },
    { type: 'separator' },
    { label: `关于 ${APP_CONFIG.app.displayName}`, click: showAboutDialog },
    { label: '退出', click: quitApp }
  ]);
  tray.setContextMenu(contextMenu);
}

function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function toggleWindow() {
  mainWindow ? (mainWindow.isVisible() ? mainWindow.hide() : showWindow()) : createWindow();
}

function showTrayBalloon(title, content) {
  if (tray && process.platform === 'win32') {
    try {
      tray.displayBalloon({ title, content, icon: getAppIcon() });
    } catch (error) {}
  }
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: `关于 ${APP_CONFIG.app.displayName}`,
    message: APP_CONFIG.app.displayName,
    detail: `版本: ${APP_CONFIG.app.version}\n${APP_CONFIG.app.description}\n\n${APP_CONFIG.app.copyright}`,
    buttons: ['确定']
  });
}

function quitApp() {
  app.isQuiting = true;
  app.quit();
}

function setAutoLaunch(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    args: enable ? ['--hidden'] : []
  });
  setSystemConfig(CONFIG_KEYS.AUTO_LAUNCH, enable.toString());
}

async function executeAllTasks() {
  try {
    const tasks = await getAllEnabledTasks();
    for (const task of tasks) {
      if (mainWindow) mainWindow.webContents.send(EVENTS.BACKUP.START, task.id);
    }
  } catch (error) {
    logger.error('执行任务失败', error);
  }
}

async function getAllEnabledTasks() {
  try {
    return db.prepare(`SELECT * FROM ${TABLES.BACKUP_TASKS} WHERE enabled = 1`).all();
  } catch (error) {
    return [];
  }
}

function initDatabase() {
  db = new Database(dbPath);
  const pragma = APP_CONFIG.database.pragma;
  db.pragma(`journal_mode = ${pragma.journal_mode}`);
  db.pragma(`synchronous = ${pragma.synchronous}`);
  db.pragma(`cache_size = ${pragma.cache_size}`);
  db.pragma(`temp_store = ${pragma.temp_store}`);
  createTables();
  insertDefaultConfig();
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLES.BACKUP_TASKS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_name TEXT NOT NULL, source_dir TEXT NOT NULL,
      storage_type TEXT NOT NULL, storage_config TEXT, backup_strategy TEXT NOT NULL, cron_expression TEXT,
      enabled INTEGER DEFAULT 1, encrypted INTEGER DEFAULT 0, encrypt_password TEXT, compressed INTEGER DEFAULT 1,
      retention_count INTEGER DEFAULT 7, last_execute_time TEXT, next_execute_time TEXT,
      status TEXT DEFAULT 'waiting', create_time TEXT DEFAULT CURRENT_TIMESTAMP, update_time TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON ${TABLES.BACKUP_TASKS}(enabled);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON ${TABLES.BACKUP_TASKS}(status);
    CREATE TABLE IF NOT EXISTS ${TABLES.BACKUP_LOGS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, task_name TEXT NOT NULL,
      level TEXT DEFAULT 'INFO', file_size INTEGER, backup_path TEXT, status TEXT, duration INTEGER,
      error_msg TEXT, details TEXT, create_time TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_logs_task_id ON ${TABLES.BACKUP_LOGS}(task_id);
    CREATE INDEX IF NOT EXISTS idx_logs_create_time ON ${TABLES.BACKUP_LOGS}(create_time DESC);
    CREATE TABLE IF NOT EXISTS ${TABLES.SYSTEM_CONFIG} (
      id INTEGER PRIMARY KEY AUTOINCREMENT, config_key TEXT UNIQUE NOT NULL,
      config_value TEXT, update_time TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_config_key ON ${TABLES.SYSTEM_CONFIG}(config_key);
  `);
}

function insertDefaultConfig() {
  const configs = [
    { key: CONFIG_KEYS.CACHE_DIR, value: cachePath },
    { key: CONFIG_KEYS.CACHE_MAX_SIZE, value: '1024' },
    { key: CONFIG_KEYS.LOG_RETENTION_DAYS, value: '30' },
    { key: CONFIG_KEYS.LOG_LEVEL, value: 'INFO' },
    { key: CONFIG_KEYS.CLOSE_TO_TRAY, value: 'true' },
    { key: CONFIG_KEYS.FIRST_MINIMIZE_TIP, value: 'true' }
  ];
  const stmt = db.prepare(`INSERT OR IGNORE INTO ${TABLES.SYSTEM_CONFIG} (config_key, config_value) VALUES (?, ?)`);
  const transaction = db.transaction((cfgs) => cfgs.forEach(c => stmt.run(c.key, c.value)));
  transaction(configs);
}

async function getSystemConfig(key) {
  try {
    const result = db.prepare(`SELECT config_value FROM ${TABLES.SYSTEM_CONFIG} WHERE config_key = ?`).get(key);
    return result?.config_value || null;
  } catch (error) {
    return null;
  }
}

async function setSystemConfig(key, value) {
  try {
    db.prepare(`INSERT OR REPLACE INTO ${TABLES.SYSTEM_CONFIG} (config_key, config_value, update_time) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(key, value);
  } catch (error) {}
}

function backupDatabase(reason = 'manual') {
  try {
    const timestamp = formatDate(new Date(), DATE_FORMATS.FILENAME);
    const backupFileName = `backup_${timestamp}_${reason}.db`;
    const backupFilePath = path.join(dbBackupPath, backupFileName);
    if (db) db.close();
    fs.copyFileSync(dbPath, backupFilePath);
    db = new Database(dbPath);
    cleanOldDatabaseBackups();
    return { success: true, path: backupFilePath };
  } catch (error) {
    if (!db) db = new Database(dbPath);
    return { success: false, error: error.message };
  }
}

function cleanOldDatabaseBackups() {
  try {
    const files = fs.readdirSync(dbBackupPath)
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .map(f => ({ name: f, path: path.join(dbBackupPath, f), time: fs.statSync(path.join(dbBackupPath, f)).mtime }))
        .sort((a, b) => b.time - a.time);
    if (files.length > 30) files.slice(30).forEach(file => fs.unlinkSync(file.path));
  } catch (error) {}
}

function setupIpcHandlers() {
  ipcMain.handle(EVENTS.IPC.SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.filePaths[0];
  });
  ipcMain.handle(EVENTS.IPC.DB_QUERY, (e, sql, params = []) => {
    try { return { success: true, data: db.prepare(sql).all(...params) }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle(EVENTS.IPC.DB_RUN, (e, sql, params = []) => {
    try { return { success: true, data: db.prepare(sql).run(...params) }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle(EVENTS.IPC.DB_TRANSACTION, (e, ops) => {
    const transaction = db.transaction(() => ops.map(op => {
      const stmt = db.prepare(op.sql);
      return op.type === 'run' ? stmt.run(...(op.params || [])) : stmt.all(...(op.params || []));
    }));
    try { return { success: true, data: transaction() }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle(EVENTS.IPC.BACKUP_DATABASE, (e, reason) => backupDatabase(reason));
  ipcMain.handle(EVENTS.IPC.GET_DATABASE_BACKUPS, () => {
    try {
      const files = fs.readdirSync(dbBackupPath)
          .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
          .map(f => {
            const stat = fs.statSync(path.join(dbBackupPath, f));
            return { name: f, path: path.join(dbBackupPath, f), size: stat.size, time: stat.mtime };
          })
          .sort((a, b) => b.time - a.time);
      return { success: true, data: files };
    } catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle(EVENTS.IPC.RESTORE_DATABASE, (e, backupPath) => {
    try {
      backupDatabase('before_restore');
      if (db) db.close();
      fs.copyFileSync(backupPath, dbPath);
      db = new Database(dbPath);
      return { success: true };
    } catch (error) {
      if (!db) db = new Database(dbPath);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(EVENTS.IPC.SCHEDULE_TASK, (e, task) => {
    try {
      if (scheduledJobs.has(task.id)) scheduledJobs.get(task.id).cancel();
      const job = schedule.scheduleJob(task.cron_expression || '0 2 * * *', () => {
        if (mainWindow) mainWindow.webContents.send(EVENTS.BACKUP.START, task.id);
      });
      scheduledJobs.set(task.id, job);
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle(EVENTS.IPC.UNSCHEDULE_TASK, (e, taskId) => {
    if (scheduledJobs.has(taskId)) {
      scheduledJobs.get(taskId).cancel();
      scheduledJobs.delete(taskId);
    }
    return { success: true };
  });
  ipcMain.handle(EVENTS.IPC.GET_SYSTEM_INFO, () => {
    const os = require('os');
    return { platform: process.platform, totalMemory: os.totalmem(), freeMemory: os.freemem(), userDataPath, appVersion: APP_CONFIG.app.version };
  });
}

app.whenReady().then(() => {
  try {
    initConfig();
    initDatabase();
    setupIpcHandlers();
    createWindow();
    createTray();
  } catch (error) {
    console.error('初始化失败:', error);
    dialog.showErrorBox('启动失败', error.message);
    app.quit();
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') quitApp(); });
app.on('before-quit', () => { scheduledJobs.forEach(job => job.cancel()); if (db) db.close(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
process.on('uncaughtException', (error) => { console.error('未捕获异常:', error); });
process.on('unhandledRejection', (reason) => { console.error('Promise拒绝:', reason); });