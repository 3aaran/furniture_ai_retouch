export const API_MOCK_KEY = 'miniapp_api_use_mock';
export const API_BASE_URL_KEY = 'miniapp_api_base_url';

export const APP_ENV = 'production';
export const API_BASE_URL = 'https://www.xungang.xin';
export const FILE_BASE_URL = 'https://www.xungang.xin';
export const USE_MOCK = false;

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
  return API_BASE_URL;
}

export function setApiBaseUrl() {
  uni.removeStorageSync(API_BASE_URL_KEY);
}

export function getFileBaseUrl() {
  return FILE_BASE_URL;
}

export default {
  env: APP_ENV,
  baseURL: API_BASE_URL,
  fileBaseURL: FILE_BASE_URL,
  useMock: USE_MOCK,
  isMockEnabled,
  setMockEnabled,
  getApiBaseUrl,
  setApiBaseUrl,
  getFileBaseUrl
};
