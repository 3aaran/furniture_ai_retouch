export const featureTypes = [
  {
    key: 'background_clean',
    group: 'base',
    apiFeatureKey: 'remove_bg',
    name: '背景净化',
    shortName: '净化',
    desc: '清理仓库、展厅和杂物背景，保留家具主体结构与真实质感。',
    cost: 10,
    scene: '电商白底、详情页首屏、门店快速上架'
  },
  {
    key: 'material_replace',
    group: 'base',
    apiFeatureKey: 'material',
    name: '材质替换',
    shortName: '材质',
    desc: '替换布艺、皮革、木纹、金属等表面材质，快速预览 SKU 效果。',
    cost: 12,
    scene: 'SKU 展示、客户选色、门店方案沟通'
  },
  {
    key: 'scene_fusion',
    group: 'base',
    apiFeatureKey: 'replace_bg',
    name: '场景融合',
    shortName: '场景',
    desc: '把单品放入真实家居空间，生成适合电商展示和门店宣传的画面。',
    cost: 12,
    scene: '家具主图、活动海报、空间搭配图'
  },
  {
    key: 'photo_enhance',
    group: 'base',
    apiFeatureKey: 'enhance',
    name: '摄影增强',
    shortName: '增强',
    desc: '提升光影、清晰度、轮廓和质感，让普通照片接近商业成片。',
    cost: 8,
    scene: '门店实拍优化、商品图库修整'
  },
  {
    key: 'line_drawing',
    group: 'base',
    apiFeatureKey: 'lineart',
    name: '线稿图',
    shortName: '线稿',
    desc: '基于家具照片生成干净产品线稿，适合设计沟通和方案确认。',
    cost: 8,
    scene: '设计沟通、尺寸说明、客户确认'
  },
  {
    key: 'multi_view',
    group: 'base',
    apiFeatureKey: 'multiview',
    name: '多视角',
    shortName: '多视角',
    desc: '生成正面、侧面、45 度和背面等多角度商品展示图。',
    cost: 20,
    scene: '详情页素材、产品档案、招商资料'
  },
  {
    key: 'promo_main_image',
    group: 'promotion',
    apiFeatureKey: 'promo_main_image',
    name: '产品主图',
    shortName: '主图',
    desc: '生成主体突出、背景干净的家具商品主图。',
    cost: 12,
    scene: '电商首图、商品封面'
  },
  {
    key: 'promo_poster_image',
    group: 'promotion',
    apiFeatureKey: 'promo_poster_image',
    name: '广告海报图',
    shortName: '海报',
    desc: '生成有留白和广告构图的宣传海报。',
    cost: 12,
    scene: '朋友圈、小红书、门店活动'
  },
  {
    key: 'promo_detail_image',
    group: 'promotion',
    apiFeatureKey: 'promo_detail_image',
    name: '产品细节图',
    shortName: '细节',
    desc: '生成材质、结构和工艺细节展示图。',
    cost: 8,
    scene: '详情页、卖点展示'
  },
  {
    key: 'video_generate',
    group: 'video',
    apiFeatureKey: 'video_generate',
    name: '宣传视频',
    shortName: '视频',
    desc: '基于家具图片生成短视频分镜。',
    cost: 30,
    scene: '短视频、门店宣传'
  }
];

export const mockUser = {
  id: 'u_store_001',
  name: '许店长',
  displayName: '许店长',
  role: 'MERCHANT_ADMIN',
  roleName: '门店管理员',
  company: '勋港家居旗舰店',
  phone: '138****2688',
  quota: 860,
  merchantQuota: 3280,
  storageUsedText: '1.8GB',
  storageLimitText: '5GB'
};

export const mockResources = [
  {
    id: 'res_scene_001',
    name: '浅灰客厅场景',
    type: 'system',
    typeText: '系统素材',
    sourceType: 'RESOURCE',
    scope: 'SYSTEM',
    source: '系统素材库',
    resourceType: 'scene',
    mainCategoryName: '场景模板',
    subCategoryName: '客厅',
    createdAt: '2026-06-21 10:18',
    thumbText: '客厅',
    desc: '适合沙发、茶几和电视柜主图。'
  },
  {
    id: 'res_material_001',
    name: '胡桃木材质参考',
    type: 'merchant',
    typeText: '门店素材',
    sourceType: 'RESOURCE',
    scope: 'MERCHANT',
    source: '门店素材库',
    resourceType: 'material',
    mainCategoryName: '材质',
    subCategoryName: '木材',
    createdAt: '2026-06-22 15:42',
    thumbText: '木纹',
    desc: '适合餐桌、书柜、边柜细节生成。'
  },
  {
    id: 'res_material_002',
    name: '米白布艺面料',
    type: 'merchant',
    typeText: '门店素材',
    sourceType: 'RESOURCE',
    scope: 'MERCHANT',
    source: '门店素材库',
    resourceType: 'material',
    mainCategoryName: '软体',
    subCategoryName: '布艺',
    createdAt: '2026-06-23 09:35',
    thumbText: '布艺',
    desc: '适合沙发、床头软包、抱枕材质替换。'
  },
  {
    id: 'res_origin_001',
    name: '门店实拍沙发原图',
    type: 'original',
    typeText: '原图',
    sourceType: 'UPLOAD',
    scope: 'USER',
    source: '个人上传',
    resourceType: 'user_reference',
    mainCategoryName: '产品',
    subCategoryName: '家具原图',
    createdAt: '2026-06-24 11:08',
    thumbText: '原图',
    desc: '用户上传的可继续创作素材。'
  },
  {
    id: 'res_generated_001',
    name: '单人椅春季海报生成图',
    type: 'generated',
    typeText: '生成图',
    sourceType: 'AI_GENERATED',
    scope: 'MERCHANT',
    source: 'AI 任务结果',
    resourceType: 'user_reference',
    mainCategoryName: '产品',
    subCategoryName: 'AI生成',
    createdAt: '2026-06-24 18:40',
    thumbText: '海报',
    desc: '可作为后续海报或场景融合参考。'
  },
  {
    id: 'res_personal_001',
    name: '用户参考角度图',
    type: 'personal',
    typeText: '个人素材',
    sourceType: 'RESOURCE',
    scope: 'USER',
    source: '个人素材库',
    resourceType: 'user_reference',
    mainCategoryName: '产品',
    subCategoryName: '结构参考',
    createdAt: '2026-06-25 08:20',
    thumbText: '参考',
    desc: '用于多视角生成时参考主体结构。'
  },
  {
    id: 'res_video_001',
    name: '沙发门店短视频',
    type: 'video',
    typeText: '视频',
    sourceType: 'AI_GENERATED',
    scope: 'MERCHANT',
    source: 'AI 视频任务',
    resourceType: 'video',
    mainCategoryName: '产品',
    subCategoryName: '宣传视频',
    createdAt: '2026-06-25 10:15',
    thumbText: '视频',
    desc: '适合门店号和短视频平台发布。'
  }
];

export const mockTasks = [
  {
    id: 'T20260625001',
    title: '北欧布艺沙发背景净化',
    featureKey: 'background_clean',
    apiFeatureKey: 'remove_bg',
    featureName: '背景净化',
    status: 'queued',
    statusText: '等待中',
    cost: 10,
    createdAt: '2026-06-25 09:12',
    originImage: { id: 'img_origin_001', thumbText: '原图', name: '沙发实拍原图' },
    resultImage: null,
    failReason: '',
    userPrompt: '保留靠枕和扶手细节，输出干净白底。'
  },
  {
    id: 'T20260625002',
    title: '胡桃木餐桌材质替换',
    featureKey: 'material_replace',
    apiFeatureKey: 'material',
    featureName: '材质替换',
    status: 'running',
    statusText: '生成中',
    cost: 12,
    createdAt: '2026-06-25 09:26',
    originImage: { id: 'img_origin_002', thumbText: '餐桌', name: '餐桌原图' },
    resultImage: null,
    failReason: '',
    userPrompt: '替换为深胡桃木，保持桌腿结构不变。'
  },
  {
    id: 'T20260624018',
    title: '单人椅场景融合主图',
    featureKey: 'scene_fusion',
    apiFeatureKey: 'replace_bg',
    featureName: '场景融合',
    status: 'succeeded',
    statusText: '已完成',
    cost: 12,
    createdAt: '2026-06-24 18:40',
    originImage: { id: 'img_origin_003', thumbText: '单椅', name: '单人椅原图' },
    resultImage: { id: 'img_result_003', thumbText: '结果', name: '客厅场景主图' },
    failReason: '',
    userPrompt: '放入浅色客厅，适合电商首页展示。'
  },
  {
    id: 'T20260624009',
    title: '床垫多视角生成',
    featureKey: 'multi_view',
    apiFeatureKey: 'multiview',
    featureName: '多视角',
    status: 'failed',
    statusText: '失败',
    cost: 20,
    createdAt: '2026-06-24 11:08',
    originImage: { id: 'img_origin_004', thumbText: '床垫', name: '床垫原图' },
    resultImage: null,
    failReason: '原图主体边缘被遮挡，无法稳定生成背面视图。',
    userPrompt: '生成四角度视图。'
  },
  {
    id: 'T20260625005',
    title: '客厅沙发宣传视频',
    featureKey: 'video_generate',
    apiFeatureKey: 'video_generate',
    featureName: '宣传视频',
    status: 'queued',
    statusText: '等待中',
    cost: 30,
    createdAt: '2026-06-25 10:20',
    originImage: { id: 'img_origin_005', thumbText: '沙发', name: '沙发分镜图' },
    resultImage: null,
    failReason: '',
    userPrompt: '缓慢推进，突出材质和空间氛围。'
  }
];

export const quotaLogs = [
  { id: 'q1', type: 'AI_COST', typeText: 'AI 生成', amount: -12, balanceAfter: 860, relatedTaskId: 'T20260624018', createdAt: '2026-06-24 18:40' },
  { id: 'q2', type: 'AI_REFUND', typeText: '失败退款', amount: 20, balanceAfter: 872, relatedTaskId: 'T20260624009', createdAt: '2026-06-24 11:15' },
  { id: 'q3', type: 'MANUAL_ADJUST', typeText: '门店分配', amount: 300, balanceAfter: 852, relatedTaskId: '', createdAt: '2026-06-23 16:00' }
];

export const announcements = [
  { id: 'a1', title: '背景净化模型已更新', content: '白底图边缘保留更稳定，适合门店批量处理商品图。', createdAt: '2026-06-24' },
  { id: 'a2', title: '资源库分类规范', content: '建议按材质、软体、产品、场景模板维护素材，方便工作台快速选择。', createdAt: '2026-06-20' }
];
