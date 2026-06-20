import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createWorkflowRepository } from './workflowRepository.js';

describe('workflow API repository', () => {
  it('maps every repository method to the administrator API', async () => {
    const calls = [];
    const request = async (url, options = {}) => {
      calls.push({ url, options });
      return { id: 'wf-1', items: [], total: 0, page: 1, pageSize: 10, valid: true, errors: [] };
    };
    const repo = createWorkflowRepository({ request });
    const payload = { name: '工作流', code: 'WORKFLOW' };

    await repo.list({ keyword: '商品', status: 'DRAFT', type: 'VIDEO', page: 2, pageSize: 20 });
    await repo.create(payload);
    await repo.get('wf/1');
    await repo.update('wf/1', payload);
    await repo.validate('wf/1');
    await repo.publish('wf/1');
    await repo.disable('wf/1');
    await repo.duplicate('wf/1');
    await repo.remove('wf/1');
    await repo.run('wf/1', { originImageId: 'image-1' });
    await repo.getRun('run/1');

    assert.match(calls[0].url, /^\/api\/admin\/workflows\?/);
    assert.match(calls[0].url, /keyword=%E5%95%86%E5%93%81/);
    assert.deepEqual(calls.slice(1).map(call => [call.url, call.options.method || 'GET']), [
      ['/api/admin/workflows', 'POST'],
      ['/api/admin/workflows/wf%2F1', 'GET'],
      ['/api/admin/workflows/wf%2F1', 'PUT'],
      ['/api/admin/workflows/wf%2F1/validate', 'POST'],
      ['/api/admin/workflows/wf%2F1/publish', 'POST'],
      ['/api/admin/workflows/wf%2F1/disable', 'POST'],
      ['/api/admin/workflows/wf%2F1/duplicate', 'POST'],
      ['/api/admin/workflows/wf%2F1', 'DELETE'],
      ['/api/workflows/wf%2F1/runs', 'POST'],
      ['/api/workflow-runs/run%2F1', 'GET']
    ]);
    assert.equal(calls[1].options.body, JSON.stringify(payload));
    assert.equal(calls[3].options.body, JSON.stringify(payload));
    assert.equal(calls[9].options.body, JSON.stringify({ originImageId: 'image-1' }));
  });

  it('does not access browser local storage', async () => {
    let requested = false;
    const repo = createWorkflowRepository({ request: async () => { requested = true; return { items: [], total: 0 }; } });
    await repo.list();
    assert.equal(requested, true);
    assert.equal('storage' in repo, false);
  });
});
