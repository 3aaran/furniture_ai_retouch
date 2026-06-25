import { mockUser } from '../mock/data.js';

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
  uni.setStorageSync(TOKEN_KEY, 'mock-token');
  uni.setStorageSync(USER_KEY, mockUser);
  return mockUser;
}

export function mockLogout() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
}
