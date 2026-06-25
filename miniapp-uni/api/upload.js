import { del, get, post, uploadFile } from '../utils/request.js';

export function uploadImage(filePath, formData = {}) {
  return uploadFile({
    url: '/api/images/upload',
    filePath,
    name: 'image',
    formData,
    loadingText: '上传图片'
  });
}

export function uploadFurnitureImage(filePath, formData = {}) {
  return uploadImage(filePath, formData);
}

export function processImage(imageId, payload = {}) {
  return post(`/api/images/${encodeURIComponent(imageId)}/process`, payload, { loadingText: '处理中' });
}

export function getImageDetail(imageId, options = {}) {
  return get(`/api/images/${encodeURIComponent(imageId)}/detail`, {}, options);
}

export function getImageRichDetail(imageId, options = {}) {
  return get(`/api/images/${encodeURIComponent(imageId)}/detail-rich`, {}, options);
}

export function getImageSource(imageId, options = {}) {
  return get(`/api/images/${encodeURIComponent(imageId)}/source`, {}, options);
}

export function deleteImage(imageId) {
  return del(`/api/images/${encodeURIComponent(imageId)}`, {}, { loadingText: '删除中' });
}
