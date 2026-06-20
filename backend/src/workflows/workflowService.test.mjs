import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createExampleWorkflows } from './workflowDomain.js';
import { createWorkflowService } from './workflowService.js';

function createMemoryStore(seed = []) {
  const rows = seed.map(item => structuredClone(item));
  return {
    rows,
    async list({ keyword = '', status = '', type = '', page, pageSize }) {
      const needle = keyword.toLowerCase();
      const filtered = rows.filter(item =>
        (!needle || [item.name, item.code, item.description, item.scene].some(value => String(value || '').toLowerCase().includes(needle))) &&
        (!status || item.status === status) &&
        (!type || item.type === type)
      );
      return { items: structuredClone(filtered.slice((page - 1) * pageSize, page * pageSize)), total: filtered.length };
    },
    async get(id) { return structuredClone(rows.find(item => item.id === id) || null); },
    async codeExists(code, excludeId = '') { return rows.some(item => item.code === code && item.id !== excludeId); },
    async insert(item) { rows.push(structuredClone(item)); return structuredClone(item); },
    async update(id, patch) {
      const index = rows.findIndex(item => item.id === id);
      if (index < 0) return null;
      rows[index] = { ...rows[index], ...structuredClone(patch) };
      return structuredClone(rows[index]);
    },
    async remove(id) {
      const index = rows.findIndex(item => item.id === id);
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    }
  };
}

const examples = () => {
  let index = 0;
  return createExampleWorkflows({
    id: () => `wf-${++index}`,
    now: () => '2026-06-18T00:00:00.000Z'
  });
};

describe('workflow service', () => {
  it('supports list, create, direct update, publish, disable, duplicate and delete', async () => {
    const store = createMemoryStore(examples());
    let idIndex = 10;
    const service = createWorkflowService({
      store,
      id: () => `wf-${++idIndex}`,
      now: () => '2026-06-18T02:00:00.000Z'
    });

    const listed = await service.list({ keyword: '电商', page: 1, pageSize: 10 });
    assert.equal(listed.total, 1);

    const payload = structuredClone(store.rows[1]);
    payload.code = 'NEW_WORKFLOW';
    payload.name = '新工作流';
    const created = await service.create(payload, 'admin-1');
    assert.equal(created.status, 'DRAFT');
    assert.equal(created.createdBy, 'admin-1');

    const published = await service.publish(created.id, 'admin-1');
    assert.equal(published.status, 'PUBLISHED');
    assert.equal(published.version, 1);

    const updated = await service.update(created.id, { ...published, name: '直接修改已发布工作流' }, 'admin-1');
    assert.equal(updated.name, '直接修改已发布工作流');
    assert.equal(updated.status, 'PUBLISHED');
    assert.equal(updated.version, 1);

    const disabled = await service.disable(created.id, 'admin-1');
    assert.equal(disabled.status, 'DISABLED');

    const duplicated = await service.duplicate(created.id, 'admin-1');
    assert.equal(duplicated.status, 'DRAFT');
    assert.equal(duplicated.version, 0);
    assert.notEqual(duplicated.code, created.code);

    assert.deepEqual(await service.remove(created.id), { message: '工作流已删除' });
    await assert.rejects(() => service.get(created.id), error => error.code === 'WORKFLOW_NOT_FOUND');
  });

  it('rejects duplicate codes and invalid publishing', async () => {
    const store = createMemoryStore(examples());
    const service = createWorkflowService({ store, id: () => 'wf-new', now: () => '2026-06-18T02:00:00.000Z' });
    const duplicate = structuredClone(store.rows[0]);
    duplicate.id = 'client-id';
    await assert.rejects(() => service.create(duplicate, 'admin-1'), error => error.code === 'WORKFLOW_CODE_EXISTS');

    const invalid = structuredClone(store.rows[1]);
    invalid.id = 'wf-invalid';
    invalid.code = 'INVALID_WORKFLOW';
    invalid.canvasJson.edges = [];
    await store.insert(invalid);
    await assert.rejects(() => service.publish(invalid.id, 'admin-1'), error =>
      error.code === 'WORKFLOW_VALIDATION_FAILED' && error.details.valid === false
    );
  });
});
