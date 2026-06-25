import { FILE_BASE_URL } from '../config/env.js';

export const PLACEHOLDER_IMAGE = '/static/logo.png';

export function normalizeFileUrl(url) {
  const text = String(url || '').trim();
  if (!text) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('/files/')) return `${FILE_BASE_URL}${text}`;
  return text;
}

export default normalizeFileUrl;
