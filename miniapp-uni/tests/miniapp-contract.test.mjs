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

test('workbench template attributes do not compile into multiline WXML values', () => {
  const workbench = read('pages/workbench/index.vue');
  assert.doesNotMatch(workbench, /&#(?:10|13);|&#x0*[ad];/i);
});

test('workbench feature drawer keeps function selection open and shows resource references inline', () => {
  const workbench = read('pages/workbench/index.vue');
  assert.doesNotMatch(workbench, /selectFeature\(key\)\s*\{[^}]*closeDrawer\(\)/, 'selecting a feature must not close the feature drawer');
  assert.match(workbench, /v-if="needsResource"[\s\S]*resource-grid/, 'material and scene features must show reference resources inside the feature drawer');
  assert.match(workbench, /featureMatchesResource/, 'resource filtering must tolerate real category data, not only exact resourceType values');
});

test('resources page follows Web space and purpose classification', () => {
  const resources = read('pages/resources/index.vue');
  assert.match(resources, /系统空间/);
  assert.match(resources, /门店空间/);
  assert.match(resources, /我的空间/);
  assert.match(resources, /产品图/);
  assert.match(resources, /材质替换/);
  assert.match(resources, /场景融合/);
  assert.match(resources, /normalizeSpaceKey/);
  assert.match(resources, /filterResourcesBySpaceAndPurpose/);
  assert.doesNotMatch(resources, /spaceTabs:\s*\[[\s\S]*\{ key: 'ALL'/, 'resource library must not use a mixed all-space tab as the primary Web-style category');
});

test('workbench distinguishes product origin resource selection from reference resources', () => {
  const workbench = read('pages/workbench/index.vue');
  assert.match(workbench, /resourcePickTarget/);
  assert.match(workbench, /openResourceDrawer\('origin'\)/);
  assert.match(workbench, /openResourceDrawer\('reference'\)/);
  assert.match(workbench, /selectOriginResource/);
  assert.match(workbench, /resourcePickTarget === 'origin'/);
});

test('miniapp login follows WeChat authorization flow before manual fallback', () => {
  const login = read('pages/login/index.vue');
  const authApi = read('api/auth.js');
  const server = fs.readFileSync(new URL('../../backend/src/server.js', import.meta.url), 'utf8');
  const db = fs.readFileSync(new URL('../../backend/src/db.js', import.meta.url), 'utf8');

  assert.match(login, /open-type="getPhoneNumber"/);
  assert.match(login, /@getphonenumber="handleWechatPhoneLogin"/);
  assert.match(login, /tryWechatSilentLogin/);
  assert.match(login, /wechatSilentLogin/);
  assert.match(login, /wechatPhoneLogin/);
  assert.match(authApi, /\/api\/auth\/wechat\/silent-login/);
  assert.match(authApi, /\/api\/auth\/wechat\/phone-login/);
  assert.match(server, /app\.post\('\/api\/auth\/wechat\/silent-login'/);
  assert.match(server, /app\.post\('\/api\/auth\/wechat\/phone-login'/);
  assert.match(server, /jscode2session/);
  assert.match(server, /getuserphonenumber/);
  assert.match(server, /getWechatPhoneIdentityStatus/);
  assert.match(server, /APPLICATION_PENDING/);
  assert.match(server, /NOT_FOUND/);
  assert.match(login, /不发送验证码/);
  assert.match(db, /wechat_openid/);
  assert.match(db, /wechat_bound_at/);
});
