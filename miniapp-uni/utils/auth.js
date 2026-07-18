export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';
export const QUOTA_KEY = 'quota';

const LEGACY_TOKEN_KEY = 'miniapp_auth_token';
const pendingLoginActions = [];
let loginSheetRequested = false;

export function getToken() {
  const token = uni.getStorageSync(TOKEN_KEY) || '';
  if (token) return token;

  const legacyToken = uni.getStorageSync(LEGACY_TOKEN_KEY) || '';
  if (legacyToken) {
    uni.setStorageSync(TOKEN_KEY, legacyToken);
    uni.removeStorageSync(LEGACY_TOKEN_KEY);
  }
  return legacyToken;
}

export function setLoginState(payload = {}) {
  const token = payload.token || payload.accessToken || payload?.data?.token || payload?.data?.accessToken;
  const user = payload.user !== undefined ? payload.user : payload?.data?.user;
  const quota = payload.quota !== undefined ? payload.quota : payload?.data?.quota;

  if (token) uni.setStorageSync(TOKEN_KEY, token);
  if (user !== undefined) uni.setStorageSync(USER_KEY, user || {});
  if (quota !== undefined) uni.setStorageSync(QUOTA_KEY, quota ?? 0);
}

export function clearLoginState() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
  uni.removeStorageSync(QUOTA_KEY);
  uni.removeStorageSync(LEGACY_TOKEN_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

function queueLoginAction(action) {
  if (typeof action !== 'function') return;
  pendingLoginActions.push(action);
  if (pendingLoginActions.length > 10) pendingLoginActions.shift();
}

export function notifyLoginRequired(action) {
  if (isLoggedIn()) return true;
  queueLoginAction(action);
  if (!loginSheetRequested) {
    loginSheetRequested = true;
    setTimeout(() => {
      loginSheetRequested = false;
      uni.$emit('auth:required');
    }, 0);
  }
  return false;
}

export function requireLogin(action) {
  if (isLoggedIn()) return true;
  if (typeof action === 'function') notifyLoginRequired(action);
  return false;
}

export async function resumePendingLoginActions() {
  const actions = pendingLoginActions.splice(0, pendingLoginActions.length);
  for (const action of actions) {
    try {
      await Promise.resolve(action());
    } catch (error) {
      uni.showToast({ title: error?.message || '操作恢复失败，请重试', icon: 'none' });
    }
  }
}

export function clearPendingLoginActions() {
  pendingLoginActions.splice(0, pendingLoginActions.length);
}
