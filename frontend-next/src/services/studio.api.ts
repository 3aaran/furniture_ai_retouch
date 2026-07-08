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
  resourceType?: string;
  scope?: string;
  mainCategoryName?: string;
  subCategoryName?: string;
  objectName?: string;
  colorName?: string;
};

export type PagedResult<T> = {
  items: T[];
  page?: number;
  pageSize?: number;
  total?: number;
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
  user?: { quota?: number; [key: string]: unknown };
};

export type CreateAiTaskPayload = {
  featureKey: string;
  imageA: { imageId: string; url?: string; name?: string };
  selectedResource?: Record<string, unknown> | null;
  selectedResourceId?: string;
  userReferenceImageIds?: string[];
  referenceImageIds?: string[];
  resolution: string;
  ratio: string;
  userPrompt?: string;
  customText?: string;
  options?: Record<string, unknown>;
};

export function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  return requestForm<ImageUploadResult>('/api/images/upload', formData);
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
