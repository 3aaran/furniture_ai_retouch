// 中文说明：封装 SD 2.0 参考生视频模型的参数校验、创建任务和状态查询契约。
import axios from 'axios';
import { assertPublicHttpUrlLiteral } from '../../services/publicUrlSafety.js';

export const SEEDANCE_REFERENCE_VIDEO_MODEL = 'kwvideo-v2-ref';
export const DEFAULT_SEEDANCE_VIDEO_BASE_URL = 'https://api.lk888.ai';
export const DEFAULT_SEEDANCE_VIDEO_CREATE_PATH = '/v1/media/generate';
export const DEFAULT_SEEDANCE_VIDEO_STATUS_PATH = '/v1/media/status';

const VERSIONS = new Set(['Mini', '快速', '标准']);
const ASPECT_RATIOS = new Set(['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9']);
const RESOLUTIONS = new Set(['480p', '720p', '1080p', '4K']);
const FAST_RESOLUTIONS = new Set(['480p', '720p']);
const NETWORK_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT'
]);

function assertPublicUrl(value, label) {
  return assertPublicHttpUrlLiteral(value, label).toString();
}

function joinUrl(baseUrl, routePath) {
  return `${String(baseUrl || DEFAULT_SEEDANCE_VIDEO_BASE_URL).replace(/\/$/, '')}/${String(routePath || '').replace(/^\//, '')}`;
}

function requestOptions(apiKey, timeoutMs, extra = {}) {
  const secret = String(apiKey || '').trim();
  if (!secret) throw new Error('Seedance 视频 API Key 未配置');
  return {
    ...extra,
    timeout: Math.max(1000, Number(timeoutMs || 120000)),
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(extra.headers || {})
    }
  };
}

export function validateSeedanceReferenceParams(params = {}) {
  const version = params.version;
  if (!VERSIONS.has(version)) throw new Error('视频版本仅支持 Mini、快速或标准');

  const duration = params.duration;
  if (duration !== 'auto' && (!Number.isInteger(duration) || duration < 4 || duration > 15)) {
    throw new Error('视频时长必须为 auto 或 4 到 15 的整数');
  }

  const aspectRatio = params.aspect_ratio;
  if (!ASPECT_RATIOS.has(aspectRatio)) throw new Error('不支持的视频宽高比');

  const resolution = params.resolution;
  if (!RESOLUTIONS.has(resolution)) throw new Error('不支持的视频分辨率');
  if (version !== '标准' && !FAST_RESOLUTIONS.has(resolution)) {
    throw new Error('Mini/快速版只支持 480p/720p，1080p/4K 必须使用标准版');
  }

  if (!Array.isArray(params.images) || params.images.length < 1 || params.images.length > 9) {
    throw new Error('参考图片数量必须为 1 到 9 张');
  }
  const images = params.images.map((url, index) => assertPublicUrl(url, `第 ${index + 1} 张参考图片`));

  let avatarIds;
  if (params.avatar_ids !== undefined) {
    if (!Array.isArray(params.avatar_ids)) throw new Error('avatar_ids 必须是数组');
    avatarIds = params.avatar_ids.map((id) => {
      const value = typeof id === 'number' ? id : String(id || '').trim();
      if (value === '') throw new Error('avatar_ids 不能包含空值');
      return value;
    });
  }

  return {
    version,
    duration,
    aspect_ratio: aspectRatio,
    resolution,
    images,
    ...(avatarIds === undefined ? {} : { avatar_ids: avatarIds })
  };
}

function progressNumber(value) {
  const parsed = typeof value === 'string' ? Number(value.replace(/%$/, '').trim()) : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function normalizeSeedanceStatus(payload = {}) {
  const raw = payload && typeof payload.data === 'object' && payload.state === undefined
    ? payload.data
    : payload;
  const providerStatus = String(raw?.state || 'pending').toLowerCase();
  const isFinal = raw?.is_final === true;
  let status = providerStatus === 'pending' ? 'queued' : 'running';
  if (isFinal) status = providerStatus === 'success' ? 'succeeded' : 'failed';

  return {
    providerTaskId: raw?.task_id === undefined || raw?.task_id === null ? '' : String(raw.task_id),
    providerStatus,
    status,
    isFinal,
    progress: progressNumber(raw?.progress),
    resultUrl: String(raw?.result_url || ''),
    resultType: String(raw?.result_type || ''),
    errorMessage: String(raw?.error || raw?.message || ''),
    cost: Number(raw?.cost || 0)
  };
}

export function isRecoverableSeedanceError(error) {
  const status = Number(error?.response?.status || 0);
  if (status === 429 || status === 502) return true;
  if (NETWORK_CODES.has(String(error?.code || '').toUpperCase())) return true;
  return !error?.response && (!!error?.request || /network|socket|fetch failed/i.test(String(error?.message || '')));
}

export async function createSeedanceReferenceTask(input = {}, options = {}) {
  const prompt = String(input.prompt ?? '');
  if (!prompt.trim()) throw new Error('prompt 不能为空');
  const params = validateSeedanceReferenceParams(input.params);
  const body = {
    model: options.modelName || SEEDANCE_REFERENCE_VIDEO_MODEL,
    prompt,
    params
  };
  if (input.notifyUrl !== undefined && String(input.notifyUrl || '').trim()) {
    body.notify_url = assertPublicUrl(input.notifyUrl, 'notify_url');
  }

  const httpClient = options.httpClient || axios;
  const response = await httpClient.post(
    joinUrl(options.baseUrl || process.env.SEEDANCE_VIDEO_BASE_URL, options.createPath || process.env.SEEDANCE_VIDEO_CREATE_PATH || DEFAULT_SEEDANCE_VIDEO_CREATE_PATH),
    body,
    requestOptions(options.apiKey ?? process.env.SEEDANCE_VIDEO_API_KEY, options.timeoutMs)
  );
  const data = response?.data || {};
  const taskId = data.task_id ?? data.data?.task_id;
  if (taskId === undefined || taskId === null || String(taskId).trim() === '') {
    throw new Error('Seedance 创建响应缺少 task_id');
  }
  return {
    providerTaskId: String(taskId),
    providerStatus: String(data.task_status || data.data?.task_status || 'pending').toLowerCase()
  };
}

export async function getSeedanceReferenceTaskStatus(providerTaskId, options = {}) {
  const taskId = String(providerTaskId || '').trim();
  if (!taskId) throw new Error('供应商 task_id 不能为空');
  const httpClient = options.httpClient || axios;
  try {
    const response = await httpClient.get(
      joinUrl(options.baseUrl || process.env.SEEDANCE_VIDEO_BASE_URL, options.statusPath || process.env.SEEDANCE_VIDEO_STATUS_PATH || DEFAULT_SEEDANCE_VIDEO_STATUS_PATH),
      requestOptions(options.apiKey ?? process.env.SEEDANCE_VIDEO_API_KEY, options.timeoutMs, {
        params: { task_id: taskId }
      })
    );
    return normalizeSeedanceStatus(response?.data || {});
  } catch (error) {
    error.recoverable = isRecoverableSeedanceError(error);
    throw error;
  }
}

export default {
  create: createSeedanceReferenceTask,
  getStatus: getSeedanceReferenceTaskStatus
};
