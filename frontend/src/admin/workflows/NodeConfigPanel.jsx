import React from 'react';
import { AVAILABLE_INPUTS, MODEL_OPTIONS, MODEL_TYPES, OUTPUT_TYPES, PRESET_OPTIONS, USAGE_MODES } from './workflowDefinitions.js';

const Field = ({ label, error, children }) => <label className={error ? 'fieldError' : ''}><span>{label}</span>{children}{error && <small>{error.message}</small>}</label>;
const Toggle = ({ label, value, onChange }) => <label className="workflowToggle"><input type="checkbox" checked={!!value} onChange={event => onChange(event.target.checked)}/><span>{label}</span></label>;
const Segmented = ({ value, options, onChange }) => <div className="workflowSegmented">{options.map(option => <button type="button" key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}>{option}</button>)}</div>;

const unique = items => [...new Set(items.filter(Boolean))];

function collectProducedOptions(workflow, selectedNode) {
  const nodes = workflow?.canvasJson?.nodes || [];
  const selectedIndex = nodes.findIndex(node => node.id === selectedNode?.id);
  const previousNodes = selectedIndex >= 0 ? nodes.slice(0, selectedIndex) : nodes;
  const options = [];
  for (const node of previousNodes) {
    if (node.data?.nodeType === 'INPUT_NODE') options.push(...(node.data.config?.outputs || []));
    if (node.data?.nodeType === 'MODEL_NODE' && node.data.config?.output) options.push(node.data.config.output);
  }
  return unique([...options, ...AVAILABLE_INPUTS]);
}

function ParamsPanel({ config, setConfig }) {
  const params = config.params || {};
  const setParam = (field, value) => setConfig({ params: { ...params, [field]: value } });
  if (config.modelType === '视频模型') return <div className="workflowParamGroup">
    <Field label="视频比例"><select value={params.videoRatio || '16:9'} onChange={event => setParam('videoRatio', event.target.value)}><option>16:9</option><option>1:1</option><option>9:16</option></select></Field>
    <Field label="视频时长"><select value={params.videoDuration || '5秒'} onChange={event => setParam('videoDuration', event.target.value)}><option>4秒</option><option>5秒</option><option>10秒</option><option>15秒</option></select></Field>
    <Field label="清晰度"><select value={params.quality || '高清'} onChange={event => setParam('quality', event.target.value)}><option>标准</option><option>高清</option><option>超清</option></select></Field>
    <Field label="运动方式"><input value={params.motionMode || ''} onChange={event => setParam('motionMode', event.target.value)}/></Field>
  </div>;
  if (config.modelType === '文本模型') return <div className="workflowParamGroup">
    <Field label="输出长度"><select value={params.textLength || '中等'} onChange={event => setParam('textLength', event.target.value)}><option>简短</option><option>中等</option><option>详细</option></select></Field>
    <Field label="输出格式"><select value={params.textFormat || '自然语言'} onChange={event => setParam('textFormat', event.target.value)}><option>自然语言</option><option>分点说明</option><option>JSON 结构</option></select></Field>
    <Toggle label="是否结构化输出" value={params.structuredOutput} onChange={value => setParam('structuredOutput', value)}/>
  </div>;
  if (config.modelType === '音频模型') return <div className="workflowParamGroup">
    <Field label="音频格式"><select value={params.audioFormat || 'mp3'} onChange={event => setParam('audioFormat', event.target.value)}><option>mp3</option><option>wav</option></select></Field>
    <Field label="音频时长"><select value={params.audioDuration || '30秒'} onChange={event => setParam('audioDuration', event.target.value)}><option>15秒</option><option>30秒</option><option>60秒</option></select></Field>
    <Field label="音色选择"><select value={params.voice || '自然女声'} onChange={event => setParam('voice', event.target.value)}><option>自然女声</option><option>自然男声</option><option>年轻活力</option></select></Field>
    <Field label="语速"><select value={params.speed || '正常'} onChange={event => setParam('speed', event.target.value)}><option>慢速</option><option>正常</option><option>快速</option></select></Field>
  </div>;
  return <div className="workflowParamGroup">
    <Field label="图片比例"><select value={params.imageRatio || '1:1'} onChange={event => setParam('imageRatio', event.target.value)}><option>1:1</option><option>4:3</option><option>3:4</option><option>16:9</option></select></Field>
    <Field label="图片数量"><input type="number" min="1" max="8" value={params.imageCount || 4} onChange={event => setParam('imageCount', Number(event.target.value))}/></Field>
    <Field label="清晰度"><select value={params.quality || '高清'} onChange={event => setParam('quality', event.target.value)}><option>标准</option><option>高清</option><option>超清</option></select></Field>
    <Toggle label="保留主体结构" value={params.keepStructure} onChange={value => setParam('keepStructure', value)}/>
  </div>;
}

export default function NodeConfigPanel({ workflow, selectedNode, validationErrors = [], onWorkflowChange, onNodeChange }) {
  if (!selectedNode) return <aside className="workflowConfigPanel"><div className="workflowPanelHead"><span>工作流设置</span><small>请选择画布节点进行配置</small></div><div className="workflowConfigBody">
    <Field label="工作流名称"><input value={workflow.name} onChange={event => onWorkflowChange('name', event.target.value)}/></Field>
    <Field label="描述"><textarea value={workflow.description || ''} onChange={event => onWorkflowChange('description', event.target.value)}/></Field>
    <Field label="适用场景"><input value={workflow.scene || ''} onChange={event => onWorkflowChange('scene', event.target.value)}/></Field>
  </div></aside>;

  const type = selectedNode.data.nodeType;
  const config = selectedNode.data.config || {};
  const nodeErrors = validationErrors.filter(item => item.nodeId === selectedNode.id);
  const setConfig = patch => onNodeChange({ config: { ...config, ...patch } });
  const producedOptions = collectProducedOptions(workflow, selectedNode);

  if (type === 'INPUT_NODE') {
    const text = config.text || {};
    const image = config.image || {};
    const video = config.video || {};
    const audio = config.audio || {};
    const setGroup = (group, patch) => setConfig({ [group]: { ...(config[group] || {}), ...patch } });
    return <aside className="workflowConfigPanel"><div className="workflowPanelHead"><span>节点配置 - 输入节点</span><small>配置用户可提交的内容</small></div><div className="workflowConfigBody">
      <Field label="节点名称"><input value={selectedNode.data.label} onChange={event => onNodeChange({ label: event.target.value, title: '第1步：输入节点' })}/></Field>
      <h3>文本输入</h3>
      <Toggle label="是否必填" value={text.required} onChange={value => setGroup('text', { required: value, enabled: true })}/>
      <Field label="输入标题"><input value={text.title || ''} onChange={event => setGroup('text', { title: event.target.value, enabled: true })}/></Field>
      <Field label="占位提示"><input value={text.placeholder || ''} onChange={event => setGroup('text', { placeholder: event.target.value, enabled: true })}/></Field>
      <h3>图片输入</h3>
      <Toggle label="是否开启" value={image.enabled} onChange={value => setGroup('image', { enabled: value })}/>
      <Toggle label="是否必填" value={image.required} onChange={value => setGroup('image', { required: value })}/>
      <Toggle label="是否支持多张" value={image.multiple} onChange={value => setGroup('image', { multiple: value })}/>
      <Field label="最大上传数量"><input type="number" min="1" value={image.maxCount || 1} onChange={event => setGroup('image', { maxCount: Number(event.target.value) })}/></Field>
      <Field label="输入名称"><input value={(image.names || []).join('、')} onChange={event => setGroup('image', { names: event.target.value.split(/[、,，]/).map(item => item.trim()).filter(Boolean) })}/></Field>
      <h3>视频输入</h3>
      <Toggle label="是否开启" value={video.enabled} onChange={value => setGroup('video', { enabled: value })}/>
      <Toggle label="是否必填" value={video.required} onChange={value => setGroup('video', { required: value })}/>
      <Field label="最大上传数量"><input type="number" min="1" value={video.maxCount || 1} onChange={event => setGroup('video', { maxCount: Number(event.target.value) })}/></Field>
      <h3>音频输入</h3>
      <Toggle label="是否开启" value={audio.enabled} onChange={value => setGroup('audio', { enabled: value })}/>
      <Toggle label="是否必填" value={audio.required} onChange={value => setGroup('audio', { required: value })}/>
      <Field label="最大上传数量"><input type="number" min="1" value={audio.maxCount || 1} onChange={event => setGroup('audio', { maxCount: Number(event.target.value) })}/></Field>
    </div></aside>;
  }

  if (type === 'OUTPUT_NODE') return <aside className="workflowConfigPanel"><div className="workflowPanelHead"><span>节点配置 - 输出节点</span><small>只返回前面节点已经产出的内容</small></div><div className="workflowConfigBody">
    <Field label="节点名称"><input value={selectedNode.data.label} onChange={event => onNodeChange({ label: event.target.value })}/></Field>
    <Field label="输出内容选择"><select value={(config.outputs || [])[0] || ''} onChange={event => setConfig({ outputs: [event.target.value] })}>{unique([...producedOptions, ...OUTPUT_TYPES]).map(option => <option key={option}>{option}</option>)}</select></Field>
    <Field label="单结果处理方式"><select value={config.singleResult || '直接返回'} onChange={event => setConfig({ singleResult: event.target.value })}><option>直接返回</option></select></Field>
    <Field label="多结果处理方式"><select value={(config.multiResult || [])[0] || '合集展示'} onChange={event => setConfig({ multiResult: [event.target.value] })}><option>合集展示</option><option>支持打包下载</option></select></Field>
    <Toggle label="保存到资源库" value={config.saveToResourceLibrary} onChange={value => setConfig({ saveToResourceLibrary: value })}/>
    <Toggle label="写入历史任务" value={config.writeHistoryTask} onChange={value => setConfig({ writeHistoryTask: value })}/>
    {nodeErrors.map(error => <p className="workflowConfigError" key={error.message}>{error.message}</p>)}
  </div></aside>;

  const presetOptions = PRESET_OPTIONS[config.modelType] || [];
  const modelOptions = MODEL_OPTIONS[config.modelType] || [];
  const changeModelType = value => setConfig({ modelType: value, preset: (PRESET_OPTIONS[value] || [''])[0], model: (MODEL_OPTIONS[value] || [''])[0] });
  const inputs = config.inputs || [];
  return <aside className="workflowConfigPanel"><div className="workflowPanelHead"><span>节点配置 - {selectedNode.data.label}</span><small>大模型节点支持四类模型</small></div><div className="workflowConfigBody">
    <Field label="节点名称"><input value={selectedNode.data.label} onChange={event => onNodeChange({ label: event.target.value })}/></Field>
    <Field label="模型类型"><Segmented value={config.modelType || '图片模型'} options={MODEL_TYPES} onChange={changeModelType}/></Field>
    <Field label="使用方式"><Segmented value={config.usageMode || '调用预设'} options={USAGE_MODES} onChange={value => setConfig({ usageMode: value })}/></Field>
    <Field label="预设能力"><select value={config.preset || presetOptions[0]} onChange={event => setConfig({ preset: event.target.value })}>{presetOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
    <Field label="模型选择"><select value={config.model || modelOptions[0]} onChange={event => setConfig({ model: event.target.value })}>{modelOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
    <div className="workflowInputSourceList"><span>输入来源</span>{inputs.map((input, index) => <div key={`${input}-${index}`}><b>输入{index + 1}</b><select value={input} onChange={event => setConfig({ inputs: inputs.map((item, i) => i === index ? event.target.value : item) })}>{producedOptions.map(option => <option key={option}>{option}</option>)}</select><button type="button" onClick={() => setConfig({ inputs: inputs.filter((_, i) => i !== index) })}>删除</button></div>)}<button type="button" onClick={() => setConfig({ inputs: [...inputs, producedOptions[0] || '主图'] })}>+ 添加输入</button></div>
    <Field label="系统提示词"><textarea value={config.systemPrompt || ''} onChange={event => setConfig({ systemPrompt: event.target.value })}/></Field>
    {config.usageMode === '自定义' && <Field label="用户提示词 / 补充提示词"><textarea value={config.userPrompt || ''} onChange={event => setConfig({ userPrompt: event.target.value })}/></Field>}
    <h3>生成参数</h3>
    <ParamsPanel config={config} setConfig={setConfig}/>
    <Field label="输出内容"><input value={config.output || ''} onChange={event => setConfig({ output: event.target.value })}/></Field>
    <div className="workflowValidationHint">需要主图，参考图可选，缺少必需输入时阻止运行。</div>
    {nodeErrors.map(error => <p className="workflowConfigError" key={error.message}>{error.message}</p>)}
  </div></aside>;
}
