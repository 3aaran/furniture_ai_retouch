export const GENERATION_FEATURE_MAP = Object.freeze({
  MATERIAL_GENERATE: 'material',
  SCENE_GENERATE: 'replace_bg',
  BACKGROUND_CLEAN: 'remove_bg',
  PHOTO_ENHANCE: 'enhance',
  LINEART_GENERATE: 'lineart',
  MULTIVIEW_GENERATE: 'multiview',
  PROMO_MAIN_GENERATE: 'promo_main_image',
  PROMO_POSTER_GENERATE: 'promo_poster_image',
  PROMO_DETAIL_GENERATE: 'promo_detail_image'
});

export function buildAiTaskPayload(node, currentImageId) {
  const nodeType = node?.data?.nodeType;
  const expectedFeatureKey = GENERATION_FEATURE_MAP[nodeType];
  if (!expectedFeatureKey) {
    const error = new Error('该节点不能执行生图任务');
    error.code = 'WORKFLOW_NODE_NOT_EXECUTABLE';
    throw error;
  }
  const config = node?.data?.config || {};
  if (config.featureKey && config.featureKey !== expectedFeatureKey) {
    const error = new Error('节点功能映射不一致');
    error.code = 'WORKFLOW_NODE_FEATURE_MISMATCH';
    throw error;
  }
  return {
    originImageId: currentImageId,
    featureKey: expectedFeatureKey,
    selectedResourceId: config.selectedResourceId || null,
    selectedResourceSnapshot: config.selectedResourceSnapshot || null,
    templatePrompt: config.templatePrompt || '',
    userPrompt: config.userPrompt || '',
    resolution: config.resolution || '2K',
    ratio: config.ratio || '自适应',
    options: config.options || {}
  };
}
