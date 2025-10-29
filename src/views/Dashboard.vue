<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card>
          <n-statistic label="总任务数" :value="stats.totalTasks">
            <template #prefix>
              <n-icon :component="ListOutline" />
            </template>
          </n-statistic>
        </n-card>
      </n-gi>
      
      <n-gi>
        <n-card>
          <n-statistic label="启用任务" :value="stats.enabledTasks">
            <template #prefix>
              <n-icon :component="CheckmarkCircleOutline" color="#18a058" />
            </template>
          </n-statistic>
        </n-card>
      </n-gi>
      
      <n-gi>
        <n-card>
          <n-statistic label="今日备份" :value="stats.todayBackups">
            <template #prefix>
              <n-icon :component="CloudUploadOutline" color="#2080f0" />
            </template>
          </n-statistic>
        </n-card>
      </n-gi>
      
      <n-gi>
        <n-card>
          <n-statistic label="总备份大小" :value="stats.totalSize">
            <template #prefix>
              <n-icon :component="ServerOutline" />
            </template>
          </n-statistic>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 系统状态 -->
    <n-card title="系统状态" style="margin-top: 16px">
      <n-space vertical>
        <n-space align="center" justify="space-between">
          <span>缓存使用</span>
          <n-progress
            type="line"
            :percentage="cachePercentage"
            :status="cachePercentage > 80 ? 'error' : 'success'"
            style="width: 300px"
          >
            {{ formatSize(systemInfo.cacheSize) }} / {{ systemInfo.cacheMax }}
          </n-progress>
        </n-space>
        
        <n-space align="center" justify="space-between">
          <span>内存使用</span>
          <n-progress
            type="line"
            :percentage="memoryPercentage"
            :status="memoryPercentage > 80 ? 'warning' : 'success'"
            style="width: 300px"
          >
            {{ formatSize(systemInfo.usedMemory) }} / {{ formatSize(systemInfo.totalMemory) }}
          </n-progress>
        </n-space>
      </n-space>
    </n-card>

    <!-- 最近备份 -->
    <n-card title="最近备份" style="margin-top: 16px">
      <n-space vertical>
        <n-timeline>
          <n-timeline-item
            v-for="log in recentLogs"
            :key="log.id"
            :type="log.status === 'success' ? 'success' : 'error'"
            :title="log.task_name"
            :time="formatTime(log.create_time)"
          >
            <template #icon>
              <n-icon
                :component="log.status === 'success' ? CheckmarkCircleOutline : CloseCircleOutline"
              />
            </template>
            <div>
              <n-text v-if="log.status === 'success'" type="success">
                备份成功 • {{ formatSize(log.file_size) }} • 耗时 {{ log.duration }}秒
              </n-text>
              <n-text v-else type="error">
                备份失败 • {{ log.error_msg }}
              </n-text>
            </div>
          </n-timeline-item>
        </n-timeline>
        
        <n-empty v-if="recentLogs.length === 0" description="暂无备份记录" />
      </n-space>
    </n-card>

    <!-- 即将执行的任务 -->
    <n-card title="即将执行" style="margin-top: 16px">
      <n-list bordered>
        <n-list-item v-for="task in upcomingTasks" :key="task.id">
          <n-thing :title="task.task_name">
            <template #description>
              <n-space>
                <n-tag :type="getStrategyType(task.backup_strategy)" size="small">
                  {{ getStrategyText(task.backup_strategy) }}
                </n-tag>
                <n-text depth="3">
                  下次执行: {{ formatTime(task.next_execute_time) }}
                </n-text>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
        
        <n-empty v-if="upcomingTasks.length === 0" description="暂无待执行任务" />
      </n-list>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { NIcon } from 'naive-ui';
import {
  ListOutline,
  CheckmarkCircleOutline,
  CloudUploadOutline,
  ServerOutline,
  CloseCircleOutline
} from '@vicons/ionicons5';
import db from '../services/database';
import backupService from '../services/backup';

const stats = ref({
  totalTasks: 0,
  enabledTasks: 0,
  todayBackups: 0,
  totalSize: '0 MB'
});

const systemInfo = ref({
  cacheSize: 0,
  cacheMax: '1024 MB',
  usedMemory: 0,
  totalMemory: 0
});

const recentLogs = ref([]);
const upcomingTasks = ref([]);

const cachePercentage = computed(() => {
  const max = parseFloat(systemInfo.value.cacheMax) * 1024 * 1024;
  return Math.round((systemInfo.value.cacheSize / max) * 100);
});

const memoryPercentage = computed(() => {
  if (systemInfo.value.totalMemory === 0) return 0;
  return Math.round((systemInfo.value.usedMemory / systemInfo.value.totalMemory) * 100);
});

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  try {
    // 加载统计数据
    const tasks = await db.getTasks();
    stats.value.totalTasks = tasks.length;
    stats.value.enabledTasks = tasks.filter(t => t.enabled).length;

    // 今日备份数
    const logs = await db.getLogs(null, 100);
    const today = new Date().toISOString().split('T')[0];
    stats.value.todayBackups = logs.filter(
      l => l.create_time?.startsWith(today)
    ).length;

    // 总备份大小
    const totalBytes = logs
      .filter(l => l.status === 'success')
      .reduce((sum, l) => sum + (l.file_size || 0), 0);
    stats.value.totalSize = formatSize(totalBytes);

    // 系统信息
    const { ipcRenderer } = window.require('electron');
    const sysInfo = await ipcRenderer.invoke('get-system-info');
    systemInfo.value.usedMemory = sysInfo.totalMemory - sysInfo.freeMemory;
    systemInfo.value.totalMemory = sysInfo.totalMemory;
    systemInfo.value.cacheSize = backupService.getCacheSize();

    const configs = await db.getAllConfigs();
    systemInfo.value.cacheMax = configs.cache_max_size + ' MB';

    // 最近备份
    recentLogs.value = logs.slice(0, 10);

    // 即将执行的任务
    upcomingTasks.value = tasks
      .filter(t => t.enabled && t.next_execute_time)
      .sort((a, b) => new Date(a.next_execute_time) - new Date(b.next_execute_time))
      .slice(0, 5);

  } catch (error) {
    console.error('加载数据失败:', error);
  }
};

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

const formatTime = (time) => {
  if (!time) return '-';
  const date = new Date(time);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStrategyType = (strategy) => {
  const types = {
    daily: 'info',
    weekly: 'success',
    monthly: 'warning',
    cron: 'error'
  };
  return types[strategy] || 'default';
};

const getStrategyText = (strategy) => {
  const texts = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    cron: '自定义'
  };
  return texts[strategy] || strategy;
};
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
