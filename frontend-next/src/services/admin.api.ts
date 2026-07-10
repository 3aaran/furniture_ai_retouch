import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthToken, request, requestForm, resolveApiUrl, withQuery } from './http';

export type AdminQueryValue = string | number | undefined | null;
export type AdminQuery = Record<string, AdminQueryValue>;

export type AdminPagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

function normalizePagedResult<T>(value: Partial<AdminPagedResult<T>> | T[], query: AdminQuery): AdminPagedResult<T> {
  if (Array.isArray(value)) {
    return {
      items: value,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || Math.max(value.length, 10)),
      total: value.length,
    };
  }
  return {
    items: Array.isArray(value.items) ? value.items : [],
    page: Number(value.page || query.page || 1),
    pageSize: Number(value.pageSize || query.pageSize || 10),
    total: Number(value.total || 0),
  };
}

export function useAdminPaged<T>(path: string, initialQuery: AdminQuery) {
  const [query, setQuery] = useState<AdminQuery>(initialQuery);
  const [data, setData] = useState<AdminPagedResult<T>>({
    items: [],
    page: Number(initialQuery.page || 1),
    pageSize: Number(initialQuery.pageSize || 10),
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request<Partial<AdminPagedResult<T>> | T[]>(withQuery(path, query));
      setData(normalizePagedResult(result, query));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [path, queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchQuery(patch: AdminQuery) {
    setQuery((current) => ({ ...current, ...patch }));
  }

  return { query, setQuery, patchQuery, data, loading, error, reload: load };
}

export function adminGet<T>(path: string, query?: AdminQuery) {
  return request<T>(query ? withQuery(path, query) : path);
}

export function adminPost<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function adminPut<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function adminPatch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function adminDelete<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

export function adminUpload<T>(path: string, formData: FormData, method = 'POST') {
  return requestForm<T>(path, formData, method);
}

export function adminExportUrl(path: string, query: AdminQuery = {}) {
  const token = getAuthToken();
  const url = withQuery(path, { ...query, token });
  return API_BASE ? `${API_BASE}${url}` : url;
}

export function adminImageUrl(item: Record<string, unknown> | null | undefined) {
  if (!item) return '';
  const candidates = [
    item.thumbUrl,
    item.previewUrl,
    item.imageUrl,
    item.resultUrl,
    item.url,
    item.downloadUrl,
  ];
  const value = candidates.map((candidate) => String(candidate || '').trim()).find(Boolean);
  return resolveApiUrl(value || '');
}

export function formatAdminTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function numberText(value: unknown, digits = 0) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
