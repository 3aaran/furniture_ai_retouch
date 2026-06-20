import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDefaultWorkflow, createNode } from './workflowDefinitions.js';
import { validateWorkflow } from './workflowValidation.js';

const codes = workflow => validateWorkflow(workflow).errors.map(error => error.code);

describe('workflow validation', () => {
  it('accepts the default three-node workflow', () => {
    assert.equal(validateWorkflow(createDefaultWorkflow()).valid, true);
  });

  it('requires input, model and output nodes', () => {
    const workflow = createDefaultWorkflow();
    workflow.canvasJson.nodes = [];
    workflow.canvasJson.edges = [];
    assert.deepEqual(
      new Set(codes(workflow)),
      new Set(['INPUT_NODE_REQUIRED', 'MODEL_NODE_REQUIRED', 'OUTPUT_NODE_REQUIRED'])
    );
  });

  it('rejects unsupported nodes and invalid directions', () => {
    const workflow = createDefaultWorkflow();
    const input = workflow.canvasJson.nodes.find(node => node.data.nodeType === 'INPUT_NODE');
    const output = workflow.canvasJson.nodes.find(node => node.data.nodeType === 'OUTPUT_NODE');
    workflow.canvasJson.nodes.push({
      id: 'legacy',
      type: 'workflowNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'START', label: '开始', config: {} }
    });
    workflow.canvasJson.edges.push(
      { id: 'into-input', source: output.id, target: input.id },
      { id: 'out-of-output', source: output.id, target: 'legacy' }
    );
    const resultCodes = codes(workflow);
    assert.ok(resultCodes.includes('UNSUPPORTED_NODE'));
    assert.ok(resultCodes.includes('INPUT_INCOMING'));
    assert.ok(resultCodes.includes('OUTPUT_OUTGOING'));
  });

  it('rejects missing and invalid model inputs', () => {
    const workflow = createDefaultWorkflow();
    const mainImage = workflow.canvasJson.nodes.find(node => node.data.label === '生成产品主图');
    mainImage.data.config.inputs = ['不存在的内容'];
    const resultCodes = codes(workflow);
    assert.ok(resultCodes.includes('MODEL_INPUT_INVALID'));
    assert.ok(resultCodes.includes('REQUIRED_INPUT_MISSING'));
  });

  it('rejects invalid output selections', () => {
    const workflow = createDefaultWorkflow();
    const output = workflow.canvasJson.nodes.find(node => node.data.nodeType === 'OUTPUT_NODE');
    output.data.config.outputs = ['不存在的输出'];
    const error = validateWorkflow(workflow).errors.find(item => item.code === 'OUTPUT_INVALID');
    assert.equal(error.nodeId, output.id);
  });

  it('rejects cycles duplicate edges self connections and isolated nodes', () => {
    const workflow = createDefaultWorkflow();
    const first = workflow.canvasJson.nodes[0].id;
    const last = workflow.canvasJson.nodes.at(-1).id;
    workflow.canvasJson.nodes.push(createNode('MODEL_NODE', { id: 'isolated' }));
    workflow.canvasJson.edges.push(
      { id: 'cycle', source: last, target: first },
      { ...workflow.canvasJson.edges[0], id: 'duplicate' },
      { id: 'self', source: first, target: first }
    );
    const resultCodes = codes(workflow);
    assert.ok(resultCodes.includes('CYCLE_DETECTED'));
    assert.ok(resultCodes.includes('DUPLICATE_EDGE'));
    assert.ok(resultCodes.includes('SELF_CONNECTION'));
    assert.ok(resultCodes.includes('ISOLATED_NODE'));
  });
});
