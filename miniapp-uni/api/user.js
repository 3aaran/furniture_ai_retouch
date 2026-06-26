import { del, get, patch, post, uploadFile } from '../utils/request.js';

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

export function getAnnouncements(options = {}) {
  return get('/api/announcements', {}, options);
}

export function markAnnouncementRead(id) {
  return post(`/api/announcements/${encodeURIComponent(id)}/read`, {}, { showLoading: false });
}

export function submitFeedback(payload) {
  return post('/api/feedbacks', payload, { loadingText: '提交中' });
}

export function getPromotion(params = {}, options = {}) {
  return get('/api/merchant/promotion', params, options);
}

export function getMerchantUsers(params = {}, options = {}) {
  return get('/api/merchant/users', params, options);
}

export function createMerchantUser(payload) {
  return post('/api/merchant/users', payload, { loadingText: '创建用户' });
}

export function updateMerchantUser(userId, payload) {
  return patch(`/api/merchant/users/${encodeURIComponent(userId)}`, payload, { loadingText: '保存用户' });
}

export function updateMerchantUserStatus(userId, status) {
  return patch(`/api/merchant/users/${encodeURIComponent(userId)}/status`, { status }, { loadingText: '更新状态' });
}

export function adjustMerchantUserQuota(userId, amount) {
  return patch(`/api/merchant/users/${encodeURIComponent(userId)}/quota`, { amount }, { loadingText: '调整算力' });
}

export function deleteMerchantUser(userId) {
  return del(`/api/merchant/users/${encodeURIComponent(userId)}`, {}, { loadingText: '删除用户' });
}

export function getUserAvatar(userId, options = {}) {
  return get(`/api/users/${encodeURIComponent(userId)}/avatar`, {}, options);
}
