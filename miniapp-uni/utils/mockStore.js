import {
  announcements,
  featureGroups,
  featureTypes,
  mockResources,
  mockTasks,
  mockUser,
  promotionInfo,
  promotionRecords,
  quotaLogs,
  quotaSummary
} from '../mock/data.js';

const TASKS_KEY = 'miniapp_mock_business_tasks';
const RESOURCES_KEY = 'miniapp_mock_business_resources';
const RESOURCE_TO_WORKBENCH_KEY = 'miniapp_resource_to_workbench';

const statusTextMap = {
  queued: '等待中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowText() {
  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resourceTypeText(type) {
  return {
    original: '原图',
    generated: '生成图',
    system: '系统素材',
    merchant: '门店素材',
    personal: '个人素材',
    video: '视频'
  }[type] || '素材';
}

function normalizeImage(image = {}, index = 1) {
  return {
    id: image.id || `img_${Date.now()}_${index}`,
    name: image.name || image.originalName || `家具原图 ${index}`,
    thumbText: image.thumbText || image.name || `图${index}`,
    source: image.source || '工作台',
    resourceId: image.resourceId || image.id || ''
  };
}

function normalizeTask(task = {}) {
  const featureKey = task.type || task.featureKey || 'background_clean';
  const feature = getFeatureByKey(featureKey);
  const status = task.status === 'succeeded' || task.status === 'failed' || task.status === 'queued' || task.status === 'running'
    ? task.status
    : 'running';
  const inputImages = Array.isArray(task.inputImages) && task.inputImages.length
    ? task.inputImages.map(normalizeImage)
    : [task.originImage || { id: 'mock_origin', name: '家具原图', thumbText: '原图' }].map(normalizeImage);
  const resultImages = Array.isArray(task.resultImages) && task.resultImages.length
    ? task.resultImages.map(normalizeImage)
    : task.resultImage
      ? [normalizeImage(task.resultImage)]
      : [];

  return {
    taskId: task.taskId || task.id || `T${Date.now()}`,
    id: task.taskId || task.id || `T${Date.now()}`,
    title: task.title || `${inputImages[0]?.name || '家具图片'}${feature.name}`,
    type: feature.key,
    featureKey: feature.key,
    apiFeatureKey: feature.apiFeatureKey,
    typeName: task.typeName || task.featureName || feature.name,
    featureName: task.typeName || task.featureName || feature.name,
    inputImages,
    originImage: inputImages[0],
    params: task.params || {},
    status,
    statusText: statusTextMap[status],
    progress: Number(task.progress ?? (status === 'succeeded' ? 100 : status === 'running' ? 30 : 0)),
    costQuota: Number(task.costQuota ?? task.cost ?? feature.cost ?? 0),
    cost: Number(task.costQuota ?? task.cost ?? feature.cost ?? 0),
    createdAt: task.createdAt || nowText(),
    resultImages,
    resultImage: resultImages[0] || null,
    errorMessage: task.errorMessage || task.failReason || '',
    failReason: task.errorMessage || task.failReason || '',
    userPrompt: task.userPrompt || '',
    userName: task.userName || mockUser.displayName || mockUser.name,
    selectedResource: task.selectedResource || null,
    completedSynced: Boolean(task.completedSynced)
  };
}

function normalizeResource(resource = {}) {
  const type = resource.type || (resource.sourceType === 'AI_GENERATED' ? 'generated' : 'personal');
  return {
    ...resource,
    id: resource.id || `res_${Date.now()}`,
    name: resource.name || resource.originalName || '家具素材',
    type,
    typeText: resource.typeText || resourceTypeText(type),
    source: resource.source || '本地 mock',
    sourceType: resource.sourceType || (type === 'generated' ? 'AI_GENERATED' : 'RESOURCE'),
    scope: resource.scope || (type === 'system' ? 'SYSTEM' : type === 'merchant' ? 'MERCHANT' : 'USER'),
    resourceType: resource.resourceType || 'user_reference',
    mainCategoryName: resource.mainCategoryName || '产品',
    subCategoryName: resource.subCategoryName || resourceTypeText(type),
    createdAt: resource.createdAt || nowText(),
    thumbText: resource.thumbText || resource.name || resourceTypeText(type),
    sizeText: resource.sizeText || '2.0MB',
    resolution: resource.resolution || '2048x2048',
    relatedTasks: Number(resource.relatedTasks || 0)
  };
}

function taskResultResource(task) {
  const result = task.resultImages[0];
  return normalizeResource({
    id: result.resourceId || `res_${task.taskId}`,
    name: result.name || `${task.typeName}结果图`,
    type: 'generated',
    typeText: '生成图',
    sourceType: 'AI_GENERATED',
    scope: 'MERCHANT',
    source: 'AI 任务结果',
    resourceType: 'user_reference',
    mainCategoryName: '产品',
    subCategoryName: task.typeName,
    createdAt: nowText(),
    thumbText: result.thumbText || '结果',
    desc: `${task.typeName}生成结果`,
    relatedTasks: 1,
    taskId: task.taskId
  });
}

export function getMockUser() {
  return clone(mockUser);
}

export function getFeatureTypes() {
  return clone(featureTypes);
}

export function getBusinessFeatures() {
  return clone(featureTypes.filter((item) => item.group === 'base'));
}

export function getFeatureGroups() {
  return clone(featureGroups);
}

export function getFeatureByKey(key) {
  return featureTypes.find((item) => item.key === key) || featureTypes[0];
}

export function getMockTasks() {
  const saved = uni.getStorageSync(TASKS_KEY);
  const source = Array.isArray(saved) && saved.length ? saved : mockTasks;
  const tasks = source.map(normalizeTask);
  return clone(tasks);
}

export function saveMockTasks(tasks) {
  uni.setStorageSync(TASKS_KEY, clone(tasks.map(normalizeTask)));
}

export function getMockResources() {
  const saved = uni.getStorageSync(RESOURCES_KEY);
  const source = Array.isArray(saved) && saved.length ? saved : mockResources;
  return clone(source.map(normalizeResource));
}

export function saveMockResources(resources) {
  uni.setStorageSync(RESOURCES_KEY, clone(resources.map(normalizeResource)));
}

export function addMockResource(resource) {
  const next = normalizeResource(resource);
  const resources = getMockResources();
  const exists = resources.some((item) => item.id === next.id);
  saveMockResources(exists ? resources.map((item) => item.id === next.id ? next : item) : [next, ...resources]);
  return clone(next);
}

function ensureInputResources(task) {
  task.inputImages.forEach((image, index) => {
    if (String(image.id || '').startsWith('upload_')) {
      addMockResource({
        id: `res_${image.id}`,
        name: image.name,
        type: 'original',
        typeText: '原图',
        sourceType: 'UPLOAD',
        source: '工作台上传',
        resourceType: 'user_reference',
        mainCategoryName: '产品',
        subCategoryName: '家具原图',
        createdAt: task.createdAt,
        thumbText: image.thumbText || `原图${index + 1}`,
        relatedTasks: 1
      });
    }
  });
}

export function createMockTask(payload = {}) {
  const feature = getFeatureByKey(payload.featureKey || payload.type);
  const inputImages = (payload.inputImages && payload.inputImages.length ? payload.inputImages : [payload.originImage]).filter(Boolean).map(normalizeImage);
  const task = normalizeTask({
    taskId: `T${Date.now()}`,
    title: payload.title || `${inputImages[0]?.name || '家具图片'}${feature.name}`,
    type: feature.key,
    typeName: feature.name,
    inputImages,
    params: payload.params || {},
    status: 'running',
    progress: 0,
    costQuota: Number(feature.cost || 0),
    createdAt: nowText(),
    resultImages: [],
    errorMessage: '',
    userPrompt: payload.userPrompt || '',
    selectedResource: payload.selectedResource || null
  });
  ensureInputResources(task);
  saveMockTasks([task, ...getMockTasks()]);
  return clone(task);
}

export function retryMockTask(taskId) {
  const source = getMockTasks().find((item) => item.taskId === taskId || item.id === taskId);
  if (!source) return null;
  return createMockTask({
    title: source.title || '重新生成',
    featureKey: source.type,
    inputImages: source.inputImages,
    selectedResource: source.selectedResource || null,
    userPrompt: source.userPrompt || '',
    params: source.params || {}
  });
}

export function completeMockTask(task) {
  const normalized = normalizeTask(task);
  const resultId = `result_${normalized.taskId}`;
  normalized.status = 'succeeded';
  normalized.statusText = statusTextMap.succeeded;
  normalized.progress = 100;
  normalized.errorMessage = '';
  normalized.failReason = '';
  normalized.resultImages = [
    {
      id: resultId,
      name: `${normalized.typeName}结果图`,
      thumbText: '结果',
      source: 'AI 任务结果',
      resourceId: `res_${normalized.taskId}`
    }
  ];
  normalized.resultImage = normalized.resultImages[0];
  if (!normalized.completedSynced) {
    addMockResource(taskResultResource(normalized));
    normalized.completedSynced = true;
  }
  return normalized;
}

export function advanceMockTasks() {
  const next = getMockTasks().map((task) => {
    if (task.status !== 'running') return task;
    if (task.progress < 30) return { ...task, progress: 30, statusText: '生成中' };
    if (task.progress < 70) return { ...task, progress: 70, statusText: '生成中' };
    return completeMockTask(task);
  });
  saveMockTasks(next);
  return clone(next);
}

export function setWorkbenchResource(resource) {
  uni.setStorageSync(RESOURCE_TO_WORKBENCH_KEY, clone(normalizeResource(resource)));
}

export function consumeWorkbenchResource() {
  const resource = uni.getStorageSync(RESOURCE_TO_WORKBENCH_KEY);
  if (resource) uni.removeStorageSync(RESOURCE_TO_WORKBENCH_KEY);
  return resource ? normalizeResource(resource) : null;
}

export function getQuotaLogs() {
  return clone(quotaLogs);
}

export function getQuotaSummary() {
  return clone(quotaSummary);
}

export function getAnnouncements() {
  return clone(announcements);
}

export function getPromotionInfo() {
  return clone(promotionInfo);
}

export function getPromotionRecords() {
  return clone(promotionRecords);
}
