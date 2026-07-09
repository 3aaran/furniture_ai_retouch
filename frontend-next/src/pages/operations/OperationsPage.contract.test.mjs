import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const operationsDir = dirname(fileURLToPath(import.meta.url));
const routerSource = readFileSync(join(operationsDir, '..', '..', 'app', 'router.tsx'), 'utf8');
const appShellSource = readFileSync(join(operationsDir, '..', '..', 'app', 'AppShell.tsx'), 'utf8');
const appShellCss = readFileSync(join(operationsDir, '..', '..', 'app', 'AppShell.css'), 'utf8');
const operationsSource = readFileSync(join(operationsDir, 'OperationsPage.tsx'), 'utf8');
const operationsCss = readFileSync(join(operationsDir, 'OperationsPage.css'), 'utf8');
const accountPagesCss = readFileSync(join(operationsDir, 'OperationsAccountPages.css'), 'utf8');
const historySource = readFileSync(join(operationsDir, 'HistoryPage.tsx'), 'utf8');
const usersSource = readFileSync(join(operationsDir, 'UsersPage.tsx'), 'utf8');
const userActionModalSource = readFileSync(join(operationsDir, 'UserActionModal.tsx'), 'utf8');
const promotionSource = readFileSync(join(operationsDir, 'PromotionPage.tsx'), 'utf8');
const quotaSource = readFileSync(join(operationsDir, 'QuotaPage.tsx'), 'utf8');
const profileSource = readFileSync(join(operationsDir, 'ProfilePage.tsx'), 'utf8');
const shellQuickModalSource = readFileSync(join(operationsDir, '..', '..', 'app', 'ShellQuickModal.tsx'), 'utf8');
const compareSource = readFileSync(join(operationsDir, 'TaskCompareModal.tsx'), 'utf8');
const splitPageSource = [
  historySource,
  usersSource,
  promotionSource,
  quotaSource,
  profileSource,
].join('\n');
const resourcesSource = readFileSync(join(operationsDir, '..', 'resources', 'ResourcesPage.tsx'), 'utf8');
const resourcesCss = readFileSync(join(operationsDir, '..', 'resources', 'ResourcesPage.css'), 'utf8');
const mobileMainNavSource = appShellSource.slice(appShellSource.indexOf('const mobileMainNavItems'), appShellSource.indexOf('const mobileToolItems'));
const mobileToolSource = appShellSource.slice(appShellSource.indexOf('const mobileToolItems'), appShellSource.indexOf('function shortName'));
const mobileDrawerSource = appShellSource.slice(appShellSource.indexOf('<aside className={`mobileSideDrawer'), appShellSource.indexOf('<main className="shellMain"'));

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
  assert.match(splitPageSource, /opToolbar/);
  assert.match(operationsSource, /UserActionModal/);
  assert.match(splitPageSource, /opTableWrap/);
  assert.match(operationsCss, /@media \(max-width: 767px\)/);
});

test('history task detail uses old compare preview pattern', () => {
  assert.match(historySource, /historyTaskFilters/);
  assert.match(historySource, /aiTaskGrid/);
  assert.doesNotMatch(historySource, /<Hero/);
  assert.doesNotMatch(historySource, /全部时间/);
  assert.match(historySource, /historyStatusTabs/);
  assert.match(historySource, /historySelectRow/);
  assert.match(historySource, /studioFeatures\.map/);
  assert.match(historySource, /visibleItems\.map/);
  assert.match(historySource, /消耗 \{quotaUsed\(item\) \|\| '-'\} 算力/);
  assert.doesNotMatch(historySource, /<strong>\{item\.userName/);
  assert.doesNotMatch(historySource, />详情<\/button>/);
  assert.doesNotMatch(historySource, /AppIcon name="eye"/);
  assert.match(operationsCss, /\.historyStatusTabs/);
  assert.match(operationsCss, /\.historySelectRow[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(operationsCss, /\.stitchHistoryPage \.opTaskImage img[\s\S]*position: absolute[\s\S]*height: 100%[\s\S]*object-fit: contain/);
  assert.match(operationsCss, /\.stitchHistoryPage \.opTaskImage b[\s\S]*display: none/);
  assert.match(operationsCss, /\.opTaskCard footer\.taskActions[\s\S]*grid-template-columns: 1fr/);
  assert.match(compareSource, /任务对比预览/);
  assert.match(compareSource, /产品图片/);
  assert.match(compareSource, /生成结果/);
  assert.match(compareSource, /taskComparePanel/);
  assert.match(compareSource, /taskInfoPanel/);
  assert.match(operationsCss, /taskPreviewOverlay/);
});

test('users page uses compact toolbar actions without the hero block', () => {
  assert.doesNotMatch(usersSource, /<Hero/);
  assert.match(usersSource, /storeUserCreateButton/);
  assert.match(usersSource, /生成体验账号/);
  assert.match(usersSource, /外部体验与到期管理/);
  assert.match(usersSource, /门店成员与管理员/);
  assert.match(usersSource, /openCreate\('TRIAL'\)/);
  assert.match(usersSource, /method: 'DELETE'/);
  assert.match(usersSource, /AppIcon name="trash"/);
  assert.match(userActionModalSource, /initialUserForm/);
  assert.match(userActionModalSource, /useEffect\(\(\) =>/);
  assert.match(userActionModalSource, /modal\.role \|\| 'STAFF'/);
  assert.match(operationsCss, /\.storeUserToolbarV2[\s\S]*grid-template-columns: minmax\(260px, 360px\)/);
  assert.match(operationsCss, /\.storeUserFilterRow[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(operationsCss, /\.storeUserCreateBox[\s\S]*grid-column: 2[\s\S]*grid-row: 1/);
});

test('promotion page uses compact invite layout and responsive filters', () => {
  assert.doesNotMatch(promotionSource, /<Hero/);
  assert.doesNotMatch(promotionSource, /opLinkBox/);
  assert.match(promotionSource, /promotionInviteCompactV2/);
  assert.match(promotionSource, /promotionCopyMenuV2/);
  assert.match(promotionSource, /promotionToolbarV2/);
  assert.match(promotionSource, /promotionDateRowV2/);
  assert.match(operationsSource, /OperationsAccountPages\.css/);
  assert.match(accountPagesCss, /\.promotionInviteCompactV2[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(accountPagesCss, /\.promotionToolbarV2[\s\S]*justify-content: start/);
  assert.match(accountPagesCss, /\.promotionToolbarV2 > button[\s\S]*margin-left: auto/);
});

test('quota page removes hero/type filter and keeps parallel summary stats', () => {
  assert.doesNotMatch(quotaSource, /<Hero/);
  assert.doesNotMatch(quotaSource, /opHeroBalance/);
  assert.doesNotMatch(quotaSource, /全部类型/);
  assert.doesNotMatch(quotaSource, /query\.type/);
  assert.match(quotaSource, /quotaSummaryStripV2/);
  assert.match(accountPagesCss, /\.quotaSummaryStripV2[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
});

test('profile page follows old profile center layout without the shared hero', () => {
  assert.doesNotMatch(profileSource, /<Hero/);
  assert.match(profileSource, /profileHeroV3/);
  assert.match(profileSource, /profileHeroMetaV3/);
  assert.match(profileSource, /stitchProfileTagline/);
  assert.match(profileSource, /profileStoragePanelV3/);
  assert.match(accountPagesCss, /\.profileHeroV3[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) auto/);
});

test('operation route shell stays small enough to maintain', () => {
  assert.ok(operationsSource.length < 9000, `OperationsPage.tsx is too large: ${operationsSource.length}`);
});

test('utility-only features stay in shell modal surface', () => {
  assert.match(appShellSource, /quickModal/);
  assert.match(appShellSource, /setQuickModal\('feedback'\)/);
  assert.match(appShellSource, /setQuickModal\('notices'\)/);
  assert.match(appShellSource, /setQuickModal\('redeem'\)/);
  assert.doesNotMatch(shellQuickModalSource, /旧前端使用弹窗承载兑换入口/);
  assert.match(appShellCss, /\.shellProfileBox[\s\S]*display: block/);
  assert.match(appShellCss, /\.avatarButton[\s\S]*display: inline-flex/);
  assert.doesNotMatch(mobileMainNavSource, /label: '历史记录'/);
  assert.match(mobileToolSource, /label: '历史记录'/);
  assert.doesNotMatch(mobileDrawerSource, /mobileSideDrawerHead[\s\S]*<BrandLogo \/>/);
  assert.match(appShellCss, /\.mobileSideTools[\s\S]*margin-top: auto/);
  assert.match(appShellCss, /\.mobileToolText[\s\S]*display: none/);
});

test('resources page preserves boundary rules for large asset lists', () => {
  assert.match(resourcesSource, /ASSET_PAGE_SIZE/);
  assert.match(resourcesSource, /resourcePreviewImage/);
  assert.match(resourcesSource, /thumbUrl \|\| item\.previewUrl/);
  assert.match(resourcesSource, /resourceFullImage/);
  assert.match(resourcesSource, /assetCategoryManageSheet/);
  assert.doesNotMatch(resourcesCss, /!important/);
});
