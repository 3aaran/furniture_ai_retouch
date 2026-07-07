import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const canvasToolbarSource=read('./components/WorkbenchCanvasToolbar.jsx');
const controlPanelSource=read('./components/WorkbenchStudioControlPanel.jsx');
const workbenchLayoutStyles=read('../../styles/overrides/studio-workbench/layout-panels-1.css');
const premiumWorkbenchStyles=read('../../styles/overrides/stitch-premium-layout/workbench.css');

test('workbench canvas toolbar omits the unused zoom and drag controls',()=>{
  assert.doesNotMatch(canvasToolbarSource,/wbStudioZoomTools/);
  assert.doesNotMatch(canvasToolbarSource,/title="(?:放大|缩小|拖拽画布)"/);
  assert.doesNotMatch(workbenchLayoutStyles,/wbStudioZoomTools/);
  assert.match(workbenchLayoutStyles,/\.wbStudioCanvasToolbar\{[\s\S]*?justify-content:flex-end;/);
  assert.doesNotMatch(canvasToolbarSource,/wbStudioWatermarkToggle/);
});

test('workbench control panel omits environment light controls',()=>{
  assert.doesNotMatch(controlPanelSource,/wbStudioLightCard/);
  assert.doesNotMatch(controlPanelSource,/>环境光效</);
  assert.doesNotMatch(workbenchLayoutStyles,/wbStudioLightCard/);
  assert.doesNotMatch(premiumWorkbenchStyles,/wbStudioLightCard/);
  assert.match(controlPanelSource,/wbStudioOutputControls/);
});
