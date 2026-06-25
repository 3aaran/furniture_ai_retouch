import { API_BASE_URL } from '../config/env.js';

export const AUTH_TOKEN_KEY = 'miniapp_auth_token';
export const MOCK_TOKEN_KEY = 'miniapp_mock_token';

let isRedirectingLogin = false;

function normalizePath(url = '') {
  const text = String(url || '').trim();
  if (/^https?:\/\//i.test(text)) return text;
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = text.startsWith('/') ? text : `/${text}`;
  return `${base}${path}`;
}

export function getToken() {
  return uni.getStorageSync(AUTH_TOKEN_KEY) || uni.getStorageSync(MOCK_TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) uni.setStorageSync(AUTH_TOKEN_KEY, token);
  else uni.removeStorageSync(AUTH_TOKEN_KEY);
}

export function clearToken() {
  uni.removeStorageSync(AUTH_TOKEN_KEY);
  uni.removeStorageSync(MOCK_TOKEN_KEY);
  uni.removeStorageSync('miniapp_mock_user');
}

function buildHeaders(header = {}, auth = true, includeJsonContentType = true) {
  const headers = {
    ...header
  };
  if (includeJsonContentType && !headers['content-type'] && !headers['Content-Type']) {
    headers['content-type'] = 'application/json';
  }
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getErrorMessage(data, fallback = '请求失败') {
  if (typeof data === 'string' && data) return data;
  return data?.message || data?.error || data?.msg || fallback;
}

function showError(message) {
  if (!message) return;
  uni.showToast({
    title: String(message).slice(0, 60),
    icon: 'none'
  });
}

function redirectToLogin() {
  if (isRedirectingLogin) return;
  isRedirectingLogin = true;
  setTimeout(() => {
    isRedirectingLogin = false;
  }, 1200);
  uni.navigateTo({
    url: '/pages/login/login',
    fail() {
      uni.switchTab({ url: '/pages/me/me' });
    }
  });
}

function handleUnauthorized(message = '登录已过期，请重新登录') {
  clearToken();
  showError(message);
  redirectToLogin();
}

function parseUploadResponse(data) {
  if (!data) return {};
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (error) {
    return { message: data };
  }
}

function finishLoading(showLoading) {
  if (showLoading) uni.hideLoading();
}

export function request(options = {}) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    auth = true,
    showLoading = true,
    loadingText = '加载中',
    showErrorToast = true,
    timeout = 30000
  } = options;

  if (!url) return Promise.reject(new Error('请求地址不能为空'));
  if (showLoading) uni.showLoading({ title: loadingText, mask: true });

  return new Promise((resolve, reject) => {
    uni.request({
      url: normalizePath(url),
      method,
      data,
      timeout,
      header: buildHeaders(header, auth, true),
      success(response) {
        const { statusCode, data: body } = response;
        if (statusCode >= 200 && statusCode < 300) {
          resolve(body);
          return;
        }

        const message = getErrorMessage(body, `请求失败（${statusCode}）`);
        const error = new Error(message);
        error.statusCode = statusCode;
        error.data = body;

        if (statusCode === 401) {
          handleUnauthorized(message);
        } else if (showErrorToast) {
          showError(message);
        }
        reject(error);
      },
      fail(error) {
        const message = error?.errMsg || '网络连接失败';
        if (showErrorToast) showError(message);
        reject(new Error(message));
      },
      complete() {
        finishLoading(showLoading);
      }
    });
  });
}

export function uploadFile(options = {}) {
  const {
    url,
    filePath,
    name = 'file',
    formData = {},
    header = {},
    auth = true,
    showLoading = true,
    loadingText = '上传中',
    showErrorToast = true
  } = options;

  if (!url) return Promise.reject(new Error('上传地址不能为空'));
  if (!filePath) return Promise.reject(new Error('上传文件不能为空'));
  if (showLoading) uni.showLoading({ title: loadingText, mask: true });

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: normalizePath(url),
      filePath,
      name,
      formData,
      header: buildHeaders(header, auth, false),
      success(response) {
        const statusCode = Number(response.statusCode || 0);
        const body = parseUploadResponse(response.data);
        if (statusCode >= 200 && statusCode < 300) {
          resolve(body);
          return;
        }

        const message = getErrorMessage(body, `上传失败（${statusCode}）`);
        const error = new Error(message);
        error.statusCode = statusCode;
        error.data = body;

        if (statusCode === 401) {
          handleUnauthorized(message);
        } else if (showErrorToast) {
          showError(message);
        }
        reject(error);
      },
      fail(error) {
        const message = error?.errMsg || '上传失败';
        if (showErrorToast) showError(message);
        reject(new Error(message));
      },
      complete() {
        finishLoading(showLoading);
      }
    });
  });
}

export function withQuery(url, params = {}) {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return pairs.length ? `${url}${url.includes('?') ? '&' : '?'}${pairs.join('&')}` : url;
}

export const get = (url, params = {}, options = {}) => request({ ...options, url: withQuery(url, params), method: 'GET' });
export const post = (url, data = {}, options = {}) => request({ ...options, url, method: 'POST', data });
export const put = (url, data = {}, options = {}) => request({ ...options, url, method: 'PUT', data });
export const patch = (url, data = {}, options = {}) => request({ ...options, url, method: 'PATCH', data });
export const del = (url, data = {}, options = {}) => request({ ...options, url, method: 'DELETE', data });

export default request;
