import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMysqlWorkflowStore } from './workflowStore.js';

describe('mysql workflow store', () => {
  it('passes JavaScript Date values to MySQL datetime columns', async () => {
    const calls = [];
    const pool = {
      async query(sql, params = []) {
        calls.push({ sql, params });
        if (sql.startsWith('INSERT INTO workflow_templates')) return [{ affectedRows: 1 }];
        if (sql.startsWith('SELECT * FROM workflow_templates')) return [[{
          id: 'wf-1', name: '工作流', code: 'WF_1', type: 'VIDEO', status: 'DRAFT',
          version: 0, canvas_json: '{}', config_json: '{}',
          created_at: new Date('2026-06-18T00:00:00.000Z'),
          updated_at: new Date('2026-06-18T00:00:00.000Z')
        }]];
        return [[]];
      }
    };
    const store = createMysqlWorkflowStore(pool);
    await store.insert({
      id: 'wf-1', name: '工作流', code: 'WF_1', description: '', type: 'VIDEO', scene: '',
      status: 'DRAFT', version: 0, canvasJson: {}, configJson: {}, isExample: false,
      createdBy: 'admin', updatedBy: 'admin',
      createdAt: '2026-06-18T00:00:00.000Z',
      updatedAt: '2026-06-18T00:00:00.000Z'
    });

    const insert = calls.find(call => call.sql.startsWith('INSERT INTO workflow_templates'));
    assert.ok(insert.params[13] instanceof Date);
    assert.ok(insert.params[14] instanceof Date);
  });
});
