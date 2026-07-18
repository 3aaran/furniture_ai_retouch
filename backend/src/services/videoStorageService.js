// 中文说明：流式转存远程 MP4，并提供视频访问字段与 HTTP Range 解析。
import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

import {
  STORAGE_PROVIDER,
  buildSignedImageUrl,
  saveFilePathToStorage,
  storageTempDir
} from './storageService.js';
import { assertPublicResolvedUrl } from './publicUrlSafety.js';

export const DEFAULT_VIDEO_MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;

function safeSegment(value, fallback) {
  const clean = String(value ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return clean || fallback;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function buildVideoStorageKey({ merchantId, userId, fileName, now = new Date() } = {}) {
  const date = new Date(now);
  const name = path.posix.basename(String(fileName || `${uuid()}.mp4`)).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.posix.join(
    'videos',
    'merchants',
    safeSegment(merchantId, 'public'),
    'users',
    safeSegment(userId, 'system'),
    'generated',
    String(date.getFullYear()),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    name.toLowerCase().endsWith('.mp4') ? name : `${name}.mp4`
  );
}

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()] ?? '';
}

export function validateRemoteVideoResponse(url, headers = {}, maxBytes = DEFAULT_VIDEO_MAX_DOWNLOAD_BYTES) {
  const limit = Math.max(1, Number(maxBytes || DEFAULT_VIDEO_MAX_DOWNLOAD_BYTES));
  const contentType = String(headerValue(headers, 'content-type') || '').split(';')[0].trim().toLowerCase();
  let pathname = '';
  try { pathname = new URL(String(url || '')).pathname.toLowerCase(); } catch {}
  const allowedTypes = new Set(['video/mp4', 'video/x-m4v', 'application/octet-stream']);
  const mp4ByExtension = pathname.endsWith('.mp4');
  if ((contentType && !allowedTypes.has(contentType)) || (!contentType && !mp4ByExtension)) {
    throw new Error('供应商结果不是可接受的 MP4 视频');
  }
  const declaredSize = Number(headerValue(headers, 'content-length') || 0);
  if (Number.isFinite(declaredSize) && declaredSize > limit) {
    throw new Error(`视频体积超过允许上限 ${limit} 字节`);
  }
  return { mimeType: 'video/mp4', declaredSize: Math.max(0, declaredSize || 0), maxBytes: limit };
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function getRemoteVideoResponse(initialUrl, options) {
  let currentUrl = String(initialUrl);
  let redirectCount = 0;
  while (true) {
    const parsed = await assertPublicResolvedUrl(currentUrl, {
      label: '供应商视频 URL',
      resolveHost: options.resolveHost
    });
    const response = await options.httpClient.get(parsed.toString(), {
      responseType: 'stream',
      timeout: options.timeoutMs,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    const status = Number(response?.status || 200);
    if (!REDIRECT_STATUSES.has(status)) {
      if (status < 200 || status >= 300) throw new Error(`供应商视频请求失败: HTTP ${status}`);
      return { response, finalUrl: parsed.toString() };
    }
    const location = String(headerValue(response?.headers, 'location') || '').trim();
    if (!location) throw new Error('供应商视频重定向缺少 Location');
    if (redirectCount >= 5) throw new Error('供应商视频重定向超过 5 次');
    currentUrl = new URL(location, parsed).toString();
    redirectCount += 1;
  }
}

class ByteLimitTransform extends Transform {
  constructor(limit) {
    super();
    this.limit = limit;
    this.bytes = 0;
  }

  _transform(chunk, encoding, callback) {
    this.bytes += Number(chunk?.length || 0);
    if (this.bytes > this.limit) return callback(new Error(`视频体积超过允许上限 ${this.limit} 字节`));
    callback(null, chunk);
  }
}

async function assertMp4File(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead < 12 || header.toString('ascii', 4, 8) !== 'ftyp') {
      throw new Error('供应商结果缺少有效 MP4 文件头');
    }
  } finally {
    await handle.close();
  }
}

export async function saveRemoteVideoToStorage(url, options = {}) {
  const remoteUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(remoteUrl)) throw new Error('远程视频 URL 必须使用 http/https');
  const maxBytes = Math.max(1, Number(options.maxBytes || process.env.VIDEO_MAX_DOWNLOAD_BYTES || DEFAULT_VIDEO_MAX_DOWNLOAD_BYTES));
  const tempDir = path.resolve(options.tempDir || storageTempDir());
  fs.mkdirSync(tempDir, { recursive: true });
  const fileName = `${Date.now()}-seedance-${uuid()}.mp4`;
  const tempPath = path.join(tempDir, `${fileName}.part`);
  const storageKey = buildVideoStorageKey({
    merchantId: options.merchantId,
    userId: options.userId,
    fileName,
    now: options.now || new Date()
  });
  const httpClient = options.httpClient || axios;
  let response;
  try {
    const fetched = await getRemoteVideoResponse(remoteUrl, {
      httpClient,
      resolveHost: options.resolveHost,
      timeoutMs: Math.max(1000, Number(options.timeoutMs || 10 * 60 * 1000))
    });
    response = fetched.response;
    const remoteMeta = validateRemoteVideoResponse(fetched.finalUrl, response?.headers || {}, maxBytes);
    if (!response?.data || typeof response.data.pipe !== 'function') throw new Error('供应商视频响应不是可读 stream');
    const limiter = new ByteLimitTransform(maxBytes);
    await pipeline(response.data, limiter, fs.createWriteStream(tempPath, { flags: 'wx' }));
    await assertMp4File(tempPath);
    const sizeBytes = Number((await fs.promises.stat(tempPath)).size || limiter.bytes || 0);
    const metadata = {
      storageKey,
      fileName,
      originalName: options.originalName || fileName,
      mimeType: remoteMeta.mimeType,
      sizeBytes
    };
    const persistFile = options.persistFile || ((sourcePath, meta) => saveFilePathToStorage(sourcePath, meta));
    const stored = await persistFile(tempPath, metadata);
    return {
      storageProvider: stored?.storageProvider || STORAGE_PROVIDER,
      storageKey: stored?.storageKey || storageKey,
      url: stored?.url || '',
      fileName,
      originalName: metadata.originalName,
      mimeType: remoteMeta.mimeType,
      sizeBytes
    };
  } catch (error) {
    if (error && typeof error === 'object' && !error.failureStage) error.failureStage = response ? 'download' : 'provider';
    throw error;
  } finally {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
  }
}

export function buildVideoAccessFields(video = {}, options = {}) {
  const id = String(video.id || '');
  const provider = String(video.storage_provider || video.storageProvider || '').toLowerCase();
  if (provider !== 'oss') {
    return {
      videoUrl: id ? `/api/videos/${id}/stream` : '',
      posterUrl: String(video.poster_url || video.posterUrl || ''),
      downloadUrl: id ? `/api/videos/${id}/download` : ''
    };
  }
  const signer = options.sign || ((key, signOptions) => buildSignedImageUrl(key, signOptions));
  const key = video.storage_key || video.storageKey || '';
  const posterKey = video.poster_storage_key || video.posterStorageKey || '';
  const fileName = video.original_name || video.originalName || video.file_name || video.fileName || `${id || 'video'}.mp4`;
  return {
    videoUrl: key ? signer(key, { expires: 3600 }) : String(video.url || ''),
    posterUrl: posterKey ? signer(posterKey, { expires: 3600 }) : String(video.poster_url || video.posterUrl || ''),
    downloadUrl: key ? signer(key, { expires: 3600, download: true, fileName }) : String(video.url || '')
  };
}

function rangeError(size) {
  const error = new Error('请求的视频 Range 无效');
  error.status = 416;
  error.contentRange = `bytes */${Math.max(0, Number(size || 0))}`;
  return error;
}

export function parseVideoByteRange(rangeHeader, sizeBytes) {
  const size = Number(sizeBytes);
  if (!Number.isInteger(size) || size <= 0) throw rangeError(size);
  const value = String(rangeHeader || '').trim();
  if (!value) return null;
  if (!value.startsWith('bytes=') || value.includes(',')) throw rangeError(size);
  const [rawStart, rawEnd] = value.slice(6).split('-', 2);
  let start;
  let end;
  if (rawStart === '') {
    const suffixLength = Number(rawEnd);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) throw rangeError(size);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Number(rawEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) throw rangeError(size);
    end = Math.min(end, size - 1);
  }
  return { start, end, length: end - start + 1 };
}
