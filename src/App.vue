<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-layout has-sider style="height: 100vh">
            <!-- 侧边栏 -->
            <n-layout-sider
              bordered
              collapse-mode="width"
              :collapsed-width="64"
              :width="240"
              :collapsed="collapsed"
              show-trigger
              @collapse="collapsed = true"
              @expand="collapsed = false"
              :native-scrollbar="false"
            >
              <div class="logo">
                <n-icon size="32" :component="CloudUploadOutline" />
                <span v-if="!collapsed" class="logo-text">自动备份工具</span>
              </div>

              <n-menu
                v-model:value="activeKey"
                :collapsed="collapsed"
                :collapsed-width="64"
                :collapsed-icon-size="22"
                :options="menuOptions"
                @update:value="handleMenuSelect"
              />
            </n-layout-sider>

            <!-- 主内容区 -->
            <n-layout :native-scrollbar="false">
              <!-- 头部 -->
              <n-layout-header bordered style="height: 64px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between">
                <n-space align="center">
                  <n-h2 style="margin: 0">{{ currentTitle }}</n-h2>
                </n-space>

                <n-space>
                  <n-button
                    text
                    @click="handleRefresh"
                    :loading="refreshing"
                  >
                    <template #icon>
                      <n-icon :component="RefreshOutline" />
                    </template>
                  </n-button>

                  <n-dropdown :options="userOptions" @select="handleUserAction">
                    <n-button text>
                      <template #icon>
                        <n-icon :component="PersonCircleOutline" />
                      </template>
                    </n-button>
                  </n-dropdown>
                </n-space>
              </n-layout-header>

              <!-- 内容 -->
              <n-layout-content
                :native-scrollbar="false"
                style="padding: 24px"
              >
                <router-view v-slot="{ Component }">
                  <transition name="fade" mode="out-in">
                    <component :is="Component" />
                  </transition>
                </router-view>
              </n-layout-content>
            </n-layout>
          </n-layout>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NIcon } from 'naive-ui';
import {
  CloudUploadOutline,
  GridOutline,
  ListOutline,
  DocumentTextOutline,
  SettingsOutline,
  RefreshOutline,
  PersonCircleOutline,
  LogOutOutline,
  InformationCircleOutline
} from '@vicons/ionicons5';
import { darkTheme } from 'naive-ui';

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);
const activeKey = ref('dashboard');
const refreshing = ref(false);

// 自定义主题
const themeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43'
  }
};

// 渲染图标
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) });
};

// 菜单选项
const menuOptions = [
  {
    label: '仪表盘',
    key: 'dashboard',
    icon: renderIcon(GridOutline)
  },
  {
    label: '备份任务',
    key: 'tasks',
    icon: renderIcon(ListOutline)
  },
  {
    label: '备份日志',
    key: 'logs',
    icon: renderIcon(DocumentTextOutline)
  },
  {
    label: '系统设置',
    key: 'settings',
    icon: renderIcon(SettingsOutline)
  }
];

// 用户菜单
const userOptions = [
  {
    label: '关于',
    key: 'about',
    icon: renderIcon(InformationCircleOutline)
  },
  {
    type: 'divider'
  },
  {
    label: '退出',
    key: 'exit',
    icon: renderIcon(LogOutOutline)
  }
];

// 当前标题
const currentTitle = computed(() => {
  const routeMeta = route.meta;
  return routeMeta.title || '自动备份工具';
});

// 监听路由变化
router.afterEach((to) => {
  activeKey.value = to.name?.toLowerCase() || 'dashboard';
});

// 菜单选择
const handleMenuSelect = (key) => {
  router.push({ name: key });
};

// 刷新
const handleRefresh = () => {
  refreshing.value = true;
  setTimeout(() => {
    refreshing.value = false;
    window.location.reload();
  }, 500);
};

// 用户操作
const handleUserAction = (key) => {
  if (key === 'about') {
    // 显示关于对话框
    window.$dialog.info({
      title: '关于',
      content: '自动备份工具 v1.0.0\n支持阿里云盘、OSS等多种存储方式',
      positiveText: '确定'
    });
  } else if (key === 'exit') {
    window.close();
  }
};
</script>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  margin-bottom: 8px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
