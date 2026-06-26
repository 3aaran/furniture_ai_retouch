export const APP_ENV = 'production';
export const API_BASE_URL = 'https://www.xungang.xin';
export const FILE_BASE_URL = 'https://www.xungang.xin';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getFileBaseUrl() {
  return FILE_BASE_URL;
}

export default {
  env: APP_ENV,
  baseURL: API_BASE_URL,
  fileBaseURL: FILE_BASE_URL,
  getApiBaseUrl,
  getFileBaseUrl
};
