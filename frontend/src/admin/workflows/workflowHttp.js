const apiBase = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const API = apiBase === '/api' ? '' : apiBase;

export async function workflowRequest(url, options = {}) {
  const token = globalThis.localStorage?.getItem('token') || '';
  const response = await fetch(API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data.message || '工作流请求失败');
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}
