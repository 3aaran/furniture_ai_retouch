import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function readJsonc(file) {
  const text = read(file)
    .replace(/^\uFEFF/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  return JSON.parse(text);
}

test('miniapp exposes Web mobile account service pages', () => {
  const pages = readJsonc('pages.json').pages.map(item => item.path);
  for (const path of [
    'pages/quota/index',
    'pages/feedback/index',
    'pages/announcements/index',
    'pages/promotion/index',
    'pages/users/index'
  ]) {
    assert.ok(pages.includes(path), `${path} must be registered in pages.json`);
  }
});

test('side menu and mine page navigate to real service pages', () => {
  const topbar = read('components/app-topbar/app-topbar.vue');
  assert.match(topbar, /url:\s*'\/pages\/promotion\/index'/);
  assert.match(topbar, /key:\s*'users'[\s\S]*url:\s*'\/pages\/users\/index'/);

  const mine = read('pages/mine/index.vue');
  assert.match(mine, /goQuota\(\)\s*\{[^}]*\/pages\/quota\/index/);
  assert.match(mine, /goFeedback\(\)\s*\{[^}]*\/pages\/feedback\/index/);
  assert.match(mine, /goAnnouncements\(\)\s*\{[^}]*\/pages\/announcements\/index/);
  assert.doesNotMatch(mine, /follow-up integration|standalone page pending/i);
});

test('user API module keeps account service calls centralized', () => {
  const api = read('api/user.js');
  for (const contract of [
    "get('/api/merchant/quota-logs'",
    "get('/api/announcements'",
    "post(`/api/announcements/${encodeURIComponent(id)}/read`",
    "post('/api/feedbacks'",
    "get('/api/merchant/promotion'",
    "get('/api/merchant/users'",
    "post('/api/merchant/users'",
    "patch(`/api/merchant/users/${encodeURIComponent(userId)}`",
    "patch(`/api/merchant/users/${encodeURIComponent(userId)}/status`",
    "patch(`/api/merchant/users/${encodeURIComponent(userId)}/quota`",
    "del(`/api/merchant/users/${encodeURIComponent(userId)}`"
  ]) {
    assert.ok(api.includes(contract), `missing API contract: ${contract}`);
  }
});

test('secondary account pages expose a back action', () => {
  const topbar = read('components/app-topbar/app-topbar.vue');
  assert.match(topbar, /showBack/);
  assert.match(topbar, /goBack\(\)/);

  for (const file of [
    'pages/quota/index.vue',
    'pages/feedback/index.vue',
    'pages/announcements/index.vue',
    'pages/promotion/index.vue',
    'pages/users/index.vue'
  ]) {
    assert.match(read(file), /show-back/, `${file} must render AppTopbar with show-back`);
  }
});

test('users page keeps mini-program template expressions simple', () => {
  const users = read('pages/users/index.vue');
  assert.doesNotMatch(users, /<template[\s\S]*\?\?[\s\S]*<\/template>/);
  assert.doesNotMatch(users, /<template[\s\S]*\?\.[\s\S]*<\/template>/);
  assert.doesNotMatch(users, /<template[\s\S]*:class="\[[\s\S]*<\/template>/);
  assert.doesNotMatch(users, /<template[\s\S]*@click="[^"]*=[^"]*"[\s\S]*<\/template>/);
  assert.match(users, /viewItems/);
});
