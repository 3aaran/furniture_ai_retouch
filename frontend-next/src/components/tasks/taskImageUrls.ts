import { resolveApiUrl } from '../../services/http';

type TaskImage = {
  id?: string | number | null;
  url?: string | null;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
};

export type TaskImageRecord = {
  thumbUrl?: string | null;
  previewUrl?: string | null;
  resultUrl?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  downloadUrl?: string | null;
  sourceThumbUrl?: string | null;
  sourcePreviewUrl?: string | null;
  sourceUrl?: string | null;
  originUrl?: string | null;
  originalUrl?: string | null;
  inputUrl?: string | null;
  sourceImageUrl?: string | null;
  sourceDownloadUrl?: string | null;
  resultImage?: TaskImage | null;
  originImage?: TaskImage | null;
};

function firstResolved(...urls: Array<string | null | undefined>) {
  return resolveApiUrl(urls.find((url) => Boolean(String(url || '').trim()))) || '';
}

export function taskPreviewImageUrl(task: TaskImageRecord) {
  return firstResolved(task.thumbUrl, task.previewUrl, task.resultImage?.thumbUrl, task.resultImage?.previewUrl, task.resultUrl, task.url, task.imageUrl, task.resultImage?.url, task.downloadUrl);
}

export function taskSourcePreviewImageUrl(task: TaskImageRecord) {
  return firstResolved(task.sourceThumbUrl, task.sourcePreviewUrl, task.originImage?.thumbUrl, task.originImage?.previewUrl, task.sourceUrl, task.originUrl, task.originalUrl, task.inputUrl, task.sourceImageUrl, task.originImage?.url);
}

export function fullTaskImageUrl(task: TaskImageRecord) {
  return firstResolved(task.downloadUrl, task.resultImage?.downloadUrl, task.resultUrl, task.imageUrl, task.resultImage?.imageUrl, task.resultImage?.url, task.url, task.thumbUrl, task.previewUrl);
}

export function fullTaskSourceImageUrl(task: TaskImageRecord) {
  return firstResolved(task.sourceDownloadUrl, task.originImage?.downloadUrl, task.sourceUrl, task.originUrl, task.originalUrl, task.inputUrl, task.sourceImageUrl, task.originImage?.imageUrl, task.originImage?.url, task.sourceThumbUrl, task.sourcePreviewUrl);
}
