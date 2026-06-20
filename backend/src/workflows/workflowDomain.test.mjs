import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createExampleWorkflows,
  normalizeWorkflowInput,
  validateWorkflow,
  workflowFromRow
} from './workflowDomain.js';

const validWorkflow = () => createExampleWorkflows({
  id: () => 'wf-example',
  now: () => '2026-06-18T00:00:00.000Z'
})[0];

describe('workflow domain', () => {
  it('normalizes editable workflow fields without trusting audit fields', () => {
    const normalized = normalizeWorkflowInput({
      id: 'client-id',
      name: '  商品视频  ',
      code: ' product video ',
      description: ' 说明 ',
      type: 'video',
      scene: ' 商品展示 ',
      status: 'DISABLED',
      version: 99,
      canvasJson: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      configJson: { schemaVersion: 1, executionMode: 'SEQUENTIAL', entryNodeId: null }
    });

    assert.equal(normalized.name, '商品视频');
    assert.equal(normalized.code, 'PRODUCT_VIDEO');
    assert.equal(normalized.type, 'IMAGE');
    assert.equal(normalized.scene, '商品展示');
    assert.equal('id' in normalized, false);
    assert.equal('status' in normalized, false);
    assert.equal('version' in normalized, false);
  });

  it('accepts the seeded example workflow', () => {
    assert.deepEqual(validateWorkflow(validWorkflow()), { valid: true, errors: [] });
  });

  it('rejects legacy nodes and branching image workflows', () => {
    const workflow = validWorkflow();
    const start = workflow.canvasJson.nodes[0];
    const output = workflow.canvasJson.nodes.at(-1);
    workflow.canvasJson.nodes.push({
      id: 'legacy',
      type: 'workflowNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'VIDEO_GENERATE', label: '旧节点', config: {} }
    });
    workflow.canvasJson.edges.push(
      { id: 'branch', source: start.id, target: output.id },
      { id: 'legacy-edge', source: output.id, target: 'legacy' }
    );
    const codes = validateWorkflow(workflow).errors.map(error => error.code);
    assert.ok(codes.includes('LEGACY_NODE_UNSUPPORTED'));
    assert.ok(codes.includes('NODE_OUTGOING_COUNT'));
    assert.ok(codes.includes('SAVE_OUTPUT_OUTGOING'));
  });

  it('rejects invalid graph structure and invalid code', () => {
    const workflow = validWorkflow();
    workflow.code = 'bad-code';
    workflow.canvasJson.edges = [];
    const result = validateWorkflow(workflow);

    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.code === 'WORKFLOW_CODE_INVALID'));
    assert.ok(result.errors.some(error => error.code === 'ISOLATED_NODE'));
  });

  it('maps database rows to the frontend workflow contract', () => {
    const row = {
      id: 'wf-1',
      name: '工作流',
      code: 'WF_1',
      description: '说明',
      type: 'VIDEO',
      scene: '商品展示',
      status: 'PUBLISHED',
      version: 2,
      canvas_json: JSON.stringify({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }),
      config_json: { schemaVersion: 1, executionMode: 'SEQUENTIAL', entryNodeId: null },
      created_by: 'admin-1',
      updated_by: 'admin-2',
      created_at: new Date('2026-06-18T00:00:00.000Z'),
      updated_at: new Date('2026-06-18T01:00:00.000Z')
    };

    const workflow = workflowFromRow(row);
    assert.equal(workflow.canvasJson.nodes.length, 0);
    assert.equal(workflow.configJson.schemaVersion, 1);
    assert.deepEqual(workflow.versions, []);
    assert.equal(workflow.createdBy, 'admin-1');
    assert.equal(workflow.updatedAt, '2026-06-18T01:00:00.000Z');
  });

  it('creates two deletable example workflows with unique ids and codes', () => {
    let index = 0;
    const examples = createExampleWorkflows({
      id: () => `wf-${++index}`,
      now: () => '2026-06-18T00:00:00.000Z'
    });

    assert.equal(examples.length, 2);
    assert.equal(new Set(examples.map(item => item.id)).size, 2);
    assert.equal(new Set(examples.map(item => item.code)).size, 2);
    assert.ok(examples.every(item => item.isExample === true));
  });
});
