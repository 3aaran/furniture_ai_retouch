export const featureGroups = [
  { key: 'base', name: '基础' },
  { key: 'promotion', name: '宣传图' },
  { key: 'video', name: '短视频' }
];

export const featureTypes = [
  {
    key: 'remove_bg',
    group: 'base',
    apiFeatureKey: 'remove_bg',
    name: '背景净化',
    shortName: '净化',
    desc: '清理杂物背景，保留家具主体。',
    cost: 10,
    scene: '白底、上架、详情页'
  },
  {
    key: 'material',
    group: 'base',
    apiFeatureKey: 'material',
    name: '材质替换',
    shortName: '材质',
    desc: '替换布艺、皮革、木纹等材质。',
    cost: 12,
    scene: 'SKU、选色、方案沟通'
  },
  {
    key: 'replace_bg',
    group: 'base',
    apiFeatureKey: 'replace_bg',
    name: '场景融合',
    shortName: '场景',
    desc: '把家具放入真实家居空间。',
    cost: 12,
    scene: '主图、海报、搭配图'
  },
  {
    key: 'enhance',
    group: 'base',
    apiFeatureKey: 'enhance',
    name: '摄影增强',
    shortName: '增强',
    desc: '增强光影、清晰度和质感。',
    cost: 8,
    scene: '门店实拍、商品图库'
  },
  {
    key: 'lineart',
    group: 'base',
    apiFeatureKey: 'lineart',
    name: '线稿图',
    shortName: '线稿',
    desc: '生成干净产品线稿。',
    cost: 8,
    scene: '设计沟通、尺寸说明'
  },
  {
    key: 'multiview',
    group: 'base',
    apiFeatureKey: 'multiview',
    name: '多角度视图',
    shortName: '多角度',
    desc: '生成正面、侧面、45 度等视图。',
    cost: 20,
    scene: '详情页、产品档案'
  },
  {
    key: 'promo_main_image',
    group: 'promotion',
    apiFeatureKey: 'promo_main_image',
    name: '产品主图',
    shortName: '主图',
    desc: '主体突出，背景干净。',
    cost: 12,
    scene: '电商首图、商品封面'
  },
  {
    key: 'promo_poster_image',
    group: 'promotion',
    apiFeatureKey: 'promo_poster_image',
    name: '广告海报图',
    shortName: '海报',
    desc: '广告构图，预留文案空间。',
    cost: 12,
    scene: '朋友圈、活动海报'
  },
  {
    key: 'promo_detail_image',
    group: 'promotion',
    apiFeatureKey: 'promo_detail_image',
    name: '产品细节图',
    shortName: '细节',
    desc: '突出材质、结构和工艺。',
    cost: 8,
    scene: '详情页、卖点展示'
  },
  {
    key: 'video_generate',
    group: 'video',
    apiFeatureKey: 'video_generate',
    name: '宣传视频',
    shortName: '视频',
    desc: '家具图片生成短视频。',
    cost: 30,
    scene: '门店号、短视频平台'
  }
];

export const mockUser = {
  id: 'u_store_001',
  name: '许店长',
  displayName: '许店长',
  role: 'MERCHANT_ADMIN',
  roleName: '门店管理员',
  company: '勋港家居旗舰店',
  companyName: '勋港家居旗舰店',
  phone: '138****2688',
  username: 'store_xu',
  status: 'ACTIVE',
  quota: 860,
  merchantQuota: 3280,
  storageUsedText: '1.8GB',
  storageLimitText: '5GB',
  storageRemainingText: '3.2GB',
  storagePercent: 36
};

export const quotaSummary = {
  currentBalance: 860,
  totalIncome: 1320,
  totalExpense: 460
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
    sizeText: '2.4MB',
    resolution: '2048x2048',
    relatedTasks: 12,
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
    sizeText: '1.7MB',
    resolution: '1600x1600',
    relatedTasks: 8,
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
    sizeText: '1.3MB',
    resolution: '1600x1600',
    relatedTasks: 5,
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
    sizeText: '3.1MB',
    resolution: '3024x3024',
    relatedTasks: 3,
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
    sizeText: '2.8MB',
    resolution: '2048x3072',
    relatedTasks: 1,
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
    sizeText: '2.2MB',
    resolution: '2048x2048',
    relatedTasks: 2,
    createdAt: '2026-06-25 08:20',
    thumbText: '参考',
    desc: '用于多角度生成时参考主体结构。'
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
    sizeText: '18.6MB',
    resolution: '1080x1920',
    relatedTasks: 1,
    createdAt: '2026-06-25 10:15',
    thumbText: '视频',
    desc: '适合门店号和短视频平台发布。'
  }
];

export const mockTasks = [
  {
    id: 'T20260625001',
    title: '北欧布艺沙发背景净化',
    featureKey: 'remove_bg',
    apiFeatureKey: 'remove_bg',
    featureName: '背景净化',
    status: 'queued',
    statusText: '等待中',
    cost: 10,
    userName: '许店长',
    createdAt: '2026-06-25 09:12',
    originImage: { id: 'img_origin_001', thumbText: '原图', name: '沙发实拍原图' },
    resultImage: null,
    failReason: '',
    userPrompt: '保留靠枕和扶手细节，输出干净白底。',
    params: { resolution: '2K', ratio: '1:1' }
  },
  {
    id: 'T20260625002',
    title: '胡桃木餐桌材质替换',
    featureKey: 'material',
    apiFeatureKey: 'material',
    featureName: '材质替换',
    status: 'running',
    statusText: '生成中',
    cost: 12,
    userName: '许店长',
    createdAt: '2026-06-25 09:26',
    originImage: { id: 'img_origin_002', thumbText: '餐桌', name: '餐桌原图' },
    resultImage: null,
    failReason: '',
    userPrompt: '替换为深胡桃木，保持桌腿结构不变。',
    params: { resolution: '2K', ratio: '4:3' }
  },
  {
    id: 'T20260624018',
    title: '单人椅场景融合主图',
    featureKey: 'replace_bg',
    apiFeatureKey: 'replace_bg',
    featureName: '场景融合',
    status: 'succeeded',
    statusText: '已完成',
    cost: 12,
    userName: '许店长',
    createdAt: '2026-06-24 18:40',
    originImage: { id: 'img_origin_003', thumbText: '单椅', name: '单人椅原图' },
    resultImage: { id: 'img_result_003', thumbText: '结果', name: '客厅场景主图' },
    failReason: '',
    userPrompt: '放入浅色客厅，适合电商首页展示。',
    params: { resolution: '2K', ratio: '1:1' }
  },
  {
    id: 'T20260624013',
    title: '春季活动广告海报',
    featureKey: 'promo_poster_image',
    apiFeatureKey: 'promo_poster_image',
    featureName: '广告海报图',
    status: 'succeeded',
    statusText: '已完成',
    cost: 12,
    userName: '门店设计',
    createdAt: '2026-06-24 16:22',
    originImage: { id: 'img_origin_006', thumbText: '单椅', name: '休闲椅原图' },
    resultImage: { id: 'img_result_006', thumbText: '海报', name: '春季活动海报' },
    failReason: '',
    userPrompt: '温暖春季氛围，右侧留文案。',
    params: { resolution: '2K', ratio: '3:4' }
  },
  {
    id: 'T20260624009',
    title: '床垫多角度生成',
    featureKey: 'multiview',
    apiFeatureKey: 'multiview',
    featureName: '多角度视图',
    status: 'failed',
    statusText: '失败',
    cost: 20,
    userName: '许店长',
    createdAt: '2026-06-24 11:08',
    originImage: { id: 'img_origin_004', thumbText: '床垫', name: '床垫原图' },
    resultImage: null,
    failReason: '原图主体边缘被遮挡，无法稳定生成背面视图。',
    userPrompt: '生成四角度视图。',
    params: { resolution: '2K', ratio: '1:1' }
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
    userName: '许店长',
    createdAt: '2026-06-25 10:20',
    originImage: { id: 'img_origin_005', thumbText: '沙发', name: '沙发分镜图' },
    resultImage: null,
    failReason: '',
    userPrompt: '缓慢推进，突出材质和空间氛围。',
    params: { duration: '10秒', ratio: '9:16', quality: '高清' }
  }
];

export const quotaLogs = [
  { id: 'q1', type: 'AI_GENERATE', typeText: 'AI生成', amount: -12, balanceAfter: 860, relatedTaskId: 'T20260624018', createdAt: '2026-06-24 18:40' },
  { id: 'q2', type: 'AI_REFUND', typeText: '失败退款', amount: 20, balanceAfter: 872, relatedTaskId: 'T20260624009', createdAt: '2026-06-24 11:15' },
  { id: 'q3', type: 'MANUAL_RECHARGE', typeText: '人工充值', amount: 300, balanceAfter: 852, relatedTaskId: '', createdAt: '2026-06-23 16:00' },
  { id: 'q4', type: 'AUTO_RECHARGE', typeText: '自动充值', amount: 100, balanceAfter: 552, relatedTaskId: '', createdAt: '2026-06-22 09:30' }
];

export const announcements = [
  { id: 'a1', title: '背景净化模型已更新', content: '白底图边缘保留更稳定，适合门店批量处理商品图。', createdAt: '2026-06-24', unread: true },
  { id: 'a2', title: '资源库分类规范', content: '建议按材质、软体、产品、场景模板维护素材，方便工作台快速选择。', createdAt: '2026-06-20', unread: false }
];

export const promotionInfo = {
  inviteCode: 'XG2026',
  inviteLink: 'https://xungang.example.com/apply?invite=XG2026',
  summary: {
    invitedCount: 18,
    approvedCount: 12,
    benefitQuota: 680
  }
};

export const promotionRecords = [
  {
    id: 'p1',
    invitedMerchantName: '城北家具馆',
    invitedMerchantCode: 'M20260601',
    rechargeQuota: 500,
    shareRatio: '10%',
    benefitQuota: 50,
    settlementStatus: '已结算',
    generatedAt: '2026-06-20 14:35'
  },
  {
    id: 'p2',
    invitedMerchantName: '南区软装店',
    invitedMerchantCode: 'M20260608',
    rechargeQuota: 300,
    shareRatio: '10%',
    benefitQuota: 30,
    settlementStatus: '未结算',
    generatedAt: '2026-06-23 16:10'
  }
];
