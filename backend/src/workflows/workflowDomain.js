export const GENERATION_NODE_TYPES = [
  'MATERIAL_GENERATE',
  'SCENE_GENERATE',
  'BACKGROUND_CLEAN',
  'PHOTO_ENHANCE',
  'LINEART_GENERATE',
  'MULTIVIEW_GENERATE',
  'PROMO_MAIN_GENERATE',
  'PROMO_POSTER_GENERATE',
  'PROMO_DETAIL_GENERATE'
];

export const FIXED_NODE_TYPES = ['START', 'IMAGE_INPUT', ...GENERATION_NODE_TYPES, 'SAVE_OUTPUT'];

const generationDefaults = (featureKey, options = {}) => ({
  featureKey,
  resolution: '2K',
  ratio: '自适应',
  userPrompt: '',
  options,
  failurePolicy: 'STOP'
});

const NODE_DEFINITIONS = {
  START: { label: '开始', description: '工作流唯一入口', defaults: {} },
  IMAGE_INPUT: { label: '图片输入', description: '接收本次运行的家具原图', defaults: { source: 'RUN_INPUT' } },
  MATERIAL_GENERATE: { label: '材质替换', description: '调用现有材质替换功能', defaults: generationDefaults('material', { keepStructure: true, keepAngle: true, keepProportion: true }) },
  SCENE_GENERATE: { label: '场景融合', description: '调用现有场景融合功能', defaults: generationDefaults('replace_bg', { keepLighting: true, keepPerspective: true }) },
  BACKGROUND_CLEAN: { label: '背景净化', description: '调用现有背景净化功能', defaults: generationDefaults('remove_bg', { whiteBg: false, mirror: false }) },
  PHOTO_ENHANCE: { label: '摄影增强', description: '调用现有摄影增强功能', defaults: generationDefaults('enhance', { enhanceSharpness: true, enhanceLight: true, enhanceTexture: true, enhanceColor: true, commercialStyle: true }) },
  LINEART_GENERATE: { label: '线稿图', description: '调用现有线稿生成功能', defaults: generationDefaults('lineart', { lineStyle: 'Simple line art', lineColor: '黑色', keepDetailLevel: '中等', withShadow: false }) },
  MULTIVIEW_GENERATE: { label: '多角度视图', description: '调用现有多角度视图功能', defaults: generationDefaults('multiview', { view: '四角度视图', viewCount: 4, layoutType: '宫格', backgroundStyle: '纯白' }) },
  PROMO_MAIN_GENERATE: { label: '产品主图', description: '生成电商产品主图', defaults: generationDefaults('promo_main_image', { mainBackground: '暖灰渐变商业摄影背景', mainComposition: '主体居中', mainWhitespace: '少量留白', keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true }) },
  PROMO_POSTER_GENERATE: { label: '广告海报图', description: '生成带文案留白的广告海报', defaults: generationDefaults('promo_poster_image', { posterTextMode: 'auto', posterText: '', posterCopyPlacement: '右侧留白', posterTone: '温暖家居', keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true }) },
  PROMO_DETAIL_GENERATE: { label: '产品细节图', description: '生成材质与工艺细节图', defaults: generationDefaults('promo_detail_image', { detailLayout: '四宫格', detailFocus: '材质纹理、边角工艺', detailTextMode: '留白不生成文字', keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true }) },
  SAVE_OUTPUT: { label: '保存结果', description: '将上一步图片标记为最终结果', defaults: {} }
};

const REQUIRED_FIELDS = {
  IMAGE_INPUT: ['source'],
  ...Object.fromEntries(GENERATION_NODE_TYPES.map(type => [type, ['featureKey', 'resolution', 'ratio', 'failurePolicy']]))
};

const clone = value => JSON.parse(JSON.stringify(value));
const empty = value => value === undefined || value === null || (typeof value === 'string' && !value.trim());
const dateIso = value => value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null;
const parseJson = (value, fallback) => {
  if (value && typeof value === 'object') return clone(value);
  try { return JSON.parse(value); } catch { return clone(fallback); }
};

export function normalizeWorkflowInput(input = {}) {
  return {
    name: String(input.name || '').trim(),
    code: String(input.code || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, ''),
    description: String(input.description || '').trim(),
    type: 'IMAGE',
    scene: String(input.scene || '').trim(),
    canvasJson: clone(input.canvasJson || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }),
    configJson: clone(input.configJson || { schemaVersion: 2, executionMode: 'SEQUENTIAL', entryNodeId: null })
  };
}

export function validateWorkflow(workflow) {
  const errors = [];
  const normalized = normalizeWorkflowInput(workflow);
  const nodes = normalized.canvasJson.nodes || [];
  const edges = normalized.canvasJson.edges || [];
  if (!normalized.name) errors.push({ code: 'WORKFLOW_NAME_REQUIRED', message: '工作流名称不能为空', nodeId: null, field: 'name' });
  if (!/^[A-Z0-9_]+$/.test(String(workflow?.code || ''))) errors.push({ code: 'WORKFLOW_CODE_INVALID', message: 'code 只允许大写字母、数字和下划线', nodeId: null, field: 'code' });

  const starts = nodes.filter(node => node.data?.nodeType === 'START');
  const inputs = nodes.filter(node => node.data?.nodeType === 'IMAGE_INPUT');
  const outputs = nodes.filter(node => node.data?.nodeType === 'SAVE_OUTPUT');
  const generations = nodes.filter(node => GENERATION_NODE_TYPES.includes(node.data?.nodeType));
  if (starts.length !== 1) errors.push({ code: 'START_COUNT', message: '必须有且只有一个开始节点', nodeId: starts[0]?.id || null, field: null });
  if (inputs.length !== 1) errors.push({ code: 'IMAGE_INPUT_COUNT', message: '必须有且只有一个图片输入节点', nodeId: inputs[0]?.id || null, field: null });
  if (outputs.length !== 1) errors.push({ code: 'SAVE_OUTPUT_COUNT', message: '必须有且只有一个保存结果节点', nodeId: outputs[0]?.id || null, field: null });
  if (!generations.length) errors.push({ code: 'GENERATION_NODE_REQUIRED', message: '至少需要一个真实生图节点', nodeId: null, field: null });

  const ids = new Set(nodes.map(node => node.id));
  const incoming = new Map(nodes.map(node => [node.id, []]));
  const outgoing = new Map(nodes.map(node => [node.id, []]));
  const pairs = new Set();
  for (const node of nodes) {
    if (!FIXED_NODE_TYPES.includes(node.data?.nodeType)) errors.push({ code: 'LEGACY_NODE_UNSUPPORTED', message: '包含已停用的旧版节点，请重新创建图片工作流', nodeId: node.id, field: null });
  }
  for (const edge of edges) {
    if (edge.source === edge.target) errors.push({ code: 'SELF_CONNECTION', message: '节点不能连接自己', nodeId: edge.source, field: null });
    const pair = `${edge.source}->${edge.target}`;
    if (pairs.has(pair)) errors.push({ code: 'DUPLICATE_EDGE', message: '不允许重复连线', nodeId: edge.source, field: null });
    pairs.add(pair);
    if (ids.has(edge.source) && ids.has(edge.target)) {
      outgoing.get(edge.source).push(edge.target);
      incoming.get(edge.target).push(edge.source);
    }
  }
  for (const node of nodes) {
    const type = node.data?.nodeType;
    const parents = incoming.get(node.id) || [];
    const children = outgoing.get(node.id) || [];
    if (!parents.length && !children.length) errors.push({ code: 'ISOLATED_NODE', message: `节点“${node.data?.label || node.id}”未连接`, nodeId: node.id, field: null });
    if (type === 'START' && parents.length) errors.push({ code: 'START_INCOMING', message: '开始节点不能有输入连线', nodeId: node.id, field: null });
    if (type === 'IMAGE_INPUT' && (parents.length !== 1 || starts[0]?.id !== parents[0])) errors.push({ code: 'IMAGE_INPUT_PARENT', message: '图片输入节点必须直接连接开始节点', nodeId: node.id, field: null });
    if ((GENERATION_NODE_TYPES.includes(type) || type === 'SAVE_OUTPUT') && parents.length !== 1) errors.push({ code: 'NODE_INCOMING_COUNT', message: '节点必须且只能有一个输入', nodeId: node.id, field: null });
    if (type !== 'SAVE_OUTPUT' && children.length !== 1) errors.push({ code: 'NODE_OUTGOING_COUNT', message: '当前版本每个节点必须且只能连接一个下游节点', nodeId: node.id, field: null });
    if (type === 'SAVE_OUTPUT' && children.length) errors.push({ code: 'SAVE_OUTPUT_OUTGOING', message: '保存结果节点不能有输出连线', nodeId: node.id, field: null });
    for (const field of REQUIRED_FIELDS[type] || []) {
      if (empty(node.data?.config?.[field])) errors.push({ code: 'REQUIRED_CONFIG', message: `${node.data?.label || node.id}：${field} 为必填项`, nodeId: node.id, field });
    }
  }

  const visited = new Set();
  const queue = starts[0]?.id ? [starts[0].id] : [];
  while (queue.length) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    queue.push(...(outgoing.get(nodeId) || []));
  }
  if (starts[0]) {
    for (const node of nodes) if (!visited.has(node.id)) errors.push({ code: 'UNREACHABLE_NODE', message: `节点“${node.data?.label || node.id}”无法从开始节点访问`, nodeId: node.id, field: null });
  }
  const colors = new Map();
  let cycle = false;
  const visit = nodeId => {
    if (colors.get(nodeId) === 1) { cycle = true; return; }
    if (colors.get(nodeId) === 2) return;
    colors.set(nodeId, 1);
    for (const next of outgoing.get(nodeId) || []) visit(next);
    colors.set(nodeId, 2);
  };
  nodes.forEach(node => visit(node.id));
  if (cycle) errors.push({ code: 'CYCLE_DETECTED', message: '工作流不允许循环连线', nodeId: null, field: null });
  return { valid: errors.length === 0, errors };
}

export function workflowFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    type: row.type,
    scene: row.scene || '',
    status: row.status,
    version: Number(row.version || 0),
    canvasJson: parseJson(row.canvas_json, { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }),
    configJson: parseJson(row.config_json, { schemaVersion: 2, executionMode: 'SEQUENTIAL', entryNodeId: null }),
    versions: [],
    isExample: Boolean(row.is_example),
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function createNode(workflowId, nodeType, index) {
  const definition = NODE_DEFINITIONS[nodeType];
  return {
    id: `${workflowId}-${nodeType.toLowerCase()}`,
    type: 'workflowNode',
    position: { x: 80 + index * 250, y: 140 },
    data: {
      nodeType,
      label: definition.label,
      description: definition.description,
      config: clone(definition.defaults),
      validationErrors: []
    }
  };
}

function createExample({ id, now, name, code, status, version }) {
  const workflowId = id();
  const types = ['START', 'IMAGE_INPUT', 'PHOTO_ENHANCE', 'PROMO_MAIN_GENERATE', 'SAVE_OUTPUT'];
  const nodes = types.map((nodeType, index) => createNode(workflowId, nodeType, index));
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${node.id}-${nodes[index + 1].id}`,
    source: node.id,
    target: nodes[index + 1].id,
    type: 'smoothstep'
  }));
  return {
    id: workflowId,
    name,
    code,
    description: '摄影增强后生成产品主图的测试工作流。',
    type: 'IMAGE',
    scene: '商品展示',
    status,
    version,
    canvasJson: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
    configJson: { schemaVersion: 2, executionMode: 'SEQUENTIAL', entryNodeId: nodes[0].id },
    versions: [],
    isExample: true,
    createdBy: null,
    updatedBy: null,
    createdAt: now(),
    updatedAt: now()
  };
}

export function createExampleWorkflows({ id, now }) {
  return [
    createExample({ id, now, name: '商品图片工作流（测试）', code: 'PRODUCT_IMAGE_WORKFLOW', status: 'PUBLISHED', version: 1 }),
    createExample({ id, now, name: '电商推广主图工作流（测试）', code: 'PROMOTION_IMAGE_DRAFT', status: 'DRAFT', version: 0 })
  ];
}
