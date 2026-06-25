const MODE = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production'
  ? 'production'
  : 'development';

export const API_MOCK_KEY = 'miniapp_api_use_mock';
export const API_BASE_URL_KEY = 'miniapp_api_base_url';

const ENV_CONFIG = {
  development: {
    baseURL: 'http://127.0.0.1:3001',
    useMock: false
  },
  production: {
    baseURL: 'https://api.example.com',
    useMock: false
  }
};

export const APP_ENV = MODE;
export const API_BASE_URL = ENV_CONFIG[MODE].baseURL;

// 页面仍可走 mock 数据。后续接真实接口时可把 useMock 改为 false，或通过 setMockEnabled 动态切换。
export const USE_MOCK = ENV_CONFIG[MODE].useMock;

export function isMockEnabled() {
  const saved = uni.getStorageSync(API_MOCK_KEY);
  if (saved === true || saved === 'true') return true;
  if (saved === false || saved === 'false') return false;
  return USE_MOCK;
}

export function setMockEnabled(value) {
  uni.setStorageSync(API_MOCK_KEY, !!value);
}

export function getApiBaseUrl() {
  const saved = uni.getStorageSync(API_BASE_URL_KEY);
  return String(saved || API_BASE_URL).replace(/\/$/, '');
}

export function setApiBaseUrl(url) {
  const value = String(url || '').trim().replace(/\/$/, '');
  if (value) uni.setStorageSync(API_BASE_URL_KEY, value);
  else uni.removeStorageSync(API_BASE_URL_KEY);
}

export default {
  env: APP_ENV,
  baseURL: API_BASE_URL,
  useMock: USE_MOCK,
  isMockEnabled,
  setMockEnabled,
  getApiBaseUrl,
  setApiBaseUrl
};
