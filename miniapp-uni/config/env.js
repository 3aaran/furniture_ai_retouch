const MODE = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production'
  ? 'production'
  : 'development';

const ENV_CONFIG = {
  development: {
    baseURL: 'http://127.0.0.1:3001',
    useMock: true
  },
  production: {
    baseURL: 'https://api.example.com',
    useMock: true
  }
};

export const APP_ENV = MODE;
export const API_BASE_URL = ENV_CONFIG[MODE].baseURL;

// 第二阶段页面仍走 mock 数据。后续接真实接口时可先把 useMock 改为 false。
export const USE_MOCK = ENV_CONFIG[MODE].useMock;

export default {
  env: APP_ENV,
  baseURL: API_BASE_URL,
  useMock: USE_MOCK
};
