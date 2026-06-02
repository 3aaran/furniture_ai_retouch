import axios from 'axios';
import { downloadImage, joinUrl } from './utils.js';

/**
 * CogView-3-Flash 是文生图模型，不是真正的图像编辑模型。
 * 所以这里不会把原图直接上传给智谱接口，而是把“原图存在”这一事实转成提示词补充。
 * 如果后面你换成支持图像编辑的模型，再单独改这个文件即可。
 */

/**
 * 把你项目里的分辨率 / 比例映射成智谱支持的 size
 * 官方文档中常见支持：
 * 1024x1024、768x1344、864x1152、1344x768、1152x864、1440x720、720x1440
 */
function mapSize(resolution = '2K', ratio = '1:1') {
  const r = String(ratio || '1:1').trim();

  // 优先按比例映射
  if (r === '1:1') return '1024x1024';
  if (r === '3:4') return '768x1344';
  if (r === '4:3') return '1344x768';
  if (r === '9:16') return '720x1440';
  if (r === '16:9') return '1440x720';

  // 兜底按分辨率映射
  const res = String(resolution || '2K').toUpperCase();
  if (res === '1K') return '1024x1024';
  if (res === '2K') return '1024x1024';
  if (res === '4K') return '1440x720';

  return '1024x1024';
}

/**
 * 将你项目 6 大功能的语义补充到 prompt 里
 * 因为 CogView-3-Flash 是文生图，所以只能通过提示词尽量约束效果
 */
function buildFeatureInstruction(featureKey) {
  switch (featureKey) {
    case 'material':
      return '请根据描述生成一张家具材质替换后的展示图，尽量保持家具主体造型稳定，重点体现材质变化。';
    case 'replace_bg':
      return '请根据描述生成一张家具与新场景自然融合的展示图，注意光影、比例和空间关系。';
    case 'remove_bg':
      return '请根据描述生成一张背景简洁、主体清晰的家具展示图，适合电商展示。';
    case 'enhance':
      return '请根据描述生成一张质感更强、清晰度更高、光影更好的家具展示图。';
    case 'lineart':
      return '请根据描述生成一张清晰的家具线稿图，背景简洁，保留主要轮廓结构。';
    case 'multiview':
      return '基于 Image A 生成同一件家具的多角度产品展示拼版图。本次只允许生成一张拼版图片，不允许输出多张独立图片；拼版图中的多个视图必须展示同一件家具在不同方向下的外观，并保持主体结构、尺寸比例、材质颜色、纹理质感和装饰细节一致。';
    case 'promo_main_image':
      return '请根据描述生成一张家具产品主图，完整保留家具主体，突出电商首图和品牌封面感，背景干净高级，默认不要生成文字、Logo 或水印。';
    case 'promo_poster_image':
      return '请根据描述生成一张家具广告海报图，保留家具主体并采用广告海报构图，可根据用户选项生成少量通顺中文文案，避免乱码、价格、Logo 和虚假参数。';
    case 'promo_detail_image':
      return '请根据描述生成一张家具产品细节图，以局部材质、纹理、工艺和结构卖点为主，采用多区域细节展示，不要把完整家具作为主体大图。';
    default:
      return '请根据描述生成一张高质量家具图片。';
  }
}

/**
 * 把用户 prompt 和系统 prompt 合并成最终 prompt
 */
function buildFinalPrompt({ featureKey, prompt }) {
  const head = buildFeatureInstruction(featureKey);
  const userPrompt = String(prompt || '').trim();
  if (!userPrompt) return head;
  return `${head}\n用户要求：${userPrompt}`;
}

/**
 * 智谱图片生成
 */
export async function generate(params) {
  const {
    baseUrl,
    apiPath,
    apiKey,
    modelName,
    featureKey,
    prompt,
    resolution,
    ratio
  } = params || {};

  if (!apiKey) {
    throw new Error('缺少智谱 API Key');
  }

  // 如果前端没填 API Path，就走默认智谱图像生成接口
  const endpoint = joinUrl(
    baseUrl || 'https://open.bigmodel.cn',
    apiPath || '/api/paas/v4/images/generations'
  );

  const finalPrompt = buildFinalPrompt({
    featureKey,
    prompt
  });

  const body = {
    model: modelName || 'cogview-3-flash',
    prompt: finalPrompt,
    size: mapSize(resolution, ratio)
  };

  let res;
  try {
    res = await axios.post(endpoint, body, {
      timeout: Number(params?.timeoutMs || 120000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
    });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    throw new Error(
      `智谱接口请求失败${status ? `（HTTP ${status}）` : ''}：${
        typeof data === 'string'
          ? data
          : JSON.stringify(data || err.message || '未知错误')
      }`
    );
  }

  const imageUrl = res?.data?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error(
      `智谱返回中没有图片地址：${JSON.stringify(res?.data || {}).slice(0, 800)}`
    );
  }

  // 下载到本地 outputs，并返回本地 URL
  return await downloadImage(imageUrl, `zhipu-${featureKey || 'image'}`, { merchantId: params?.merchantId, userId: params?.userId, kind: 'generated' });
}

export default { generate };
