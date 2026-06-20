import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FIXED_NODE_TYPES,
  GENERATION_NODE_TYPES,
  MODEL_TYPES,
  NODE_DEFINITIONS,
  createBlankWorkflow,
  createNode
} from './workflowDefinitions.js';

describe('workflow definitions', () => {
  it('exposes only the three workflow node types', () => {
    assert.deepEqual(FIXED_NODE_TYPES, ['INPUT_NODE', 'MODEL_NODE', 'OUTPUT_NODE']);
    assert.deepEqual(GENERATION_NODE_TYPES, ['MODEL_NODE']);
    assert.deepEqual(MODEL_TYPES, ['文本模型', '图片模型', '视频模型', '音频模型']);
    assert.equal(NODE_DEFINITIONS.INPUT_NODE.label, '输入节点');
    assert.equal(NODE_DEFINITIONS.MODEL_NODE.label, '大模型节点');
    assert.equal(NODE_DEFINITIONS.OUTPUT_NODE.label, '输出节点');
  });

  it('creates the default three-node example workflow', () => {
    const workflow = createBlankWorkflow({ id: 'wf-1', now: '2026-06-18T00:00:00.000Z' });
    assert.equal(workflow.name, '工作流创建');
    assert.equal(workflow.type, 'MULTIMODAL');
    assert.equal(workflow.configJson.schemaVersion, 3);
    assert.equal(workflow.canvasJson.nodes.length, 5);
    assert.equal(workflow.canvasJson.edges.length, 5);
    assert.deepEqual(
      workflow.canvasJson.nodes.map(node => node.data.nodeType),
      ['INPUT_NODE', 'MODEL_NODE', 'MODEL_NODE', 'MODEL_NODE', 'OUTPUT_NODE']
    );
    assert.ok(workflow.canvasJson.nodes.some(node => node.data.label === '生成产品主图'));
    assert.ok(workflow.canvasJson.nodes.some(node => node.data.label === '生成产品短视频'));
  });

  it('creates independent model configs', () => {
    const first = createNode('MODEL_NODE', { id: 'a' });
    const second = createNode('MODEL_NODE', { id: 'b' });
    first.data.config.params.keepStructure = false;
    assert.equal(second.data.config.params.keepStructure, true);
  });
});
