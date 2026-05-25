import fs from 'fs';
import path from 'path';
import axios from 'axios';
import OSS from 'ali-oss';
import { v4 as uuid } from 'uuid';

// STORAGE_DRIVER 控制图片存储方式：local 使用本机目录；oss/cos 需要接入对应上传 SDK 后启用。
export const STORAGE_PROVIDER = process.env.STORAGE_DRIVER || process.env.STORAGE_PROVIDER || 'local';
// LOCAL_STORAGE_ROOT 是本地存储根目录，线上若继续用本机磁盘也可挂载到独立数据盘。
export const STORAGE_ROOT = path.resolve(process.env.LOCAL_STORAGE_ROOT || process.env.STORAGE_ROOT || 'storage');
// LOCAL_PUBLIC_PATH 是本地文件对外访问前缀，默认由 Express/Nginx 暴露为 /files。
export const FILES_BASE_PATH = process.env.LOCAL_PUBLIC_PATH || process.env.FILES_BASE_PATH || '/files';
export const OSS_PUBLIC_BASE_URL = process.env.OSS_PUBLIC_BASE_URL || '';
export const COS_PUBLIC_BASE_URL = process.env.COS_PUBLIC_BASE_URL || '';
export const DEFAULT_USER_STORAGE_LIMIT_BYTES = Number(process.env.USER_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024 * 1024);
export const MIN_GENERATION_STORAGE_BYTES = Number(process.env.MIN_GENERATION_STORAGE_BYTES || 50 * 1024 * 1024);
const REMOTE_IMAGE_META_MAX_BYTES = Number(process.env.REMOTE_IMAGE_META_MAX_BYTES || 50 * 1024 * 1024);

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);
const KIND_DIR_MAP = {
  original: 'originals',
  reference: 'references',
  resource: 'resources',
  generated: 'generated',
  avatar: 'avatars',
  temp: 'temp',
  trash: 'trash'
};
let ossClient = null;

function isOssStorage() {
  return String(STORAGE_PROVIDER || '').toLowerCase() === 'oss';
}

function getOssClient() {
  if (!isOssStorage()) return null;
  if (ossClient) return ossClient;
  const region = process.env.OSS_REGION;
  const bucket = process.env.OSS_BUCKET;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  if (!region || !bucket || !accessKeyId || !accessKeySecret) {
    throw new Error('OSS 配置不完整：请设置 OSS_REGION、OSS_BUCKET、OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET');
  }
  ossClient = new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    secure: true,
    endpoint: process.env.OSS_ENDPOINT || undefined
  });
  return ossClient;
}

export function ensureStorageRoot() {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.mkdirSync(path.join(STORAGE_ROOT, 'images'), { recursive: true });
  fs.mkdirSync(path.join(STORAGE_ROOT, 'temp'), { recursive: true });
}

ensureStorageRoot();

export function storageTempDir() {
  const dir = path.join(STORAGE_ROOT, 'temp', 'multer');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function datePath(date = new Date()) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function normalizeKind(kind = 'original') {
  const k = String(kind || 'original').trim().toLowerCase();
  return KIND_DIR_MAP[k] ? k : 'generated';
}

function safeExtFromName(name = '', fallback = '.png') {
  const ext = path.extname(String(name || '')).toLowerCase();
  return IMAGE_EXTS.has(ext) ? ext : fallback;
}

export function normalizeUploadedFileName(name = '') {
  const raw = path.basename(String(name || '').replace(/\\/g, '/')).trim();
  if (!raw) return '';
  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    const cjkCount = value => (String(value).match(/[\u4e00-\u9fff]/g) || []).length;
    if (decoded && decoded !== raw && !decoded.includes('\uFFFD') && cjkCount(decoded) > cjkCount(raw)) {
      return decoded;
    }
  } catch {}
  return raw;
}

function safeSegment(v, fallback) {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function avatarStorageKey(userId) {
  return path.posix.join('images', 'avatars', safeSegment(userId, 'system'), 'avatar');
}

function readImageDimensionsFromBuffer(buffer) {
  try {
    if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
        }
        offset += 2 + length;
      }
    }
    if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buffer.toString('ascii', 12, 16);
      if (chunk === 'VP8X') {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3)
        };
      }
      if (chunk === 'VP8 ' && buffer.length >= 30) {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
      if (chunk === 'VP8L' && buffer.length >= 25) {
        const b0 = buffer[21], b1 = buffer[22], b2 = buffer[23], b3 = buffer[24];
        return {
          width: 1 + (((b1 & 0x3f) << 8) | b0),
          height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
        };
      }
    }
  } catch {}
  return { width: null, height: null };
}

function readImageDimensions(filePath = '') {
  try {
    return readImageDimensionsFromBuffer(fs.readFileSync(filePath));
  } catch {}
  return { width: null, height: null };
}

export function buildImageStorageKey({ merchantId, userId, kind = 'original', fileName }) {
  const k = normalizeKind(kind);
  const dirName = KIND_DIR_MAP[k];
  const m = safeSegment(merchantId, 'public');
  const u = safeSegment(userId, 'system');

  if (k === 'avatar') {
    return isOssStorage() ? avatarStorageKey(userId) : path.posix.join('images', 'avatars', u, fileName);
  }

  if (k === 'resource') {
    return path.posix.join('images', 'resources', m, datePath(), fileName);
  }

  if (k === 'temp' || k === 'trash') {
    return path.posix.join('images', dirName, m, u, datePath(), fileName);
  }

  return path.posix.join('images', 'merchants', m, 'users', u, dirName, datePath(), fileName);
}

export function publicUrlFromStorageKey(storageKey = '') {
  const clean = String(storageKey || '').replace(/^\/+/, '');
  if (isOssStorage()) {
    const base = OSS_PUBLIC_BASE_URL || `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`;
    return `${String(base).replace(/\/$/, '')}/${clean}`;
  }
  return `${FILES_BASE_PATH.replace(/\/$/, '')}/${clean}`;
}

export function getImageAccessUrl(imageOrUrl = '', { expires } = {}) {
  const url = typeof imageOrUrl === 'string' ? imageOrUrl : (imageOrUrl.url || '');
  const storageKey = typeof imageOrUrl === 'object' ? imageOrUrl.storage_key || imageOrUrl.storageKey || '' : '';
  if (isOssStorage()) {
    const key = storageKey || storageKeyFromUrl(url);
    if (!key) return url;
    return getOssClient().signatureUrl(key, {
      expires: Number(expires || process.env.OSS_SIGNED_URL_EXPIRES || 900)
    });
  }
  return url || publicUrlFromStorageKey(storageKey);
}

export function diskPathFromStorageKey(storageKey = '') {
  const clean = String(storageKey || '').replace(/^\/+/, '');
  return path.join(STORAGE_ROOT, clean);
}

export function urlToDiskPath(urlPath = '') {
  const raw = String(urlPath || '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const filesPrefix = `${FILES_BASE_PATH.replace(/\/$/, '')}/`;
  if (raw.startsWith(filesPrefix)) {
    return diskPathFromStorageKey(raw.slice(filesPrefix.length));
  }

  // 兼容旧数据：历史版本使用 /uploads 与 /outputs。
  if (raw.startsWith('/uploads/') || raw.startsWith('/outputs/')) {
    return path.resolve(`.${raw}`);
  }

  if (raw.startsWith('/storage/')) {
    return path.resolve(`.${raw}`);
  }

  return path.resolve(`.${raw.startsWith('/') ? raw : `/${raw}`}`);
}

export function getLocalFileMeta(urlPath = '') {
  const filePath = urlToDiskPath(urlPath);
  if (!filePath || /^https?:\/\//i.test(filePath) || !fs.existsSync(filePath)) {
    return {
      storageProvider: STORAGE_PROVIDER,
      storageKey: '',
      fileName: path.basename(String(urlPath || '')),
      sizeBytes: 0,
      mimeType: ''
    };
  }

  const filesPrefix = `${FILES_BASE_PATH.replace(/\/$/, '')}/`;
  let storageKey = '';
  if (String(urlPath).startsWith(filesPrefix)) {
    storageKey = String(urlPath).slice(filesPrefix.length).replace(/^\/+/, '');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp'
  };

  return {
    storageProvider: STORAGE_PROVIDER,
    storageKey,
    fileName: path.basename(filePath),
    sizeBytes: fs.statSync(filePath).size,
    mimeType: mimeMap[ext] || '',
    ...readImageDimensions(filePath)
  };
}

async function getRemoteImageMeta(url = '', storageKey = '') {
  const raw = String(url || '');
  const signed = storageKey ? getImageAccessUrl({ url: raw, storage_key: storageKey }) : raw;
  if (!signed || !/^https?:\/\//i.test(signed)) return {};
  const fetchMeta = target => axios.get(target, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: REMOTE_IMAGE_META_MAX_BYTES,
    maxBodyLength: REMOTE_IMAGE_META_MAX_BYTES
  });
  let response;
  try {
    response = await fetchMeta(signed);
  } catch (err) {
    if (!raw || raw === signed || !/^https?:\/\//i.test(raw)) throw err;
    response = await fetchMeta(raw);
  }
  const buffer = Buffer.from(response.data || []);
  return {
    sizeBytes: Number(response.headers?.['content-length'] || buffer.length || 0),
    mimeType: response.headers?.['content-type'] || '',
    ...readImageDimensionsFromBuffer(buffer)
  };
}

export async function getStoredFileMeta(imageOrUrl = '') {
  const url = typeof imageOrUrl === 'string' ? imageOrUrl : (imageOrUrl.url || '');
  const storageKey = typeof imageOrUrl === 'object' ? imageOrUrl.storage_key || imageOrUrl.storageKey || '' : '';
  if (isOssStorage()) {
    const key = storageKey || storageKeyFromUrl(url);
    const fileName = path.posix.basename(key || String(url || ''));
    if (!key) {
      const remote = /^https?:\/\//i.test(url) ? await getRemoteImageMeta(url).catch(() => ({})) : {};
      return { storageProvider: STORAGE_PROVIDER, storageKey: '', fileName, sizeBytes: Number(remote.sizeBytes || 0), mimeType: remote.mimeType || '', width: remote.width || null, height: remote.height || null };
    }
    try {
      const head = await getOssClient().head(key);
      const headers = head?.res?.headers || {};
      const remote = await getRemoteImageMeta(url, key).catch(() => ({}));
      return {
        storageProvider: STORAGE_PROVIDER,
        storageKey: key,
        fileName,
        sizeBytes: Number(headers['content-length'] || remote.sizeBytes || 0),
        mimeType: headers['content-type'] || remote.mimeType || '',
        width: remote.width || null,
        height: remote.height || null
      };
    } catch {
      const remote = await getRemoteImageMeta(url, key).catch(() => ({}));
      return { storageProvider: STORAGE_PROVIDER, storageKey: key, fileName, sizeBytes: Number(remote.sizeBytes || 0), mimeType: remote.mimeType || '', width: remote.width || null, height: remote.height || null };
    }
  }
  const local = getLocalFileMeta(url);
  if ((!local.width || !local.height || !local.sizeBytes) && /^https?:\/\//i.test(url)) {
    const remote = await getRemoteImageMeta(url, storageKey).catch(() => ({}));
    return {
      ...local,
      sizeBytes: Number(local.sizeBytes || remote.sizeBytes || 0),
      mimeType: local.mimeType || remote.mimeType || '',
      width: local.width || remote.width || null,
      height: local.height || remote.height || null
    };
  }
  return local;
}

export async function saveUploadedImage(file, { merchantId = null, userId = null, kind = 'original' } = {}) {
  if (!file) return null;

  const normalizedKind = normalizeKind(kind);
  const ext = safeExtFromName(normalizeUploadedFileName(file.originalname), '.png');
  const avatarMode = normalizedKind === 'avatar';
  const fileName = avatarMode ? (isOssStorage() ? 'avatar' : `avatar${ext}`) : `${Date.now()}-${normalizedKind}-${uuid()}${ext}`;
  const storageKey = buildImageStorageKey({ merchantId, userId, kind, fileName });
  const finalPath = diskPathFromStorageKey(storageKey);
  const sizeBytes = Number(file.size || fs.statSync(file.path).size || 0);
  const dimensions = readImageDimensions(file.path);

  if (isOssStorage()) {
    await getOssClient().put(storageKey, file.path, {
      mime: file.mimetype || undefined,
      headers: file.mimetype ? { 'Content-Type': file.mimetype } : undefined
    });
    fs.rmSync(file.path, { force: true });
    return {
      storageProvider: STORAGE_PROVIDER,
      storageKey,
      url: avatarMode ? `${publicUrlFromStorageKey(storageKey)}?v=${Date.now()}` : publicUrlFromStorageKey(storageKey),
      fileName,
      mimeType: file.mimetype || '',
      sizeBytes,
      ...dimensions
    };
  }

  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  if (avatarMode) {
    try {
      for (const name of fs.readdirSync(path.dirname(finalPath))) {
        if (name.startsWith('avatar') && path.join(path.dirname(finalPath), name) !== finalPath) {
          fs.rmSync(path.join(path.dirname(finalPath), name), { force: true });
        }
      }
      if (fs.existsSync(finalPath)) fs.rmSync(finalPath, { force: true });
    } catch {}
  }
  fs.renameSync(file.path, finalPath);

  return {
    storageProvider: STORAGE_PROVIDER,
    storageKey,
    url: avatarMode ? `${publicUrlFromStorageKey(storageKey)}?v=${Date.now()}` : publicUrlFromStorageKey(storageKey),
    fileName,
    mimeType: file.mimetype || '',
    sizeBytes,
    ...readImageDimensions(finalPath)
  };
}

export async function saveBufferToStorage(buffer, { merchantId = null, userId = null, kind = 'generated', op = 'ai-result', ext = 'png' } = {}) {
  const safeExt = String(ext || 'png').replace(/^\./, '').toLowerCase() || 'png';
  const cleanOp = safeSegment(op, 'ai-result');
  const fileName = `${Date.now()}-${cleanOp}-${uuid()}.${safeExt}`;
  const storageKey = buildImageStorageKey({ merchantId, userId, kind, fileName });
  const finalPath = diskPathFromStorageKey(storageKey);
  const mimeType = `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`;
  const sizeBytes = Number(buffer?.length || 0);
  const dimensions = readImageDimensionsFromBuffer(buffer || Buffer.alloc(0));

  if (isOssStorage()) {
    await getOssClient().put(storageKey, buffer, {
      mime: mimeType,
      headers: { 'Content-Type': mimeType }
    });
    return {
      storageProvider: STORAGE_PROVIDER,
      storageKey,
      url: publicUrlFromStorageKey(storageKey),
      fileName,
      mimeType,
      sizeBytes,
      ...dimensions
    };
  }

  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(finalPath, buffer);

  return {
    storageProvider: STORAGE_PROVIDER,
    storageKey,
    url: publicUrlFromStorageKey(storageKey),
    fileName,
    mimeType,
    sizeBytes: Number(buffer?.length || fs.statSync(finalPath).size || 0),
    ...readImageDimensions(finalPath)
  };
}

export async function downloadImageToStorage(url, { merchantId = null, userId = null, kind = 'generated', op = 'ai-result' } = {}) {
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 180000 });
  return saveBufferToStorage(Buffer.from(r.data), { merchantId, userId, kind, op, ext: 'png' });
}


export function formatBytes(bytes = 0) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n}B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)}MB`;
  return `${(n / 1024 ** 3).toFixed(2)}GB`;
}

export async function getUserStorageSummary(conn, userId) {
  const [[u]] = await conn.query(
    'SELECT id, storage_limit_bytes, storage_used_bytes FROM users WHERE id=? LIMIT 1',
    [userId]
  );
  if (!u) throw new Error('用户不存在');

  const limitBytes = Number(u.storage_limit_bytes || DEFAULT_USER_STORAGE_LIMIT_BYTES);
  const usedBytes = Number(u.storage_used_bytes || 0);
  const remainingBytes = Math.max(0, limitBytes - usedBytes);

  return {
    userId: u.id,
    limitBytes,
    usedBytes,
    remainingBytes,
    limitText: formatBytes(limitBytes),
    usedText: formatBytes(usedBytes),
    remainingText: formatBytes(remainingBytes),
    percent: limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0
  };
}

export async function refreshUserStorageUsage(conn, userId) {
  const [[sum]] = await conn.query(
    'SELECT IFNULL(SUM(size_bytes),0) total FROM images WHERE user_id=? AND deleted_at IS NULL',
    [userId]
  );
  const total = Number(sum?.total || 0);
  await conn.query('UPDATE users SET storage_used_bytes=? WHERE id=?', [total, userId]);
  return getUserStorageSummary(conn, userId);
}

export async function assertUserStorageAvailable(conn, userId, incomingBytes = 0, options = {}) {
  const incoming = Math.max(0, Number(incomingBytes || 0));
  const label = options.label || '图片文件';
  const summary = await getUserStorageSummary(conn, userId);

  if (summary.usedBytes + incoming > summary.limitBytes) {
    throw new Error(
      `${label}超过用户存储上限：当前已用 ${summary.usedText} / ${summary.limitText}，本次需要 ${formatBytes(incoming)}，请先删除历史图片或升级容量`
    );
  }

  return summary;
}

export async function addUserStorageUsage(conn, userId, deltaBytes = 0) {
  const delta = Number(deltaBytes || 0);
  if (!delta) return getUserStorageSummary(conn, userId);

  await conn.query(
    'UPDATE users SET storage_used_bytes=GREATEST(0, storage_used_bytes + ?) WHERE id=?',
    [delta, userId]
  );

  return getUserStorageSummary(conn, userId);
}

export async function applyUserStorageDelta(conn, userId, deltaBytes = 0, log = {}) {
  const summary = await addUserStorageUsage(conn, userId, deltaBytes);
  return summary;
}

export async function deleteStoredFile(imageOrUrl = '') {
  const url = typeof imageOrUrl === 'string' ? imageOrUrl : (imageOrUrl.url || '');
  const storageKey = typeof imageOrUrl === 'object' ? imageOrUrl.storage_key || imageOrUrl.storageKey || '' : '';
  if (isOssStorage()) {
    const key = storageKey || storageKeyFromUrl(url);
    if (!key) return false;
    try {
      await getOssClient().delete(key);
      return true;
    } catch (err) {
      if (err?.code === 'NoSuchKey') return false;
      console.warn('[storage] 删除 OSS 图片文件失败：', key, err.message);
      return false;
    }
  }
  return deleteLocalStoredFile(imageOrUrl);
}

export function storageKeyFromUrl(url = '') {
  const raw = String(url || '').split('#')[0].split('?')[0];
  if (!raw) return '';
  const ossBase = OSS_PUBLIC_BASE_URL || '';
  if (ossBase && raw.startsWith(ossBase.replace(/\/$/, '') + '/')) {
    return raw.slice(ossBase.replace(/\/$/, '').length + 1).replace(/^\/+/, '');
  }
  const filesPrefix = `${FILES_BASE_PATH.replace(/\/$/, '')}/`;
  if (raw.startsWith(filesPrefix)) return raw.slice(filesPrefix.length).replace(/^\/+/, '');
  const match = raw.match(/^https?:\/\/[^/]+\/(.+)$/i);
  return match ? decodeURIComponent(match[1]) : '';
}

export function deleteLocalStoredFile(imageOrUrl = '') {
  const url = typeof imageOrUrl === 'string' ? imageOrUrl : (imageOrUrl.url || '');
  if (!url || /^https?:\/\//i.test(url)) return false;

  const filePath = urlToDiskPath(url);
  if (!filePath || /^https?:\/\//i.test(filePath)) return false;

  const normalized = path.resolve(filePath);
  const allowedRoots = [
    STORAGE_ROOT,
    path.resolve('uploads'),
    path.resolve('outputs')
  ].map((x) => path.resolve(x));

  const safe = allowedRoots.some((root) => normalized === root || normalized.startsWith(root + path.sep));
  if (!safe) return false;

  try {
    if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
      fs.unlinkSync(normalized);
      return true;
    }
  } catch (err) {
    console.warn('[storage] 删除本地图片文件失败：', normalized, err.message);
  }

  return false;
}
