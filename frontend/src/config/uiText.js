export const roleName = {
  SYSTEM_ADMIN: '平台管理员',
  MERCHANT_OWNER: '门店管理员',
  MERCHANT_ADMIN: '门店管理员',
  STAFF: '门店人员',
  TRIAL: '体验用户'
};

export const audienceName = {
  ALL: '全体用户',
  MERCHANT: '门店/商家用户',
  ADMIN: '平台管理员'
};

export const resourceTypeName = {
  material: '材质替换',
  scene: '场景融合',
  user_reference: '用户图'
};

export const legacyResourceTypeName = {
  PRODUCT: '产品',
  MATERIAL: '材质替换',
  SOFT_DECOR: '材质替换',
  SCENE: '场景融合',
  COLOR: '用户图',
  OTHER: '用户图'
};

export const statusName = {
  ACTIVE: '启用',
  DISABLED: '禁用',
  DELETED: '已删除',
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  EXPIRED: '已过期',
  SUCCESS: '成功',
  FAILED: '失败',
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
  PAID: '已支付',
  CANCELLED: '已取消',
  INCOME: '收入',
  COST: '成本',
  ALLOCATE: '分配额度',
  ADD: '充值额度',
  RECYCLE: '回收额度',
  CONSUME: '消耗额度',
  ADMIN_ADJUST: '平台调整',
  DELETE_RECYCLE: '删除回收',
  AI_SUBMIT: 'AI任务预扣',
  AI_REFUND: 'AI失败退款'
};

export const imageSourceName = {
  AI_GENERATED: 'AI生成图',
  PROCESS_RESULT: '图片处理结果',
  UPLOAD: '上传图片',
  ORIGINAL: '原始图片',
  RESOURCE: '资源图片',
  MATERIAL: '材质图片',
  SCENE: '场景图片',
  USER_REFERENCE: '用户参考图',
  WATERMARK: '水印图片',
  AVATAR: '头像图片',
  OTHER: '其他图片'
};

export const targetScopeName = {
  ALL: '全部用户',
  MERCHANT: '门店用户',
  ADMIN: '平台管理员',
  MERCHANT_OWNER: '门店管理员',
  MERCHANT_ADMIN: '门店管理员',
  MERCHANT_USER: '门店人员',
  STAFF: '门店人员',
  TRIAL: '体验账户'
};

export const buttonText = {
  search: '查询',
  export: '导出',
  detail: '详情',
  edit: '编辑',
  delete: '删除',
  enable: '启用',
  disable: '禁用',
  approve: '通过',
  reject: '驳回',
  download: '下载',
  save: '保存',
  cancel: '取消',
  create: '创建',
  recharge: '充值'
};

export const featureName = {
  material: '材质替换',
  replace_bg: '场景融合',
  remove_bg: '背景净化',
  enhance: '摄影增强',
  lineart: '线稿图',
  multiview: '多角度视图',
  video_generate: '宣传视频生成'
};

function readableFallback(value,fallback='-'){
  const text=String(value||'').trim();
  if(!text)return fallback;
  return /[\u4e00-\u9fa5]/.test(text)?text:fallback;
}

export function getDisplayStatusName(value,fallback='未知状态'){
  const key=String(value||'');
  return statusName[key]||statusName[key.toUpperCase()]||statusName[key.toLowerCase()]||readableFallback(value,fallback);
}

export function getFeatureDisplayName(value,fallback='AI任务'){
  const key=String(value||'');
  return featureName[key]||featureName[key.toLowerCase()]||imageSourceName[key]||imageSourceName[key.toUpperCase()]||readableFallback(value,fallback);
}

export function getTargetScopeDisplayName(value,fallback='未知对象'){
  const key=String(value||'');
  return targetScopeName[key]||targetScopeName[key.toUpperCase()]||readableFallback(value,fallback);
}

export const messageText = {
  requestFailed: '请求失败',
  saveSuccess: '已保存',
  noData: '暂无数据'
};

export const workbenchText = {
  generatedTitle: '生成效果',
  recentTitle: '最近生成',
  uploadResource: '上传资源',
  download: '下载',
  delete: '删除',
  confirmDeleteImage: '确定删除该图片？',
  uploadSuccess: '上传成功',
  deleteSuccess: '删除成功',
  deleteFailed: '删除失败'
};

export const resourceText = {
  resourceName: '资源名称',
  resourceType: '资源类型',
  mainCategory: '主类型',
  subCategory: '子类别',
  systemSpace: '系统空间',
  merchantSpace: '门店空间',
  mySpace: '我的空间',
  manageCategory: '管理分类',
  uploadResource: '上传资源'
};
