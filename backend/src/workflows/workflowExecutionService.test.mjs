import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createExampleWorkflows } from './workflowDomain.js';
import { createWorkflowExecutionService } from './workflowExecutionService.js';

const workflow = () => createExampleWorkflows({
  id: () => 'wf-1',
  now: () => '2026-06-18T00:00:00.000Z'
})[0];

function memoryRunStore() {
  return {
    run: null,
    nodes: [],
    async createRun(run, nodes) { this.run = { ...run }; this.nodes = nodes.map(node => ({ ...node })); },
    async updateRun(id, patch) { Object.assign(this.run, patch); },
    async updateNode(runId, nodeId, patch) { Object.assign(this.nodes.find(node => node.nodeId === nodeId), patch); },
    async getRun() { return { ...this.run, nodes: this.nodes.map(node => ({ ...node })) }; }
  };
}

describe('workflow execution service', () => {
  it('passes the previous result image into the next generation node', async () => {
    const runStore = memoryRunStore();
    const inputs = [];
    const results = ['result-1', 'result-2'];
    const service = createWorkflowExecutionService({
      workflowStore: { get: async () => workflow() },
      runStore,
      submitAiTask: async payload => {
        inputs.push(payload.originImageId);
        return { task: { id: `task-${inputs.length}` } };
      },
      waitForAiTaskCompletion: async () => ({ status: 'succeeded', imageId: results.shift() }),
      id: (() => { let value = 0; return () => `id-${++value}`; })(),
      now: () => '2026-06-18T00:00:00.000Z',
      defer: () => {}
    });
    await service.submit('wf-1', 'origin-1', { id: 'user-1', merchant_id: 'merchant-1' });
    await service.execute('id-1', workflow(), { id: 'user-1', merchant_id: 'merchant-1' });
    assert.deepEqual(inputs, ['origin-1', 'result-1']);
    assert.equal(runStore.run.status, 'succeeded');
    assert.equal(runStore.run.resultImageId, 'result-2');
  });

  it('stops after a failed generation node', async () => {
    const runStore = memoryRunStore();
    let submitted = 0;
    const service = createWorkflowExecutionService({
      workflowStore: { get: async () => workflow() },
      runStore,
      submitAiTask: async () => ({ task: { id: `task-${++submitted}` } }),
      waitForAiTaskCompletion: async taskId => {
        if (taskId === 'task-2') throw new Error('第二节点失败');
        return { status: 'succeeded', imageId: 'result-1' };
      },
      id: (() => { let value = 0; return () => `id-${++value}`; })(),
      now: () => '2026-06-18T00:00:00.000Z',
      defer: () => {}
    });
    await service.submit('wf-1', 'origin-1', { id: 'user-1', merchant_id: 'merchant-1' });
    await service.execute('id-1', workflow(), { id: 'user-1', merchant_id: 'merchant-1' });
    assert.equal(submitted, 2);
    assert.equal(runStore.run.status, 'failed');
    assert.match(runStore.run.errorMessage, /第二节点失败/);
  });
});
