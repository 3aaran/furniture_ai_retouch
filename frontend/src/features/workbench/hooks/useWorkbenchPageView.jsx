import React,{useEffect,useState}from'react';
import{resTypeName}from'../../../appShared.jsx';
import{promotionOptionDefaults}from'../model/promotionFeatures.js';
import WorkbenchPageView from'../WorkbenchPageView.jsx';
import{buildWorkbenchPageSlots}from'../WorkbenchPageSlots.jsx';
import{buildWorkbenchOps,workbenchImageSrc,workbenchListImageSrc}from'../model/index.js';
import{useVideoStoryboard,useWorkbenchFeatureMode,useWorkbenchGeneration,useWorkbenchImageUpload,useWorkbenchRecent,useWorkbenchResourceLibrary,useWorkbenchResourceUpload,useWorkbenchWatermark}from'./index.js';
import{fetchPublicSettings}from'../api/index.js';

function useWorkbenchPageView({me,setMe,setMsg,goPage,TaskDetailModal}){
  const imgSrc=workbenchImageSrc;
  const listImgSrc=workbenchListImageSrc;
  const ops=buildWorkbenchOps();
  const {op,featureGroup,mediaMode,resolution,setResolution,ratio,setRatio,featurePopover,openFeaturePopover,closeFeaturePopover,activateFeatureGroup,selectPromotionFeature,selectBaseFeature,isPromotionSelected}=useWorkbenchFeatureMode();
  const {storyboards,storyboardDragging,setStoryboardDragging,videoPrompt,setVideoPrompt,videoParams,chooseStoryboard,dropStoryboard,removeStoryboard,updateVideoParam}=useVideoStoryboard();
  const [studioLight,setStudioLight]=useState({strength:85,colorTemp:4500});
  const [custom,setCustom]=useState('');
  const {resources,setResources,resourceKeyword,setResourceKeyword,resourceScope,setResourceScope,selectedResource,setSelectedResource,currentTemplate,getResourceItems,getModalItems}=useWorkbenchResourceLibrary({op,mediaMode,resTypeName});
  const {resourceUploadOpen,resourceUpload,setResourceUpload,resourceUploadFile,resourceUploadPreview,workbenchUploadMainOptions,workbenchUploadSubOptions,openWorkbenchResourceUpload,chooseWorkbenchResourceFile,closeWorkbenchResourceUpload,changeWorkbenchUploadType,changeWorkbenchUploadMain,createWorkbenchResource}=useWorkbenchResourceUpload({op,me,resources,setResources,setResourceScope,setMsg});
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
  const slots=buildWorkbenchPageSlots({
    mediaMode,
    op,
    ops,
    featureGroup,
    currentFeatureMode,
    currentFeatureLabel,
    featurePopover,
    closeFeaturePopover,
    activateFeatureGroup,
    selectPromotionFeature,
    selectBaseFeature,
    openFeaturePopover,
    setLeftDrawerOpen,
    setRightDrawerOpen,
    resourceKeyword,
    setResourceKeyword,
    resourceScope,
    setResourceScope,
    resourceItems,
    openWorkbenchResourceUpload,
    selectedResource,
    setSelectedResource,
    listImgSrc,
    removeOpts,
    setRemoveOpts,
    enhanceOpts,
    setEnhanceOpts,
    multiView,
    setMultiView,
    promotionOptions,
    setPromotionOptions,
    recentItems,
    recentKeyword,
    setRecentKeyword,
    refreshRecent,
    setRecentHoverId,
    recentHoverId,
    showRecentOriginal,
    moveRecentOriginal,
    hideRecentOriginal,
    openRecentTask,
    deleteRecentTask,
    recentTypeName,
    setMsg,
    goPage,
    showWorkbenchWatermark,
    workbenchWatermark,
    toggleWorkbenchWatermark,
    isPromotionSelected,
    custom,
    setCustom,
    reference,
    draggingRef,
    dragOver,
    dragLeave,
    dropUpload,
    chooseReference,
    imgSrc,
    clearReferenceImage,
    openResourceModal,
    studioLight,
    setStudioLight,
    resolution,
    setResolution,
    ratio,
    setRatio,
    gen,
    calcWorkbenchCost,
    me,
    storyboardDragging,
    setStoryboardDragging,
    dropStoryboard,
    chooseStoryboard,
    storyboards,
    removeStoryboard,
    videoPrompt,
    setVideoPrompt,
    videoParams,
    updateVideoParam
  });

  return <WorkbenchPageView
    mediaMode={mediaMode}
    leftDrawerOpen={leftDrawerOpen}
    setLeftDrawerOpen={setLeftDrawerOpen}
    rightDrawerOpen={rightDrawerOpen}
    setRightDrawerOpen={setRightDrawerOpen}
    currentFeatureMode={currentFeatureMode}
    currentFeatureLabel={currentFeatureLabel}
    recentItems={recentItems}
    canConfigureWatermark={canConfigureWatermark}
    setWatermarkOpen={setWatermarkOpen}
    workbenchSignalItems={workbenchSignalItems}
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
    clearSourceImage={clearSourceImage}
    clearReferenceImage={clearReferenceImage}
    setMsg={setMsg}
    showWorkbenchWatermark={showWorkbenchWatermark}
    workbenchWatermark={workbenchWatermark}
    latestCompareImageUrl={latestCompareImageUrl}
    slots={slots}
    recentSourcePreview={recentSourcePreview}
    recentPreviewSrc={recentPreviewSrc}
    hideRecentOriginal={hideRecentOriginal}
    modalsProps={{
      TaskDetailModal,
      taskDetailLoading,
      taskDetail,
      setTaskDetail,
      ops,
      setMsg,
      setRecent,
      refreshRecent,
      recentItems,
      openRecentTask,
      continueWithImage,
      resourceModal,
      setResourceModal,
      modalItems,
      chooseResourceImage,
      listImgSrc,
      watermarkOpen,
      setWatermarkOpen,
      loadWorkbenchWatermark,
      deleteTarget,
      setDeleteTarget,
      confirmDeleteRecentTask,
      resourceUploadOpen,
      me,
      resourceUpload,
      setResourceUpload,
      resourceUploadFile,
      resourceUploadPreview,
      chooseWorkbenchResourceFile,
      changeWorkbenchUploadType,
      changeWorkbenchUploadMain,
      workbenchUploadMainOptions,
      workbenchUploadSubOptions,
      createWorkbenchResource,
      closeWorkbenchResourceUpload
    }}
  />;
}

export default useWorkbenchPageView;
