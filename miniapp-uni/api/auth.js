import { clearToken, post, setAuthQuota, setAuthUser, setToken } from '../utils/request.js';

export function getAuthTokenFromResponse(response = {}) {
  return response.token || response.accessToken || response.data?.token || response.data?.accessToken || '';
}

function getAuthUserFromResponse(response = {}) {
  return response.user || response.data?.user || response.profile || response.data?.profile || null;
}

function getAuthQuotaFromResponse(response = {}, user = null) {
  return response.quota ?? response.data?.quota ?? response.quotaSummary ?? response.data?.quotaSummary ?? user?.quota ?? null;
}

function saveLoginToken(response) {
  const token = getAuthTokenFromResponse(response || {});
  const user = getAuthUserFromResponse(response || {});
  const quota = getAuthQuotaFromResponse(response || {}, user);

  if (!token) {
    console.warn('[miniapp-auth] 登录接口返回中未找到 token/accessToken/data.token/data.accessToken', response);
    return response;
  }

  setToken(token);
  setAuthUser(user);
  setAuthQuota(quota);
  return response;
}

export function loginByPassword(payload) {
  return post('/api/auth/login', payload, { auth: false, loadingText: '登录中' }).then(saveLoginToken);
}

export function sendSmsCode({ phone, scene = 'LOGIN' }) {
  return post('/api/sms/send-code', { phone, scene }, { auth: false, loadingText: '发送中' });
}

export function verifySmsCode(payload) {
  return post('/api/sms/verify-code', payload, { auth: false, loadingText: '验证中' });
}

export function loginByCode(payload) {
  return post('/api/auth/code-login', payload, { auth: false, loadingText: '登录中' }).then(saveLoginToken);
}

// 后端保留的旧登录验证码入口；小程序默认优先使用 /api/sms/send-code。
export function sendAuthLoginCode(payload) {
  return post('/api/auth/send-code', payload, { auth: false, loadingText: '发送中' });
}

export function submitMerchantApplication(payload) {
  return post('/api/applications', payload, { auth: false, loadingText: '提交中' });
}

export function logoutLocal() {
  clearToken();
}
