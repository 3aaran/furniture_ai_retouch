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

test('miniapp starts at workbench and keeps login as an on-demand page', () => {
  const config = readJsonc('pages.json');
  const pages = config.pages.map(item => item.path);
  assert.equal(pages[0], 'pages/workbench/index');
  assert.ok(pages.includes('pages/login/index'));
  assert.ok(!pages.includes('pages/index/index'));

  const legacyHome = read('pages/index/index.vue');
  assert.doesNotMatch(legacyHome, /<template|<script|<style/);
});

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

test('miniapp terminology follows frontend-next navigation labels', () => {
  const pagesJson = read('pages.json');
  const topbar = read('components/app-topbar/app-topbar.vue');
  const resources = read('pages/resources/index.vue');
  const tasks = read('pages/tasks/index.vue');
  const promotion = read('pages/promotion/index.vue');

  for (const label of ['工作室', '资产库', '历史记录', '邀请共创']) {
    assert.ok(pagesJson.includes(label), `pages.json must expose ${label}`);
    assert.ok(topbar.includes(label), `topbar must expose ${label}`);
  }

  assert.match(resources, /资产库/);
  assert.match(tasks, /历史记录/);
  assert.match(promotion, /邀请共创/);
  assert.doesNotMatch(`${pagesJson}\n${topbar}\n${resources}\n${tasks}\n${promotion}`, /AI 工作台|资源库|历史任务|推广邀请/);
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

test('miniapp uses on-demand OPENID login instead of phone-number authorization', () => {
  const login = read('pages/login/index.vue');
  const loginSheet = read('components/login-sheet/login-sheet.vue');
  const topbar = read('components/app-topbar/app-topbar.vue');
  const auth = read('utils/auth.js');
  const request = read('utils/request.js');
  const authApi = read('api/auth.js');
  const server = fs.readFileSync(new URL('../../backend/src/server.js', import.meta.url), 'utf8');
  const taskService = fs.readFileSync(new URL('../../backend/src/ai/taskService.js', import.meta.url), 'utf8');
  const videoTaskService = fs.readFileSync(new URL('../../backend/src/ai/videoTaskService.js', import.meta.url), 'utf8');
  const merchantRoutes = fs.readFileSync(new URL('../../backend/src/routes/merchantRoutes.js', import.meta.url), 'utf8');
  const db = fs.readFileSync(new URL('../../backend/src/db.js', import.meta.url), 'utf8');

  assert.doesNotMatch(`${login}
${loginSheet}`, /getPhoneNumber|handleWechatPhoneLogin|wechatPhoneLogin/);
  assert.match(loginSheet, /微信一键登录/);
  assert.match(loginSheet, /wechatSilentLogin/);
  assert.match(loginSheet, /uni\.\$on\('auth:required'/);
  assert.match(topbar, /<login-sheet/);
  assert.match(auth, /pendingLoginActions/);
  assert.match(auth, /uni\.\$emit\('auth:required'/);
  assert.match(auth, /resumePendingLoginActions/);
  assert.match(request, /notifyLoginRequired/);
  assert.doesNotMatch(request, /reLaunch\(\{[\s\S]*pages\/login\/index/);
  assert.match(authApi, /\/api\/auth\/wechat\/silent-login/);
  assert.match(server, /createWechatTrialUser/);
  assert.match(server, /wechat_trial_initial_quota/);
  assert.match(server, /微信首次登录体验额度/);
  assert.match(server, /beginTransaction\(\)/);
  assert.match(server, /TRIAL/);
  assert.doesNotMatch(taskService, /当前账号未绑定门店，无法提交 AI 任务/);
  assert.match(videoTaskService, /if \(merchant && merchant\.status !== 'ACTIVE'\)/);
  assert.match(merchantRoutes, /app\.get\('\/api\/merchant\/quota-logs', requireAuth/);
  assert.doesNotMatch(merchantRoutes, /需要商家账号/);
  assert.match(db, /merchant_id VARCHAR\(36\) NULL/);
  assert.match(db, /wechat_openid/);
  assert.match(db, /wechat_trial_initial_quota/);
});

test('page entry stays browsable while protected workbench actions request login', () => {
  const pageFiles = readJsonc('pages.json').pages
    .map(item => `${item.path}.vue`)
    .filter(file => file !== 'pages/login/index.vue');
  for (const file of pageFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /onShow\(\)\s*\{[\s\S]{0,100}notifyLoginRequired/);
  }

  const workbench = read('pages/workbench/index.vue');
  assert.match(workbench, /chooseInputImage\(\)\s*\{[\s\S]*requireLogin\(\(\) => this\.chooseInputImage\(\)\)/);
  assert.match(workbench, /chooseReferenceImage\(\)\s*\{[\s\S]*requireLogin\(\(\) => this\.chooseReferenceImage\(\)\)/);
  assert.match(workbench, /submitTask\(\)\s*\{[\s\S]*requireLogin\(\(\) => this\.submitTask\(\)\)/);
});

test('miniapp visual system follows frontend-next palette and brand mark', () => {
  const app = read('App.vue');
  const login = read('pages/login/index.vue');
  const topbar = read('components/app-topbar/app-topbar.vue');
  const icon = read('components/app-icon/app-icon.vue');

  assert.match(app, /--xg-color-primary:\s*#3040a0/);
  assert.match(app, /--xg-color-accent:\s*#00bcd4/);
  assert.match(app, /--xg-bg-page:\s*#eef4fb/);
  assert.doesNotMatch(app, /#07080a|#08090b|#0d0f12|#fff4df|#f3da94|#c79b3b/);

  assert.ok(fs.existsSync(new URL('../static/brand/xungang-mark.png', import.meta.url)), 'miniapp must use frontend-next brand mark asset');
  assert.match(topbar, /\/static\/brand\/xungang-mark\.png/);
  assert.match(topbar, /var\(--xg-color-primary\)/);
  assert.doesNotMatch(topbar, /#07080a|#f3da94|#c79b3b|#fff4df/);

  assert.match(icon, /\.app-icon-gold\s+\.app-icon-image\s*\{\s*filter:\s*none/);
  assert.doesNotMatch(icon, /#f3dc9a|#181207|#fff4df/);

  assert.match(login, /var\(--xg-bg-page\)/);
  assert.doesNotMatch(login, /#eef4fb|#3040a0|#00bcd4|#16223a|#60708c|#f7faff/);
});

test('miniapp page and business component styles stay locally scoped', () => {
  const files = [
    'components/app-icon/app-icon.vue',
    'components/app-topbar/app-topbar.vue',
    ...readJsonc('pages.json').pages.map(item => `${item.path}.vue`)
  ];

  for (const file of files) {
    assert.match(read(file), /<style\s+scoped>/, `${file} must keep page-private styles scoped`);
  }
});

test('uni-app theme variables follow frontend-next tokens', () => {
  const theme = read('uni.scss');
  assert.match(theme, /\$uni-color-primary:\s*#3040a0/);
  assert.match(theme, /\$uni-color-success:\s*#32c7a3/);
  assert.match(theme, /\$uni-color-warning:\s*#ffb84d/);
  assert.match(theme, /\$uni-color-error:\s*#ff7087/);
  assert.match(theme, /\$uni-bg-color-grey:\s*#eef4fb/);
  assert.match(theme, /\$uni-text-color:\s*#16223a/);
});

test('miniapp pages do not keep the previous black gold theme palette', () => {
  const files = [
    'App.vue',
    'components/app-icon/app-icon.vue',
    'components/app-topbar/app-topbar.vue',
    ...readJsonc('pages.json').pages.map(item => `${item.path}.vue`)
  ];
  const forbidden = /#07080a|#08090b|#0d0f12|#111317|#fff4df|#fff6dc|#f3dc9a|#f3da94|#c79b3b|#efd482|#d9bb6a|#e8c763|#e9c85e|#d6a942|#fff1b8|#ffe597|rgba\(\s*242\s*,\s*213\s*,\s*140|rgba\(\s*239\s*,\s*212\s*,\s*130|rgba\(\s*255\s*,\s*244\s*,\s*223|rgba\(\s*255\s*,\s*246\s*,\s*220/i;

  for (const file of files) {
    assert.doesNotMatch(read(file), forbidden, `${file} still contains old black/gold theme color`);
  }
});

test('miniapp templates and styles avoid unsupported b and small selectors', () => {
  const files = [
    'App.vue',
    'components/app-topbar/app-topbar.vue',
    ...readJsonc('pages.json').pages.map(item => `${item.path}.vue`)
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /<\/?\s*(b|small)\b/i, `${file} must use text classes instead of b/small tags`);
    assert.doesNotMatch(source, /(?:^|[\s,{>])(?:b|small)(?=[\s.#:{,>])/im, `${file} must not style b/small tag selectors`);
  }
});

test('miniapp separates browsing thumbnails from full-resolution image sources', () => {
  const model = read('utils/model.js');
  assert.match(model, /export function thumbnailOf\(item = \{\}\)/);
  assert.match(model, /export function originalOf\(item = \{\}\)/);
  assert.match(model, /return item\.thumbUrl \|\| item\.thumbnailUrl \|\| originalOf\(item\)/);
  assert.match(model, /return item\.url \|\| item\.imageUrl \|\| item\.resultUrl/);
});

test('miniapp icons use local Lucide SVG resources instead of CSS-drawn layers', () => {
  const icon = read('components/app-icon/app-icon.vue');
  assert.match(icon, /\/static\/icons\//);
  assert.match(icon, /:src="iconSrc"/);
  assert.doesNotMatch(icon, /class="i i\d"/);
  assert.doesNotMatch(icon, /\.app-icon-[\w-]+\s+\.i\d/);
});

test('topbar reserves the WeChat capsule area without sacrificing the avatar touch target', () => {
  const topbar = read('components/app-topbar/app-topbar.vue');
  assert.match(topbar, /topbar-right/);
  assert.match(topbar, /quota-chip-compact/);
  assert.match(topbar, /padding-right:\s*var\(--xg-menu-button-safe-width\)/);
  assert.match(topbar, /--xg-menu-button-safe-width/);
});

test('image browsing pages lazy-load thumbnails and retain originals for detail preview', () => {
  const tasks = read('pages/tasks/index.vue');
  const resources = read('pages/resources/index.vue');
  const workbench = read('pages/workbench/index.vue');

  for (const source of [tasks, resources, workbench]) {
    assert.match(source, /lazy-load/);
    assert.match(source, /thumbnailOf/);
    assert.match(source, /originalOf/);
    assert.match(source, /mode="aspectFit"/);
  }

  assert.match(tasks, /page:\s*1/);
  assert.match(tasks, /hasMore/);
  assert.match(tasks, /urls:\s*\[task\.original\]/);
  assert.match(resources, /page:\s*1/);
  assert.match(resources, /hasMore/);
});
