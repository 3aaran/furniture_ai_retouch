import { promptTemplates } from './promptTemplates.js';

export const featureNameMap = Object.fromEntries(
  Object.entries(promptTemplates.features).map(([key, value]) => [key, value.name])
);

function clean(value) {
  return String(value ?? '').trim();
}

function yes(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function notFalse(value) {
  return value !== false && value !== 'false' && value !== 0 && value !== '0';
}

function firstText(...values) {
  return values.map(clean).find(Boolean) || '';
}

function block(title, items) {
  const lines = (Array.isArray(items) ? items : [items]).filter(Boolean);
  if (!lines.length) return '';
  return [`${title}：`, ...lines].join('\n');
}

function listOutputFormat({ resolution = '2K', ratio = '自适应' } = {}) {
  return [`画面比例：${ratio}`, `分辨率：${resolution}`];
}

function selectedResourceCategoryText(selectedResource = {}) {
  const main = clean(selectedResource.mainCategoryName || selectedResource.objectName);
  const sub = clean(selectedResource.subCategoryName || selectedResource.colorName);
  return [main, sub].filter(Boolean).join(' / ');
}

export function buildExtraRequirements(featureKey, options = {}, taskParams = {}) {
  const result = [];
  const selectedResource = taskParams.selectedResource || {};
  const categoryText = selectedResourceCategoryText(selectedResource);

  if (selectedResource.name) result.push(`资源名称：${selectedResource.name}`);
  if (categoryText) {
    result.push(`当前参考图分类为“${categoryText}”，请结合分类语义和图片内容提取可用于生成的视觉信息。`);
  }

  if (featureKey === 'material') {
    const materialName = firstText(options.materialName, options.resourceName, options.templateName, selectedResource.name);
    const materialColor = firstText(options.materialColor, options.colorName, selectedResource.subCategoryName, selectedResource.colorName);
    const materialCategory = firstText(options.materialCategory, options.objectName, selectedResource.mainCategoryName, selectedResource.objectName);

    if (materialName) result.push(`目标材质：${materialName}`);
    if (materialColor) result.push(`目标颜色或色系：${materialColor}`);
    if (materialCategory) result.push(`材质适用对象：${materialCategory}`);
    if (notFalse(options.keepStructure)) result.push('保持家具主体结构不变');
    if (notFalse(options.keepAngle)) result.push('保持原视角不变');
    if (notFalse(options.keepProportion)) result.push('保持原始比例不变');
  }

  if (featureKey === 'replace_bg') {
    const scene = firstText(options.sceneType, options.sceneName, options.templateName, options.resourceName, selectedResource.name);
    const sceneDesc = firstText(options.sceneDesc, options.description, selectedResource.description);
    result.push(scene ? `目标场景：${scene}` : '目标场景：真实、干净、有商业质感的室内空间');
    if (sceneDesc) result.push(`场景说明：${sceneDesc}`);
    if (notFalse(options.keepLighting)) result.push('整体光影真实自然');
    if (notFalse(options.keepPerspective)) result.push('透视、比例、摆放关系和地面接触协调');
  }

  if (featureKey === 'remove_bg') {
    result.push(yes(options.whiteBg)
      ? '将背景处理为干净、纯净、均匀的纯白背景，适合电商主图或产品展示图使用；白底背景应整洁自然，不要出现脏灰、色偏、边缘污染或抠图残留。'
      : '生成简洁、干净、克制的背景环境，突出主体，不加入复杂场景内容。');
    if (yes(options.mirror)) {
      result.push('在家具底部生成自然、对称、克制的镜像反射效果，镜像应符合透视关系和反射逻辑，不要过强、过亮或虚假。');
    }
  }

  if (featureKey === 'enhance') {
    if (yes(options.focus)) result.push('产品聚焦：突出产品主体并增强画面层次。');
    if (clean(options.angle) && clean(options.angle) !== '不变') result.push(`角度：${clean(options.angle)}`);
  }

  if (featureKey === 'multiview') {
    const viewCount = Number(options.viewCount || (String(options.view || '').includes('四') ? 4 : 3));
    if (viewCount === 4) {
      result.push('如果用户选择四视图，则在同一张拼版图中展示以下四个视角：');
      result.push('1. 正视图：从家具正前方水平拍摄，展示正面整体轮廓、正面结构、左右对称关系、底部支脚和主要正面细节。');
      result.push('2. 侧视图：从家具左侧或右侧水平拍摄，展示侧面长度、侧板或扶手形态、座面高度、靠背厚度、底部支脚和侧面结构关系。');
      result.push('3. 45度视图：从家具前方偏左或偏右约45度拍摄，展示家具正面、侧面和顶部结构关系，作为主展示视角。');
      result.push('4. 背视图：从家具正后方水平拍摄，展示家具背面整体轮廓、背部面板、左右端板外侧、底部支脚和背面结构关系。背视图必须是背面直视图，不能生成成正视图、侧视图、俯视图或普通45度图。背视图中不应大面积展示正面坐垫分格或正面细节；如果原图中的枕头、靠垫或装饰物位于正面或座面前侧，背视图中应隐藏或只少量露出，不能让其成为画面主体。');
    } else {
      result.push('如果用户选择三视图，则在同一张拼版图中展示以下三个视角：');
      result.push('1. 正视图：从家具正前方水平拍摄，展示正面整体轮廓、正面结构、左右对称关系、底部支脚和主要正面细节。');
      result.push('2. 侧视图：从家具左侧或右侧水平拍摄，展示侧面长度、侧板或扶手形态、座面高度、靠背厚度、底部支脚和侧面结构关系。');
      result.push('3. 45度视图：从家具前方偏左或偏右约45度拍摄，展示家具正面、侧面和顶部结构关系，作为主展示视角。');
    }
  }

  return result;
}

export function buildPromptParts({
  featureKey,
  userPrompt = '',
  options = {},
  resolution = '2K',
  ratio = '自适应',
  taskParams = {}
}) {
  const tpl = promptTemplates.features[featureKey] || promptTemplates.features.material;
  const common = promptTemplates.common;
  const hasImageB = !!taskParams.imageB?.imageId
    || !!taskParams.selectedResource?.imageId
    || !!taskParams.selectedResource?.resourceId
    || !!taskParams.selectedResource?.url
    || !!taskParams.selectedResource?.imageUrl;
  const hasImageC = !!taskParams.imageC?.imageId || (taskParams.userReferenceImageIds || []).length > 0;
  const extraRequirements = buildExtraRequirements(featureKey, options, taskParams);
  const outputFormat = { ratio, resolution };
  const userInput = clean(userPrompt) || clean(taskParams.userPrompt);

  return {
    featureName: tpl.name,
    userInput,
    extraRequirements,
    outputFormat,
    sections: {
      intro: common.intro,
      taskGoal: common.taskGoal.replace('{featureName}', tpl.name),
      keepRequirements: common.keepRequirements,
      modificationRequirements: [
        ...tpl.modification,
        hasImageB && tpl.imageB ? tpl.imageB : '',
        userInput ? `用户补充要求：${userInput}` : '',
        hasImageC && tpl.imageC ? tpl.imageC : '',
        ...extraRequirements
      ].filter(Boolean),
      outputRequirements: listOutputFormat(outputFormat),
      qualityRequirements: common.qualityRequirements,
      negativeRestrictions: common.negativeRestrictions
    }
  };
}

export function buildAiPrompt(args) {
  const parts = buildPromptParts(args);
  return [
    parts.sections.intro,
    '',
    block('任务目标', parts.sections.taskGoal),
    '',
    block('保留要求', parts.sections.keepRequirements),
    '',
    block('修改要求', parts.sections.modificationRequirements),
    '',
    block('输出要求', parts.sections.outputRequirements),
    '',
    block('质量要求', parts.sections.qualityRequirements),
    '',
    block('负面限制', parts.sections.negativeRestrictions)
  ].filter((line) => line !== undefined).join('\n');
}

export default {
  featureNameMap,
  buildExtraRequirements,
  buildPromptParts,
  buildAiPrompt
};
