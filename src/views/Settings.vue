<template>
  <div class="settings-page">
    <n-tabs type="line" animated>
      <!-- 基本设置 -->
      <n-tab-pane name="basic" tab="基本设置">
        <n-card title="缓存设置">
          <n-form
            ref="cacheFormRef"
            :model="cacheForm"
            label-placement="left"
            label-width="150px"
          >
            <n-form-item label="缓存目录">
              <n-input-group>
                <n-input
                  v-model:value="cacheForm.cacheDir"
                  placeholder="缓存目录路径"
                  readonly
                />
                <n-button @click="selectCacheDir">选择</n-button>
              </n-input-group>
            </n-form-item>

            <n-form-item label="缓存最大大小">
              <n-input-number
                v-model:value="cacheForm.cacheMaxSize"
                :min="100"
                :max="10240"
                style="width: 200px"
              >
                <template #suffix>MB</template>
              </n-input-number>
            </n-form-item>

            <n-form-item label="当前缓存大小">
              <n-space align="center">
                <n-text>{{ formatSize(cacheSize) }}</n-text>
                <n-button size="small" @click="cleanCache" type="error">
                  <template #icon>
                    <n-icon :component="TrashOutline" />
                  </template>
                  清空缓存
                </n-button>
              </n-space>
            </n-form-item>
          </n-form>
        </n-card>

        <n-card title="日志设置" style="margin-top: 16px">
          <n-form
            ref="logFormRef"
            :model="logForm"
            label-placement="left"
            label-width="150px"
          >
            <n-form-item label="日志级别">
              <n-select
                v-model:value="logForm.logLevel"
                :options="logLevelOptions"
                style="width: 200px"
              />
            </n-form-item>

            <n-form-item label="日志保留天数">
              <n-input-number
                v-model:value="logForm.logRetentionDays"
                :min="1"
                :max="365"
                style="width: 200px"
              >
                <template #suffix>天</template>
              </n-input-number>
            </n-form-item>
          </n-form>
        </n-card>

        <n-space justify="end" style="margin-top: 24px">
          <n-button @click="resetConfig">重置</n-button>
          <n-button type="primary" @click="saveConfig" :loading="saving">
            保存设置
          </n-button>
        </n-space>
      </n-tab-pane>

      <!-- 数据库管理 -->
      <n-tab-pane name="database" tab="数据库管理">
        <n-card title="数据库备份">
          <n-space vertical>
            <n-alert type="info">
              系统会在策略变更时自动备份数据库，您也可以手动创建备份。
            </n-alert>

            <n-button type="primary" @click="backupDatabase">
              <template #icon>
                <n-icon :component="SaveOutline" />
              </template>
              立即备份数据库
            </n-button>

            <n-divider />

            <n-h3>备份历史</n-h3>
            
            <n-data-table
              :columns="backupColumns"
              :data="databaseBackups"
              :loading="loadingBackups"
              :pagination="{ pageSize: 10 }"
            />
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- 关于 -->
      <n-tab-pane name="about" tab="关于">
        <n-card>
          <n-space vertical align="center" size="large">
            <n-icon size="80" :component="CloudUploadOutline" color="#18a058" />
            
            <n-h2>自动备份工具</n-h2>
            
            <n-text depth="3">Version 1.0.0</n-text>
            
            <n-divider />
            
            <n-descriptions label-placement="left" :column="1" bordered>
              <n-descriptions-item label="开发框架">
                Vue 3 + Electron + Naive UI
              </n-descriptions-item>
              <n-descriptions-item label="数据库">
                SQLite
              </n-descriptions-item>
              <n-descriptions-item label="支持存储">
                本地存储、阿里云OSS、阿里云盘
              </n-descriptions-item>
              <n-descriptions-item label="功能特性">
                文件压缩、AES加密、定时备份、自动清理
              </n-descriptions-item>
            </n-descriptions>

            <n-space>
              <n-button
                tag="a"
                href="https://github.com"
                target="_blank"
                type="primary"
                ghost
              >
                <template #icon>
                  <n-icon :component="LogoGithub" />
                </template>
                GitHub
              </n-button>
              
              <n-button
                tag="a"
                href="https://docs.naiveui.com"
                target="_blank"
                ghost
              >
                <template #icon>
                  <n-icon :component="DocumentTextOutline" />
                </template>
                文档
              </n-button>
            </n-space>
          </n-space>
        </n-card>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import { NButton, NSpace, NIcon, useMessage, useDialog } from 'naive-ui';
import {
  TrashOutline,
  SaveOutline,
  CloudUploadOutline,
  LogoGithub,
  DocumentTextOutline,
  DownloadOutline,
  RefreshCircleOutline
} from '@vicons/ionicons5';
import db from '../services/database';
import backupService from '../services/backup';

const { ipcRenderer } = window.require('electron');

const message = useMessage();
const dialog = useDialog();

const cacheFormRef = ref(null);
const logFormRef = ref(null);
const saving = ref(false);
const loadingBackups = ref(false);
const cacheSize = ref(0);
const databaseBackups = ref([]);

const cacheForm = ref({
  cacheDir: '',
  cacheMaxSize: 1024
});

const logForm = ref({
  logLevel: 'INFO',
  logRetentionDays: 30
});

const logLevelOptions = [
  { label: 'DEBUG', value: 'DEBUG' },
  { label: 'INFO', value: 'INFO' },
  { label: 'WARN', value: 'WARN' },
  { label: 'ERROR', value: 'ERROR' }
];

const backupColumns = [
  { title: '文件名', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '大小',
    key: 'size',
    width: 120,
    render: (row) => formatSize(row.size)
  },
  {
    title: '创建时间',
    key: 'time',
    width: 180,
    render: (row) => new Date(row.time).toLocaleString('zh-CN')
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => {
      return h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => restoreDatabase(row.path)
            },
            {
              default: () => '恢复',
              icon: () => h(NIcon, null, { default: () => h(RefreshCircleOutline) })
            }
          )
        ]
      });
    }
  }
];

onMounted(async () => {
  await loadConfig();
  await loadDatabaseBackups();
  await updateCacheSize();
});

const loadConfig = async () => {
  try {
    const configs = await db.getAllConfigs();
    
    cacheForm.value = {
      cacheDir: configs.cache_dir || '',
      cacheMaxSize: parseInt(configs.cache_max_size) || 1024
    };

    logForm.value = {
      logLevel: configs.log_level || 'INFO',
      logRetentionDays: parseInt(configs.log_retention_days) || 30
    };
  } catch (error) {
    message.error('加载配置失败: ' + error.message);
  }
};

const selectCacheDir = async () => {
  const dir = await ipcRenderer.invoke('select-directory');
  if (dir) {
    cacheForm.value.cacheDir = dir;
  }
};

const saveConfig = async () => {
  saving.value = true;
  try {
    await db.setConfigs({
      cache_dir: cacheForm.value.cacheDir,
      cache_max_size: cacheForm.value.cacheMaxSize.toString(),
      log_level: logForm.value.logLevel,
      log_retention_days: logForm.value.logRetentionDays.toString()
    });

    message.success('设置保存成功');
  } catch (error) {
    message.error('保存失败: ' + error.message);
  } finally {
    saving.value = false;
  }
};

const resetConfig = async () => {
  await loadConfig();
  message.info('已重置为当前配置');
};

const updateCacheSize = async () => {
  try {
    cacheSize.value = backupService.getCacheSize();
  } catch (error) {
    console.error('获取缓存大小失败:', error);
  }
};

const cleanCache = () => {
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有缓存文件吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await backupService.cleanCache();
        message.success(`缓存清理成功: ${result.deletedCount} 个文件`);
        await updateCacheSize();
      } catch (error) {
        message.error('清空失败: ' + error.message);
      }
    }
  });
};

const backupDatabase = async () => {
  try {
    const result = await db.backup('manual');
    message.success('数据库备份成功');
    await loadDatabaseBackups();
  } catch (error) {
    message.error('备份失败: ' + error.message);
  }
};

const loadDatabaseBackups = async () => {
  loadingBackups.value = true;
  try {
    databaseBackups.value = await db.getBackups();
  } catch (error) {
    message.error('加载备份列表失败: ' + error.message);
  } finally {
    loadingBackups.value = false;
  }
};

const restoreDatabase = (backupPath) => {
  dialog.warning({
    title: '确认恢复',
    content: '恢复数据库将覆盖当前数据，是否继续？建议先备份当前数据库。',
    positiveText: '确定恢复',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await db.restore(backupPath);
        message.success('数据库恢复成功，请重启应用');
        
        // 提示重启
        setTimeout(() => {
          dialog.info({
            title: '需要重启',
            content: '数据库已恢复，请重启应用以使更改生效。',
            positiveText: '立即重启',
            onPositiveClick: () => {
              location.reload();
            }
          });
        }, 1000);
      } catch (error) {
        message.error('恢复失败: ' + error.message);
      }
    }
  });
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};
</script>

<style scoped>
.settings-page {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
