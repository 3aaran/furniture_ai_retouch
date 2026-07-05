import React from 'react';

function WorkbenchCanvasToolbar({showWorkbenchWatermark,workbenchWatermark,toggleWorkbenchWatermark}){
  return <div className="wbStudioCanvasToolbar" aria-label="画布工具栏">
    <button
      className={`wbStudioWatermarkToggle ${showWorkbenchWatermark?'active':''} ${workbenchWatermark.configured?'isReady':'isNotReady'}`}
      type="button"
      disabled={workbenchWatermark.loading}
      title={workbenchWatermark.configured?'控制当前图片是否显示水印':'请先配置水印'}
      onClick={toggleWorkbenchWatermark}
    >
      <span>原图</span><i/><b>水印</b>
    </button>
  </div>;
}

export default WorkbenchCanvasToolbar;
