import React from'react';
import{Droplet,Eye,Layers}from'../../shared/icons/index.jsx';
import{AuroraLayer}from'../../shared/effects/index.jsx';
import{WorkbenchModals,WorkbenchRecentSourcePreview,WorkbenchSignalBar,WorkbenchUploadPanel,WorkbenchWatermarkOverlay}from'./components/index.jsx';

function WorkbenchPageView({
  mediaMode,
  leftDrawerOpen,
  setLeftDrawerOpen,
  rightDrawerOpen,
  setRightDrawerOpen,
  currentFeatureMode,
  currentFeatureLabel,
  recentItems,
  canConfigureWatermark,
  setWatermarkOpen,
  workbenchSignalActions,
  origin,
  reference,
  selectedTpl,
  imgSrc,
  draggingSource,
  draggingRef,
  chooseSource,
  chooseReference,
  dragOver,
  dragLeave,
  dropUpload,
  openResourceModal,
  clearSourceImage,
  clearReferenceImage,
  setMsg,
  showWorkbenchWatermark,
  workbenchWatermark,
  latestCompareImageUrl,
  slots,
  recentSourcePreview,
  recentPreviewSrc,
  hideRecentOriginal,
  modalsProps
}){
  return <>
    <div className={`wbScreen ${leftDrawerOpen?'isWorkbenchLeftOpen':''} ${rightDrawerOpen?'isWorkbenchRightOpen':''}`}>
      <AuroraLayer variant="workbench"/>
      {(leftDrawerOpen||rightDrawerOpen)&&<button className="wbMobileDrawerBackdrop" type="button" aria-label="关闭侧栏" onClick={()=>{setLeftDrawerOpen(false);setRightDrawerOpen(false)}}/>}
      <div className="wbToolRail">
        <button type="button" className="wbRailBtn primary" onClick={()=>setLeftDrawerOpen(true)}>
          <Layers size={20}/>
          <span>{currentFeatureMode}</span>
          <b>{currentFeatureLabel}</b>
        </button>
        <button type="button" className="wbRailBtn" onClick={()=>setRightDrawerOpen(true)}>
          <Eye size={20}/>
          <span>最近生成</span>
          <b>{recentItems.length}</b>
        </button>
        {canConfigureWatermark&&<button type="button" className="wbRailBtn watermark" onClick={()=>setWatermarkOpen(true)}>
          <Droplet size={20}/>
          <span>水印</span>
          <b>水印配置</b>
        </button>}
      </div>
      <div className="wbSidePanel wbWorkbenchLeftDrawer">
        {slots.featurePanel}
      </div>

      <section className="wbCenterPanel">
        <WorkbenchSignalBar title={mediaMode==='video'?'宣传视频智能工作台':'家具图片智能工作台'} actions={workbenchSignalActions}/>
        {mediaMode==='image'
          ? <>
            {slots.studioCenterToolbar}
            <WorkbenchUploadPanel
              origin={origin}
              reference={reference}
              selectedTpl={selectedTpl}
              imgSrc={imgSrc}
              draggingSource={draggingSource}
              draggingRef={draggingRef}
              chooseSource={chooseSource}
              chooseReference={chooseReference}
              dragOver={dragOver}
              dragLeave={dragLeave}
              dropUpload={dropUpload}
              openResourceModal={openResourceModal}
              onOpenWatermark={()=>setWatermarkOpen(true)}
              canConfigureWatermark={canConfigureWatermark}
              clearSourceImage={clearSourceImage}
              clearReferenceImage={clearReferenceImage}
              setMsg={setMsg}
              watermarkOverlay={showWorkbenchWatermark&&workbenchWatermark.configured?<WorkbenchWatermarkOverlay config={workbenchWatermark.config}/>:null}
              generatedImageUrl={latestCompareImageUrl}
            />
            {slots.studioRecentStrip}
          </>
          : slots.videoCenterPanel}
      </section>

      <div className="wbRightPanel wbWorkbenchRightDrawer">
        {mediaMode==='image'?slots.studioControlPanel:slots.recentPanel}
      </div>
    </div>

    {slots.featureDetailPopover}

    <WorkbenchRecentSourcePreview recentSourcePreview={recentSourcePreview} recentPreviewSrc={recentPreviewSrc} hideRecentOriginal={hideRecentOriginal}/>

    <WorkbenchModals {...modalsProps}/>
  </>;
}

export default WorkbenchPageView;
