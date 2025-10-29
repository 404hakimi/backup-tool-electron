// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import router from './router';

// 创建应用
const app = createApp(App);

// 使用插件
app.use(createPinia());
app.use(router);
app.use(naive);

// 挂载应用
app.mount('#app');
