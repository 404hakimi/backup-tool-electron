<template>
  <div class="tasks-page">
    <!-- 操作栏 -->
    <n-space justify="space-between" style="margin-bottom: 16px">
      <n-space>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          创建任务
        </n-button>
        
        <n-button @click="loadTasks">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
      </n-space>
      
      <n-input
        v-model:value="searchText"
        placeholder="搜索任务名称"
        clearable
        style="width: 300px"
      >
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
    </n-space>

    <!-- 任务列表 -->
    <n-data-table
      :columns="columns"
      :data="filteredTasks"
      :loading="loading"
      :pagination="pagination"
      :bordered="false"
    />

    <!-- 创建/编辑任务模态框 -->
    <n-modal
      v-model:show="showCreateModal"
      :mask-closable="false"
      preset="card"
      :title="editingTask ? '编辑任务' : '创建任务'"
      style="width: 800px"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="120px"
      >
        <n-form-item label="任务名称" path="taskName">
          <n-input v-model:value="formData.taskName" placeholder="请输入任务名称" />
        </n-form-item>

        <n-form-item label="源目录" path="sourceDir">
          <n-input-group>
            <n-input
              v-model:value="formData.sourceDir"
              placeholder="选择要备份的目录"
              readonly
            />
            <n-button @click="selectDirectory">选择</n-button>
          </n-input-group>
        </n-form-item>

        <n-form-item label="存储类型" path="storageType">
          <n-select
            v-model:value="formData.storageType"
            :options="storageTypeOptions"
            placeholder="选择存储类型"
          />
        </n-form-item>

        <!-- 阿里云OSS配置 -->
        <template v-if="formData.storageType === 'aliyun_oss'">
          <n-form-item label="OSS Region" path="storageConfig.region">
            <n-input v-model:value="formData.storageConfig.region" placeholder="oss-cn-hangzhou" />
          </n-form-item>
          
          <n-form-item label="Access Key ID" path="storageConfig.accessKeyId">
            <n-input v-model:value="formData.storageConfig.accessKeyId" type="password" show-password-on="click" />
          </n-form-item>
          
          <n-form-item label="Access Key Secret" path="storageConfig.accessKeySecret">
            <n-input v-model:value="formData.storageConfig.accessKeySecret" type="password" show-password-on="click" />
          </n-form-item>
          
          <n-form-item label="Bucket 名称" path="storageConfig.bucketName">
            <n-input v-model:value="formData.storageConfig.bucketName" />
          </n-form-item>
        </template>

        <!-- 阿里云盘配置 -->
        <template v-if="formData.storageType === 'aliyun_drive'">
          <n-form-item label="Refresh Token" path="storageConfig.refreshToken">
            <n-input
              v-model:value="formData.storageConfig.refreshToken"
              type="textarea"
              placeholder="从阿里云盘获取的 Refresh Token"
              :autosize="{ minRows: 3, maxRows: 5 }"
            />
          </n-form-item>
          
          <n-form-item label="根目录ID" path="storageConfig.rootFolderId">
            <n-input
              v-model:value="formData.storageConfig.rootFolderId"
              placeholder="root (留空使用根目录)"
            />
          </n-form-item>
        </template>

        <!-- 本地存储配置 -->
        <template v-if="formData.storageType === 'local'">
          <n-form-item label="存储路径" path="storageConfig.rootPath">
            <n-input-group>
              <n-input
                v-model:value="formData.storageConfig.rootPath"
                placeholder="选择本地存储目录"
                readonly
              />
              <n-button @click="selectStorageDirectory">选择</n-button>
            </n-input-group>
          </n-form-item>
        </template>

        <n-form-item label="备份策略" path="backupStrategy">
          <n-select
            v-model:value="formData.backupStrategy"
            :options="strategyOptions"
            placeholder="选择备份策略"
          />
        </n-form-item>

        <n-form-item
          v-if="formData.backupStrategy === 'cron'"
          label="Cron 表达式"
          path="cronExpression"
        >
          <n-input
            v-model:value="formData.cronExpression"
            placeholder="0 2 * * * (每天凌晨2点)"
          />
        </n-form-item>

        <n-form-item label="启用压缩" path="compressed">
          <n-switch v-model:value="formData.compressed" />
        </n-form-item>

        <n-form-item label="启用加密" path="encrypted">
          <n-switch v-model:value="formData.encrypted" />
        </n-form-item>

        <n-form-item v-if="formData.encrypted" label="加密密码" path="encryptPassword">
          <n-input
            v-model:value="formData.encryptPassword"
            type="password"
            show-password-on="click"
            placeholder="请输入加密密码"
          />
        </n-form-item>

        <n-form-item label="保留份数" path="retentionCount">
          <n-input-number
            v-model:value="formData.retentionCount"
            :min="1"
            :max="100"
            placeholder="保留最近 N 份备份"
          />
        </n-form-item>

        <n-form-item label="启用任务" path="enabled">
          <n-switch v-model:value="formData.enabled" />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ editingTask ? '保存' : '创建' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue';
import { NButton, NTag, NSpace, NIcon, NSwitch, useMessage, useDialog } from 'naive-ui';
import {
  AddOutline,
  RefreshOutline,
  SearchOutline,
  PlayOutline,
  PauseOutline,
  CreateOutline,
  TrashOutline
} from '@vicons/ionicons5';
import db from '../services/database';
import backupService from '../services/backup';

const { ipcRenderer } = window.require('electron');

const message = useMessage();
const dialog = useDialog();

const tasks = ref([]);
const loading = ref(false);
const searchText = ref('');
const showCreateModal = ref(false);
const editingTask = ref(null);
const submitting = ref(false);
const formRef = ref(null);

const formData = ref({
  taskName: '',
  sourceDir: '',
  storageType: 'local',
  storageConfig: {},
  backupStrategy: 'daily',
  cronExpression: '0 2 * * *',
  enabled: true,
  encrypted: false,
  encryptPassword: '',
  compressed: true,
  retentionCount: 7
});

const pagination = {
  pageSize: 10
};

const storageTypeOptions = [
  { label: '本地存储', value: 'local' },
  { label: '阿里云OSS', value: 'aliyun_oss' },
  { label: '阿里云盘', value: 'aliyun_drive' }
];

const strategyOptions = [
  { label: '每日备份', value: 'daily' },
  { label: '每周备份', value: 'weekly' },
  { label: '每月备份', value: 'monthly' },
  { label: '自定义 (Cron)', value: 'cron' }
];

const formRules = {
  taskName: { required: true, message: '请输入任务名称', trigger: 'blur' },
  sourceDir: { required: true, message: '请选择源目录', trigger: 'change' },
  storageType: { required: true, message: '请选择存储类型', trigger: 'change' }
};

const columns = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '任务名称', key: 'task_name', ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'enabled',
    width: 80,
    render: (row) => {
      return h(
        NTag,
        { type: row.enabled ? 'success' : 'default', size: 'small' },
        { default: () => (row.enabled ? '启用' : '禁用') }
      );
    }
  },
  {
    title: '备份策略',
    key: 'backup_strategy',
    width: 100,
    render: (row) => {
      const strategies = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
        cron: '自定义'
      };
      return strategies[row.backup_strategy] || row.backup_strategy;
    }
  },
  {
    title: '存储类型',
    key: 'storage_type',
    width: 120,
    render: (row) => {
      const types = {
        local: '本地',
        aliyun_oss: '阿里云OSS',
        aliyun_drive: '阿里云盘'
      };
      return types[row.storage_type] || row.storage_type;
    }
  },
  {
    title: '上次执行',
    key: 'last_execute_time',
    width: 160,
    render: (row) => row.last_execute_time ? new Date(row.last_execute_time).toLocaleString('zh-CN') : '-'
  },
  {
    title: '操作',
    key: 'actions',
    width: 240,
    render: (row) => {
      return h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => executeBackup(row.id)
            },
            { default: () => '立即执行', icon: () => h(NIcon, null, { default: () => h(PlayOutline) }) }
          ),
          h(
            NButton,
            {
              size: 'small',
              onClick: () => editTask(row)
            },
            { default: () => '编辑', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => deleteTask(row.id)
            },
            { default: () => '删除', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
          )
        ]
      });
    }
  }
];

const filteredTasks = computed(() => {
  if (!searchText.value) return tasks.value;
  return tasks.value.filter(task =>
    task.task_name.toLowerCase().includes(searchText.value.toLowerCase())
  );
});

onMounted(() => {
  loadTasks();
});

const loadTasks = async () => {
  loading.value = true;
  try {
    tasks.value = await db.getTasks();
  } catch (error) {
    message.error('加载任务失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const selectDirectory = async () => {
  const dir = await ipcRenderer.invoke('select-directory');
  if (dir) {
    formData.value.sourceDir = dir;
  }
};

const selectStorageDirectory = async () => {
  const dir = await ipcRenderer.invoke('select-directory');
  if (dir) {
    formData.value.storageConfig.rootPath = dir;
  }
};

const editTask = (task) => {
  editingTask.value = task;
  formData.value = {
    taskName: task.task_name,
    sourceDir: task.source_dir,
    storageType: task.storage_type,
    storageConfig: JSON.parse(task.storage_config || '{}'),
    backupStrategy: task.backup_strategy,
    cronExpression: task.cron_expression || '0 2 * * *',
    enabled: Boolean(task.enabled),
    encrypted: Boolean(task.encrypted),
    encryptPassword: task.encrypt_password || '',
    compressed: Boolean(task.compressed),
    retentionCount: task.retention_count || 7
  };
  showCreateModal.value = true;
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    submitting.value = true;

    if (editingTask.value) {
      await db.updateTask(editingTask.value.id, formData.value);
      message.success('任务更新成功');
    } else {
      const taskId = await db.createTask(formData.value);
      message.success('任务创建成功');
      
      // 调度任务
      if (formData.value.enabled) {
        await ipcRenderer.invoke('schedule-task', {
          id: taskId,
          ...formData.value
        });
      }
    }

    showCreateModal.value = false;
    editingTask.value = null;
    resetForm();
    await loadTasks();

  } catch (error) {
    if (error) {
      message.error('提交失败: ' + error.message);
    }
  } finally {
    submitting.value = false;
  }
};

const executeBackup = async (taskId) => {
  try {
    message.loading('正在执行备份...', { duration: 0 });
    await backupService.executeBackup(taskId);
    message.destroyAll();
    message.success('备份执行成功');
    await loadTasks();
  } catch (error) {
    message.destroyAll();
    message.error('备份执行失败: ' + error.message);
  }
};

const deleteTask = (taskId) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个任务吗？此操作不可恢复。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await db.deleteTask(taskId);
        await ipcRenderer.invoke('unschedule-task', taskId);
        message.success('任务已删除');
        await loadTasks();
      } catch (error) {
        message.error('删除失败: ' + error.message);
      }
    }
  });
};

const resetForm = () => {
  formData.value = {
    taskName: '',
    sourceDir: '',
    storageType: 'local',
    storageConfig: {},
    backupStrategy: 'daily',
    cronExpression: '0 2 * * *',
    enabled: true,
    encrypted: false,
    encryptPassword: '',
    compressed: true,
    retentionCount: 7
  };
};
</script>

<style scoped>
.tasks-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
