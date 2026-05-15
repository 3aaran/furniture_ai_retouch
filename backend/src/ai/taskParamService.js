export const TASK_IMAGE_ROLES = {
  A: 'origin',
  B: 'functional_reference',
  C: 'user_reference'
};

function clean(value) {
  return String(value ?? '').trim();
}

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && !value.trim()) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

function normalizeImageRef(input, role) {
  if (!input) return null;
  if (typeof input === 'string') return { role, imageId: input };
  return compactObject({
    role,
    imageId: input.imageId || input.id || null,
    url: input.url || input.imageUrl || null,
    resourceId: input.resourceId || null,
    source: input.source || null,
    name: input.name || input.originalName || null
  });
}

function normalizeResourceRef(input, role) {
  if (!input) return null;
  if (typeof input === 'string') return { role, resourceId: input };
  return compactObject({
    role,
    imageId: input.imageId || null,
    url: input.url || input.imageUrl || null,
    resourceId: input.resourceId || input.selectedResourceId || input.id || null,
    source: input.source || 'resource',
    name: input.name || input.resourceName || null,
    resourceType: input.resourceType || null,
    mainCategoryName: input.mainCategoryName || null,
    subCategoryName: input.subCategoryName || null
  });
}

export function normalizeTaskParams(payload = {}) {
  const featureKey = clean(payload.featureKey || payload.operation);
  const imageA = normalizeImageRef(
    payload.imageA || payload.originImage || payload.originImageId || payload.imageId,
    TASK_IMAGE_ROLES.A
  );
  const legacyReferenceIds = Array.isArray(payload.referenceImageIds)
    ? payload.referenceImageIds.filter(Boolean)
    : payload.referenceImageId
      ? [payload.referenceImageId]
      : [];
  const userReferenceIds = Array.isArray(payload.userReferenceImageIds)
    ? payload.userReferenceImageIds.filter(Boolean)
    : payload.userReferenceImageId
      ? [payload.userReferenceImageId]
      : legacyReferenceIds;
  const imageB = normalizeImageRef(
    payload.imageB || payload.functionalReferenceImage || payload.functionalReferenceImageId || null,
    TASK_IMAGE_ROLES.B
  );
  const imageC = normalizeImageRef(
    payload.imageC || payload.userReferenceImage || userReferenceIds[0] || null,
    TASK_IMAGE_ROLES.C
  );
  const selectedResource = normalizeResourceRef(
    payload.selectedResourceSnapshot || payload.selectedResource || payload.resource || payload.selectedResourceId || null,
    TASK_IMAGE_ROLES.B
  );

  return compactObject({
    featureKey,
    imageA,
    imageB,
    imageC,
    selectedResource,
    selectedResourceId: clean(payload.selectedResourceId || selectedResource?.resourceId),
    resolution: clean(payload.resolution) || '2K',
    ratio: clean(payload.ratio) || '自适应',
    templatePrompt: clean(payload.templatePrompt),
    userPrompt: clean(payload.userPrompt ?? payload.customText),
    options: payload.options || {},
    functionalReferenceImageId: imageB?.imageId || null,
    userReferenceImageIds: userReferenceIds,
    referenceImageIds: [...(imageB?.imageId ? [imageB.imageId] : []), ...userReferenceIds],
    businessVersion: 1
  });
}

export function validateTaskParams(params = {}) {
  if (!params.featureKey) throw new Error('请选择生成任务类型');
  if (!params.imageA?.imageId) throw new Error('请先上传 Image A 家具原图');
}

export default {
  TASK_IMAGE_ROLES,
  normalizeTaskParams,
  validateTaskParams
};
