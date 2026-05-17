import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { saveBufferToStorage, urlToDiskPath } from './services/storageService.js';

function readAppConfigValue(key, fallback = '') {
  try {
    const config = JSON.parse(fs.readFileSync(new URL('../../frontend/src/config/appConfig.json', import.meta.url), 'utf8'));
    return String(config[key] || fallback || '').trim();
  } catch {
    return fallback;
  }
}

export const quotaCost = {
  remove_bg: 1,
  replace_bg: 2,
  enhance: 1,
  recolor: 2,
  material: 2,
  multiview: 5,
  lineart: 1,
  watermark: 0
};

async function saveBuffer(buffer, op, ext = 'png', context = {}) {
  return (await saveBufferToStorage(buffer, {
    merchantId: context.merchantId,
    userId: context.userId,
    kind: context.kind || 'generated',
    op,
    ext
  })).url;
}

async function copyMock(inputPath, op, context = {}) {
  const buffer = await sharp(inputPath).png().toBuffer();
  return saveBuffer(buffer, op, 'png', context);
}

async function localEnhance(inputPath, context = {}) {
  const buffer = await sharp(inputPath)
    .modulate({ brightness: 1.05, saturation: 1.08 })
    .sharpen()
    .png()
    .toBuffer();
  return saveBuffer(buffer, 'local-enhance', 'png', context);
}

async function localRecolor(inputPath, prompt = '', context = {}) {
  const text = String(prompt || '').toLowerCase();
  let tint = null;
  if (text.includes('红') || text.includes('red')) tint = { r: 180, g: 80, b: 80 };
  if (text.includes('蓝') || text.includes('blue')) tint = { r: 80, g: 110, b: 190 };
  if (text.includes('绿') || text.includes('green')) tint = { r: 90, g: 150, b: 100 };
  if (text.includes('白') || text.includes('white')) tint = { r: 235, g: 235, b: 235 };
  if (text.includes('黑') || text.includes('black')) tint = { r: 45, g: 45, b: 45 };
  if (!tint) return copyMock(inputPath, 'local-recolor', context);
  const buffer = await sharp(inputPath).tint(tint).png().toBuffer();
  return saveBuffer(buffer, 'local-recolor', 'png', context);
}

async function getBaiduAccessToken() {
  if (!process.env.BAIDU_API_KEY || !process.env.BAIDU_SECRET_KEY) {
    throw new Error('缺少 BAIDU_API_KEY 或 BAIDU_SECRET_KEY');
  }
  const url = 'https://aip.baidubce.com/oauth/2.0/token';
  const res = await axios.post(url, null, {
    params: {
      grant_type: 'client_credentials',
      client_id: process.env.BAIDU_API_KEY,
      client_secret: process.env.BAIDU_SECRET_KEY
    }
  });
  if (!res.data?.access_token) {
    throw new Error(`获取百度 access_token 失败：${JSON.stringify(res.data)}`);
  }
  return res.data.access_token;
}

async function baiduRemoveBg(inputPath, context = {}) {
  const token = await getBaiduAccessToken();
  const image = fs.readFileSync(inputPath).toString('base64');
  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/image-process/v1/segment?access_token=${encodeURIComponent(token)}`,
    { image, method: 'auto', refine_mask: 'true', return_form: 'rgba' },
    { headers: { 'Content-Type': 'application/json;charset=UTF-8' }, timeout: 60000 }
  );
  if (res.data?.error_code) {
    throw new Error(`百度智能抠图失败：${res.data.error_msg || res.data.error_code}`);
  }
  if (!res.data?.image) throw new Error(`百度智能抠图未返回图片：${JSON.stringify(res.data)}`);
  return saveBuffer(Buffer.from(res.data.image, 'base64'), 'baidu-remove-bg', 'png', context);
}

function toPublicUrl(localUrl) {
  if (!process.env.PUBLIC_BASE_URL) return null;
  return `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}${localUrl}`;
}

async function downloadRemoteImage(url, op, context = {}) {
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
  return saveBuffer(Buffer.from(r.data), op, 'png', context);
}

function extractDashscopeImageUrl(data) {
  const resultUrl = data?.output?.results?.find?.(x => x.url)?.url;
  if (resultUrl) return resultUrl;
  const content = data?.output?.choices?.[0]?.message?.content || [];
  const img = content.find(x => x.type === 'image' && x.image);
  return img?.image || null;
}

async function dashscopeSyncImageEdit({ imagePath, operation, prompt, context = {} }) {
  if (!process.env.DASHSCOPE_API_KEY) throw new Error('缺少 DASHSCOPE_API_KEY');
  const publicUrl = toPublicUrlFromImagePath(imagePath);
  if (!publicUrl) throw new Error('调用通义万相需要 PUBLIC_BASE_URL，确保上传图片可被公网访问');

  const textMap = {
    enhance: '提升这张家具商品图的清晰度、光影和质感，保持家具主体不变，生成适合电商展示的图片',
    recolor: `修改家具颜色，要求：${prompt || '更适合电商展示'}，保持形状和结构不变`,
    material: `修改家具材质，要求：${prompt || '更高级的家具材质'}，保持形状和结构不变`,
    multiview: `根据这张家具图生成一个新的展示角度，要求：${prompt || '45度斜侧面商品展示图'}，保持家具外观一致`,
    replace_bg: `为这张家具商品图生成新的背景，要求：${prompt || '现代简约客厅背景，真实电商摄影风格'}`
  };

  const res = await axios.post(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    {
      model: 'wan2.6-image',
      input: {
        messages: [{
          role: 'user',
          content: [{ text: textMap[operation] || prompt || '优化这张家具图片' }, { image: publicUrl }]
        }]
      },
      parameters: { prompt_extend: true, watermark: false, n: 1, enable_interleave: false, size: '1K' }
    },
    { headers: { Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 180000 }
  );
  const imageUrl = extractDashscopeImageUrl(res.data);
  if (!imageUrl) throw new Error(`通义万相未返回图片：${JSON.stringify(res.data)}`);
  return downloadRemoteImage(imageUrl, `dashscope-${operation}`, context);
}

async function dashscopeBackgroundGeneration({ imagePath, prompt, context = {} }) {
  if (!process.env.DASHSCOPE_API_KEY) throw new Error('缺少 DASHSCOPE_API_KEY');
  const publicUrl = toPublicUrlFromImagePath(imagePath);
  if (!publicUrl) throw new Error('调用通义万相背景生成需要 PUBLIC_BASE_URL，确保上传图片可被公网访问');

  const create = await axios.post(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/background-generation/generation/',
    {
      model: 'wanx-background-generation-v2',
      input: { base_image_url: publicUrl, ref_prompt: prompt || '现代简约客厅，真实家具电商摄影背景' },
      parameters: { model_version: 'v3', n: 1 }
    },
    { headers: { 'X-DashScope-Async': 'enable', Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 60000 }
  );
  const taskId = create.data?.output?.task_id;
  if (!taskId) throw new Error(`创建通义万相背景生成任务失败：${JSON.stringify(create.data)}`);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await axios.get(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}` }, timeout: 30000
    });
    const s = status.data?.output?.task_status;
    if (s === 'SUCCEEDED') {
      const imageUrl = status.data?.output?.results?.find?.(x => x.url)?.url;
      if (!imageUrl) throw new Error(`背景生成成功但未返回URL：${JSON.stringify(status.data)}`);
      return downloadRemoteImage(imageUrl, 'dashscope-background', context);
    }
    if (s === 'FAILED') throw new Error(`通义万相背景生成失败：${JSON.stringify(status.data?.output)}`);
  }
  throw new Error('通义万相背景生成超时，请稍后重试');
}

function toPublicUrlFromImagePath(imagePath) {
  if (!process.env.PUBLIC_BASE_URL) return null;
  const root = process.cwd().replace(/\\/g, '/');
  const normalized = String(imagePath || '').replace(/\\/g, '/');
  let publicPath = '';
  if (normalized.includes('/storage/')) {
    publicPath = '/files/' + normalized.split('/storage/').pop();
  } else if (normalized.startsWith(root)) {
    publicPath = normalized.slice(root.length);
  }
  if (!publicPath.startsWith('/')) publicPath = '/' + publicPath;
  return `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}${publicPath}`;
}

export async function runAi({ operation, imagePath, prompt, merchantId = null, userId = null }) {
  const context = { merchantId, userId, kind: 'generated' };
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  if ((provider === 'baidu' || provider === 'baidu_cutout') && operation === 'remove_bg') {
    return baiduRemoveBg(imagePath, context);
  }

  if (['aliyun','dashscope','tongyi','wanx'].includes(provider) && process.env.DASHSCOPE_API_KEY) {
    if (operation === 'replace_bg') return dashscopeBackgroundGeneration({ imagePath, prompt, context });
    if (['enhance', 'recolor', 'material', 'multiview'].includes(operation)) {
      return dashscopeSyncImageEdit({ imagePath, operation, prompt, context });
    }
    if (operation === 'remove_bg' && process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
      return baiduRemoveBg(imagePath, context);
    }
  }

  if (['aliyun','dashscope','tongyi','wanx'].includes(provider) && !process.env.DASHSCOPE_API_KEY && String(process.env.ALLOW_AI_FALLBACK || 'true') !== 'true') {
    throw new Error('当前设置为阿里云AI，但缺少 DASHSCOPE_API_KEY');
  }

  // 无 Key 时仍可演示完整业务流程：抠图/换背景等不报错，方便先验收页面和权限。
  if (operation === 'enhance') return localEnhance(imagePath, context);
  if (operation === 'recolor' || operation === 'material') return localRecolor(imagePath, prompt, context);
  if (operation === 'lineart') return localEnhance(imagePath, context);
  return copyMock(imagePath, `${operation}-mock`, context);
}


export async function applyWatermark({ imagePath, config }) {
  const meta = await sharp(imagePath).metadata();
  const width = meta.width || 1000;
  const height = meta.height || 800;
  if(config.mode !== 'text' && config.image){
    const raw=String(config.image);
    let markBuffer=null;
    if(raw.startsWith('data:image/')){
      const comma=raw.indexOf(',');
      if(comma>=0) markBuffer=Buffer.from(raw.slice(comma+1),'base64');
    }else if(raw.startsWith('/')){
      const localPath=urlToDiskPath(raw);
      if(localPath&&fs.existsSync(localPath)) markBuffer=fs.readFileSync(localPath);
    }
    if(!markBuffer) return imagePath;
    const widthPercent=Math.max(5,Math.min(60,Number(config.widthPercent||23.5)));
    const markWidth=Math.max(1,Math.round(width*widthPercent/100));
    const opacityRaw=Number(config.opacity??100);
    const markOpacity=Math.max(0,Math.min(1,opacityRaw>1?opacityRaw/100:opacityRaw));
    const resized=await sharp(markBuffer).resize({width:markWidth,withoutEnlargement:true}).png().toBuffer();
    const markMeta=await sharp(resized).metadata();
    const mw=markMeta.width||markWidth;
    const mh=markMeta.height||Math.round(markWidth/3);
    const x=Number(config.offsetX||0);
    const y=Number(config.offsetY||0);
    const pos=String(config.position||'center');
    const horizontal=pos.endsWith('-right')?'right':pos.endsWith('-left')?'left':'center';
    const vertical=pos.startsWith('top-')?'top':pos.startsWith('bottom-')?'bottom':'center';
    const left=horizontal==='right'?width-mw-x:horizontal==='left'?x:Math.round((width-mw)/2+x);
    const top=vertical==='bottom'?height-mh-y:vertical==='top'?y:Math.round((height-mh)/2+y);
    const input=markOpacity<1
      ? await sharp(resized).composite([{input:Buffer.from([255,255,255,Math.round(markOpacity*255)]),raw:{width:1,height:1,channels:4},tile:true,blend:'dest-in'}]).png().toBuffer()
      : resized;
    const out = await sharp(imagePath).composite([{input,left:Math.max(0,left),top:Math.max(0,top)}]).png().toBuffer();
    return saveBuffer(out, 'watermark', 'png', { kind: 'generated' });
  }
  const text = String(config.text || readAppConfigValue('watermarkText', '家具修图')).replace(/[<>&]/g, '');
  const subText = String(config.subText || '').replace(/[<>&]/g, '');
  const fontSize = Number(config.fontSize || 42);
  const opacity = Math.max(0, Math.min(1, Number(config.opacity ?? 0.36)));
  const color = config.color || '#f1d88b';
  const accent = config.accent || '#ffffff';
  const pos = config.position || 'bottom-right';
  const style = config.style || 'signature';
  const rotate = Number(config.rotate || 0);
  const margin = Math.max(24, Number(config.margin || 46));
  const gap = Math.max(80, Number(config.gap || 220));

  function xy(w, h) {
    if (pos === 'top-left') return [margin, margin];
    if (pos === 'top-center') return [(width - w) / 2, margin];
    if (pos === 'top-right') return [width - w - margin, margin];
    if (pos === 'middle-left' || pos === 'center-left') return [margin, (height - h) / 2];
    if (pos === 'center') return [(width - w) / 2, (height - h) / 2];
    if (pos === 'middle-right' || pos === 'center-right') return [width - w - margin, (height - h) / 2];
    if (pos === 'bottom-left') return [margin, height - h - margin];
    if (pos === 'bottom-center') return [(width - w) / 2, height - h - margin];
    return [width - w - margin, height - h - margin];
  }

  let svg = '';
  if (style === 'tile') {
    const patternId = 'wmPattern';
    svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="${patternId}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rotate})">
        <text x="20" y="${gap/2}" font-size="${fontSize}" fill="${color}" font-family="Arial, Microsoft YaHei" font-weight="800" opacity="${opacity}">${text}</text>
      </pattern></defs><rect width="100%" height="100%" fill="url(#${patternId})"/></svg>`;
  } else if (style === 'badge') {
    const w = Math.min(width - margin*2, Math.max(260, text.length * fontSize * 0.72 + 110));
    const h = subText ? fontSize * 2.35 : fontSize * 1.75;
    const [x,y]=xy(w,h);
    svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g opacity="${opacity}" transform="rotate(${rotate} ${x+w/2} ${y+h/2})">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" fill="rgba(10,10,10,.72)" stroke="${color}" stroke-width="2"/>
        <circle cx="${x+34}" cy="${y+h/2}" r="10" fill="${color}"/>
        <text x="${x+58}" y="${y+fontSize*1.08}" font-size="${fontSize}" fill="${accent}" font-family="Arial, Microsoft YaHei" font-weight="900">${text}</text>
        ${subText?`<text x="${x+58}" y="${y+fontSize*1.72}" font-size="${fontSize*.44}" fill="${color}" font-family="Arial, Microsoft YaHei" font-weight="600">${subText}</text>`:''}
      </g></svg>`;
  } else if (style === 'corner') {
    const w = Math.max(260, text.length * fontSize * 0.68 + 54), h = subText ? fontSize*2.15 : fontSize*1.45;
    const [x,y]=xy(w,h);
    svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g opacity="${opacity}" transform="rotate(${rotate} ${x+w/2} ${y+h/2})">
        <path d="M${x} ${y+h} L${x} ${y+18} Q${x} ${y} ${x+18} ${y} L${x+w*.42} ${y}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
        <text x="${x+22}" y="${y+fontSize}" font-size="${fontSize}" fill="${color}" font-family="Georgia, Microsoft YaHei" font-weight="900">${text}</text>
        ${subText?`<text x="${x+24}" y="${y+fontSize*1.55}" font-size="${fontSize*.42}" fill="${accent}" font-family="Arial, Microsoft YaHei">${subText}</text>`:''}
      </g></svg>`;
  } else {
    const w = Math.max(260, text.length * fontSize * 0.64 + 40), h = subText ? fontSize*2.0 : fontSize*1.35;
    const [x,y]=xy(w,h);
    svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g opacity="${opacity}" transform="rotate(${rotate} ${x+w/2} ${y+h/2})">
        <text x="${x}" y="${y+fontSize}" font-size="${fontSize}" fill="${color}" font-family="Georgia, Microsoft YaHei" font-weight="900" letter-spacing="1">${text}</text>
        <line x1="${x}" y1="${y+fontSize+12}" x2="${x+w*.72}" y2="${y+fontSize+12}" stroke="${color}" stroke-width="3"/>
        ${subText?`<text x="${x}" y="${y+fontSize*1.55}" font-size="${fontSize*.42}" fill="${accent}" font-family="Arial, Microsoft YaHei">${subText}</text>`:''}
      </g></svg>`;
  }
  const out = await sharp(imagePath).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  return saveBuffer(out, 'watermark', 'png', { kind: 'generated' });
}
