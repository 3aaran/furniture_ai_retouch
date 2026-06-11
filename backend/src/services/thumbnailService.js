import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

import { getImageAccessUrl, publicUrlFromStorageKey, saveBufferToStorage, storageKeyFromUrl, urlToDiskPath } from './storageService.js';

const THUMB_WIDTH = Number(process.env.THUMBNAIL_WIDTH || 360);
const THUMB_QUALITY = Number(process.env.THUMBNAIL_QUALITY || 72);

function normalizeStorageKey(image = {}) {
  return image.storage_key || image.storageKey || storageKeyFromUrl(image.url || image.imageUrl || '');
}

export function visibleThumbnailUrl(image = {}) {
  return image.thumb_url || image.thumbUrl || image.url || image.imageUrl || '';
}

export function thumbnailStorageKeyFromImage(image = {}) {
  const key = normalizeStorageKey(image);
  if (!key) return '';
  const parsed = path.posix.parse(key);
  const parts = parsed.dir.split('/').filter(Boolean);
  if (parts[0] === 'images') parts.splice(1, 0, 'thumbs');
  else parts.unshift('images', 'thumbs');
  return path.posix.join(...parts, `${parsed.name}-thumb.webp`);
}

async function readImageBuffer(image = {}) {
  const accessUrl = getImageAccessUrl(image);
  if (!accessUrl) throw new Error('image url is empty');

  if (/^https?:\/\//i.test(accessUrl)) {
    const response = await axios.get(accessUrl, { responseType: 'arraybuffer', timeout: 120000 });
    return Buffer.from(response.data || []);
  }

  const filePath = urlToDiskPath(accessUrl);
  if (!filePath || !fs.existsSync(filePath)) throw new Error('image file does not exist');
  return fs.readFileSync(filePath);
}

export async function createImageThumbnail(image = {}, context = {}) {
  const source = sharp(await readImageBuffer(image), { failOn: 'none' }).rotate();
  const buffer = await source
    .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  return saveBufferToStorage(buffer, {
    merchantId: context.merchantId ?? image.merchant_id ?? image.merchantId ?? null,
    userId: context.userId ?? image.user_id ?? image.userId ?? null,
    kind: 'thumb',
    op: 'thumb',
    ext: 'webp'
  });
}

export async function generateThumbnailBestEffort(db, image = {}, context = {}) {
  if (!image?.id || !image?.url) return '';
  try {
    const saved = await createImageThumbnail(image, context);
    const thumbUrl = saved?.url || publicUrlFromStorageKey(saved?.storageKey || '');
    if (thumbUrl) {
      await db.query('UPDATE images SET thumb_url=? WHERE id=?', [thumbUrl, image.id]);
    }
    return thumbUrl;
  } catch (err) {
    console.warn('[thumbnail] generate failed', image.id, err?.name || err?.code || 'Error', err?.message || err);
    return '';
  }
}
