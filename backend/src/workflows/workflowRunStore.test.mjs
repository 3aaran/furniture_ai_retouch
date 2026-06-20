import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMysqlWorkflowRunStore } from './workflowRunStore.js';

describe('workflow run store', () => {
  it('creates updates and reads runs with ordered nodes', async () => {
    const calls = [];
    const pool = {
      async query(sql, params = []) {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT * FROM workflow_runs')) return [[{
          id: 'run-1',
          workflow_template_id: 'wf-1',
          user_id: 'user-1',
          merchant_id: 'merchant-1',
          status: 'running',
          origin_image_id: 'image-1',
          result_image_id: null,
          current_node_id: 'node-1',
          error_message: null,
          created_at: new Date('2026-06-18T00:00:00.000Z')
        }]];
        if (sql.includes('FROM workflow_run_nodes')) return [[{
          id: 'rn-1',
          workflow_run_id: 'run-1',
          node_id: 'node-1',
          node_type: 'PHOTO_ENHANCE',
          feature_key: 'enhance',
          status: 'running',
          sort_order: 2
        }]];
        return [{ affectedRows: 1 }];
      }
    };
    const store = createMysqlWorkflowRunStore(pool);
    await store.createRun({
      id: 'run-1',
      workflowTemplateId: 'wf-1',
      userId: 'user-1',
      merchantId: 'merchant-1',
      status: 'queued',
      originImageId: 'image-1',
      createdAt: '2026-06-18T00:00:00.000Z'
    }, [{ id: 'rn-1', nodeId: 'node-1', nodeType: 'PHOTO_ENHANCE', featureKey: 'enhance', status: 'pending', sortOrder: 2 }]);
    await store.updateRun('run-1', { status: 'running', currentNodeId: 'node-1' });
    await store.updateNode('run-1', 'node-1', { status: 'running', inputImageId: 'image-1', aiTaskId: 'task-1' });
    const run = await store.getRun('run-1');
    assert.equal(run.id, 'run-1');
    assert.equal(run.nodes[0].nodeId, 'node-1');
    assert.ok(calls.some(call => call.sql.startsWith('INSERT INTO workflow_runs')));
    assert.ok(calls.some(call => call.sql.startsWith('INSERT INTO workflow_run_nodes')));
    assert.ok(calls.some(call => call.sql.startsWith('UPDATE workflow_runs')));
    assert.ok(calls.some(call => call.sql.startsWith('UPDATE workflow_run_nodes')));
  });
});
