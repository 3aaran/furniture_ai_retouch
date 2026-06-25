import { mockUser } from '../mock/data.js';
import { clearLoginState, setLoginState } from './auth.js';

const TOKEN_KEY = 'miniapp_mock_token';
const USER_KEY = 'miniapp_mock_user';

export function getMockUser() {
  const saved = uni.getStorageSync(USER_KEY);
  return saved || mockUser;
}

export function isMockLoggedIn() {
  return Boolean(uni.getStorageSync(TOKEN_KEY));
}

export function mockLogin() {
  setLoginState({ token: 'mock-token', user: mockUser, quota: mockUser.quota || 0 });
  uni.setStorageSync(TOKEN_KEY, 'mock-token');
  uni.setStorageSync(USER_KEY, mockUser);
  return mockUser;
}

export function mockLogout() {
  clearLoginState();
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
}
