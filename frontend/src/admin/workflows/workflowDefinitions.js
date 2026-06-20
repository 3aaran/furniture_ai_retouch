export const MODEL_TYPES = ['文本模型', '图片模型', '视频模型', '音频模型'];
export const USAGE_MODES = ['自定义', '调用预设'];
export const NODE_TYPES = ['INPUT_NODE', 'MODEL_NODE', 'OUTPUT_NODE'];
export const FIXED_NODE_TYPES = NODE_TYPES;
export const GENERATION_NODE_TYPES = ['MODEL_NODE'];

export const PRESET_OPTIONS = {
  文本模型: ['家具风格分析', '卖点提取', '生图补充提示词生成', '视频脚本生成'],
  图片模型: ['产品主图', '产品详情图', '广告海报图', '背景融合图', '场景图', '多角度图'],
  视频模型: ['产品短视频', '卖点展示视频', '场景宣传视频'],
  音频模型: ['语音讲解', '卖点旁白']
};

export const MODEL_OPTIONS = {
  文本模型: ['默认分析模型', '高质量文本模型', '快速文本模型'],
  图片模型: ['默认图片模型', '高质量图片模型', '快速图片模型'],
  视频模型: ['默认视频模型', '高质量视频模型', '快速视频模型'],
  音频模型: ['默认音频模型', '自然音频模型', '快速音频模型']
};

export const AVAILABLE_INPUTS = ['文本', '主图', '参考图', '生成意见', '补充提示词', '产品主图', '产品短视频', '图片', '视频', '音频'];
export const OUTPUT_TYPES = ['文本', '图片', '视频', '音频'];

const inputConfig = () => ({
  text: { enabled: true, required: true, title: '生成意见', placeholder: '请描述家具图片需要生成的内容' },
  image: { enabled: true, required: true, multiple: true, maxCount: 2, names: ['主图', '参考图'] },
  video: { enabled: false, required: false, maxCount: 1 },
  audio: { enabled: false, required: false, maxCount: 1 },
  outputs: ['文本', '主图', '参考图', '生成意见']
});

const modelConfig = ({
  modelType = '图片模型',
  usageMode = '调用预设',
  preset = '产品主图',
  model = '默认图片模型',
  inputs = ['主图', '参考图', '补充提示词'],
  systemPrompt = '基于家具主图、参考图和补充提示词，生成适合电商展示的产品主图，突出主体、材质与空间质感，画面简洁高级。',
  userPrompt = '',
  output = '产品主图',
  requiredInputs = ['主图'],
  params = {}
} = {}) => ({
  modelType,
  usageMode,
  preset,
  model,
  inputs,
  systemPrompt,
  userPrompt,
  output,
  requiredInputs,
  params: {
    imageRatio: '1:1',
    imageCount: 4,
    quality: '高清',
    keepStructure: true,
    videoRatio: '16:9',
    videoDuration: '5秒',
    motionMode: '镜头缓慢推进',
    textLength: '中等',
    textFormat: '自然语言',
    structuredOutput: true,
    audioFormat: 'mp3',
    audioDuration: '30秒',
    voice: '自然女声',
    speed: '正常',
    ...params
  }
});

const outputConfig = () => ({
  outputs: ['产品主图', '产品短视频'],
  singleResult: '直接返回',
  multiResult: ['合集展示', '支持打包下载'],
  saveToResourceLibrary: true,
  writeHistoryTask: true
});

export const NODE_DEFINITIONS = {
  INPUT_NODE: {
    label: '输入节点',
    group: '三节点',
    description: '收集用户输入内容',
    color: '#53a9ff',
    defaults: inputConfig()
  },
  MODEL_NODE: {
    label: '大模型节点',
    group: '三节点',
    description: '处理文本、图片、视频、音频',
    color: '#a97cff',
    defaults: modelConfig()
  },
  OUTPUT_NODE: {
    label: '输出节点',
    group: '三节点',
    description: '返回给用户的最终结果',
    color: '#35dfbf',
    defaults: outputConfig()
  }
};

export const deepCopy = value => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() || `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createNode(nodeType, { id = uid(), position = { x: 0, y: 0 }, data = {} } = {}) {
  const definition = NODE_DEFINITIONS[nodeType];
  if (!definition) throw new Error(`不支持的节点类型：${nodeType}`);
  return {
    id,
    type: 'workflowNode',
    position,
    data: {
      nodeType,
      label: data.label || definition.label,
      title: data.title || definition.label,
      description: data.description || definition.description,
      displayLines: data.displayLines || [],
      config: deepCopy(data.config || definition.defaults),
      validationErrors: []
    }
  };
}

export function createBlankWorkflow({ id = uid(), now = new Date().toISOString() } = {}) {
  const nodes = [
    createNode('INPUT_NODE', {
      id: `${id}-input`,
      position: { x: 70, y: 220 },
      data: {
        title: '第1步：输入节点',
        displayLines: ['文本：开启', '图片：开启', '视频：关闭', '音频：关闭', '输入内容：主图、参考图、生成意见']
      }
    }),
    createNode('MODEL_NODE', {
      id: `${id}-text-analysis`,
      position: { x: 390, y: 120 },
      data: {
        label: '分析生成意见',
        title: '第2步：大模型节点\n分析生成意见',
        displayLines: ['模型类型：文本模型', '模型：默认分析模型', '输入：生成意见、主图', '输出：补充提示词'],
        config: modelConfig({
          modelType: '文本模型',
          preset: '生图补充提示词生成',
          model: '默认分析模型',
          inputs: ['生成意见', '主图'],
          output: '补充提示词',
          requiredInputs: ['生成意见', '主图'],
          systemPrompt: '分析用户输入的家具主图和生成意见，补充更稳定、更适合电商图生成的提示词。'
        })
      }
    }),
    createNode('MODEL_NODE', {
      id: `${id}-main-image`,
      position: { x: 760, y: 40 },
      data: {
        label: '生成产品主图',
        title: '第2步：大模型节点\n生成产品主图',
        displayLines: ['模型类型：图片模型', '使用方式：调用预设', '预设能力：产品主图', '输入：主图、参考图、补充提示词', '输出：产品主图'],
        config: modelConfig()
      }
    }),
    createNode('MODEL_NODE', {
      id: `${id}-product-video`,
      position: { x: 760, y: 320 },
      data: {
        label: '生成产品短视频',
        title: '第2步：大模型节点\n生成产品短视频',
        displayLines: ['模型类型：视频模型', '使用方式：调用预设', '预设能力：产品短视频', '输入：主图、补充提示词', '输出：产品短视频'],
        config: modelConfig({
          modelType: '视频模型',
          preset: '产品短视频',
          model: '默认视频模型',
          inputs: ['主图', '补充提示词'],
          output: '产品短视频',
          requiredInputs: ['主图'],
          systemPrompt: '基于家具主图和补充提示词，生成适合电商宣传的产品短视频，突出材质、空间氛围和卖点。'
        })
      }
    }),
    createNode('OUTPUT_NODE', {
      id: `${id}-output`,
      position: { x: 1130, y: 205 },
      data: {
        title: '第3步：输出节点',
        displayLines: ['输出内容：图片、视频', '单结果：直接返回', '多结果：合集展示 / 打包下载']
      }
    })
  ];
  const edges = [
    [`${id}-input`, `${id}-text-analysis`],
    [`${id}-text-analysis`, `${id}-main-image`],
    [`${id}-text-analysis`, `${id}-product-video`],
    [`${id}-main-image`, `${id}-output`],
    [`${id}-product-video`, `${id}-output`]
  ].map(([source, target]) => ({ id: `edge-${source}-${target}`, source, target, type: 'smoothstep', animated: true, style: { strokeWidth: 2 } }));

  return {
    id,
    name: '工作流创建',
    code: `THREE_NODE_WORKFLOW_${Date.now().toString(36).toUpperCase()}`,
    description: '输入节点、大模型节点、输出节点组成的可视化工作流。',
    type: 'MULTIMODAL',
    scene: '家具图片与短视频生成',
    status: 'DRAFT',
    version: 0,
    canvasJson: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
    configJson: { schemaVersion: 3, executionMode: 'GRAPH', entryNodeId: nodes[0].id },
    versions: [],
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultWorkflow(options) {
  return createBlankWorkflow(options);
}
