# 自动备份工具

一个基于 Vue3 + Electron + SQLite 的桌面自动备份工具，支持多种云存储方式，提供文件压缩、加密、定时备份等功能。

## ✨ 特性

- 🎨 **现代化UI**: 使用 Naive UI (16k+ stars) 构建漂亮的界面
- 💾 **多种存储**: 支持本地存储、阿里云OSS、阿里云盘
- 🔐 **安全加密**: AES-256 加密保护备份文件
- 📦 **文件压缩**: ZIP 压缩减少存储空间
- ⏰ **定时备份**: 支持每日/每周/每月/自定义 Cron 表达式
- 📊 **可视化仪表盘**: 实时查看备份状态和系统信息
- 🗄️ **数据库备份**: SQLite 数据库自动备份，策略变更时触发
- 🧹 **自动清理**: 缓存和日志自动清理机制
- 📝 **详细日志**: 记录每次备份的详细信息

## 🛠️ 技术栈

- **前端框架**: Vue 3 + Composition API
- **UI 组件库**: Naive UI
- **桌面框架**: Electron
- **数据库**: SQLite (better-sqlite3)
- **状态管理**: Pinia
- **路由**: Vue Router
- **构建工具**: Vite
- **存储SDK**: ali-oss (阿里云OSS)
- **工具库**: archiver (压缩), node-schedule (定时任务)

## 📦 安装

```bash
# 克隆项目
git clone <repository-url>
cd backup-tool-electron

# 安装依赖
npm install

# 开发模式
npm run electron:dev

# 构建应用
npm run electron:build
```

## 🚀 使用指南

### 1. 创建备份任务

1. 进入「备份任务」页面
2. 点击「创建任务」按钮
3. 填写任务信息：
   - 任务名称
   - 选择源目录（要备份的文件夹）
   - 选择存储类型
   - 配置存储参数
   - 设置备份策略
   - 选择是否压缩/加密
4. 保存任务

### 2. 配置阿里云OSS

```javascript
{
  "region": "oss-cn-hangzhou",
  "accessKeyId": "your-access-key-id",
  "accessKeySecret": "your-access-key-secret",
  "bucketName": "your-bucket-name"
}
```

### 3. 配置阿里云盘

参考 [AList 文档](https://alist.nn.ci/zh/guide/drivers/aliyundrive.html) 获取 Refresh Token：

```javascript
{
  "refreshToken": "your-refresh-token",
  "rootFolderId": "root"  // 可选，默认为根目录
}
```

### 4. 备份策略

- **每日备份**: 每天凌晨 2 点执行
- **每周备份**: 每周日凌晨 2 点执行
- **每月备份**: 每月 1 号凌晨 2 点执行
- **自定义 Cron**: 使用 Cron 表达式自定义执行时间

Cron 表达式示例：
```
0 2 * * *      # 每天凌晨 2 点
0 */6 * * *    # 每 6 小时
0 0 * * 0      # 每周日凌晨
0 0 1 * *      # 每月 1 号凌晨
```

## 📊 功能模块

### 仪表盘
- 任务统计概览
- 系统资源监控
- 最近备份时间线
- 即将执行的任务列表

### 备份任务
- 创建/编辑/删除任务
- 立即执行备份
- 启用/禁用任务
- 任务状态监控

### 备份日志
- 查看备份历史
- 按任务筛选日志
- 查看错误信息
- 自动清理旧日志

### 系统设置
- 缓存目录配置
- 缓存大小限制
- 日志级别设置
- 日志保留天数
- 数据库备份管理

## 🔒 数据库备份机制

系统会在以下情况自动备份数据库：

1. **任务创建** - `task_created`
2. **任务更新** - `task_updated`
3. **任务删除** - `task_deleted`
4. **配置更新** - `config_updated`
5. **手动备份** - `manual`

备份文件命名格式：`backup_YYYY-MM-DDTHH-mm-ss_reason.db`

系统自动保留最近 30 个备份文件。

## 🗄️ 数据库结构

### backup_tasks (备份任务表)
```sql
CREATE TABLE backup_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_name TEXT NOT NULL,
  source_dir TEXT NOT NULL,
  storage_type TEXT NOT NULL,
  storage_config TEXT,
  backup_strategy TEXT NOT NULL,
  cron_expression TEXT,
  enabled INTEGER DEFAULT 1,
  encrypted INTEGER DEFAULT 0,
  encrypt_password TEXT,
  compressed INTEGER DEFAULT 1,
  retention_count INTEGER DEFAULT 7,
  last_execute_time TEXT,
  next_execute_time TEXT,
  status TEXT DEFAULT 'waiting',
  create_time TEXT DEFAULT CURRENT_TIMESTAMP,
  update_time TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### backup_logs (备份日志表)
```sql
CREATE TABLE backup_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  level TEXT DEFAULT 'INFO',
  file_size INTEGER,
  backup_path TEXT,
  status TEXT,
  duration INTEGER,
  error_msg TEXT,
  details TEXT,
  create_time TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### system_config (系统配置表)
```sql
CREATE TABLE system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  update_time TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 📝 项目结构

```
backup-tool-electron/
├── electron/
│   └── main.js              # Electron 主进程
├── src/
│   ├── services/
│   │   ├── database.js      # 数据库服务
│   │   └── backup.js        # 备份执行服务
│   ├── views/
│   │   ├── Dashboard.vue    # 仪表盘
│   │   ├── Tasks.vue        # 任务管理
│   │   ├── Logs.vue         # 日志查看
│   │   └── Settings.vue     # 系统设置
│   ├── router/
│   │   └── index.js         # 路由配置
│   ├── App.vue              # 根组件
│   └── main.js              # Vue 入口
├── package.json
├── vite.config.js
└── README.md
```

## 🔧 开发说明

### 添加新的存储类型

1. 在 `src/services/backup.js` 中添加上传方法
2. 在 `src/views/Tasks.vue` 中添加配置表单
3. 更新存储类型选项

示例：
```javascript
// 添加新的存储驱动
async uploadToNewStorage(config, filePath, remotePath) {
  // 实现上传逻辑
}

// 在 uploadToStorage 方法中添加分支
case 'new_storage':
  return await this.uploadToNewStorage(config, filePath, remotePath);
```

### 自定义备份策略

修改 `electron/main.js` 中的 Cron 表达式生成逻辑。

## ⚠️ 注意事项

1. **加密密码**：请妥善保管加密密码，遗失后无法恢复备份文件
2. **存储凭证**：AccessKey 等敏感信息会加密存储在本地数据库
3. **缓存清理**：建议定期清理缓存目录，避免占用过多磁盘空间
4. **数据库备份**：建议定期导出数据库备份文件到安全位置
5. **网络连接**：云存储需要稳定的网络连接

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🔗 相关链接

- [Naive UI](https://www.naiveui.com/)
- [Electron](https://www.electronjs.org/)
- [Vue 3](https://vuejs.org/)
- [AList](https://alist.nn.ci/) - 参考了其存储驱动设计

## 📧 联系方式

如有问题或建议，请提交 Issue 或发送邮件。
