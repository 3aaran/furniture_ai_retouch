import axios from 'axios';
import { buildCommonPayload, downloadImage, joinUrl, pickBase64, pickImage, saveBuffer } from './utils.js';

export async function generate({ provider, modelName, baseUrl, apiPath, apiKey, timeoutMs, featureKey, imagePath, referenceImagePaths = [], prompt, resolution, ratio, merchantId = null, userId = null }) {
  if (!baseUrl) throw new Error('缺少 AI Base URL');
  const endpoint = joinUrl(baseUrl, apiPath);
  const payload = buildCommonPayload({ provider, modelName, featureKey, prompt, imagePath, referenceImagePaths, resolution, ratio });

  const res = await axios.post(endpoint, payload, {
    timeout: Number(timeoutMs || 120000),
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {})
    }
  });

  const b64 = pickBase64(res.data);
  if (b64) {
    return saveBuffer(Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ''), 'base64'), `${provider}-${featureKey}`, 'png', {merchantId,userId,kind:'generated'});
  }

  const imgUrl = pickImage(res.data);
  if (imgUrl) {
    return downloadImage(imgUrl, `${provider}-${featureKey}`, {merchantId,userId,kind:'generated'});
  }

  throw new Error(`模型接口未返回图片 URL 或 Base64：${JSON.stringify(res.data).slice(0, 800)}`);
}

export default { generate };
