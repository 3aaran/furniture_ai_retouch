import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  MAX_REFERENCE_IMAGES,
  appendReferenceImages,
  referenceImageIds
} from './workbenchReferences.js';
import {buildAiTaskPayload} from './workbenchGeneration.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('reference images match the backend model limit and keep unique images',()=>{
  const existing=[{id:'ref-1'}];
  const incoming=Array.from({length:12},(_,index)=>({id:`ref-${index+1}`}));
  const result=appendReferenceImages(existing,incoming);

  assert.equal(MAX_REFERENCE_IMAGES,9);
  assert.equal(result.length,MAX_REFERENCE_IMAGES);
  assert.deepEqual(referenceImageIds(result),Array.from({length:9},(_,index)=>`ref-${index+1}`));
});

test('generation payload sends every selected reference image id',()=>{
  const references=[{id:'ref-1'},{id:'ref-2'},{id:'ref-3'}];
  const payload=buildAiTaskPayload({
    origin:{id:'origin-1'},
    op:'enhance',
    tpl:null,
    custom:'',
    references,
    resolution:'2K',
    ratio:'自适应',
    options:{}
  });

  assert.deepEqual(payload.userReferenceImageIds,['ref-1','ref-2','ref-3']);
  assert.deepEqual(payload.referenceImageIds,['ref-1','ref-2','ref-3']);
});

test('workbench upload surfaces allow multiple files and render removable image lists',()=>{
  const uploadPanel=read('../components/WorkbenchUploadPanel.jsx');
  const controlPanel=read('../components/WorkbenchStudioControlPanel.jsx');

  assert.match(uploadPanel,/type="file"[^>]*multiple/);
  assert.match(controlPanel,/type="file"[^>]*multiple/);
  assert.match(uploadPanel,/references\.map/);
  assert.match(controlPanel,/references\.map/);
  assert.match(uploadPanel,/removeReferenceImage/);
  assert.match(controlPanel,/removeReferenceImage/);
});

test('watermark configuration is unreachable from workbench and task detail UI',()=>{
  const uploadPanel=read('../components/WorkbenchUploadPanel.jsx');
  const canvasToolbar=read('../components/WorkbenchCanvasToolbar.jsx');
  const workbenchModals=read('../components/WorkbenchModals.jsx');
  const pageHook=read('../hooks/useWorkbenchPageView.jsx');
  const taskDetail=read('../../../components/TaskDetailModal.jsx');
  const desktopTask=read('../../../components/task-detail/DesktopTaskPreviewView.jsx');
  const mobileTask=read('../../../components/task-detail/MobileTaskPreviewView.jsx');
  const visibleSources=[uploadPanel,canvasToolbar,workbenchModals,pageHook,taskDetail,desktopTask,mobileTask].join('\n');

  assert.doesNotMatch(visibleSources,/WatermarkConfigModal|useWorkbenchWatermark|useTaskDetailWatermark|水印配置|去配置|taskWatermarkControl|wbWatermarkBtn/);
});
