import { workflowRequest } from './workflowHttp.js';

const workflowUrl = id => `/api/admin/workflows/${encodeURIComponent(id)}`;
const queryString = params => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `?${query}` : '';
};

export function createWorkflowRepository({ request = workflowRequest } = {}) {
  return {
    async list(params = {}) {
      return request(`/api/admin/workflows${queryString(params)}`);
    },
    async create(payload) {
      return request('/api/admin/workflows', { method: 'POST', body: JSON.stringify(payload) });
    },
    async get(workflowId) {
      return request(workflowUrl(workflowId));
    },
    async update(workflowId, payload) {
      return request(workflowUrl(workflowId), { method: 'PUT', body: JSON.stringify(payload) });
    },
    async validate(workflowId) {
      return request(`${workflowUrl(workflowId)}/validate`, { method: 'POST' });
    },
    async publish(workflowId) {
      return request(`${workflowUrl(workflowId)}/publish`, { method: 'POST' });
    },
    async disable(workflowId) {
      return request(`${workflowUrl(workflowId)}/disable`, { method: 'POST' });
    },
    async duplicate(workflowId) {
      return request(`${workflowUrl(workflowId)}/duplicate`, { method: 'POST' });
    },
    async remove(workflowId) {
      return request(workflowUrl(workflowId), { method: 'DELETE' });
    },
    async run(workflowId, payload) {
      return request(`/api/workflows/${encodeURIComponent(workflowId)}/runs`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async getRun(runId) {
      return request(`/api/workflow-runs/${encodeURIComponent(runId)}`);
    }
  };
}

export const workflowRepository = createWorkflowRepository();
