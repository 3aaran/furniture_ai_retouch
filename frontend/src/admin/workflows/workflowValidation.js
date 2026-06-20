import { NODE_TYPES } from './workflowDefinitions.js';

const empty = value => value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0);
const has = (list, item) => list.includes(item);

function buildGraph(nodes, edges) {
  const incoming = new Map(nodes.map(node => [node.id, []]));
  const outgoing = new Map(nodes.map(node => [node.id, []]));
  for (const edge of edges) {
    if (incoming.has(edge.target)) incoming.get(edge.target).push(edge.source);
    if (outgoing.has(edge.source)) outgoing.get(edge.source).push(edge.target);
  }
  return { incoming, outgoing };
}

function upstreamOutputs(node, nodes, edges) {
  const byId = new Map(nodes.map(item => [item.id, item]));
  const { incoming } = buildGraph(nodes, edges);
  const result = [];
  const visited = new Set();
  const stack = [...(incoming.get(node.id) || [])];
  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    const current = byId.get(id);
    if (!current) continue;
    if (current.data?.nodeType === 'INPUT_NODE') result.push(...(current.data.config?.outputs || []));
    if (current.data?.nodeType === 'MODEL_NODE' && current.data.config?.output) result.push(current.data.config.output);
    stack.push(...(incoming.get(id) || []));
  }
  return [...new Set(result)];
}

export function validateWorkflow(workflow) {
  const errors = [];
  const nodes = workflow?.canvasJson?.nodes || [];
  const edges = workflow?.canvasJson?.edges || [];
  const inputs = nodes.filter(node => node.data?.nodeType === 'INPUT_NODE');
  const models = nodes.filter(node => node.data?.nodeType === 'MODEL_NODE');
  const outputs = nodes.filter(node => node.data?.nodeType === 'OUTPUT_NODE');

  if (!inputs.length) errors.push({ code: 'INPUT_NODE_REQUIRED', message: '当前工作流缺少输入节点，无法运行。', nodeId: null, field: null });
  if (!models.length) errors.push({ code: 'MODEL_NODE_REQUIRED', message: '当前工作流缺少大模型节点，无法运行。', nodeId: null, field: null });
  if (!outputs.length) errors.push({ code: 'OUTPUT_NODE_REQUIRED', message: '当前工作流缺少输出节点，无法运行。', nodeId: null, field: null });

  for (const node of nodes) {
    if (!NODE_TYPES.includes(node.data?.nodeType)) errors.push({ code: 'UNSUPPORTED_NODE', message: '当前工作流包含不支持的节点，请只使用输入节点、大模型节点、输出节点。', nodeId: node.id, field: null });
  }

  const ids = new Set(nodes.map(node => node.id));
  const pairs = new Set();
  for (const edge of edges) {
    if (edge.source === edge.target) errors.push({ code: 'SELF_CONNECTION', message: '节点不能连接自己。', nodeId: edge.source, field: null });
    if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push({ code: 'BROKEN_EDGE', message: '存在无效连线，请重新连接节点。', nodeId: null, field: null });
    const pair = `${edge.source}->${edge.target}`;
    if (pairs.has(pair)) errors.push({ code: 'DUPLICATE_EDGE', message: '不允许重复连线。', nodeId: edge.source, field: null });
    pairs.add(pair);
  }

  const { incoming, outgoing } = buildGraph(nodes, edges);
  for (const node of nodes) {
    const parents = incoming.get(node.id) || [];
    const children = outgoing.get(node.id) || [];
    if (!parents.length && !children.length) errors.push({ code: 'ISOLATED_NODE', message: `节点“${node.data?.label || node.id}”未连接。`, nodeId: node.id, field: null });
    if (node.data?.nodeType === 'INPUT_NODE' && parents.length) errors.push({ code: 'INPUT_INCOMING', message: '输入节点不能有输入连线。', nodeId: node.id, field: null });
    if (node.data?.nodeType === 'OUTPUT_NODE' && children.length) errors.push({ code: 'OUTPUT_OUTGOING', message: '输出节点不能有输出连线。', nodeId: node.id, field: null });
  }

  for (const node of models) {
    const config = node.data?.config || {};
    const available = upstreamOutputs(node, nodes, edges);
    if (empty(config.inputs)) errors.push({ code: 'MODEL_INPUT_EMPTY', message: `${node.data?.label || '大模型节点'}输入来源不能为空。`, nodeId: node.id, field: '输入来源' });
    for (const input of config.inputs || []) {
      if (!has(available, input)) errors.push({ code: 'MODEL_INPUT_INVALID', message: `${node.data?.label || '大模型节点'}输入来源“${input}”不是前面节点已有输出。`, nodeId: node.id, field: '输入来源' });
    }
    for (const required of config.requiredInputs || []) {
      if (!has(config.inputs || [], required) || !has(available, required)) errors.push({ code: 'REQUIRED_INPUT_MISSING', message: `${node.data?.label || '大模型节点'}缺少必需输入：${required}。`, nodeId: node.id, field: '输入来源' });
    }
    if (empty(config.modelType)) errors.push({ code: 'MODEL_TYPE_EMPTY', message: `${node.data?.label || '大模型节点'}缺少模型类型。`, nodeId: node.id, field: '模型类型' });
    if (empty(config.output)) errors.push({ code: 'MODEL_OUTPUT_EMPTY', message: `${node.data?.label || '大模型节点'}缺少输出内容。`, nodeId: node.id, field: '输出内容' });
  }

  for (const node of outputs) {
    const available = upstreamOutputs(node, nodes, edges);
    const selectedOutputs = node.data?.config?.outputs || [];
    if (empty(selectedOutputs)) errors.push({ code: 'OUTPUT_EMPTY', message: '输出节点未选择输出内容。', nodeId: node.id, field: '输出内容选择' });
    for (const output of selectedOutputs) {
      if (!has(available, output)) errors.push({ code: 'OUTPUT_INVALID', message: '输出节点选择了不存在的输出内容，请重新配置。', nodeId: node.id, field: '输出内容选择' });
    }
  }

  const colors = new Map();
  let cycle = false;
  const visit = id => {
    if (colors.get(id) === 1) { cycle = true; return; }
    if (colors.get(id) === 2) return;
    colors.set(id, 1);
    for (const next of outgoing.get(id) || []) visit(next);
    colors.set(id, 2);
  };
  nodes.forEach(node => visit(node.id));
  if (cycle) errors.push({ code: 'CYCLE_DETECTED', message: '工作流不允许循环连线。', nodeId: null, field: null });
  return { valid: errors.length === 0, errors };
}
