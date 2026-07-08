import { request, requestForm, withQuery } from './http';

export type ImageUploadResult = {
  id: string;
  imageId?: string;
  originalName?: string;
  url?: string;
  imageUrl?: string;
  thumbUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  createdAt?: string;
};

export type ResourceApiItem = {
  id: string | number;
  name?: string;
  resourceName?: string;
  originalName?: string;
  imageId?: string;
  imageUrl?: string;
  url?: string;
  thumbUrl?: string;
  downloadUrl?: string;
  resourceType?: string;
  resource_type?: string;
  scope?: string;
  mainCategoryName?: string;
  subCategoryName?: string;
  objectName?: string;
  colorName?: string;
  source?: string;
  status?: string;
  createdAt?: string;
};

export type PagedResult<T> = {
  items: T[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export type CategorySubItem = {
  id: string | number;
  name: string;
};

export type CategoryMainItem = {
  id: string | number;
  name: string;
  scope?: string;
  purposeKey?: string;
  purposeName?: string;
  subs?: CategorySubItem[];
};

export type CategoryPurpose = {
  purposeKey: string;
  purposeName: string;
  mains: CategoryMainItem[];
};

export type CategoryTree = {
  scope: string;
  purposes: CategoryPurpose[];
};

export type AiTask = {
  id: string;
  status: string;
  statusLabel?: string;
  statusMessage?: string;
  featureKey?: string;
  featureName?: string;
  kind?: string;
  cost?: number;
  quotaUsed?: number;
  resolution?: string;
  ratio?: string;
  url?: string;
  previewUrl?: string;
  resultUrl?: string | null;
  thumbUrl?: string | null;
  downloadUrl?: string;
  imageId?: string | null;
  errorMessage?: string;
  createdAt?: string;
  submittedAt?: string;
  finishedAt?: string;
  user?: { quota?: number; merchantQuota?: number; [key: string]: unknown };
};

export type CreateAiTaskPayload = {
  featureKey: string;
  imageA: { imageId: string; url?: string; imageUrl?: string; name?: string };
  imageB?: { imageId: string; url?: string; imageUrl?: string; name?: string };
  selectedResource?: Record<string, unknown> | null;
  selectedResourceSnapshot?: Record<string, unknown> | null;
  selectedResourceId?: string;
  userReferenceImageIds?: string[];
  referenceImageIds?: string[];
  resolution: string;
  ratio: string;
  userPrompt?: string;
  customText?: string;
  options?: Record<string, unknown>;
};

export type UploadResourcePayload = {
  file: File;
  name?: string;
  scope?: string;
  objectName?: string;
  colorName?: string;
};

export function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  return requestForm<ImageUploadResult>('/api/images/upload', formData);
}

export function uploadWorkbenchResource(payload: UploadResourcePayload) {
  const formData = new FormData();
  formData.append('image', payload.file);
  formData.append('name', payload.name || payload.file.name.replace(/\.[^.]+$/, ''));
  formData.append('scope', payload.scope || 'USER');
  formData.append('objectName', payload.objectName || '未分类');
  formData.append('colorName', payload.colorName || '');
  return requestForm<{ items?: ResourceApiItem[]; ids?: Array<string | number>; storage?: unknown }>('/api/merchant/resources', formData);
}

export function fetchCategoryTree(scope = 'SYSTEM') {
  return request<CategoryTree>(withQuery('/api/categories/tree', { scope }));
}

export function fetchWorkbenchResources(params: Record<string, string | number | undefined | null>) {
  return request<PagedResult<ResourceApiItem>>(withQuery('/api/resources', params));
}

export function fetchRecentAiTasks(params: Record<string, string | number | undefined | null> = {}) {
  return request<PagedResult<AiTask> | AiTask[]>(withQuery('/api/ai/tasks/recent', params));
}

export function createAiTask(payload: CreateAiTaskPayload) {
  return request<AiTask>('/api/ai/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchAiTaskStatus(taskId: string) {
  return request<AiTask>(`/api/ai/tasks/${encodeURIComponent(taskId)}/status`);
}

export function fetchPublicSettings() {
  return request<Record<string, string | number | undefined>>('/api/settings/public');
}
