import { post, clearToken, setToken } from '../utils/request.js';

export function loginByPassword(payload) {
  return post('/api/auth/login', payload, { auth: false, loadingText: '登录中' }).then((data) => {
    if (data?.token) setToken(data.token);
    return data;
  });
}

export function sendSmsCode({ phone, scene = 'LOGIN' }) {
  return post('/api/sms/send-code', { phone, scene }, { auth: false, loadingText: '发送中' });
}

export function verifySmsCode(payload) {
  return post('/api/sms/verify-code', payload, { auth: false, loadingText: '验证中' });
}

export function loginByCode(payload) {
  return post('/api/auth/code-login', payload, { auth: false, loadingText: '登录中' }).then((data) => {
    if (data?.token) setToken(data.token);
    return data;
  });
}

export function submitMerchantApplication(payload) {
  return post('/api/applications', payload, { auth: false, loadingText: '提交中' });
}

export function logoutLocal() {
  clearToken();
}
