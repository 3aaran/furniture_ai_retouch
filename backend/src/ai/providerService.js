import mockAdapter from './adapters/mock.js';
import customAdapter from './adapters/custom.js';
import zhipuAdapter from './adapters/zhipu.js';
import gptImage2Adapter from './adapters/gpt-image-2.js';
import aliyunAdapter from './adapters/aliyun.js';
import jimengAdapter from './adapters/jimeng.js';

/**
 * 统一的 provider 适配器映射
 * 以后如果新增平台，只需要：
 * 1. 新增 adapters/xxx.js
 * 2. 在这里注册
 */
const providerMap = {
  mock: mockAdapter,
  local: mockAdapter,
  demo: mockAdapter,

  custom: customAdapter,

  zhipu: zhipuAdapter,
  bigmodel: zhipuAdapter,
  bigmodelcn: zhipuAdapter,
  'bigmodel.cn': zhipuAdapter,
  zhipuai: zhipuAdapter,
  cogview: zhipuAdapter,
  glm: zhipuAdapter,

  'gpt-image-2': gptImage2Adapter,
  gptimage2: gptImage2Adapter,
  openai: gptImage2Adapter,
  gptimage: gptImage2Adapter,

  aliyun: aliyunAdapter,
  tongyi: aliyunAdapter,
  wanx: aliyunAdapter,
  wanxiang: aliyunAdapter,

  jimeng: jimengAdapter,
  volcengine: jimengAdapter,
  volc: jimengAdapter
};

/**
 * 读取配置字段，兼容 snake_case / camelCase
 */
function readValue(obj, ...keys) {
  if (!obj) return '';
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return '';
}

/**
 * 去掉空白
 */
function clean(v) {
  return String(v || '').trim();
}

/**
 * 判断一个功能配置值是否应该视为“未单独配置”
 */
function isEmptyFeatureValue(v) {
  const s = clean(v).toLowerCase();
  return (
    !s ||
    s === 'mock' ||
    s === '本地模拟模型' ||
    s === '本地模拟' ||
    s === 'local-mock-model' ||
    s === 'local' ||
    s === 'demo'
  );
}

/**
 * 根据 provider 给默认 API Path
 * 这样即使前端功能行里没填 API Path，也能自动补默认值
 */
function getDefaultApiPath(provider) {
  const p = clean(provider).toLowerCase();

  if (p === 'zhipu' || p === 'cogview' || p === 'glm' || p === 'bigmodel' || p === 'bigmodelcn' || p === 'bigmodel.cn' || p === 'zhipuai') {
    return '/api/paas/v4/images/generations';
  }

  if (p === 'gpt-image-2' || p === 'gptimage2' || p === 'openai' || p === 'gptimage') {
    return '/v1/media/generate';
  }

  // 下面两个先给常用占位值，后续如果你接真实平台专用格式，只改对应 adapter 即可
  if (p === 'aliyun' || p === 'tongyi' || p === 'wanx' || p === 'wanxiang') {
    return '';
  }

  if (p === 'jimeng' || p === 'volcengine' || p === 'volc') {
    return '';
  }

  if (p === 'custom') {
    return '';
  }

  return '';
}

/**
 * 解析最终 Provider
 * 优先级：功能配置 > 全局配置 > mock
 */
function resolveProvider(featureConfig, providerConfig) {
  const featureProvider = clean(
    readValue(featureConfig, 'provider')
  ).toLowerCase();

  if (!isEmptyFeatureValue(featureProvider)) {
    return featureProvider;
  }

  const globalProvider = clean(
    readValue(providerConfig, 'provider')
  ).toLowerCase();

  if (globalProvider) {
    return globalProvider;
  }

  return 'mock';
}

/**
 * 解析最终模型名
 * 优先级：功能配置 > 全局默认模型 > 空
 */
function resolveModel(featureConfig, providerConfig) {
  const featureModel = clean(
    readValue(featureConfig, 'model_name', 'modelName')
  );

  if (!isEmptyFeatureValue(featureModel)) {
    return featureModel;
  }

  const globalModel = clean(
    readValue(providerConfig, 'default_model', 'defaultModel')
  );

  return globalModel;
}

/**
 * 解析最终 API Path
 * 优先级：
 * 1. 功能配置 api_path
 * 2. 全局 default_api_path（如果你后面数据库加了这个字段）
 * 3. 按 provider 自动给默认值
 */
function resolveApiPath(featureConfig, providerConfig, provider) {
  const featurePath = clean(
    readValue(featureConfig, 'api_path', 'apiPath')
  );

  if (featurePath) {
    return featurePath;
  }

  const globalPath = clean(
    readValue(providerConfig, 'default_api_path', 'defaultApiPath', 'api_path', 'apiPath')
  );

  if (globalPath) {
    return globalPath;
  }

  return getDefaultApiPath(provider);
}

/**
 * 解析基础地址
 */
function resolveBaseUrl(providerConfig) {
  return clean(
    readValue(providerConfig, 'base_url', 'baseUrl')
  );
}

/**
 * 解析 API Key
 */
function resolveApiKey(providerConfig) {
  return clean(
    readValue(providerConfig, 'api_key', 'apiKey')
  );
}

/**
 * 解析超时时间
 */
function resolveTimeoutMs(providerConfig) {
  const raw = readValue(providerConfig, 'timeout_ms', 'timeoutMs');
  const n = Number(raw || 120000);
  return Number.isFinite(n) && n > 0 ? n : 120000;
}

/**
 * 主调用入口
 * taskService / taskWorker 只需要调这个方法，不要关心具体平台
 */
export async function callImageModel({
  providerConfig,
  featureConfig,
  featureKey,
  imagePath,
  imageUrl,
  referenceImagePaths = [],
  referenceImageUrls = [],
  prompt,
  resolution,
  ratio,
  merchantId = null,
  userId = null
}) {
  const provider = resolveProvider(featureConfig, providerConfig);
  const modelName = resolveModel(featureConfig, providerConfig);
  const baseUrl = resolveBaseUrl(providerConfig);
  const apiKey = resolveApiKey(providerConfig);
  const apiPath = resolveApiPath(featureConfig, providerConfig, provider);
  const timeoutMs = resolveTimeoutMs(providerConfig);

  const adapter = providerMap[provider] || customAdapter;

  return await adapter.generate({
    provider,
    modelName,
    baseUrl,
    apiPath,
    apiKey,
    timeoutMs,
    featureKey,
    imagePath,
    imageUrl,
    referenceImagePaths,
    referenceImageUrls,
    prompt,
    resolution,
    ratio,
    merchantId,
    userId
  });
}

/**
 * 暴露解析后的配置，方便调试
 */
export function resolveAiRuntimeConfig(providerConfig, featureConfig) {
  const provider = resolveProvider(featureConfig, providerConfig);
  const modelName = resolveModel(featureConfig, providerConfig);
  const baseUrl = resolveBaseUrl(providerConfig);
  const apiKey = resolveApiKey(providerConfig);
  const apiPath = resolveApiPath(featureConfig, providerConfig, provider);
  const timeoutMs = resolveTimeoutMs(providerConfig);

  return {
    provider,
    modelName,
    baseUrl,
    apiKey,
    apiPath,
    timeoutMs
  };
}

export default {
  callImageModel,
  resolveAiRuntimeConfig
};
