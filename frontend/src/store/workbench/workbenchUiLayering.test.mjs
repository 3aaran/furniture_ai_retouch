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
const workbenchSource = readFileSync(join(workbenchFeatureRoot, 'hooks/useWorkbenchRecent.js'), 'utf8');
const appSharedSource = readFileSync(join(srcRoot, 'appShared.jsx'), 'utf8');
const finalCss = readFileSync(join(srcRoot, 'styles/overrides/final-fixes.css'), 'utf8');

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
