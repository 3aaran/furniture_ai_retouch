import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const signalSource=read('./components/WorkbenchSignalBar.jsx');
const featurePanelSource=read('./components/WorkbenchFeaturePanel.jsx');
const recentPanelSource=read('./components/WorkbenchRecentPanel.jsx');
const currentMobileCss=read('../../styles/overrides/mobile-app/workbench-current.css');
const legacyMobileWorkbenchCss=read('../../styles/overrides/mobile-app/workbench.css');
const mobileShellPart4Css=read('../../styles/mobile/mobile-shell/mobile-shell-part-4.css');
const mobileShellPart1Css=read('../../styles/mobile/mobile-shell/mobile-shell-part-1.css');

test('mobile signal bar removes the redundant feature-mode chip only on mobile',()=>{
  assert.match(signalSource,/isMobileFeatureMode/);
  assert.match(currentMobileCss,/\.wbSignalActionWrap\.isMobileFeatureMode\s*\{[\s\S]*?display:none\s*!important/);
});

test('mobile workbench panels behave as full-width pages instead of side drawers',()=>{
  const panelRule=currentMobileCss.match(/\.topApp \.wbScreen > \.wbWorkbenchLeftDrawer,[\s\S]*?\n\s*\}/)?.[0]||'';
  assert.match(panelRule,/top:72px\s*!important/);
  assert.match(panelRule,/width:100vw\s*!important/);
  assert.match(panelRule,/max-width:100vw\s*!important/);
  assert.doesNotMatch(currentMobileCss,/translateX/);
  assert.match(currentMobileCss,/\.wbMobileDrawerBackdrop\s*\{[\s\S]*?display:none\s*!important/);
  assert.doesNotMatch(featurePanelSource,/关闭功能侧栏/);
  assert.doesNotMatch(recentPanelSource,/关闭最近生成侧栏/);
});

test('mobile recent generation keeps compact thumbnails and hides only the hover-original preview',()=>{
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentThumb\s*\{[\s\S]*?display:block\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentThumb\s*\{[\s\S]*?width:64px\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentItem\s*\{[\s\S]*?grid-template-columns:64px minmax\(0,1fr\)\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentInfo small\s*\{[\s\S]*?display:none\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentHoverPreview\s*\{[\s\S]*?display:none\s*!important/);
});

test('mobile recent generation exposes persistent edit and delete actions',()=>{
  assert.match(recentPanelSource,/wbRecentMobileActions/);
  assert.match(recentPanelSource,/wbRecentDesktopActions/);
  assert.match(recentPanelSource,/title="编辑"/);
  assert.match(recentPanelSource,/title="删除"/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentMobileActions\s*\{[\s\S]*?display:flex\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentMobileActions\s*\{[\s\S]*?flex-direction:row\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentMobileActions button\s*\{[\s\S]*?min-height:30px\s*!important/);
  assert.match(currentMobileCss,/\.wbWorkbenchRightDrawer \.wbRecentDesktopActions\s*\{[\s\S]*?display:none\s*!important/);
});

test('superseded mobile recent-card rules are removed from compatibility layers',()=>{
  assert.doesNotMatch(legacyMobileWorkbenchCss,/\.topApp \.wbRecentItem/);
  assert.doesNotMatch(legacyMobileWorkbenchCss,/\.topApp \.wbRecentThumb/);
  assert.doesNotMatch(mobileShellPart4Css,/\.topApp \.wbRecentItem/);
  assert.doesNotMatch(mobileShellPart4Css,/\.topApp \.wbRecentThumb/);
  assert.doesNotMatch(mobileShellPart1Css,/wbWorkbench(?:Left|Right)Drawer/);
  assert.doesNotMatch(mobileShellPart4Css,/wbWorkbench(?:Left|Right)Drawer/);
});
