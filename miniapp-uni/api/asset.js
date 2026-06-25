import { del, get, patch, post, uploadFile } from '../utils/request.js';

export function getImages(params = {}, options = {}) {
  return get('/api/images', params, options);
}

export function getRecentImages(params = {}, options = {}) {
  return get('/api/images/recent', params, options);
}

export function getResources(params = {}, options = {}) {
  return get('/api/resources', params, options);
}

export function getResourceDetail(resourceId, options = {}) {
  return get(`/api/resources/${encodeURIComponent(resourceId)}/detail`, {}, options);
}

export function getCategoryTree(params = {}, options = {}) {
  return get('/api/categories/tree', params, options);
}

export function getMerchantResources(params = {}, options = {}) {
  return get('/api/merchant/resources', params, options);
}

export function createMerchantResource(payload = {}) {
  return post('/api/merchant/resources', payload, { loadingText: '创建资源' });
}

export function uploadMerchantResource(filePath, formData = {}) {
  return uploadFile({
    url: '/api/merchant/resources',
    filePath,
    name: 'image',
    formData,
    loadingText: '上传资源'
  });
}

export function updateMerchantResource(resourceId, payload = {}) {
  return patch(`/api/merchant/resources/${encodeURIComponent(resourceId)}`, payload, { loadingText: '保存中' });
}

export function deleteMerchantResource(resourceId) {
  return del(`/api/merchant/resources/${encodeURIComponent(resourceId)}`, {}, { loadingText: '删除中' });
}
