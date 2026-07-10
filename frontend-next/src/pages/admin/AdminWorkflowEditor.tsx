import { AppIcon } from '../../components/icons/AppIcon';
import { AdminButton } from './AdminUi';

type WorkflowNodeType =
  | 'START'
  | 'IMAGE_INPUT'
  | 'MATERIAL_GENERATE'
  | 'SCENE_GENERATE'
  | 'BACKGROUND_CLEAN'
  | 'PHOTO_ENHANCE'
  | 'LINEART_GENERATE'
  | 'MULTIVIEW_GENERATE'
  | 'PROMO_MAIN_GENERATE'
  | 'PROMO_POSTER_GENERATE'
  | 'PROMO_DETAIL_GENERATE'
  | 'SAVE_OUTPUT';

type WorkflowNodeDefinition = {
  type: WorkflowNodeType;
  label: string;
  description: string;
  featureKey?: string;
  options?: Record<string, unknown>;
};

export type WorkflowEditorNode = {
  id: string;
  nodeType: WorkflowNodeType;
  label: string;
  description: string;
  config: Record<string, unknown>;
};

export type WorkflowDraft = {
  mode: 'create' | 'edit';
  id?: string;
  name: string;
  code: string;
  description: string;
  scene: string;
  nodes: WorkflowEditorNode[];
  selectedNodeId: string;
};

type WorkflowSourceNode = {
  id?: string;
  data?: {
    nodeType?: string;
    label?: string;
    description?: string;
    config?: Record<string, unknown>;
  };
};

export type WorkflowSource = {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  scene?: string;
  canvasJson?: {
    nodes?: WorkflowSourceNode[];
  };
};

const generationDefinitions: WorkflowNodeDefinition[] = [
  { type: 'MATERIAL_GENERATE', label: '材质替换', description: '调用材质替换能力并保持家具结构。', featureKey: 'material', options: { keepStructure: true, keepAngle: true, keepProportion: true } },
  { type: 'SCENE_GENERATE', label: '场景融合', description: '将家具融合到新的真实场景中。', featureKey: 'replace_bg', options: { keepLighting: true, keepPerspective: true } },
  { type: 'BACKGROUND_CLEAN', label: '背景净化', description: '净化原图背景，可输出白底效果。', featureKey: 'remove_bg', options: { whiteBg: false, mirror: false } },
  { type: 'PHOTO_ENHANCE', label: '摄影增强', description: '增强清晰度、光影、纹理和商品质感。', featureKey: 'enhance', options: { enhanceSharpness: true, enhanceLight: true, enhanceTexture: true, enhanceColor: true, commercialStyle: true } },
  { type: 'LINEART_GENERATE', label: '线稿图', description: '将家具图转换为结构清晰的线稿图。', featureKey: 'lineart', options: { lineStyle: 'Simple line art', lineColor: '黑色', keepDetailLevel: '中等', withShadow: false } },
  { type: 'MULTIVIEW_GENERATE', label: '多角度视图', description: '生成家具的多角度展示组合图。', featureKey: 'multiview', options: { view: '四角度视图', viewCount: 4, layoutType: '宫格', backgroundStyle: '纯白' } },
  { type: 'PROMO_MAIN_GENERATE', label: '产品主图', description: '生成适合电商展示的家具产品主图。', featureKey: 'promo_main_image', options: { mainBackground: '暖灰渐变商业摄影背景', mainComposition: '主体居中', mainWhitespace: '少量留白', keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true } },
  { type: 'PROMO_POSTER_GENERATE', label: '广告海报图', description: '生成具有文案留白区域的宣传海报。', featureKey: 'promo_poster_image', options: { posterTextMode: 'auto', posterText: '', posterCopyPlacement: '右侧留白', posterTone: '温暖家居', keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true } },
  { type: 'PROMO_DETAIL_GENERATE', label: '产品细节图', description: '突出材质纹理、边角和工艺细节。', featureKey: 'promo_detail_image', options: { detailLayout: '四宫格', detailFocus: '材质纹理、边角工艺', detailTextMode: '留白不生成文字', keepSubject: true, forbidGeneratedText: true, forbidLogo: true, forbidPeople: true } },
];

const fixedDefinitions: WorkflowNodeDefinition[] = [
  { type: 'START', label: '开始', description: '工作流唯一入口。' },
  { type: 'IMAGE_INPUT', label: '图片输入', description: '接收用户本次上传的家具原图。' },
  { type: 'SAVE_OUTPUT', label: '保存结果', description: '将上一步生成内容保存为最终输出。' },
];

const definitions = new Map([...fixedDefinitions, ...generationDefinitions].map((item) => [item.type, item]));
const generationTypes = new Set(generationDefinitions.map((item) => item.type));

function nextId(type: WorkflowNodeType) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${type.toLowerCase()}-${suffix}`;
}

function defaultConfig(definition: WorkflowNodeDefinition) {
  if (definition.type === 'IMAGE_INPUT') return { source: 'RUN_INPUT' };
  if (!definition.featureKey) return {};
  return {
    featureKey: definition.featureKey,
    resolution: '2K',
    ratio: '自适应',
    userPrompt: '',
    options: { ...(definition.options || {}) },
    failurePolicy: 'STOP',
  };
}

function createNode(type: WorkflowNodeType): WorkflowEditorNode {
  const definition = definitions.get(type) || { type, label: type, description: '工作流节点' };
  return {
    id: nextId(type),
    nodeType: type,
    label: definition.label,
    description: definition.description,
    config: defaultConfig(definition),
  };
}

function normalizeNode(node: WorkflowSourceNode): WorkflowEditorNode | null {
  const rawType = String(node.data?.nodeType || '') as WorkflowNodeType;
  const definition = definitions.get(rawType);
  if (!definition) return null;
  return {
    id: String(node.id || nextId(rawType)),
    nodeType: rawType,
    label: String(node.data?.label || definition.label),
    description: String(node.data?.description || definition.description),
    config: { ...defaultConfig(definition), ...(node.data?.config || {}) },
  };
}

export function createWorkflowDraft(): WorkflowDraft {
  const nodes = [createNode('START'), createNode('IMAGE_INPUT'), createNode('PHOTO_ENHANCE'), createNode('SAVE_OUTPUT')];
  return {
    mode: 'create',
    name: '',
    code: '',
    description: '',
    scene: '',
    nodes,
    selectedNodeId: nodes[2].id,
  };
}

export function workflowToDraft(source: WorkflowSource): WorkflowDraft {
  const parsed = (source.canvasJson?.nodes || []).map(normalizeNode).filter((item): item is WorkflowEditorNode => Boolean(item));
  const start = parsed.find((item) => item.nodeType === 'START') || createNode('START');
  const input = parsed.find((item) => item.nodeType === 'IMAGE_INPUT') || createNode('IMAGE_INPUT');
  const output = parsed.find((item) => item.nodeType === 'SAVE_OUTPUT') || createNode('SAVE_OUTPUT');
  const generationNodes = parsed.filter((item) => generationTypes.has(item.nodeType));
  const nodes = [start, input, ...(generationNodes.length ? generationNodes : [createNode('PHOTO_ENHANCE')]), output];
  return {
    mode: 'edit',
    id: source.id,
    name: source.name || '',
    code: source.code || '',
    description: source.description || '',
    scene: source.scene || '',
    nodes,
    selectedNodeId: generationNodes[0]?.id || nodes[2].id,
  };
}

export function validateWorkflowDraft(draft: WorkflowDraft) {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('工作流名称不能为空');
  if (!/^[A-Z0-9_]+$/.test(draft.code.trim())) errors.push('工作流 Code 只允许大写字母、数字和下划线');
  if (!draft.nodes.some((item) => generationTypes.has(item.nodeType))) errors.push('至少需要一个 AI 生成节点');
  return errors;
}

export function workflowDraftPayload(draft: WorkflowDraft) {
  const nodes = draft.nodes.map((node, index) => ({
    id: node.id,
    type: 'workflowNode',
    position: { x: 80 + index * 250, y: 140 },
    data: {
      nodeType: node.nodeType,
      label: node.label,
      description: node.description,
      config: node.config,
      validationErrors: [],
    },
  }));
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${node.id}-${nodes[index + 1].id}`,
    source: node.id,
    target: nodes[index + 1].id,
    type: 'smoothstep',
  }));
  return {
    name: draft.name.trim(),
    code: draft.code.trim().toUpperCase(),
    description: draft.description.trim(),
    type: 'IMAGE',
    scene: draft.scene.trim(),
    canvasJson: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
    configJson: { schemaVersion: 2, executionMode: 'SEQUENTIAL', entryNodeId: nodes[0]?.id || null },
  };
}

function nodeTone(type: WorkflowNodeType) {
  if (type === 'START') return 'start';
  if (type === 'IMAGE_INPUT') return 'input';
  if (type === 'SAVE_OUTPUT') return 'output';
  return 'model';
}

export function AdminWorkflowEditor({ draft, onChange }: { draft: WorkflowDraft; onChange: (draft: WorkflowDraft) => void }) {
  const selected = draft.nodes.find((item) => item.id === draft.selectedNodeId) || draft.nodes[0];
  const selectedIndex = draft.nodes.findIndex((item) => item.id === selected?.id);
  const selectedIsGeneration = Boolean(selected && generationTypes.has(selected.nodeType));

  function patchDraft(patch: Partial<WorkflowDraft>) {
    onChange({ ...draft, ...patch });
  }

  function addNode(type: WorkflowNodeType) {
    const node = createNode(type);
    const outputIndex = draft.nodes.findIndex((item) => item.nodeType === 'SAVE_OUTPUT');
    const insertAt = selectedIsGeneration ? selectedIndex + 1 : Math.max(2, outputIndex);
    const nodes = [...draft.nodes];
    nodes.splice(insertAt, 0, node);
    patchDraft({ nodes, selectedNodeId: node.id });
  }

  function updateSelectedConfig(key: string, value: unknown) {
    patchDraft({
      nodes: draft.nodes.map((item) => item.id === selected.id ? { ...item, config: { ...item.config, [key]: value } } : item),
    });
  }

  function moveSelected(offset: -1 | 1) {
    if (!selectedIsGeneration) return;
    const minIndex = 2;
    const maxIndex = draft.nodes.length - 2;
    const targetIndex = selectedIndex + offset;
    if (targetIndex < minIndex || targetIndex > maxIndex) return;
    const nodes = [...draft.nodes];
    [nodes[selectedIndex], nodes[targetIndex]] = [nodes[targetIndex], nodes[selectedIndex]];
    patchDraft({ nodes });
  }

  function removeSelected() {
    if (!selectedIsGeneration) return;
    const remaining = draft.nodes.filter((item) => item.id !== selected.id);
    const nextSelection = remaining[Math.min(selectedIndex, remaining.length - 1)] || remaining[0];
    patchDraft({ nodes: remaining, selectedNodeId: nextSelection?.id || '' });
  }

  return (
    <div className="adminWorkflowVisualEditor">
      <section className="adminWorkflowMeta">
        <div className="adminFormGrid">
          <label><span>工作流名称</span><input value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} autoFocus /></label>
          <label><span>工作流 Code</span><input value={draft.code} onChange={(event) => patchDraft({ code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} placeholder="PRODUCT_IMAGE_FLOW" /></label>
          <label><span>适用场景</span><input value={draft.scene} onChange={(event) => patchDraft({ scene: event.target.value })} placeholder="例如：商品展示" /></label>
          <label><span>工作流说明</span><input value={draft.description} onChange={(event) => patchDraft({ description: event.target.value })} /></label>
        </div>
      </section>

      <div className="adminWorkflowEditorLayout">
        <aside className="adminWorkflowLibrary">
          <header><span>节点库</span><small>点击加入流程</small></header>
          <div>{generationDefinitions.map((definition) => <button key={definition.type} type="button" onClick={() => addNode(definition.type)}><span><AppIcon name="model" /></span><b>{definition.label}</b><small>{definition.featureKey}</small><AppIcon name="plus" size={15} /></button>)}</div>
        </aside>

        <section className="adminWorkflowCanvas">
          <header><div><span>执行流程</span><small>节点会按照从左到右的顺序执行</small></div><em>{draft.nodes.length} 个节点</em></header>
          <div className="adminWorkflowTrack">
            {draft.nodes.map((node, index) => <div className="adminWorkflowTrackItem" key={node.id}>
              <button type="button" className={`adminWorkflowNode is-${nodeTone(node.nodeType)} ${node.id === selected.id ? 'isSelected' : ''}`.trim()} onClick={() => patchDraft({ selectedNodeId: node.id })}>
                <span className="adminWorkflowNodeIcon"><AppIcon name={node.nodeType === 'START' ? 'power' : node.nodeType === 'IMAGE_INPUT' ? 'resources' : node.nodeType === 'SAVE_OUTPUT' ? 'save' : 'model'} /></span>
                <small>{node.nodeType}</small>
                <b>{node.label}</b>
                <p>{node.description}</p>
              </button>
              {index < draft.nodes.length - 1 && <span className="adminWorkflowConnector"><i /><AppIcon name="chevronRight" size={16} /></span>}
            </div>)}
          </div>
        </section>

        <aside className="adminWorkflowConfig">
          <header><span>节点配置</span><small>{selected?.nodeType || '-'}</small></header>
          {selected ? <div className="adminWorkflowConfigBody">
            <section className="adminWorkflowSelectedSummary"><span className={`is-${nodeTone(selected.nodeType)}`}><AppIcon name={selectedIsGeneration ? 'model' : selected.nodeType === 'IMAGE_INPUT' ? 'resources' : selected.nodeType === 'SAVE_OUTPUT' ? 'save' : 'power'} /></span><div><b>{selected.label}</b><p>{selected.description}</p></div></section>
            {selectedIsGeneration ? <>
              <label><span>输出分辨率</span><select value={String(selected.config.resolution || '2K')} onChange={(event) => updateSelectedConfig('resolution', event.target.value)}><option value="1K">1K</option><option value="2K">2K</option><option value="4K">4K</option></select></label>
              <label><span>输出比例</span><select value={String(selected.config.ratio || '自适应')} onChange={(event) => updateSelectedConfig('ratio', event.target.value)}><option value="自适应">自适应</option><option value="1:1">1:1</option><option value="4:3">4:3</option><option value="3:4">3:4</option><option value="16:9">16:9</option><option value="9:16">9:16</option></select></label>
              <label><span>失败策略</span><select value={String(selected.config.failurePolicy || 'STOP')} onChange={(event) => updateSelectedConfig('failurePolicy', event.target.value)}><option value="STOP">失败后停止</option><option value="CONTINUE">失败后继续</option></select></label>
              <label><span>附加提示词</span><textarea value={String(selected.config.userPrompt || '')} onChange={(event) => updateSelectedConfig('userPrompt', event.target.value)} placeholder="可选：补充该节点的生成要求" /></label>
              <div className="adminWorkflowNodeActions"><AdminButton icon="chevronLeft" disabled={selectedIndex <= 2} onClick={() => moveSelected(-1)}>前移</AdminButton><AdminButton icon="chevronRight" disabled={selectedIndex >= draft.nodes.length - 2} onClick={() => moveSelected(1)}>后移</AdminButton><AdminButton icon="trash" tone="danger" onClick={removeSelected}>删除</AdminButton></div>
            </> : <div className="adminWorkflowFixedNote"><AppIcon name="lock" /><p>这是固定节点。为保证后台校验和顺序执行，不允许删除或调整其核心配置。</p></div>}
          </div> : null}
        </aside>
      </div>
    </div>
  );
}
