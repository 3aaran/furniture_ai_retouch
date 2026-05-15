import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { downloadImage, saveBuffer } from './utils.js';

function mapSize(ratio = '1:1') {
  const r = String(ratio || '1:1').trim();
  if (r === '16:9') return '1920x1088';
  if (r === '9:16') return '1088x1920';
  if (r === '4:3') return '1280x960';
  if (r === '3:4') return '960x1280';
  return '1024x1024';
}

function contentType(filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function imageDataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const buffer = fs.readFileSync(filePath);
  return `data:${contentType(filePath)};base64,${buffer.toString('base64')}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildFeatureInstruction(featureKey) {
  switch (featureKey) {
    case 'material':
      return '在保留家具主体结构、比例和轮廓的前提下，替换或优化家具表面材质。';
    case 'replace_bg':
      return '将家具自然融合到新的室内或电商展示场景中，保持真实光影、透视和比例。';
    case 'remove_bg':
      return '净化或移除背景，保留家具主体，输出干净的电商展示图。';
    case 'enhance':
      return '提升家具图片的清晰度、光影、质感和商业摄影效果，不改变主体结构。';
    case 'lineart':
      return '基于家具主体生成清晰线稿图，保留主要轮廓和结构细节。';
    case 'multiview':
      return '生成同一件家具的多角度产品展示拼版图，只输出一张拼版图片，并保持结构、材质、颜色和细节一致。';
    default:
      return '生成一张高质量家具商品图。';
  }
}

function buildPrompt({ featureKey, prompt }) {
  const userPrompt = String(prompt || '').trim();
  return [buildFeatureInstruction(featureKey), userPrompt].filter(Boolean).join('\n用户要求：');
}

function pickResult(data) {
  const outputImage = Array.isArray(data?.output)
    ? data.output.find(item => item?.type === 'image_generation_call' && item?.result)
    : null;
  const item = data?.data?.[0] || data?.images?.[0] || outputImage || data?.output?.[0] || data;
  return data?.result_url || item?.result_url || item?.b64_json || item?.image_base64 || item?.result || item?.url || data?.url || null;
}

function pickTaskId(data) {
  return data?.task_id || data?.taskId || data?.id || data?.data?.task_id || data?.data?.taskId || data?.data?.id || null;
}

function authHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey
  };
}

function isLk888Base(baseUrl = '') {
  return String(baseUrl || '').toLowerCase().includes('api.lk888.ai');
}

function normalizeEndpoint(baseUrl, apiPath) {
  const base = String(baseUrl || 'https://api.lk888.ai').replace(/\/$/, '');
  if (isLk888Base(base)) {
    return `${base}/v1/media/generate`;
  }
  return `${base}${apiPath || '/v1/media/generate'}`;
}

function statusEndpoint(endpoint) {
  const url = new URL(endpoint);
  url.pathname = '/v1/media/status';
  url.search = '';
  return url.toString();
}

function getPublicImages({ imageUrl, referenceImageUrls = [] }) {
  return [imageUrl, ...referenceImageUrls]
    .map(v => String(v || '').trim())
    .filter(v => /^https?:\/\//i.test(v))
    .slice(0, 10);
}

function assertPublicImages({ imagePath, imageUrl, referenceImageUrls = [] }) {
  const publicImages = getPublicImages({ imageUrl, referenceImageUrls });
  if (imagePath && fs.existsSync(imagePath) && publicImages.length === 0) {
    throw new Error('锦潮 AI 的 images 只接受公网可访问 URL。请在 backend/.env 设置 PUBLIC_BASE_URL 为后端公网地址，并确认 /files 可公网访问。');
  }
  return publicImages;
}

function buildLk888ParamsPayload({ modelName, finalPrompt, imagePath, imageUrl, referenceImageUrls, ratio }) {
  const images = assertPublicImages({ imagePath, imageUrl, referenceImageUrls });
  return {
    model: modelName || 'gpt-image-2',
    prompt: finalPrompt,
    params: {
      size: mapSize(ratio),
      quality: 'high',
      ...(images.length ? { images } : {})
    }
  };
}

function buildLk888FlatPayload({ modelName, finalPrompt, imagePath, imageUrl, referenceImageUrls, ratio }) {
  const images = assertPublicImages({ imagePath, imageUrl, referenceImageUrls });
  return {
    background: 'opaque',
    model: modelName || 'gpt-image-2',
    n: 1,
    prompt: finalPrompt,
    quality: 'high',
    size: mapSize(ratio),
    ...(images.length ? { images } : {})
  };
}

async function createLk888Task(endpoint, requestParams) {
  try {
    return await axios.post(endpoint, buildLk888ParamsPayload(requestParams), {
      timeout: Number(requestParams.timeoutMs || 120000),
      headers: authHeaders(requestParams.apiKey)
    });
  } catch (err) {
    const status = err?.response?.status;
    if (status && status !== 400 && status !== 422) throw err;
    return await axios.post(endpoint, buildLk888FlatPayload(requestParams), {
      timeout: Number(requestParams.timeoutMs || 120000),
      headers: authHeaders(requestParams.apiKey)
    });
  }
}

async function pollLk888Result(endpoint, taskId, { apiKey, timeoutMs }) {
  const started = Date.now();
  const maxWait = Number(timeoutMs || 180000);
  const interval = 3500;
  const url = statusEndpoint(endpoint);

  while (Date.now() - started < maxWait) {
    const res = await axios.get(url, {
      timeout: Math.min(30000, maxWait),
      headers: authHeaders(apiKey),
      params: { task_id: taskId }
    });
    const data = res.data || {};
    if (data.is_final === true) {
      if (data.state === 'success' && data.result_url) return data.result_url;
      throw new Error(data.error || `锦潮 AI 任务失败：${JSON.stringify(data).slice(0, 800)}`);
    }
    await sleep(interval);
  }

  throw new Error('锦潮 AI 任务超时，请稍后到任务记录中查看结果');
}

async function postLk888(endpoint, requestParams) {
  const res = await createLk888Task(endpoint, requestParams);
  const directResult = pickResult(res.data);
  if (directResult) return directResult;

  const taskId = pickTaskId(res.data);
  if (!taskId) {
    throw new Error(`锦潮 AI 创建任务后未返回 task_id 或图片地址：${JSON.stringify(res.data || {}).slice(0, 800)}`);
  }

  return await pollLk888Result(endpoint, taskId, requestParams);
}

function buildOpenAiJsonPayload({ modelName, finalPrompt, imagePath, ratio }) {
  const image = imageDataUrl(imagePath);
  return {
    model: modelName || 'gpt-image-2',
    prompt: finalPrompt,
    size: mapSize(ratio),
    n: 1,
    output_format: 'png',
    ...(image ? { image, images: [image] } : {})
  };
}

async function postOpenAiJson(endpoint, requestParams) {
  const res = await axios.post(endpoint, buildOpenAiJsonPayload(requestParams), {
    timeout: Number(requestParams.timeoutMs || 120000),
    headers: authHeaders(requestParams.apiKey)
  });
  return pickResult(res.data);
}

async function postOpenAiMultipart(endpoint, { apiKey, timeoutMs, modelName, finalPrompt, imagePath, ratio }) {
  const form = new FormData();
  form.append('model', modelName || 'gpt-image-2');
  form.append('prompt', finalPrompt);
  form.append('size', mapSize(ratio));

  if (imagePath && fs.existsSync(imagePath)) {
    const buffer = fs.readFileSync(imagePath);
    form.append('image[]', new Blob([buffer], { type: contentType(imagePath) }), path.basename(imagePath));
  }

  const res = await axios.post(endpoint, form, {
    timeout: Number(timeoutMs || 120000),
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return pickResult(res.data);
}

function shouldUseJson(endpoint) {
  const url = String(endpoint || '').toLowerCase();
  return url.includes('/images/generations') || /\/v1\/images\/?$/.test(url);
}

export async function generate(params = {}) {
  const {
    baseUrl,
    apiPath,
    apiKey,
    modelName,
    featureKey,
    imagePath,
    imageUrl,
    referenceImageUrls = [],
    prompt,
    ratio,
    merchantId = null,
    userId = null
  } = params;

  if (!apiKey) throw new Error('缺少 OpenAI API Key');

  const endpoint = normalizeEndpoint(baseUrl, apiPath);
  const finalPrompt = buildPrompt({ featureKey, prompt });
  const requestParams = { apiKey, timeoutMs: params.timeoutMs, modelName, finalPrompt, imagePath, imageUrl, referenceImageUrls, ratio };

  let result;
  try {
    if (isLk888Base(baseUrl) || endpoint.toLowerCase().includes('/v1/media/generate')) {
      result = await postLk888(endpoint, requestParams);
    } else if (shouldUseJson(endpoint)) {
      result = await postOpenAiJson(endpoint, requestParams);
    } else {
      result = await postOpenAiMultipart(endpoint, requestParams);
    }
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    throw new Error(`GPT Image 2 接口请求失败${status ? `（HTTP ${status}）` : ''}：${typeof data === 'string' ? data : JSON.stringify(data || err.message || '未知错误')}`);
  }

  if (!result) {
    throw new Error('GPT Image 2 接口未返回图片地址或 Base64 图片');
  }

  if (String(result).startsWith('http')) {
    return downloadImage(result, `gpt-image-2-${featureKey || 'image'}`, { merchantId, userId, kind: 'generated' });
  }

  const b64 = String(result).replace(/^data:image\/\w+;base64,/, '');
  return saveBuffer(Buffer.from(b64, 'base64'), `gpt-image-2-${featureKey || 'image'}`, 'png', { merchantId, userId, kind: 'generated' });
}

export default { generate };
