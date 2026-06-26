export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export function unwrapUser(payload) {
  return payload?.user || payload?.data?.user || payload?.data || payload || null;
}

export function normalizeQuota(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.balance ?? value.quota ?? value.remaining ?? value.available ?? value.merchantQuota ?? '';
  }
  return '';
}

export function userQuota(user) {
  return normalizeQuota(user?.quota ?? user?.merchantQuota ?? user?.quotaBalance ?? user?.balance ?? user?.quotaSummary);
}

export function displayName(user) {
  return user?.displayName || user?.name || user?.username || user?.phone || user?.identifier || '用户';
}

export function roleText(role) {
  const map = {
    PLATFORM_ADMIN: '平台管理员',
    STORE_OWNER: '门店主账号',
    STORE_ADMIN: '门店管理员',
    INTERNAL_STAFF: '内部人员',
    TRIAL: '体验人员',
    USER: '普通用户',
    admin: '管理员',
    user: '普通用户'
  };
  return map[role] || role || '用户';
}

export function statusText(status) {
  const key = String(status || '').toLowerCase();
  const map = {
    pending: '等待中',
    queued: '等待中',
    waiting: '等待中',
    running: '生成中',
    processing: '生成中',
    success: '已完成',
    completed: '已完成',
    done: '已完成',
    failed: '失败',
    error: '失败',
    canceled: '已取消'
  };
  return map[key] || status || '-';
}

export function featureName(key, fallback = '') {
  const map = {
    material: '材质替换',
    replace_bg: '场景融合',
    remove_bg: '背景净化',
    enhance: '摄影增强',
    lineart: '线稿图',
    multiview: '多角度视图',
    promo_main_image: '产品主图',
    promo_poster_image: '广告海报图',
    promo_detail_image: '产品细节图'
  };
  return map[key] || fallback || key || '-';
}

export function fmtTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function imageOf(item = {}) {
  return item.thumbUrl || item.thumbnailUrl || item.imageUrl || item.resultUrl || item.url || item.originalUrl || item.storageUrl || '';
}
