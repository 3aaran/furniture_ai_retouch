// 该文件用于封装图片基础处理逻辑，统一支持本地存储和 OSS 存储的图片读取与处理结果保存。
import fs from 'fs';
import axios from 'axios';
import sharp from 'sharp';
import { getImageAccessUrl, saveBufferToStorage, urlToDiskPath } from './storageService.js';

const PROCESS_TYPE_MAP = {
  crop: 'CROP',
  remove_bg: 'REMOVE_BACKGROUND',
  compress: 'COMPRESS',
  convert: 'FORMAT_CONVERT'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeFormat(format = 'png') {
  const value = String(format || 'png').toLowerCase();
  return ['png', 'jpg', 'jpeg', 'webp'].includes(value) ? (value === 'jpeg' ? 'jpg' : value) : 'png';
}

function normalizeOperation(operation = '') {
  const value = String(operation || '').trim().toLowerCase();
  if (PROCESS_TYPE_MAP[value]) return value;
  throw new Error('图片处理方式不支持');
}

async function readImageBuffer(image) {
  const accessUrl = getImageAccessUrl(image);
  if (!accessUrl) throw new Error('图片地址不存在');

  if (/^https?:\/\//i.test(accessUrl)) {
    const response = await axios.get(accessUrl, { responseType: 'arraybuffer', timeout: 120000 });
    return Buffer.from(response.data);
  }

  const filePath = urlToDiskPath(accessUrl);
  if (!filePath || !fs.existsSync(filePath)) throw new Error('图片文件不存在');
  return fs.readFileSync(filePath);
}

function outputPipeline(pipeline, format, quality) {
  const q = clamp(quality || 90, 30, 100);
  if (format === 'jpg') return pipeline.jpeg({ quality: q, mozjpeg: true });
  if (format === 'webp') return pipeline.webp({ quality: q });
  return pipeline.png();
}

export function processTypeForOperation(operation) {
  return PROCESS_TYPE_MAP[normalizeOperation(operation)];
}

export async function processStoredImage(image, payload = {}, context = {}) {
  const operation = normalizeOperation(payload.operation);
  let format = normalizeFormat(payload.format);
  let source = sharp(await readImageBuffer(image), { failOn: 'none' }).rotate();
  const meta = await source.metadata();
  const width = Number(meta.width || 0);
  const height = Number(meta.height || 0);
  const quality = Number(payload.quality || 90);

  if (operation === 'crop') {
    const left = clamp(payload.cropX, 0, Math.max(0, width - 1));
    const top = clamp(payload.cropY, 0, Math.max(0, height - 1));
    const cropWidth = clamp(payload.cropWidth, 1, Math.max(1, width - left));
    const cropHeight = clamp(payload.cropHeight, 1, Math.max(1, height - top));
    source = source.extract({
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    });
  }

  if (operation === 'compress') {
    const maxWidth = clamp(payload.maxWidth || 1600, 200, 4096);
    source = source.resize({ width: Math.round(maxWidth), withoutEnlargement: true });
  }

  if (operation === 'remove_bg') {
    format = 'png';
    source = source.ensureAlpha();
  }

  const buffer = await outputPipeline(source, format, quality).toBuffer();
  const saved = await saveBufferToStorage(buffer, {
    merchantId: context.merchantId ?? image.merchant_id ?? null,
    userId: context.userId ?? image.user_id ?? null,
    kind: 'generated',
    op: `process-${operation}`,
    ext: format
  });

  return {
    ...saved,
    operation,
    processType: processTypeForOperation(operation),
    format
  };
}
