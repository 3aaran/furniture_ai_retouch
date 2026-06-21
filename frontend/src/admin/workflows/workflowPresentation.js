const enabledText = value => value ? '开启' : '关闭';
const listText = value => (Array.isArray(value) ? value : []).filter(Boolean).join('、') || '未配置';

export function deriveInputOutputs(config = {}) {
  const outputs = [];
  if (config.text?.enabled !== false) outputs.push(config.text?.title || '文本');
  if (config.image?.enabled) outputs.push(...(config.image.names || ['图片']));
  if (config.video?.enabled) outputs.push('视频');
  if (config.audio?.enabled) outputs.push('音频');
  return [...new Set(outputs.filter(Boolean))];
}

export function getWorkflowNodeTitleLines(data = {}) {
  const label = data.label || '未命名节点';
  if (data.nodeType === 'INPUT_NODE') return label === '输入节点' ? ['第1步：输入节点'] : ['第1步：输入节点', label];
  if (data.nodeType === 'MODEL_NODE') return ['第2步：大模型节点', label];
  if (data.nodeType === 'OUTPUT_NODE') return label === '输出节点' ? ['第3步：输出节点'] : ['第3步：输出节点', label];
  return [label];
}

export function getWorkflowNodeDisplayLines(data = {}) {
  const config = data.config || {};
  if (data.nodeType === 'INPUT_NODE') {
    return [
      `文本：${enabledText(config.text?.enabled !== false)}`,
      `图片：${enabledText(config.image?.enabled)}`,
      `视频：${enabledText(config.video?.enabled)}`,
      `音频：${enabledText(config.audio?.enabled)}`,
      `输入内容：${listText(deriveInputOutputs(config))}`
    ];
  }

  if (data.nodeType === 'MODEL_NODE') {
    const lines = [
      `模型类型：${config.modelType || '未配置'}`,
      `使用方式：${config.usageMode || '未配置'}`
    ];
    if (config.usageMode === '调用预设') lines.push(`预设能力：${config.preset || '未配置'}`);
    lines.push(
      `模型：${config.model || '未配置'}`,
      `输入：${listText(config.inputs)}`,
      `输出：${config.output || '未配置'}`
    );
    return lines;
  }

  if (data.nodeType === 'OUTPUT_NODE') {
    return [
      `输出内容：${listText(config.outputs)}`,
      `单结果：${config.singleResult || '未配置'}`,
      `多结果：${listText(config.multiResult)}`
    ];
  }

  return [data.description || '未配置'];
}
