export type ApiResult<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const TOKEN_KEYS = ['furniture_token', 'token', 'authToken', 'accessToken'];

export function getAuthToken() {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return '';
}

export function resolveApiUrl(url?: string | null) {
  let value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) return value;
  if (value.startsWith('/api/files/')) value = value.replace(/^\/api\/files\//, '/files/');
  if (value.startsWith('/api/uploads/')) value = value.replace(/^\/api\/uploads\//, '/uploads/');
  if (value.startsWith('/api/outputs/')) value = value.replace(/^\/api\/outputs\//, '/outputs/');
  if (!value.startsWith('/')) return value;
  return API_BASE ? `${API_BASE}${value}` : value;
}

function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data
      ? String((data as { message?: unknown }).message || '')
      : '';
    throw new Error(message || `HTTP ${response.status}`);
  }

  return data as T;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  return parseResponse<T>(response);
}

export async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const headers = new Headers();
  Object.entries(authHeader()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return parseResponse<T>(response);
}

export function withQuery(path: string, params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
