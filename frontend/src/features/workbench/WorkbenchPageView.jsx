import React from'react';
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
      <div className="wbSidePanel wbWorkbenchLeftDrawer">
        {slots.featurePanel}
      </div>

      <section className="wbCenterPanel">
        <WorkbenchSignalBar
          title={mediaMode==='video'?'宣传视频智能工作台':'家具图片智能工作台'}
          actions={workbenchSignalActions}
          recentCount={recentItems.length}
          onOpenRecent={()=>setRightDrawerOpen(true)}
        />
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
            {slots.mobileSubmitPanel}
            {slots.studioRecentStrip}
          </>
          : slots.videoCenterPanel}
      </section>

      <div className="wbRightPanel wbWorkbenchRightDrawer">
        {rightDrawerOpen?slots.recentPanel:(mediaMode==='image'?slots.studioControlPanel:slots.recentPanel)}
      </div>
    </div>

    {slots.featureDetailPopover}

    <WorkbenchRecentSourcePreview recentSourcePreview={recentSourcePreview} recentPreviewSrc={recentPreviewSrc} hideRecentOriginal={hideRecentOriginal}/>

    <WorkbenchModals {...modalsProps}/>
  </>;
}

export default WorkbenchPageView;
