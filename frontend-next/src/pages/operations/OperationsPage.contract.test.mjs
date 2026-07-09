import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const operationsDir = dirname(fileURLToPath(import.meta.url));
const routerSource = readFileSync(join(operationsDir, '..', '..', 'app', 'router.tsx'), 'utf8');
const appShellSource = readFileSync(join(operationsDir, '..', '..', 'app', 'AppShell.tsx'), 'utf8');
const operationsSource = readFileSync(join(operationsDir, 'OperationsPage.tsx'), 'utf8');
const operationsCss = readFileSync(join(operationsDir, 'OperationsPage.css'), 'utf8');
const historySource = readFileSync(join(operationsDir, 'HistoryPage.tsx'), 'utf8');
const compareSource = readFileSync(join(operationsDir, 'TaskCompareModal.tsx'), 'utf8');
const splitPageSource = [
  historySource,
  readFileSync(join(operationsDir, 'UsersPage.tsx'), 'utf8'),
  readFileSync(join(operationsDir, 'PromotionPage.tsx'), 'utf8'),
  readFileSync(join(operationsDir, 'QuotaPage.tsx'), 'utf8'),
  readFileSync(join(operationsDir, 'ProfilePage.tsx'), 'utf8'),
].join('\n');
const resourcesSource = readFileSync(join(operationsDir, '..', 'resources', 'ResourcesPage.tsx'), 'utf8');
const resourcesCss = readFileSync(join(operationsDir, '..', 'resources', 'ResourcesPage.css'), 'utf8');

test('shell routes use finished operation pages instead of placeholders', () => {
  assert.doesNotMatch(routerSource, /PlaceholderPage/);
  for (const route of ['history', 'users', 'promotion', 'profile', 'quota']) {
    assert.match(routerSource, new RegExp(`path: '${route}'[\\s\\S]*OperationsPage`));
  }
  for (const modalOnly of ['redeem', 'feedback', 'notices']) {
    assert.doesNotMatch(routerSource, new RegExp(`path: '${modalOnly}'[\\s\\S]*OperationsPage`));
  }
});

test('operation pages keep old frontend patterns without duplicate page files', () => {
  for (const variant of ['history', 'users', 'promotion', 'profile', 'quota']) {
    assert.match(routerSource, new RegExp(`type="${variant}"|type: "${variant}"|type: '${variant}'`));
  }
  for (const modalOnly of ['redeem', 'feedback', 'notices']) {
    assert.doesNotMatch(operationsSource, new RegExp(`type: '${modalOnly}'`));
  }
  assert.match(splitPageSource, /opHero/);
  assert.match(splitPageSource, /opToolbar/);
  assert.match(operationsSource, /UserActionModal/);
  assert.match(splitPageSource, /opTableWrap/);
  assert.match(operationsCss, /@media \(max-width: 767px\)/);
});

test('history task detail uses old compare preview pattern', () => {
  assert.match(historySource, /historyTaskFilters/);
  assert.match(historySource, /aiTaskGrid/);
  assert.match(compareSource, /任务对比预览/);
  assert.match(compareSource, /产品图片/);
  assert.match(compareSource, /生成结果/);
  assert.match(compareSource, /taskComparePanel/);
  assert.match(compareSource, /taskInfoPanel/);
  assert.match(operationsCss, /taskPreviewOverlay/);
});

test('operation route shell stays small enough to maintain', () => {
  assert.ok(operationsSource.length < 9000, `OperationsPage.tsx is too large: ${operationsSource.length}`);
});

test('utility-only features stay in shell modal surface', () => {
  assert.match(appShellSource, /quickModal/);
  assert.match(appShellSource, /setQuickModal\('feedback'\)/);
  assert.match(appShellSource, /setQuickModal\('notices'\)/);
  assert.match(appShellSource, /setQuickModal\('redeem'\)/);
});

test('resources page preserves boundary rules for large asset lists', () => {
  assert.match(resourcesSource, /ASSET_PAGE_SIZE/);
  assert.match(resourcesSource, /resourcePreviewImage/);
  assert.match(resourcesSource, /thumbUrl \|\| item\.previewUrl/);
  assert.match(resourcesSource, /resourceFullImage/);
  assert.match(resourcesSource, /assetCategoryManageSheet/);
  assert.doesNotMatch(resourcesCss, /!important/);
});
