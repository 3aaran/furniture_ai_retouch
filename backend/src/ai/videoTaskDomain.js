// 中文说明：集中定义参考生视频任务的纯参数、计费、权限、状态和重试规则。

const VERSIONS = new Set(['Mini', '快速', '标准']);
const ASPECT_RATIOS = new Set(['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9']);
const RESOLUTIONS = new Set(['480p', '720p', '1080p', '4K']);
const LOW_RESOLUTIONS = new Set(['480p', '720p']);

function normalizeExtraRequirements(value) {
  const list = Array.isArray(value) ? value : (value === undefined || value === null || value === '' ? [] : [value]);
  return list
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

export function buildVideoPrompt(prompt, extraRequirements = []) {
  const mainPrompt = String(prompt ?? '');
  if (!mainPrompt.trim()) throw new Error('视频提示词不能为空');
  const extras = normalizeExtraRequirements(extraRequirements);
  return extras.length ? `${mainPrompt}\n补充要求：${extras.join('；')}` : mainPrompt;
}

export function normalizeVideoTaskPayload(payload = {}) {
  const clientRequestId = String(payload.clientRequestId || payload.client_request_id || '').trim();
  if (!clientRequestId) throw new Error('clientRequestId 不能为空');
  if (clientRequestId.length > 120) throw new Error('clientRequestId 不能超过 120 个字符');

  const rawImageIds = Array.isArray(payload.imageIds)
    ? payload.imageIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (rawImageIds.length < 1 || rawImageIds.length > 9) throw new Error('参考图片数量必须为 1 到 9 张');
  const imageIds = [...new Set(rawImageIds)];

  const prompt = String(payload.prompt ?? payload.userPrompt ?? '');
  if (!prompt.trim()) throw new Error('视频提示词不能为空');
  const extraRequirements = normalizeExtraRequirements(
    payload.extraRequirements ?? payload.prompt_extra_requirements
  );

  const version = payload.version || '快速';
  if (!VERSIONS.has(version)) throw new Error('视频版本仅支持 Mini、快速或标准');
  const duration = payload.duration ?? 'auto';
  if (duration !== 'auto' && (!Number.isInteger(duration) || duration < 4 || duration > 15)) {
    throw new Error('视频时长必须为 auto 或 4 到 15 的整数');
  }
  const aspectRatio = payload.aspectRatio || payload.aspect_ratio || 'adaptive';
  if (!ASPECT_RATIOS.has(aspectRatio)) throw new Error('不支持的视频宽高比');
  const resolution = payload.resolution || '720p';
  if (!RESOLUTIONS.has(resolution)) throw new Error('不支持的视频分辨率');
  if (version !== '标准' && !LOW_RESOLUTIONS.has(resolution)) {
    throw new Error('Mini/快速版只支持 480p/720p，1080p/4K 必须使用标准版');
  }

  let avatarIds;
  if (payload.avatarIds !== undefined || payload.avatar_ids !== undefined) {
    const source = payload.avatarIds ?? payload.avatar_ids;
    if (!Array.isArray(source)) throw new Error('avatarIds 必须为数组');
    avatarIds = source.map((id) => typeof id === 'number' ? id : String(id || '').trim()).filter((id) => id !== '');
  }

  return {
    featureKey: 'video_generate',
    clientRequestId,
    imageIds,
    prompt,
    extraRequirements,
    finalPrompt: buildVideoPrompt(prompt, extraRequirements),
    version,
    duration,
    durationSeconds: duration === 'auto' ? null : duration,
    aspectRatio,
    resolution,
    notifyUrl: String(payload.notifyUrl || payload.notify_url || '').trim(),
    providerParams: {
      version,
      duration,
      aspect_ratio: aspectRatio,
      resolution,
      ...(avatarIds === undefined ? {} : { avatar_ids: avatarIds })
    }
  };
}

export function calculateVideoTaskCost(settings = {}) {
  const raw = Number(settings.cost_video_generate ?? 30);
  if (!Number.isFinite(raw) || raw < 0) throw new Error('视频生成功能费用配置无效');
  return Math.ceil(raw);
}

export function usesMerchantQuota(user) {
  return ['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(user?.role);
}

export function canAccessVideoTask(task, user) {
  if (!task || !user) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (usesMerchantQuota(user)) {
    return String(task.merchant_id || '') === String(user.merchant_id || '');
  }
  return String(task.user_id || '') === String(user.id || '');
}

export function mapProviderVideoStatus(status = {}) {
  const providerStatus = String(status.providerStatus || status.state || 'pending').toLowerCase();
  if (status.isFinal === true || status.is_final === true) {
    return providerStatus === 'success' ? 'succeeded' : 'failed';
  }
  return providerStatus === 'pending' ? 'queued' : 'running';
}

export function videoRetryDelayMs(attempt = 0, options = {}) {
  const baseMs = Math.max(1, Number(options.baseMs || 3000));
  const maxMs = Math.max(baseMs, Number(options.maxMs || 60000));
  const exponent = Math.max(0, Math.min(30, Math.floor(Number(attempt || 0))));
  return Math.min(maxMs, baseMs * (2 ** exponent));
}

export function nextVideoPollAt(now = new Date(), attempt = 0, options = {}) {
  return new Date(new Date(now).getTime() + videoRetryDelayMs(attempt, options));
}
