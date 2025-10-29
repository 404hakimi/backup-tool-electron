<template>
  <div class="logs-page">
    <n-space justify="space-between" style="margin-bottom: 16px">
      <n-space>
        <n-select
          v-model:value="selectedTaskId"
          :options="taskOptions"
          placeholder="筛选任务"
          clearable
          style="width: 200px"
          @update:value="loadLogs"
        />
        
        <n-button @click="loadLogs">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
        
        <n-button @click="clearLogs" type="error">
          <template #icon>
            <n-icon :component="TrashOutline" />
          </template>
          清理日志
        </n-button>
      </n-space>
    </n-space>

    <n-data-table
      :columns="columns"
      :data="logs"
      :loading="loading"
      :pagination="pagination"
      :row-class-name="rowClassName"
    />
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue';
import { NTag, NIcon, useMessage, useDialog } from 'naive-ui';
import {
  RefreshOutline,
  TrashOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline
} from '@vicons/ionicons5';
import db from '../services/database';

const message = useMessage();
const dialog = useDialog();

const logs = ref([]);
const tasks = ref([]);
const selectedTaskId = ref(null);
const loading = ref(false);

const pagination = {
  pageSize: 20
};

const taskOptions = ref([]);

const columns = [
  { title: 'ID', key: 'id', width: 60 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      return h(
        NTag,
        {
          type: row.status === 'success' ? 'success' : 'error',
          size: 'small',
          round: true
        },
        {
          default: () => row.status === 'success' ? '成功' : '失败',
          icon: () => h(NIcon, null, {
            default: () => h(row.status === 'success' ? CheckmarkCircleOutline : CloseCircleOutline)
          })
        }
      );
    }
  },
  { title: '任务名称', key: 'task_name' },
  {
    title: '文件大小',
    key: 'file_size',
    width: 120,
    render: (row) => row.file_size ? formatSize(row.file_size) : '-'
  },
  {
    title: '耗时',
    key: 'duration',
    width: 100,
    render: (row) => row.duration ? `${row.duration}秒` : '-'
  },
  {
    title: '备份路径',
    key: 'backup_path',
    ellipsis: { tooltip: true }
  },
  {
    title: '创建时间',
    key: 'create_time',
    width: 180,
    render: (row) => new Date(row.create_time).toLocaleString('zh-CN')
  },
  {
    title: '错误信息',
    key: 'error_msg',
    ellipsis: { tooltip: true },
    render: (row) => row.error_msg || '-'
  }
];

onMounted(async () => {
  await loadTasks();
  await loadLogs();
});

const loadTasks = async () => {
  try {
    tasks.value = await db.getTasks();
    taskOptions.value = [
      { label: '全部任务', value: null },
      ...tasks.value.map(t => ({
        label: t.task_name,
        value: t.id
      }))
    ];
  } catch (error) {
    message.error('加载任务列表失败: ' + error.message);
  }
};

const loadLogs = async () => {
  loading.value = true;
  try {
    logs.value = await db.getLogs(selectedTaskId.value, 100);
  } catch (error) {
    message.error('加载日志失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const clearLogs = () => {
  dialog.warning({
    title: '确认清理',
    content: '确定要清理30天前的日志吗？此操作不可恢复。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await db.cleanOldLogs(30);
        message.success('日志清理成功');
        await loadLogs();
      } catch (error) {
        message.error('清理失败: ' + error.message);
      }
    }
  });
};

const rowClassName = (row) => {
  return row.status === 'failed' ? 'error-row' : '';
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
.logs-page {
  max-width: 1400px;
  margin: 0 auto;
}

:deep(.error-row) {
  background-color: rgba(255, 0, 0, 0.05);
}
</style>
