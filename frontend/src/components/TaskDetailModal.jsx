import React,{useEffect,useMemo,useState}from'react';
import{createPortal}from'react-dom';
import{req,imageViewUrl,openImageDownload}from'../appShared.jsx';
import{createWatermarkedImageBlob,downloadBlob,watermarkedFilename}from'../utils/watermarkImage.js';
import{getDisplayStatusName,getFeatureDisplayName}from'../config/uiText.js';
import WatermarkConfigModal from'../features/workbench/components/WatermarkConfigModal.jsx';
import ConfirmDialog from'../shared/ui/ConfirmDialog.jsx';
import DesktopTaskPreviewView from'./task-detail/DesktopTaskPreviewView.jsx';
import ExternalMobileTaskPreviewView from'./task-detail/MobileTaskPreviewView.jsx';
import ImageProcessModal from'./task-detail/ImageProcessModal.jsx';
import{copyText}from'./task-detail/clipboard.js';
import{asArray,buildReferenceImages,getTaskFeature,joinParts,optionTextList,parseJson,taskStatusMap,textWatermarkConfig}from'./task-detail/taskDetailModel.js';
import{useTaskDetailResponsive}from'./task-detail/useTaskDetailResponsive.js';
import{useTaskDetailWatermark}from'./task-detail/useTaskDetailWatermark.js';

function canUseBrowserDownload(){
  if(typeof document==='undefined')return false;
  const link=document.createElement('a');
  return typeof link.download==='string';
}

function TaskDetailModal({
  detail,
  onClose,
  isAdmin=false,
  ops,
  setMsg,
  onDeleted,
  onUpdated,
  taskList=[],
  onSwitchTask,
  onContinueImage
}){
  const [processOpen,setProcessOpen]=useState(false);
  const [busy,setBusy]=useState('');
  const {useWatermark,setUseWatermark,watermark,watermarkConfigOpen,setWatermarkConfigOpen,loadWatermark}=useTaskDetailWatermark(isAdmin);
  const [previewFailed,setPreviewFailed]=useState(false);
  const [confirmAction,setConfirmAction]=useState(null);
  const isMobile=useTaskDetailResponsive();

  useEffect(()=>{
    setUseWatermark(false);
    setPreviewFailed(false);
  },[detail?.id]);

  if(!detail)return null;

  const settings=parseJson(detail.settingsJson||detail.processSettings||detail.process_settings,{});
  const taskParams=parseJson(detail.taskParams||settings.taskParams,{});
  const detailOptions=parseJson(detail.optionsJson,{});
  const options=taskParams.options||settings.options||detail.options||detailOptions||{};
  const selectedResource=taskParams.selectedResource||settings.selectedResource||{};
  const outputFormat=parseJson(detail.outputFormat,settings.outputFormat||{});
  const featureKey=getTaskFeature(detail);
  const spec=joinParts([detail.resolution||outputFormat.resolution||settings.resolution, detail.ratio||outputFormat.ratio||settings.ratio]);
  const userName=detail.userName||detail.userPhone||detail.phone||detail.username||'-';
  const opKey=detail.featureKey||detail.operation||detail.kind||featureKey;
  const rawOp=ops?.[opKey]||ops?.[featureKey]||ops?.[detail.kind];
  const opLabel=(rawOp&&typeof rawOp==='object')?rawOp.label:(rawOp||getFeatureDisplayName(detail.featureName,'')||getFeatureDisplayName(opKey,getFeatureDisplayName(detail.kind,'AI任务')));
  const status=taskStatusMap[detail.status]||getDisplayStatusName(detail.status,'已完成');
  const statusTone=String(detail.status||'').toUpperCase().includes('FAIL')?'failed':'success';
  const quotaUsed=Number(detail.quotaUsed||detail.costUsed||detail.cost||settings.cost||0);
  const userPrompt=(detail.userPrompt||detail.detailUserPrompt||settings.customText||settings.userPrompt||'').trim();
  const displayPrompt=userPrompt;
  const resultCandidates=asArray(detail.resultImages||detail.outputImages||detail.outputs)
    .filter(x=>x&&(x.id||x.imageId||x.url||x.imageUrl));
  const clickedImageId=detail.imageId||detail.clickedImageId||detail.selectedImageId||detail.id;
  const selectedResultImage=resultCandidates.find(x=>String(x.id||x.imageId||'')===String(clickedImageId||''))||detail.resultImage||resultCandidates[0]||{};
  const imageId=selectedResultImage.id||selectedResultImage.imageId||detail.resultImage?.id||detail.imageId||detail.id;
  const sourceImageId=detail.originImage?.id||detail.sourceImageId;
  const resultUrl=selectedResultImage.url||selectedResultImage.imageUrl||detail.resultUrl||detail.url||detail.resultImage?.url;
  const sourceUrl=detail.sourceUrl||detail.originImage?.url;
  const resultImageSrc=imageViewUrl({id:imageId,url:resultUrl});
  const sourceImageSrc=imageViewUrl({id:sourceImageId,url:sourceUrl});

  const optionLabels=useMemo(()=>optionTextList(featureKey,options,userPrompt),[detail?.id,featureKey,userPrompt]);
  const extraText=optionLabels.join(' / ')||'未选择额外功能选项';
  const referenceImages=useMemo(()=>buildReferenceImages({detail,taskParams,selectedResource,featureKey}),[detail?.id,featureKey]);

  const orderedList=(taskList||[]).filter(x=>x&&(x.id||x.imageId||x.resultImage?.id));
  const currentIndex=orderedList.findIndex(x=>String(x.id)===String(detail.id)||String(x.imageId)===String(imageId)||String(x.resultImage?.id)===String(imageId));
  const total=orderedList.length||1;
  const canPrev=currentIndex>0;
  const canNext=currentIndex>=0&&currentIndex<orderedList.length-1;

  function switchTo(offset){
    if(currentIndex<0)return;
    const next=orderedList[currentIndex+offset];
    if(next)onSwitchTask?.(next);
  }

  async function download(){
    if(isMobile){
      if(!resultUrl)return setMsg&&setMsg('图片地址不存在');
      if(!canUseBrowserDownload()){
        setMsg&&setMsg('可以打开浏览器下载');
        return;
      }
      if(!useWatermark){
        openImageDownload({
          id:imageId,
          url:resultUrl,
          downloadUrl:selectedResultImage.downloadUrl||detail.downloadUrl||detail.resultImage?.downloadUrl
        },setMsg);
        return;
      }
      if(!wmReady||!watermark.config){
        setMsg&&setMsg('请先配置水印');
        return;
      }
      try{
        setBusy('watermark');
        const blob=await createWatermarkedImageBlob(resultImageSrc,watermarkConfig);
        downloadBlob(blob,watermarkedFilename(detail.originalName||selectedResultImage.originalName||imageId));
      }catch(e){
        const message=e?.message?.includes('跨域')?e.message:'水印图片生成失败，请重试';
        setMsg&&setMsg(message);
      }finally{
        setBusy('');
      }
      return;
    }
    if(useWatermark){
      if(!wmReady||!watermark.config){
        setMsg&&setMsg('请先配置水印');
        return;
      }
      try{
        setBusy('watermark');
        const blob=await createWatermarkedImageBlob(resultImageSrc,watermarkConfig);
        downloadBlob(blob,watermarkedFilename(detail.originalName||selectedResultImage.originalName||imageId));
      }catch(e){
        const message=e?.message?.includes('跨域')?e.message:'水印图片生成失败，请重试';
        setMsg&&setMsg(message);
      }finally{
        setBusy('');
      }
      return;
    }
    openImageDownload({
      id:imageId,
      url:resultUrl,
      downloadUrl:selectedResultImage.downloadUrl||detail.downloadUrl||detail.resultImage?.downloadUrl
    },setMsg);
  }

  async function copyPrompt(){
    try{
      await copyText(displayPrompt||'');
      setMsg&&setMsg('要求已复制');
    }catch(e){
      setMsg&&setMsg('复制失败，请检查浏览器剪贴板权限');
    }
  }

  function continueWith(img){
    if(!img?.id||!img?.url)return setMsg&&setMsg('当前图片不可继续创作');
    onContinueImage?.({
      id:img.id,
      url:img.url,
      imageUrl:imageViewUrl({id:img.id,url:img.url}),
      originalName:img.originalName||detail.originalName||''
    });
  }

  async function deleteImage(){
    if(!imageId)return;
    try{
      setBusy('delete');
      await req('/api/images/'+imageId,{method:'DELETE'});
      setMsg&&setMsg('图片已删除');
      onDeleted?.(imageId);
      onClose?.();
    }catch(e){setMsg&&setMsg(e.message)}
    finally{setBusy('')}
  }

  const watermarkConfig=textWatermarkConfig(watermark.config||{});
  const wmReady=!!watermark.configured&&!!watermarkConfig.text;
  const watermarkActive=useWatermark&&wmReady;
  const resultPreviewSrc=resultImageSrc;

  const taskOverlays=<>
    {processOpen&&<ImageProcessModal detail={{...detail,id:imageId,url:resultUrl}} onClose={()=>setProcessOpen(false)} setMsg={setMsg}/>}
    <WatermarkConfigModal open={watermarkConfigOpen} onClose={()=>{setWatermarkConfigOpen(false);loadWatermark(true);}} setMsg={setMsg}/>
    <ConfirmDialog
      open={confirmAction==='delete'}
      title="删除图片"
      message="确认删除这张生成图片吗？删除后将无法恢复。"
      confirmText="确认删除"
      danger
      onClose={()=>setConfirmAction(null)}
      onConfirm={()=>{setConfirmAction(null);deleteImage();}}
    />
  </>;

  if(isMobile){
    return createPortal(<ExternalMobileTaskPreviewView
      detail={detail}
      opLabel={opLabel}
      status={status}
      statusTone={statusTone}
      userName={userName}
      extraText={extraText}
      spec={spec}
      quotaUsed={quotaUsed}
      displayPrompt={displayPrompt}
      referenceImages={referenceImages}
      resultUrl={resultUrl}
      resultPreviewSrc={resultPreviewSrc}
      imageId={imageId}
      currentIndex={currentIndex}
      total={total}
      canPrev={canPrev}
      canNext={canNext}
      busy={busy}
      isAdmin={isAdmin}
      watermark={watermark}
      wmReady={wmReady}
      useWatermark={useWatermark}
      watermarkActive={watermarkActive}
      watermarkConfig={watermarkConfig}
      onClose={onClose}
      onPrev={()=>switchTo(-1)}
      onNext={()=>switchTo(1)}
      onOpenProcess={()=>setProcessOpen(true)}
      onSave={download}
      onDelete={()=>setConfirmAction('delete')}
      onCopyPrompt={copyPrompt}
      onContinueImage={()=>continueWith({id:imageId,url:resultUrl,originalName:detail.originalName})}
      onWatermarkToggle={setUseWatermark}
      onWatermarkConfig={()=>setWatermarkConfigOpen(true)}
      onPreviewError={()=>setPreviewFailed(true)}
    >
      {taskOverlays}
    </ExternalMobileTaskPreviewView>,document.body);
  }

  return createPortal(<DesktopTaskPreviewView
    detail={detail}
    opLabel={opLabel}
    status={status}
    statusTone={statusTone}
    userName={userName}
    extraText={extraText}
    spec={spec}
    quotaUsed={quotaUsed}
    displayPrompt={displayPrompt}
    referenceImages={referenceImages}
    sourceUrl={sourceUrl}
    sourceImageSrc={sourceImageSrc}
    sourceImageId={sourceImageId}
    resultUrl={resultUrl}
    resultPreviewSrc={resultPreviewSrc}
    imageId={imageId}
    currentIndex={currentIndex}
    total={total}
    canPrev={canPrev}
    canNext={canNext}
    busy={busy}
    isAdmin={isAdmin}
    watermark={watermark}
    wmReady={wmReady}
    useWatermark={useWatermark}
    watermarkActive={watermarkActive}
    watermarkConfig={watermarkConfig}
    onClose={onClose}
    onPrev={()=>switchTo(-1)}
    onNext={()=>switchTo(1)}
    onOpenProcess={()=>setProcessOpen(true)}
    onSave={download}
    onDelete={()=>setConfirmAction('delete')}
    onCopyPrompt={copyPrompt}
    onContinueImage={continueWith}
    onWatermarkToggle={setUseWatermark}
    onWatermarkConfig={()=>setWatermarkConfigOpen(true)}
    onPreviewError={()=>setPreviewFailed(true)}
  >
    {taskOverlays}
  </DesktopTaskPreviewView>,document.body)
}

export{TaskDetailModal,ImageProcessModal};
