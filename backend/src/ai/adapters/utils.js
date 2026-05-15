import fs from 'fs';
import axios from 'axios';
import { saveBufferToStorage, downloadImageToStorage } from '../../services/storageService.js';

export function outputUrl(file) { return `/outputs/${file}`; }

export function saveBuffer(buffer, op = 'ai-result', ext = 'png', context = {}) {
  return saveBufferToStorage(buffer, {
    merchantId: context.merchantId,
    userId: context.userId,
    kind: context.kind || 'generated',
    op,
    ext
  }).url;
}

export async function downloadImage(url, op = 'ai-result', context = {}) {
  return (await downloadImageToStorage(url, {
    merchantId: context.merchantId,
    userId: context.userId,
    kind: context.kind || 'generated',
    op
  })).url;
}

export function joinUrl(base = '', apiPath = '') {
  if (!apiPath) return String(base || '');
  return `${String(base).replace(/\/$/, '')}/${String(apiPath).replace(/^\//, '')}`;
}

export function pickImage(data) {
  return data?.imageUrl || data?.outputUrl || data?.url || data?.resultUrl ||
    data?.data?.imageUrl || data?.data?.url || data?.data?.outputUrl ||
    data?.data?.[0]?.url || data?.data?.[0]?.imageUrl || data?.data?.[0]?.outputUrl ||
    data?.output?.url || data?.output?.image_url || data?.output?.imageUrl ||
    data?.output?.results?.find?.(x => x.url)?.url ||
    data?.images?.[0]?.url || data?.results?.[0]?.url || null;
}

export function pickBase64(data) {
  return data?.imageBase64 || data?.b64_json || data?.data?.imageBase64 ||
    data?.images?.[0]?.b64_json || data?.output?.image_base64 || null;
}

export function buildCommonPayload({ provider, modelName, featureKey, prompt, imagePath, referenceImagePaths = [], resolution, ratio }) {
  return {
    provider,
    model: modelName,
    featureKey,
    prompt,
    image: fs.readFileSync(imagePath).toString('base64'),
    referenceImages: referenceImagePaths.filter(Boolean).map(p => fs.readFileSync(p).toString('base64')),
    resolution,
    ratio
  };
}
