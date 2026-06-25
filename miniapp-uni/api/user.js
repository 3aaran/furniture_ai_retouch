import { get, patch, post, uploadFile } from '../utils/request.js';

export function getCurrentUser(options = {}) {
  return get('/api/me', {}, options);
}

export function getStorageSummary(options = {}) {
  return get('/api/storage/me', {}, options);
}

export function updateProfile(payload) {
  return patch('/api/me/profile', payload, { loadingText: '保存中' });
}

export function uploadAvatar(filePath, formData = {}) {
  return uploadFile({
    url: '/api/me/avatar',
    filePath,
    name: 'avatar',
    formData,
    loadingText: '上传头像'
  });
}

export function updatePassword(payload) {
  return patch('/api/me/password', payload, { loadingText: '修改中' });
}

export function sendPasswordResetCode() {
  return post('/api/me/password/reset-code', {}, { loadingText: '发送中' });
}

export function resetPassword(payload) {
  return patch('/api/me/password/reset', payload, { loadingText: '重置中' });
}

export function getQuotaLogs(params = {}, options = {}) {
  return get('/api/merchant/quota-logs', params, options);
}
