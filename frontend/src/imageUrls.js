export function assetUrlFromBase(url, { api = '', assetBase = '' } = {}) {
  if (!url) return '';
  const text = String(url);
  if (text.startsWith('http') || text.startsWith('data:') || text.startsWith('blob:')) return text;
  if (/^\/(files|uploads|outputs)\//.test(text)) return `${api}/api${text}`;
  if (text.startsWith('/')) return `${assetBase}${text}`;
  return `${assetBase}/${text.replace(/^\/+/, '')}`;
}

export function imageViewUrlFor(image, { api = '', assetBase = '', token = '' } = {}) {
  if (typeof image === 'string') {
    if (!image) return '';
    if (image.startsWith('http') || image.startsWith('data:')) return image;
    if (image.startsWith('/')) return assetUrlFromBase(image, { api, assetBase });
    return `${api}/api/images/${image}/view?token=${encodeURIComponent(token || '')}`;
  }
  const url = image?.url || image?.imageUrl || image?.resultImage?.url || '';
  if (url) return assetUrlFromBase(url, { api, assetBase });
  const id = image?.resultImage?.id || image?.imageId || image?.sourceId || (image?.itemType === 'task' ? image?.originImage?.id : image?.id);
  return id ? `${api}/api/images/${id}/view?token=${encodeURIComponent(token || '')}` : '';
}

export function thumbnailUrl(image) {
  if (!image || typeof image === 'string') return '';
  const direct = image.thumbUrl || image.thumb_url || image.thumbnailUrl || image.thumbnail_url || image.resultImage?.thumbUrl || image.resultImage?.thumb_url || '';
  if (/(^|\/)api\/images\/[^/]+\/thumb(?:[?#]|$)/.test(String(direct))) return '';
  return direct || '';
}

export function imageListUrl(image, options = {}) {
  const thumb = thumbnailUrl(image);
  if (thumb) return assetUrlFromBase(thumb, options);
  return imageViewUrlFor(image, options);
}

export function imageFallbackUrl(image, options = {}) {
  return imageViewUrlFor(image, options);
}

export function imageDownloadUrl(image, options = {}) {
  if (!image) return '';
  const direct = typeof image === 'string' ? '' : (image.downloadUrl || image.download_url || image.resultImage?.downloadUrl || image.resultImage?.download_url || '');
  if (direct) return assetUrlFromBase(direct, options);
  return imageViewUrlFor(image, options);
}
