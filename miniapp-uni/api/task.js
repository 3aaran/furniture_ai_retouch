import { del, get, post } from '../utils/request.js';

export function createAiTask(payload) {
  return post('/api/ai/tasks', payload, { loadingText: '提交任务' });
}

export function getRecentAiTasks(params = {}, options = {}) {
  return get('/api/ai/tasks/recent', params, options);
}

export function getAiTaskStatus(taskId, options = {}) {
  return get(`/api/ai/tasks/${encodeURIComponent(taskId)}/status`, {}, { showLoading: false, ...options });
}

export function getAiTaskDetail(taskId, options = {}) {
  return get(`/api/ai/tasks/${encodeURIComponent(taskId)}`, {}, options);
}

export function deleteAiTask(taskId) {
  return del(`/api/ai/tasks/${encodeURIComponent(taskId)}`, {}, { loadingText: '删除中' });
}

export function createWorkflowRun(workflowId, originImageId) {
  return post(`/api/workflows/${encodeURIComponent(workflowId)}/runs`, { originImageId }, { loadingText: '提交工作流' });
}

export function getWorkflowRun(runId, options = {}) {
  return get(`/api/workflow-runs/${encodeURIComponent(runId)}`, {}, { showLoading: false, ...options });
}
