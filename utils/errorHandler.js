/**
 * 错误处理工具
 * 统一管理应用错误
 */

const { ERROR_CODES } = require('../config/constants');
const logger = require('./logger');

/**
 * 自定义应用错误类
 */
class AppError extends Error {
  constructor(errorCode, details = {}, originalError = null) {
    const errorInfo = ERROR_CODES[errorCode] || ERROR_CODES.UNKNOWN_ERROR;
    
    super(errorInfo.message);
    
    this.name = 'AppError';
    this.code = errorInfo.code;
    this.errorCode = errorCode;
    this.details = details;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    
    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      errorCode: this.errorCode,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * 转换为用户友好的消息
   */
  toUserMessage() {
    let message = this.message;
    
    // 如果有详细信息，追加到消息中
    if (this.details && Object.keys(this.details).length > 0) {
      const detailStr = Object.entries(this.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      message += ` (${detailStr})`;
    }
    
    return message;
  }
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  constructor() {
    this.errorListeners = [];
  }

  /**
   * 处理错误
   */
  handle(error, context = {}) {
    // 记录日志
    if (error instanceof AppError) {
      logger.error(error.message, error.originalError, {
        errorCode: error.errorCode,
        code: error.code,
        ...error.details,
        ...context
      });
    } else {
      logger.error('未处理的错误', error, context);
    }

    // 通知所有监听器
    this.notifyListeners(error, context);

    return error;
  }

  /**
   * 包装异步函数，自动处理错误
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }

  /**
   * 创建应用错误
   */
  createError(errorCode, details = {}, originalError = null) {
    return new AppError(errorCode, details, originalError);
  }

  /**
   * 添加错误监听器
   */
  addListener(listener) {
    if (typeof listener === 'function') {
      this.errorListeners.push(listener);
    }
  }

  /**
   * 移除错误监听器
   */
  removeListener(listener) {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  notifyListeners(error, context) {
    for (const listener of this.errorListeners) {
      try {
        listener(error, context);
      } catch (err) {
        logger.error('错误监听器执行失败', err);
      }
    }
  }

  /**
   * 判断错误类型
   */
  isAppError(error) {
    return error instanceof AppError;
  }

  /**
   * 判断是否为数据库错误
   */
  isDatabaseError(error) {
    if (error instanceof AppError) {
      return error.code >= 1000 && error.code < 2000;
    }
    return false;
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(error) {
    if (error instanceof AppError) {
      return error.code >= 5000 && error.code < 6000;
    }
    return false;
  }

  /**
   * 从原始错误创建应用错误
   */
  fromError(originalError, context = {}) {
    // 根据错误类型自动判断错误代码
    let errorCode = 'UNKNOWN_ERROR';
    let details = { ...context };

    if (originalError.code === 'ENOENT') {
      errorCode = 'FILE_NOT_FOUND';
      details.path = originalError.path;
    } else if (originalError.code === 'EACCES') {
      errorCode = 'FILE_ACCESS_DENIED';
      details.path = originalError.path;
    } else if (originalError.code === 'ENOSPC') {
      errorCode = 'DISK_SPACE_INSUFFICIENT';
    } else if (originalError.code === 'ETIMEDOUT') {
      errorCode = 'NETWORK_TIMEOUT';
    } else if (originalError.message?.includes('database')) {
      errorCode = 'DB_QUERY_FAILED';
    }

    return new AppError(errorCode, details, originalError);
  }

  /**
   * 处理Promise拒绝
   */
  handleRejection(reason, promise) {
    const error = reason instanceof Error 
      ? this.fromError(reason, { promise: promise.toString() })
      : this.createError('UNKNOWN_ERROR', { reason });

    this.handle(error, { type: 'unhandledRejection' });
  }

  /**
   * 处理未捕获异常
   */
  handleUncaughtException(error) {
    const appError = error instanceof AppError 
      ? error 
      : this.fromError(error);

    this.handle(appError, { type: 'uncaughtException' });
  }
}

// 创建单例
const errorHandler = new ErrorHandler();

// 导出
module.exports = {
  AppError,
  errorHandler,
  ERROR_CODES
};
