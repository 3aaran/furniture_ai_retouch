import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const adminDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(adminDir, '..', '..');
const routerSource = readFileSync(join(srcDir, 'app', 'router.tsx'), 'utf8');
const shellSource = readFileSync(join(srcDir, 'app', 'AppShell.tsx'), 'utf8');
const loginSource = readFileSync(join(srcDir, 'pages', 'login', 'LoginPage.tsx'), 'utf8');
const layoutSource = readFileSync(join(adminDir, 'AdminLayout.tsx'), 'utf8');
const overviewSource = readFileSync(join(adminDir, 'AdminOverviewPages.tsx'), 'utf8');
const reviewSource = readFileSync(join(adminDir, 'AdminReviewPages.tsx'), 'utf8');
const configSource = readFileSync(join(adminDir, 'AdminConfigPages.tsx'), 'utf8');
const manageSource = readFileSync(join(adminDir, 'AdminManagePages.tsx'), 'utf8');
const workflowEditorSource = readFileSync(join(adminDir, 'AdminWorkflowEditor.tsx'), 'utf8');
const css = readFileSync(join(adminDir, 'AdminPage.css'), 'utf8');

test('platform admin routes cover the old admin feature set', () => {
  for (const route of [
    'dashboard',
    'logs',
    'applications',
    'feedbacks',
    'resources',
    'ai-config',
    'settings',
    'merchants',
    'announcements',
    'workflows',
    'redeem-codes',
  ]) assert.match(routerSource, new RegExp(`path: '${route}'`));

  for (const label of ['运营概况', 'AI 日志', '申请审核', '问题反馈', '系统资源', '模型配置', '系统配置', '商家管理', '发布公告', '工作流管理', '兑换码管理']) {
    assert.match(layoutSource, new RegExp(label));
  }
});

test('platform admin access is role-gated and login redirects admins to the console', () => {
  assert.match(shellSource, /const platformAdminRoles = new Set\(\['SYSTEM_ADMIN', 'PLATFORM_ADMIN'\]\)/);
  assert.match(shellSource, /platformAdminRoute && !isPlatformAdmin/);
  assert.match(shellSource, /platformAdminStudioRedirect/);
  assert.match(loginSource, /'\/admin\/dashboard'/);
});

test('new pages preserve existing backend API contracts without changing the backend', () => {
  assert.match(overviewSource, /\/api\/admin\/overview/);
  assert.match(overviewSource, /\/api\/admin\/task-images/);
  assert.match(reviewSource, /\/api\/admin\/applications/);
  assert.match(reviewSource, /\/api\/admin\/feedbacks/);
  assert.match(configSource, /\/api\/admin\/resources/);
  assert.match(configSource, /\/api\/admin\/ai\/config/);
  assert.match(configSource, /\/api\/admin\/settings/);
  assert.match(manageSource, /\/api\/admin\/merchants/);
  assert.match(manageSource, /\/api\/admin\/announcements/);
  assert.match(manageSource, /\/api\/admin\/workflows/);
  assert.match(manageSource, /\/api\/admin\/redeem-codes/);
});

test('system resource upload supports the same batch file selection as the asset library', () => {
  assert.match(configSource, /const \[files, setFiles\] = useState<File\[\]>\(\[\]\)/);
  assert.match(configSource, /Array\.from\(event\.target\.files \|\| \[\]\)/);
  assert.match(configSource, /<input type="file" accept="image\/\*" multiple/);
  assert.match(configSource, /for \(const file of files\) formData\.append\('image', file\)/);
  assert.match(configSource, /files\.length \? `已选择 \$\{files\.length\} 张图片`/);
});

test('workflow management uses a visual node editor instead of raw JSON editing', () => {
  assert.match(manageSource, /<AdminWorkflowEditor draft=\{editor\}/);
  assert.match(workflowEditorSource, /adminWorkflowLibrary/);
  assert.match(workflowEditorSource, /adminWorkflowTrack/);
  assert.match(workflowEditorSource, /MATERIAL_GENERATE/);
  assert.match(workflowEditorSource, /PROMO_MAIN_GENERATE/);
  assert.match(workflowEditorSource, /workflowDraftPayload/);
  assert.doesNotMatch(manageSource, /canvasText|configText|Canvas JSON|Config JSON/);
});

test('admin styles use the new token system without legacy override patterns', () => {
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /\.topApp|legacy|final-fixes|mobile-app|overrides/);
  assert.match(css, /var\(--color-primary\)/);
  assert.match(css, /var\(--bg-card\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
});
