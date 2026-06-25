export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';
export const QUOTA_KEY = 'quota';

const LEGACY_TOKEN_KEY = 'miniapp_auth_token';
const MOCK_TOKEN_KEY = 'miniapp_mock_token';
const MOCK_USER_KEY = 'miniapp_mock_user';
const LOGIN_URL = '/pages/login/index';

let isRedirectingLogin = false;

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
  uni.removeStorageSync(MOCK_TOKEN_KEY);
  uni.removeStorageSync(MOCK_USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}

function getCurrentRoute() {
  const pages = getCurrentPages ? getCurrentPages() : [];
  const currentPage = pages && pages.length ? pages[pages.length - 1] : null;
  return currentPage && currentPage.route ? `/${currentPage.route}` : '';
}

export function requireLogin() {
  if (isLoggedIn()) return true;

  const currentRoute = getCurrentRoute();
  if (currentRoute === LOGIN_URL) return false;
  if (isRedirectingLogin) return false;

  isRedirectingLogin = true;
  uni.reLaunch({
    url: LOGIN_URL,
    complete() {
      setTimeout(() => {
        isRedirectingLogin = false;
      }, 500);
    }
  });

  return false;
}
