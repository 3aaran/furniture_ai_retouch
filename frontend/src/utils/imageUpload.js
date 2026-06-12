const MAX_IMAGE_SIDE = 2048;
const COMPRESSED_QUALITY = 0.8;

function fileExtension(type = '', name = '') {
  if (/webp/i.test(type)) return 'webp';
  if (/jpe?g/i.test(type)) return 'jpg';
  if (/png/i.test(type)) return 'png';
  const ext = String(name || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext) : 'jpg';
}

function canvasBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function loadImageFromObjectUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片读取失败'));
    img.src = url;
  });
}

export async function compressImageForUpload(file) {
  if (!file || !String(file.type || '').startsWith('image/')) return file;
  const previewUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageFromObjectUrl(previewUrl);
    const longest = Math.max(img.naturalWidth || img.width || 0, img.naturalHeight || img.height || 0);
    if (!longest) return file;

    const scale = Math.min(1, MAX_IMAGE_SIDE / longest);
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const ext = fileExtension(file.type, file.name);
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const blob = await canvasBlob(canvas, mime, mime === 'image/png' ? undefined : COMPRESSED_QUALITY);
    if (!blob) return file;
    const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export function createLocalPreviewUrl(file) {
  return file ? URL.createObjectURL(file) : '';
}

export function revokeLocalPreviewUrl(url) {
  if (url && String(url).startsWith('blob:')) URL.revokeObjectURL(url);
}
