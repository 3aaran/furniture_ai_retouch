import React,{useEffect,useState}from'react';
import{Brush,Camera,Droplet,Eye,ImageIcon,Layers,PenLine,Rotate3d,Search,WandSparkles}from'../../shared/icons/index.jsx';
import{resTypeName}from'../../appShared.jsx';
import{promotionFeatures,promotionOptionDefaults}from'./model/promotionFeatures.js';
import{AuroraLayer}from'../../shared/effects/index.jsx';
import{WorkbenchCanvasToolbar,WorkbenchFeaturePanel,WorkbenchFeaturePopover,WorkbenchLeftPanel,WorkbenchModals,WorkbenchRecentPanel,WorkbenchRecentSourcePreview,WorkbenchSignalBar,WorkbenchStudioControlPanel,WorkbenchStudioRecentStrip,WorkbenchUploadPanel,WorkbenchVideoPanel,WorkbenchWatermarkOverlay}from'./components/index.jsx';
import{buildWorkbenchOps,workbenchImageSrc,workbenchListImageSrc}from'./model/index.js';
import{useVideoStoryboard,useWorkbenchFeatureMode,useWorkbenchGeneration,useWorkbenchImageUpload,useWorkbenchRecent,useWorkbenchResourceLibrary,useWorkbenchResourceUpload,useWorkbenchWatermark}from'./hooks/index.js';
import{fetchPublicSettings}from'./api/index.js';

function WorkbenchPage({me,setMe,setMsg,goPage,TaskDetailModal}){
  const imgSrc=workbenchImageSrc;
  const listImgSrc=workbenchListImageSrc;
  const ops=buildWorkbenchOps();
  const {op,featureGroup,mediaMode,resolution,setResolution,ratio,setRatio,featurePopover,openFeaturePopover,closeFeaturePopover,activateFeatureGroup,selectPromotionFeature,selectBaseFeature,isPromotionSelected}=useWorkbenchFeatureMode();
  const {storyboards,storyboardDragging,setStoryboardDragging,videoPrompt,setVideoPrompt,videoParams,chooseStoryboard,dropStoryboard,removeStoryboard,updateVideoParam}=useVideoStoryboard();
  const [studioLight,setStudioLight]=useState({strength:85,colorTemp:4500});
  const [custom,setCustom]=useState('');
  const {resources,setResources,resourceKeyword,setResourceKeyword,resourceScope,setResourceScope,materialTab,setMaterialTab,selectedResource,setSelectedResource,currentTemplate,getResourceItems,getModalItems}=useWorkbenchResourceLibrary({op,mediaMode,resTypeName});
  const {resourceUploadOpen,setResourceUploadOpen,resourceUpload,setResourceUpload,resourceUploadFile,resourceUploadPreview,workbenchUploadMainOptions,workbenchUploadSubOptions,openWorkbenchResourceUpload,chooseWorkbenchResourceFile,closeWorkbenchResourceUpload,changeWorkbenchUploadType,changeWorkbenchUploadMain,createWorkbenchResource}=useWorkbenchResourceUpload({op,me,resources,setResources,setResourceScope,setMsg});
  const [recentKeyword,setRecentKeyword]=useState('');
  const [removeOpts,setRemoveOpts]=useState({whiteBg:false,mirror:false});
  const [enhanceOpts,setEnhanceOpts]=useState({focus:false,angle:'不变'});
  const [multiView,setMultiView]=useState('三角度视图');
  const [promotionOptions,setPromotionOptions]=useState(promotionOptionDefaults);
  const {recent,setRecent,taskDetail,setTaskDetail,taskDetailLoading,recentSourcePreview,recentHoverId,setRecentHoverId,deleteTarget,setDeleteTarget,refreshRecent,pollAiTask,recentTypeName,recentPreviewSrc,showRecentOriginal,moveRecentOriginal,hideRecentOriginal,deleteRecentTask,confirmDeleteRecentTask,openRecentTask}=useWorkbenchRecent({imgSrc,ops,setMe,setMsg});
  const {origin,setOrigin,reference,setReference,draggingSource,draggingRef,resourceModal,setResourceModal,chooseSource,chooseReference,clearSourceImage,clearReferenceImage,continueWithImage,dropUpload,dragOver,dragLeave,openResourceModal,chooseResourceImage}=useWorkbenchImageUpload({imgSrc,setMsg,refreshRecent,setTaskDetail,goPage});
  const {canConfigureWatermark,watermarkOpen,setWatermarkOpen,workbenchWatermark,showWorkbenchWatermark,loadWorkbenchWatermark,toggleWorkbenchWatermark}=useWorkbenchWatermark({me,setMsg});
  const [costSettings,setCostSettings]=useState({});
  const [leftDrawerOpen,setLeftDrawerOpen]=useState(false);
  const [rightDrawerOpen,setRightDrawerOpen]=useState(false);

  useEffect(()=>{fetchPublicSettings().then(setCostSettings).catch(()=>{})},[]);
  useEffect(()=>{
    const raw=localStorage.getItem('pendingWorkbenchImage');
    if(!raw)return;
    try{
      const img=JSON.parse(raw);
      if(img?.id&&img?.url){
        setOrigin({...img,imageUrl:img.imageUrl||imgSrc(img)});
        setMsg('已将图片放入产品原图');
      }
    }catch{}
    localStorage.removeItem('pendingWorkbenchImage');
  },[]);

  const {calcWorkbenchCost,gen}=useWorkbenchGeneration({
    origin,
    op,
    currentTemplate,
    resolution,
    ratio,
    studioLight,
    removeOpts,
    enhanceOpts,
    multiView,
    promotionOptions,
    custom,
    reference,
    costSettings,
    ops,
    setMsg,
    setMe,
    setRecent,
    pollAiTask
  });

  const featureList=[
    ['material','材质替换',Brush],
    ['replace_bg','场景融合',Layers],
    ['remove_bg','背景净化',WandSparkles],
    ['enhance','摄影增强',Camera],
    ['lineart','线稿图',PenLine],
    ['multiview','多角度视图',Rotate3d]
  ];
  const promotionFeatureIconMap={
    promo_main_image:ImageIcon,
    promo_poster_image:WandSparkles,
    promo_detail_image:Search
  };
  const resourceItems=getResourceItems();
  const modalItems=getModalItems(resourceModal);
  const selectedTpl=currentTemplate();
  const currentFeatureLabel=mediaMode==='video'?'宣传视频生成':ops[op]?.label||'生图功能';
  const currentFeatureMode=mediaMode==='video'?'视频功能':isPromotionSelected?'宣传图':'生图功能';
  const workbenchSignalItems=[currentFeatureMode,currentFeatureLabel,mediaMode==='video'?videoParams.duration:resolution,mediaMode==='video'?videoParams.ratio:ratio];
  const filteredRecent=recent.filter(item=>{
    const isVideo=item?.featureKey==='video_generate'||item?.operation==='video_generate'||item?.mediaType==='video'||item?.kind==='video';
    return mediaMode==='video'?isVideo:!isVideo;
  });
  const recentItems=filteredRecent.filter(item=>{
    const kw=recentKeyword.trim().toLowerCase();
    if(!kw)return true;
    return String(item.id).toLowerCase().includes(kw)||recentTypeName(item).toLowerCase().includes(kw);
  }).slice(0,12);
  const latestCompareItem=mediaMode==='image'?recentItems.find(item=>{
    const status=String(item?.status||'').toLowerCase();
    return !['queued','pending','running','failed'].includes(status)&&!!(item?.resultImage||item?.imageUrl||item?.url||item?.imageId||item?.id);
  }):null;
  const latestCompareImageUrl=origin&&latestCompareItem?imgSrc(latestCompareItem.resultImage||latestCompareItem):'';

  function updatePromotionOption(key,value){
    setPromotionOptions(prev=>({
      ...prev,
      [op]:{
        ...(promotionOptionDefaults[op]||{}),
        ...(prev[op]||{}),
        [key]:value
      }
    }));
  }

  function renderLeftPanel(){
    return <WorkbenchLeftPanel
      mediaMode={mediaMode}
      op={op}
      ops={ops}
      promotionOptions={promotionOptions}
      updatePromotionOption={updatePromotionOption}
      resourceKeyword={resourceKeyword}
      setResourceKeyword={setResourceKeyword}
      resourceScope={resourceScope}
      setResourceScope={setResourceScope}
      resourceItems={resourceItems}
      openWorkbenchResourceUpload={openWorkbenchResourceUpload}
      selectedResource={selectedResource}
      setSelectedResource={setSelectedResource}
      listImgSrc={listImgSrc}
      resTypeName={resTypeName}
      removeOpts={removeOpts}
      setRemoveOpts={setRemoveOpts}
      enhanceOpts={enhanceOpts}
      setEnhanceOpts={setEnhanceOpts}
      multiView={multiView}
      setMultiView={setMultiView}
    />;
  }

  function renderFeatureDetailPopover(){
    return <WorkbenchFeaturePopover
      featurePopover={featurePopover}
      closeFeaturePopover={closeFeaturePopover}
      featureList={featureList}
      promotionFeatures={promotionFeatures}
      promotionFeatureIconMap={promotionFeatureIconMap}
      ops={ops}
      op={op}
      mediaMode={mediaMode}
      selectPromotionFeature={selectPromotionFeature}
      selectBaseFeature={selectBaseFeature}
      activateFeatureGroup={activateFeatureGroup}
    />;
  }

  function renderFeaturePanel(){
    return <WorkbenchFeaturePanel
      currentFeatureMode={currentFeatureMode}
      currentFeatureLabel={currentFeatureLabel}
      setLeftDrawerOpen={setLeftDrawerOpen}
      featureGroup={featureGroup}
      mediaMode={mediaMode}
      openFeaturePopover={openFeaturePopover}
    >
      {renderLeftPanel()}
    </WorkbenchFeaturePanel>;
  }

  function renderRecentPanel(){
    return <WorkbenchRecentPanel
      mediaMode={mediaMode}
      recentItems={recentItems}
      recentKeyword={recentKeyword}
      setRecentKeyword={setRecentKeyword}
      refreshRecent={refreshRecent}
      setRightDrawerOpen={setRightDrawerOpen}
      setRecentHoverId={setRecentHoverId}
      recentHoverId={recentHoverId}
      showRecentOriginal={showRecentOriginal}
      moveRecentOriginal={moveRecentOriginal}
      hideRecentOriginal={hideRecentOriginal}
      openRecentTask={openRecentTask}
      deleteRecentTask={deleteRecentTask}
      recentTypeName={recentTypeName}
      listImgSrc={listImgSrc}
      setMsg={setMsg}
      goPage={goPage}
    />;
  }

  function renderStudioCenterToolbar(){
    return <WorkbenchCanvasToolbar showWorkbenchWatermark={showWorkbenchWatermark} workbenchWatermark={workbenchWatermark} toggleWorkbenchWatermark={toggleWorkbenchWatermark}/>;
  }

  function renderStudioControlPanel(){
    return <WorkbenchStudioControlPanel
      currentFeatureLabel={currentFeatureLabel}
      isPromotionSelected={isPromotionSelected}
      custom={custom}
      setCustom={setCustom}
      reference={reference}
      draggingRef={draggingRef}
      dragOver={dragOver}
      dragLeave={dragLeave}
      dropUpload={dropUpload}
      chooseReference={chooseReference}
      imgSrc={imgSrc}
      setMsg={setMsg}
      clearReferenceImage={clearReferenceImage}
      openResourceModal={openResourceModal}
      studioLight={studioLight}
      setStudioLight={setStudioLight}
      resolution={resolution}
      setResolution={setResolution}
      ratio={ratio}
      setRatio={setRatio}
      gen={gen}
      calcWorkbenchCost={calcWorkbenchCost}
      me={me}
    />;
  }

  function renderStudioRecentStrip(){
    return <WorkbenchStudioRecentStrip
      recentItems={recentItems}
      recentTypeName={recentTypeName}
      setRecentHoverId={setRecentHoverId}
      showRecentOriginal={showRecentOriginal}
      moveRecentOriginal={moveRecentOriginal}
      hideRecentOriginal={hideRecentOriginal}
      openRecentTask={openRecentTask}
      listImgSrc={listImgSrc}
    />;
  }

  function renderVideoCenterPanel(){
    return <WorkbenchVideoPanel
      storyboardDragging={storyboardDragging}
      setStoryboardDragging={setStoryboardDragging}
      dropStoryboard={dropStoryboard}
      chooseStoryboard={chooseStoryboard}
      storyboards={storyboards}
      removeStoryboard={removeStoryboard}
      videoPrompt={videoPrompt}
      setVideoPrompt={setVideoPrompt}
      videoParams={videoParams}
      updateVideoParam={updateVideoParam}
    />;
  }

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
        {renderFeaturePanel()}
      </div>

      <section className="wbCenterPanel">
        <WorkbenchSignalBar title={mediaMode==='video'?'宣传视频智能工作台':'家具图片智能工作台'} items={workbenchSignalItems}/>
        {mediaMode==='image'
          ? <>
            {renderStudioCenterToolbar()}
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
            {renderStudioRecentStrip()}
          </>
          : renderVideoCenterPanel()}
      </section>

      <div className="wbRightPanel wbWorkbenchRightDrawer">
        {mediaMode==='image'?renderStudioControlPanel():renderRecentPanel()}
      </div>
    </div>

    {renderFeatureDetailPopover()}

    <WorkbenchRecentSourcePreview recentSourcePreview={recentSourcePreview} recentPreviewSrc={recentPreviewSrc} hideRecentOriginal={hideRecentOriginal}/>

    <WorkbenchModals
      TaskDetailModal={TaskDetailModal}
      taskDetailLoading={taskDetailLoading}
      taskDetail={taskDetail}
      setTaskDetail={setTaskDetail}
      ops={ops}
      setMsg={setMsg}
      setRecent={setRecent}
      refreshRecent={refreshRecent}
      recentItems={recentItems}
      openRecentTask={openRecentTask}
      continueWithImage={continueWithImage}
      resourceModal={resourceModal}
      setResourceModal={setResourceModal}
      modalItems={modalItems}
      chooseResourceImage={chooseResourceImage}
      listImgSrc={listImgSrc}
      watermarkOpen={watermarkOpen}
      setWatermarkOpen={setWatermarkOpen}
      loadWorkbenchWatermark={loadWorkbenchWatermark}
      deleteTarget={deleteTarget}
      setDeleteTarget={setDeleteTarget}
      confirmDeleteRecentTask={confirmDeleteRecentTask}
      resourceUploadOpen={resourceUploadOpen}
      me={me}
      resourceUpload={resourceUpload}
      setResourceUpload={setResourceUpload}
      resourceUploadFile={resourceUploadFile}
      resourceUploadPreview={resourceUploadPreview}
      chooseWorkbenchResourceFile={chooseWorkbenchResourceFile}
      changeWorkbenchUploadType={changeWorkbenchUploadType}
      changeWorkbenchUploadMain={changeWorkbenchUploadMain}
      workbenchUploadMainOptions={workbenchUploadMainOptions}
      workbenchUploadSubOptions={workbenchUploadSubOptions}
      createWorkbenchResource={createWorkbenchResource}
      closeWorkbenchResourceUpload={closeWorkbenchResourceUpload}
    />
  </>;
}

export default WorkbenchPage;
