import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');
const workbenchFeatureRoot = join(srcRoot, 'features/workbench');
const pickerSource = readFileSync(join(workbenchFeatureRoot, 'components/ResourcePickerModal.jsx'), 'utf8');
const uploadSource = readFileSync(join(workbenchFeatureRoot, 'components/WorkbenchUploadPanel.jsx'), 'utf8');
const featurePanelSource = readFileSync(join(workbenchFeatureRoot, 'components/WorkbenchFeaturePanel.jsx'), 'utf8');
const leftPanelSource = readFileSync(join(workbenchFeatureRoot, 'components/WorkbenchLeftPanel.jsx'), 'utf8');
const signalBarSource = readFileSync(join(workbenchFeatureRoot, 'components/WorkbenchSignalBar.jsx'), 'utf8');
const pageViewSource = readFileSync(join(workbenchFeatureRoot, 'WorkbenchPageView.jsx'), 'utf8');
const pageViewHookSource = readFileSync(join(workbenchFeatureRoot, 'hooks/useWorkbenchPageView.jsx'), 'utf8');
const workbenchSource = readFileSync(join(workbenchFeatureRoot, 'hooks/useWorkbenchRecent.js'), 'utf8');
const appSharedSource = readFileSync(join(srcRoot, 'appShared.jsx'), 'utf8');
const finalCss = readFileSync(join(srcRoot, 'styles/overrides/final-fixes.css'), 'utf8');
const studioCanvasCss = readFileSync(join(srcRoot, 'styles/overrides/studio-workbench/layout-panels-1.css'), 'utf8');
const studioLayoutCss = readFileSync(join(srcRoot, 'styles/overrides/studio-workbench/layout-panels-2.css'), 'utf8');

describe('workbench resource picker layering', () => {
  it('renders the resource picker in the body with a top-level mask', () => {
    assert.match(pickerSource, /createPortal/);
    assert.match(pickerSource, /createPortal\(content,\s*document\.body\)/);
    assert.match(pickerSource, /wbResourcePickerMask/);
    assert.match(finalCss, /\.wbResourcePickerMask[\s\S]*z-index:2147483647!important/);
  });

  it('keeps the upload resource button inside the drop zone', () => {
    assert.match(finalCss, /height:clamp\(260px,32vh,340px\)\s*!important/);
    assert.match(finalCss, /\.topApp \.wbUploadInner[\s\S]*display:flex\s*!important/);
    assert.match(finalCss, /\.topApp \.wbUploadInner[\s\S]*flex-direction:column\s*!important/);
    assert.match(uploadSource, /stopPropagation\(\);\s*openResourceModal\('source'\)/);
  });

  it('shows the desktop product preview directly without debug coordinates or dark overlay padding', () => {
    const previewWrapRule=studioLayoutCss.match(/\.topApp \.wbPreviewWrap\{[\s\S]*?\n\s*\}/)?.[0]||'';
    const previewRule=studioLayoutCss.match(/\.topApp \.wbPreview,[\s\S]*?\n\s*\}/)?.[0]||'';
    assert.doesNotMatch(studioCanvasCss, /wbUploadBox:before/);
    assert.doesNotMatch(studioCanvasCss, /X:\s*1024\s*Y:\s*768/);
    assert.doesNotMatch(previewWrapRule, /radial-gradient/);
    assert.match(previewRule, /width:100%!important;/);
    assert.match(previewRule, /height:100%!important;/);
    assert.match(previewRule, /position:absolute!important;/);
    assert.match(previewRule, /inset:0!important;/);
    assert.match(previewRule, /max-width:100%!important;/);
    assert.match(previewRule, /max-height:100%!important;/);
    assert.match(previewRule, /object-fit:contain!important;/);
  });

  it('keeps the desktop feature navigation inside a fixed boundary', () => {
    assert.match(featurePanelSource, /className="wbFeatureNavBlock"/);
    assert.match(studioCanvasCss, /\.wbFeatureNavBlock\{[\s\S]*?flex:0 0 252px;[\s\S]*?min-height:252px;/);
  });

  it('shows resource ownership before main and sub category filters', () => {
    const filterMarkup=leftPanelSource.match(/<div className="wbResourceFilterBar"[\s\S]*?<\/div>/)?.[0]||'';
    assert.match(filterMarkup, /aria-label="资源归属"/);
    assert.match(filterMarkup, /系统资源/);
    assert.match(filterMarkup, /用户资源/);
    assert.match(filterMarkup, /个人资源/);
    assert.match(filterMarkup, /aria-label="主分类"/);
    assert.match(filterMarkup, /aria-label="子分类"/);
  });

  it('hides the watermark toggle while preserving its toolbar space', () => {
    const toggleRule=studioCanvasCss.match(/\.topApp \.wbStudioWatermarkToggle\{[\s\S]*?\n\s*\}/)?.[0]||'';
    const toolbarRule=studioCanvasCss.match(/\.topApp \.wbStudioCanvasToolbar\{[\s\S]*?\n\s*\}/)?.[0]||'';
    assert.match(toggleRule, /visibility:hidden;/);
    assert.match(toggleRule, /pointer-events:none;/);
    assert.doesNotMatch(toolbarRule, /display:none/);
  });

  it('makes workbench status chips open their matching controls', () => {
    assert.match(signalBarSource, /wbSignalAction/);
    assert.match(signalBarSource, /action\.options/);
    assert.match(signalBarSource, /action\.onSelect/);
    assert.match(pageViewHookSource, /workbenchSignalActions/);
    assert.match(pageViewHookSource, /setLeftDrawerOpen\(true\)/);
    assert.match(pageViewHookSource, /setResolution/);
    assert.match(pageViewHookSource, /setRatio/);
  });

  it('uses the signal bar as the only mobile workbench entry area', () => {
    assert.doesNotMatch(pageViewSource, /className="wbToolRail"/);
    assert.match(signalBarSource, /wbSignalRecentButton/);
    assert.match(signalBarSource, /onOpenRecent/);
    assert.match(pageViewHookSource, /options:\['基础','宣传图'\]/);
    assert.match(pageViewHookSource, /onSelect:value=>activateFeatureGroup/);
    assert.match(pageViewHookSource, /onClick:\(\)=>setLeftDrawerOpen\(true\)/);
  });

  it('keeps video unavailable and provides a mobile generation footer', () => {
    assert.match(featurePanelSource, /disabled/);
    assert.match(featurePanelSource, /宣传短视频（开发中）/);
    assert.match(pageViewSource, /slots\.mobileSubmitPanel/);
  });

  it('does not stop task polling on the first transient status read failure', () => {
    assert.match(workbenchSource, /let missedStatusReads=0/);
    assert.match(workbenchSource, /missedStatusReads>=5/);
    assert.match(workbenchSource, /任务仍在生成，状态读取短暂失败，继续等待结果/);
  });

  it('does not label model wait timeouts as poor network', () => {
    const modelTimeoutIndex = appSharedSource.indexOf('模型生成耗时过长');
    const networkIndex = appSharedSource.indexOf('网络较差');
    assert.ok(modelTimeoutIndex > -1, 'model timeout message should exist');
    assert.ok(networkIndex > -1, 'network message should still exist');
    assert.ok(modelTimeoutIndex < networkIndex, 'model timeout should be classified before generic network timeout');
  });

  it('does not label result image receive failures as poor network', () => {
    const receiveFailureIndex = appSharedSource.indexOf('结果图接收失败');
    const networkIndex = appSharedSource.indexOf('网络较差');
    assert.ok(receiveFailureIndex > -1, 'result receive failure message should exist');
    assert.ok(networkIndex > -1, 'network message should still exist');
    assert.ok(receiveFailureIndex < networkIndex, 'result receive failures should be classified before generic network errors');
  });

  it('uses browser-like root zoom and keeps promo requirements independently scrollable', () => {
    assert.match(finalCss, /--app-browser-zoom:\.9/);
    assert.doesNotMatch(finalCss, /\.topApp[\s\S]*zoom:\.9/);
    assert.match(finalCss, /body[\s\S]*width:calc\(100% \/ var\(--app-browser-zoom\)\)/);
    assert.match(finalCss, /\.topApp \.wbSidePanel[\s\S]*overflow:hidden\s*!important/);
    assert.match(finalCss, /\.topApp \.wbPromoFormCard[\s\S]*overflow-y:auto\s*!important/);
  });
});
