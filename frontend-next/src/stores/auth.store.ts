import type { CurrentUser, LoginResult } from '../types/auth';

const TOKEN_KEY = 'furniture_token';
const USER_KEY = 'furniture_user';
const LEGACY_TOKEN_KEYS = ['token', 'authToken', 'accessToken'];

let currentUser: CurrentUser | null = loadStoredUser();

function normalizeCurrentUser(user: Partial<CurrentUser> | null | undefined): CurrentUser | null {
  if (!user?.id) return null;
  const name = String(user.name || user.displayName || user.username || user.phone || '用户');
  return {
    ...user,
    id: user.id,
    name,
    displayName: user.displayName || name,
    role: user.role || 'user',
    quota: Number(user.quota ?? user.merchantQuota ?? 0),
    merchantQuota: user.merchantQuota !== undefined ? Number(user.merchantQuota) : undefined,
    merchantId: user.merchantId ?? user.storeId ?? null,
    storeId: user.storeId ?? user.merchantId ?? null,
  };
}

export function setCurrentUser(user: CurrentUser | null) {
  currentUser = normalizeCurrentUser(user);
  if (currentUser) localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  else localStorage.removeItem(USER_KEY);
}

export function getCurrentUserSnapshot() {
  return currentUser;
}

export function saveAuthSession(result: LoginResult) {
  localStorage.setItem(TOKEN_KEY, result.token);
  setCurrentUser(result.user);
}

export function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? normalizeCurrentUser(JSON.parse(raw) as CurrentUser) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  setCurrentUser(null);
}
