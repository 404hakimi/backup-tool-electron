/**
 * 通用工具函数
 */

const { FILE_SIZE_UNITS, DATE_FORMATS, REGEX } = require('../config/constants');

/**
 * 格式化文件大小
 */
function formatFileSize(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 解析文件大小字符串为字节数
 */
function parseFileSize(sizeStr) {
  if (typeof sizeStr === 'number') return sizeStr;
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B?)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return value * (FILE_SIZE_UNITS[unit] || 1);
}

/**
 * 格式化日期时间
 */
function formatDate(date, format = DATE_FORMATS.DATETIME) {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  const padZero = (num) => String(num).padStart(2, '0');
  
  const replacements = {
    'YYYY': d.getFullYear(),
    'MM': padZero(d.getMonth() + 1),
    'DD': padZero(d.getDate()),
    'HH': padZero(d.getHours()),
    'mm': padZero(d.getMinutes()),
    'ss': padZero(d.getSeconds()),
    'SSS': String(d.getMilliseconds()).padStart(3, '0')
  };
  
  let result = format;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(key, value);
  }
  
  return result;
}

/**
 * 解析日期字符串
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 计算时间差（人类可读格式）
 */
function getTimeAgo(date) {
  if (!date) return '';
  
  const now = new Date();
  const past = date instanceof Date ? date : new Date(date);
  const diffMs = now - past;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  if (seconds > 0) return `${seconds}秒前`;
  return '刚刚';
}

/**
 * 计算持续时间（人类可读格式）
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0秒';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
  
  return parts.join('');
}

/**
 * 深度克隆对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof RegExp) return new RegExp(obj);
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * 深度合并对象
 */
function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * 判断是否为对象
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 防抖函数
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * 节流函数
 */
function throttle(func, wait) {
  let timeout;
  let previous = 0;
  
  return function executedFunction(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 重试函数
 */
async function retry(fn, options = {}) {
  const {
    attempts = 3,
    delay = 1000,
    onRetry = null,
    shouldRetry = () => true
  } = options;
  
  let lastError;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < attempts - 1 && shouldRetry(error, i)) {
        if (onRetry) {
          onRetry(error, i);
        }
        await sleep(delay * Math.pow(2, i)); // 指数退避
      }
    }
  }
  
  throw lastError;
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成唯一ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证Cron表达式
 */
function validateCron(expression) {
  return REGEX.CRON.test(expression);
}

/**
 * 验证邮箱地址
 */
function validateEmail(email) {
  return REGEX.EMAIL.test(email);
}

/**
 * 验证URL
 */
function validateUrl(url) {
  return REGEX.URL.test(url);
}

/**
 * 截断字符串
 */
function truncate(str, maxLength, suffix = '...') {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 安全的JSON解析
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 安全的JSON字符串化
 */
function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * 获取文件名（不含扩展名）
 */
function getFileNameWithoutExt(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length > 1) {
    parts.pop();
  }
  return parts.join('.');
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  const fs = require('fs');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 计算百分比
 */
function calculatePercentage(value, total, decimals = 0) {
  if (!total || total === 0) return 0;
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
}

/**
 * 限制数值范围
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 数组分组
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {});
}

/**
 * 数组去重
 */
function unique(array, key = null) {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 随机字符串
 */
function randomString(length = 8, charset = 'alphanumeric') {
  const charsets = {
    numeric: '0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    alphanumeric: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    hex: '0123456789abcdef'
  };
  
  const chars = charsets[charset] || charsets.alphanumeric;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

module.exports = {
  formatFileSize,
  parseFileSize,
  formatDate,
  parseDate,
  getTimeAgo,
  formatDuration,
  deepClone,
  deepMerge,
  isObject,
  debounce,
  throttle,
  retry,
  sleep,
  generateId,
  validateCron,
  validateEmail,
  validateUrl,
  truncate,
  safeJsonParse,
  safeJsonStringify,
  getFileExtension,
  getFileNameWithoutExt,
  ensureDir,
  calculatePercentage,
  clamp,
  groupBy,
  unique,
  randomString
};
