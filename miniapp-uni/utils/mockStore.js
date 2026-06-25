import { mockResources, mockTasks, mockUser, quotaLogs, announcements, featureTypes } from '../mock/data.js';

const TASKS_KEY = 'miniapp_mock_business_tasks';
const RESOURCE_TO_WORKBENCH_KEY = 'miniapp_resource_to_workbench';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowText() {
  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getMockUser() {
  return clone(mockUser);
}

export function getFeatureTypes() {
  return clone(featureTypes);
}

export function getFeatureByKey(key) {
  return featureTypes.find((item) => item.key === key) || featureTypes[0];
}

export function getMockTasks() {
  const saved = uni.getStorageSync(TASKS_KEY);
  return Array.isArray(saved) && saved.length ? saved : clone(mockTasks);
}

export function saveMockTasks(tasks) {
  uni.setStorageSync(TASKS_KEY, clone(tasks));
}

export function createMockTask(payload = {}) {
  const feature = getFeatureByKey(payload.featureKey);
  const task = {
    id: `T${Date.now()}`,
    title: `${payload.title || '家具商品图'}${feature.name}`,
    featureKey: feature.key,
    apiFeatureKey: feature.apiFeatureKey,
    featureName: feature.name,
    status: 'queued',
    statusText: '等待中',
    cost: Number(feature.cost || 0),
    createdAt: nowText(),
    originImage: payload.originImage || { id: 'mock_origin', thumbText: '原图', name: '家具原图' },
    resultImage: null,
    failReason: '',
    userPrompt: payload.userPrompt || '',
    selectedResource: payload.selectedResource || null,
    params: payload.params || {}
  };
  const tasks = [task, ...getMockTasks()];
  saveMockTasks(tasks);
  return task;
}

export function retryMockTask(taskId) {
  const source = getMockTasks().find((item) => item.id === taskId);
  if (!source) return null;
  return createMockTask({
    title: source.originImage && source.originImage.name ? source.originImage.name : '重新生成',
    featureKey: source.featureKey,
    originImage: source.originImage,
    selectedResource: source.selectedResource || null,
    userPrompt: source.userPrompt || '',
    params: source.params || {}
  });
}

export function getMockResources() {
  return clone(mockResources);
}

export function setWorkbenchResource(resource) {
  uni.setStorageSync(RESOURCE_TO_WORKBENCH_KEY, clone(resource));
}

export function consumeWorkbenchResource() {
  const resource = uni.getStorageSync(RESOURCE_TO_WORKBENCH_KEY);
  if (resource) uni.removeStorageSync(RESOURCE_TO_WORKBENCH_KEY);
  return resource || null;
}

export function getQuotaLogs() {
  return clone(quotaLogs);
}

export function getAnnouncements() {
  return clone(announcements);
}
