import { useEffect, useState } from 'react';
import { request, withQuery } from '../../services/http';
import { fullTaskImageUrl, fullTaskSourceImageUrl, taskPreviewImageUrl, taskSourcePreviewImageUrl } from '../../components/tasks/taskImageUrls';
import type { OperationsPageType, PageConfig, PagedRows, QueryState, Row } from './operations.types';

export const pageConfigs: PageConfig[] = [
  { type: 'history', title: '生成历史', eyebrow: 'HISTORY CENTER', desc: '按任务、状态、时间和用户筛选图片生成记录，快速回看结果、下载图片或继续处理。' },
  { type: 'users', title: '用户管理', eyebrow: 'TEAM ACCESS', desc: '管理门店成员、体验账号、账号状态和算力分配。' },
  { type: 'promotion', title: '邀请共创', eyebrow: 'INVITE CENTER', desc: '查看邀请链接、被邀请门店、审核状态和共创收益。' },
  { type: 'profile', title: '个人中心', eyebrow: 'PROFILE', desc: '集中管理账号资料、安全设置与存储空间。' },
  { type: 'quota', title: '额度明细', eyebrow: 'QUOTA LEDGER', desc: '查看当前余额、收入支出和每一次 AI 任务扣费记录。' },
];

export const roleNames: Record<string, string> = {
  SYSTEM_ADMIN: '平台管理员',
  MERCHANT_OWNER: '门店主账号',
  MERCHANT_ADMIN: '门店管理员',
  STAFF: '普通用户',
  TRIAL: '体验账号',
};

export function pageConfig(type: OperationsPageType) {
  return pageConfigs.find((item) => item.type === type) || pageConfigs[0];
}

export function fmt(value?: string | number | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function statusText(value?: string) {
  const key = String(value || '').toUpperCase();
  return ({
    SUCCEEDED: '已完成',
    SUCCESS: '已完成',
    ACTIVE: '启用',
    RUNNING: '生成中',
    PENDING: '待处理',
    QUEUED: '排队中',
    FAILED: '失败',
    DISABLED: '禁用',
    REJECTED: '已驳回',
    APPROVED: '已通过',
  } as Record<string, string>)[key] || value || '-';
}

export function featureText(item: Row) {
  return String(item.featureName || item.operationName || item.kind || item.featureKey || item.operation || 'AI 任务');
}

export function imageUrl(item: Row) {
  return taskPreviewImageUrl(item);
}

export function sourceImageUrl(item: Row) {
  return taskSourcePreviewImageUrl(item);
}

export function fullImageUrl(item: Row) {
  return fullTaskImageUrl(item);
}

export function fullSourceImageUrl(item: Row) {
  return fullTaskSourceImageUrl(item);
}

export function quotaText(value: unknown) {
  return `${Number(value || 0)} 算力`;
}

export function patchQuery(setQuery: (next: QueryState) => void, query: QueryState, patch: QueryState) {
  setQuery({ ...query, ...patch, page: patch.page || 1 });
}

export function usePaged(endpoint: string | null, query: QueryState) {
  const [data, setData] = useState<PagedRows>({ items: [], page: 1, pageSize: Number(query.pageSize || 10), total: 0 });
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState('');
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    request<PagedRows>(withQuery(endpoint, query)).then((result) => {
      if (!cancelled) setData(Array.isArray(result) ? { items: result } : result);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : '读取失败');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [endpoint, queryKey]);

  return { data, loading, error };
}
