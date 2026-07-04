import React,{useEffect,useMemo,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{ChevronLeft,ChevronRight,Copy,Download,FileText,Flag,Hash,SlidersHorizontal,Trash2,User,WalletCards}from'lucide-react';
import{req,fmt,imageViewUrl,assetUrl,openImageDownload}from'../appShared.jsx';
import{createWatermarkedImageBlob,downloadBlob,watermarkedFilename}from'../utils/watermarkImage.js';
import{getDisplayStatusName,getFeatureDisplayName}from'../config/uiText.js';
import WatermarkConfigModal from'../store/workbench/WatermarkConfigModal.jsx';
import ConfirmDialog from'../shared/ui/ConfirmDialog.jsx';
import ExternalMobileTaskPreviewView from'./task-detail/MobileTaskPreviewView.jsx';
import ExternalMobileProcessModal from'./task-detail/MobileProcessModal.jsx';
import TaskWatermarkOverlay from'./task-detail/TaskWatermarkOverlay.jsx';

const statusMap={
  SUCCESS:'\u5df2\u5b8c\u6210',
  succeeded:'\u5df2\u5b8c\u6210',
  running:'\u751f\u6210\u4e2d',
  queued:'\u6392\u961f\u4e2d',
  failed:'\u5931\u8d25',
  FAILED:'\u5931\u8d25'
};

function parseJson(v,fallback={}){
  if(v&&typeof v==='object')return v;
  try{return JSON.parse(v||'')}catch{return fallback}
}

function asArray(v){
  const data=parseJson(v,[]);
  return Array.isArray(data)?data:[];
}

function joinParts(parts){
  return parts.map(x=>String(x||'').trim()).filter(Boolean).join(' / ')||'-';
}

function textWatermarkConfig(config={}){
  return {
    ...config,
    mode:'text',
    text:String(config.text||'').trim(),
    image:'',
    imageId:'',
    imageUrl:''
  };
}

let cachedWatermarkSettings=null;

function imageSrc(url){
  return assetUrl(url);
}

function getTaskFeature(detail={}){
  return detail.featureKey||detail.kind||detail.operation||'';
}

function optionTextList(featureKey,options={},userPrompt=''){
  const labels=[];
  if(options.whiteBg)labels.push('白底图');
  if(options.mirror)labels.push('镜像产品图');
  if(options.focus)labels.push('产品聚焦');
  if(options.angle&&options.angle!=='不变')labels.push(`角度：${options.angle}`);
  if(featureKey==='multiview'&&options.view)labels.push(options.view);
  if(userPrompt)labels.push(`用户要求：${userPrompt}`);
  return [...new Set(labels.map(x=>String(x||'').trim()).filter(Boolean))];
}

function refTitleByRole(role,featureKey){
  if(role==='IMAGE_B'){
    if(featureKey==='material')return '材质参考图';
    if(featureKey==='replace_bg')return '场景参考图';
    return '功能参考图';
  }
  if(role==='IMAGE_C')return '用户参考图';
  return '参考图';
}

function buildReferenceImages({detail={},taskParams={},selectedResource={},featureKey=''}){
  const list=[];
  const seen=new Set();
  const add=(item={},fallbackTitle='参考图',role='')=>{
    const url=item.url||item.imageUrl||item.previewUrl;
    if(!url)return;
    const key=String(item.id||item.imageId||url);
    if(seen.has(key))return;
    seen.add(key);
    list.push({
      id:item.id||item.imageId||key,
      url,
      title:item.title||item.name||item.originalName||fallbackTitle,
      role,
      roleLabel:item.roleLabel||refTitleByRole(role,featureKey)
    });
  };

  (detail.referenceImages||detail.inputImages||[]).forEach(item=>{
    const role=item.role||item.inputRole||item.input_role||'';
    if(role==='IMAGE_A')return;
    add(item,refTitleByRole(role,featureKey),role);
  });

  const sr=selectedResource||taskParams.selectedResource||{};
  if(sr.url||sr.imageUrl){
    add(sr,featureKey==='material'?'材质参考图':featureKey==='replace_bg'?'场景参考图':'功能参考图','IMAGE_B');
  }

  [taskParams.imageB,taskParams.functionalReferenceImage].filter(Boolean).forEach(item=>add(item,'功能参考图','IMAGE_B'));
  [taskParams.imageC,taskParams.userReferenceImage].filter(Boolean).forEach(item=>add(item,'用户参考图','IMAGE_C'));

  return list;
}

async function copyText(text){
  const value=String(text||'');
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(value);
    return;
  }
  const area=document.createElement('textarea');
  area.value=value;
  area.setAttribute('readonly','');
  area.style.position='fixed';
  area.style.left='-9999px';
  document.body.appendChild(area);
  area.select();
  try{
    if(!document.execCommand('copy'))throw new Error('copy failed');
  }finally{
    document.body.removeChild(area);
  }
}

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
  const [useWatermark,setUseWatermark]=useState(false);
  const [watermark,setWatermark]=useState({loading:true,enabled:false,configured:false,canConfigure:false});
  const [watermarkConfigOpen,setWatermarkConfigOpen]=useState(false);
  const [previewFailed,setPreviewFailed]=useState(false);
  const [confirmAction,setConfirmAction]=useState(null);
  const [isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(max-width: 860px)').matches);

  function loadWatermark(force=false){
    if(isAdmin){
      setWatermark({loading:false,enabled:false,configured:false,canConfigure:false});
      return;
    }
    if(cachedWatermarkSettings&&!force){
      setWatermark({...cachedWatermarkSettings,loading:false});
      return;
    }
    setWatermark(prev=>({...prev,loading:true}));
    req('/api/watermark/settings')
      .then(d=>{
        cachedWatermarkSettings=d;
        setWatermark({...d,loading:false});
      })
      .catch(()=>setWatermark({loading:false,enabled:false,configured:false,canConfigure:false}));
  }

  useEffect(()=>{
    loadWatermark();
  },[isAdmin]);

  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const mq=window.matchMedia('(max-width: 860px)');
    const update=()=>setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change',update);
    return()=>mq.removeEventListener?.('change',update);
  },[]);

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
  const status=statusMap[detail.status]||getDisplayStatusName(detail.status,'已完成');
  const statusTone=String(detail.status||'').toUpperCase().includes('FAIL')?'failed':'success';
  const quotaUsed=Number(detail.quotaUsed||detail.costUsed||detail.cost||settings.cost||0);
  const userPrompt=(detail.userPrompt||detail.detailUserPrompt||settings.customText||settings.userPrompt||'').trim();
  const finalPrompt=(detail.prompt||detail.finalPrompt||settings.finalPrompt||settings.prompt||userPrompt||'').trim();
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

  return createPortal(<div className="taskPreviewOverlay taskPreviewWindowMode">
    <div className="taskPreviewTop">
      <div><b><span className="taskDesktopTitle">任务对比预览</span><span className="taskMobileTitle">任务预览</span></b><span>{currentIndex>=0?currentIndex+1:1} / {total}</span></div>
      <div className="taskPreviewTopBtns">
        <button disabled={!canPrev} onClick={()=>switchTo(-1)}><ChevronLeft size={22}/></button>
        <button disabled={!canNext} onClick={()=>switchTo(1)}><ChevronRight size={22}/></button>
        <button onClick={onClose}>×</button>
      </div>
    </div>
    <div className="taskPreviewBody">
      <div className="taskComparePanel">
        <div className="compareCol">
          <div className="compareHead"><h3>产品图片</h3>{!isAdmin&&<button onClick={()=>continueWith({id:sourceImageId,url:sourceUrl,originalName:detail.sourceOriginalName})}>以此图继续创作</button>}</div>
          <div className="taskImageFrame">{sourceUrl?<img src={sourceImageSrc} loading="lazy" decoding="async"/>:<span>无原图</span>}</div>
        </div>
        <div className="compareCol">
          <div className="compareHead"><h3>生成结果</h3>{!isAdmin&&<button onClick={()=>continueWith({id:imageId,url:resultUrl,originalName:detail.originalName})}>以此图继续创作</button>}</div>
          <div className="taskImageFrame">{resultUrl?<><img src={resultPreviewSrc} onError={()=>setPreviewFailed(true)} loading="lazy" decoding="async"/>{watermarkActive&&<TaskWatermarkOverlay config={watermarkConfig}/>}</>:<span>无生成图</span>}</div>
        </div>
      </div>
      <div className="taskMobileActionBar" aria-label="任务操作">
        <button type="button" onClick={()=>setProcessOpen(true)}><SlidersHorizontal size={20}/><span>参数</span></button>
        <button type="button" className="primary" onClick={download}><Download size={20}/><span>保存</span></button>
        {!isAdmin&&<button type="button" className="danger" onClick={()=>setConfirmAction('delete')} disabled={!!busy}><Trash2 size={20}/><span>删除</span></button>}
      </div>
      <div className="taskInfoPanel">
        <h3>任务详情</h3>
        <div className="taskInfoScroll">
          <div className="infoRows">
            <div><i><Hash size={16}/></i><p><span>任务编号</span><b>{detail.id}</b></p></div>
            <div><i><Flag size={16}/></i><p><span>任务类型</span><b className="goldTag">{opLabel}</b></p></div>
            <div><i><User size={16}/></i><p><span>生成账号</span><b>{userName}</b></p></div>
            <div><i><FileText size={16}/></i><p><span>额外要求</span><b>{extraText}</b></p></div>
            <div><i><FileText size={16}/></i><p><span>生成规格</span><b>{spec}</b></p></div>
            <div><i><FileText size={16}/></i><p><span>创建时间</span><b>{fmt(detail.createdAt||detail.submittedAt)}</b></p></div>
            <div><i><WalletCards size={16}/></i><p><span>状态 / 消耗</span><b><em className={statusTone}>{status}</em> {quotaUsed||'-'} 算力</b></p></div>
          </div>

          {referenceImages.length>0&&<div className="taskReferenceBlock">
            {referenceImages.map(img=><div className="taskReferenceItem" key={img.id}>
              <span>{img.roleLabel}</span>
              <img src={imageViewUrl(img)} alt={img.title||img.roleLabel} loading="lazy" decoding="async"/>
              {img.title&&<b>{img.title}</b>}
            </div>)}
          </div>}

          <div className="promptBox"><div><span>用户要求</span><button className="iconOnly" title="复制用户要求" aria-label="复制用户要求" onClick={copyPrompt} disabled={!displayPrompt}><Copy size={14}/></button></div><p>{displayPrompt||'无'}</p></div>
          {!isAdmin&&<div className="taskWatermarkControl">
            <div>
              <b>{'\u4f7f\u7528\u6c34\u5370'}</b>
              <small>{watermark.loading?'\u6b63\u5728\u8bfb\u53d6\u95e8\u5e97\u6c34\u5370\u914d\u7f6e':wmReady?'\u5f00\u542f\u540e\u4e0b\u8f7d\u539f\u56fe\u4f1a\u6dfb\u52a0\u6c34\u5370':watermark.canConfigure?'\u95e8\u5e97\u672a\u914d\u7f6e\u6c34\u5370':'\u95e8\u5e97\u672a\u914d\u7f6e\u6c34\u5370'}</small>
            </div>
            {wmReady?
              <label className="taskWatermarkToggle">
                <input type="checkbox" checked={useWatermark} onChange={e=>setUseWatermark(e.target.checked)}/>
                <i/>
              </label>
              :
              <button type="button" disabled={!watermark.canConfigure||watermark.loading} onClick={()=>setWatermarkConfigOpen(true)}>{'\u53bb\u914d\u7f6e'}</button>}
          </div>}
        </div>
        <div className="taskDetailActions">
          <button className="outlineGold iconOnly" title="图片处理" aria-label="图片处理" onClick={()=>setProcessOpen(true)}><SlidersHorizontal size={18}/></button>
          <button className="primary iconOnly" title="下载原图" aria-label="下载原图" onClick={download}><Download size={18}/></button>
          {!isAdmin&&<>
            <button className="danger iconOnly" title={busy==='delete'?'删除中':'删除图片'} aria-label="删除图片" onClick={()=>setConfirmAction('delete')} disabled={!!busy}><Trash2 size={18}/></button>
          </>}
        </div>
      </div>
    </div>
    {taskOverlays}
  </div>,document.body)
}

function MobileTaskPreviewView({
  detail,
  opLabel,
  status,
  statusTone,
  userName,
  extraText,
  spec,
  quotaUsed,
  displayPrompt,
  referenceImages,
  resultUrl,
  resultPreviewSrc,
  currentIndex,
  total,
  canPrev,
  canNext,
  busy,
  isAdmin,
  watermark,
  wmReady,
  useWatermark,
  watermarkActive,
  watermarkConfig,
  onClose,
  onPrev,
  onNext,
  onOpenProcess,
  onSave,
  onDelete,
  onCopyPrompt,
  onContinueImage,
  onWatermarkToggle,
  onWatermarkConfig,
  onPreviewError,
  children
}){
  return <div className="taskPreviewOverlay mobileTaskPreviewOverlay">
    <section className="mobileTaskPreview" role="dialog" aria-modal="true" aria-label="任务预览">
      <header className="mobileTaskHeader">
        <div>
          <b>任务预览</b>
          <span>{currentIndex>=0?currentIndex+1:1} / {total}</span>
        </div>
        <div className="mobileTaskHeaderBtns">
          <button type="button" disabled={!canPrev} onClick={onPrev} aria-label="上一张"><ChevronLeft size={20}/></button>
          <button type="button" disabled={!canNext} onClick={onNext} aria-label="下一张"><ChevronRight size={20}/></button>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
      </header>

      <main className="mobileTaskScroll">
        <section className="mobileTaskImageCard">
          <div className="mobileTaskImageTitle">
            <div>
              <span>成品图</span>
            </div>
            <div className="mobileTaskTitleActions">
              <em>{opLabel}</em>
              {!isAdmin&&<button type="button" className="mobileContinueChip" onClick={onContinueImage} disabled={!resultUrl} aria-label="继续创作"><ChevronRight size={15}/><span>继续创作</span></button>}
            </div>
          </div>
          <div className="mobileTaskImageStage">
            {resultUrl?<><img src={resultPreviewSrc} alt={detail.originalName||opLabel||'成品图'} onError={onPreviewError} loading="lazy" decoding="async"/>{watermarkActive&&<WatermarkOverlay config={watermarkConfig}/>}</>:<span>暂无生成图</span>}
          </div>
        </section>

        <nav className="mobileTaskActions" aria-label="任务操作">
          <button type="button" onClick={onOpenProcess} aria-label="参数" title="参数"><SlidersHorizontal size={18}/></button>
          <button type="button" className="primary downloadBtn" onClick={onSave} disabled={!resultUrl||busy==='watermark'} aria-label="下载" title="下载"><Download size={18}/><span>下载</span></button>
          {!isAdmin&&<button type="button" className="danger" onClick={onDelete} disabled={!!busy} aria-label="删除" title="删除"><Trash2 size={18}/></button>}
        </nav>

        <section className="mobileTaskInfoCard">
          <h3>任务详情</h3>
          <div className="mobileTaskInfoGrid">
            <div className="mobileTaskInfoRow"><i><Hash size={15}/></i><p><span>任务编号</span><b>{detail.id}</b></p></div>
            <div className="mobileTaskInfoRow"><i><Flag size={15}/></i><p><span>任务类型</span><b className="goldTag">{opLabel}</b></p></div>
            <div className="mobileTaskInfoRow"><i><User size={15}/></i><p><span>生成账号</span><b>{userName}</b></p></div>
            <div className="mobileTaskInfoRow"><i><FileText size={15}/></i><p><span>额外要求</span><b>{extraText}</b></p></div>
            <div className="mobileTaskInfoRow"><i><FileText size={15}/></i><p><span>生成规格</span><b>{spec}</b></p></div>
            <div className="mobileTaskInfoRow"><i><FileText size={15}/></i><p><span>创建时间</span><b>{fmt(detail.createdAt||detail.submittedAt)}</b></p></div>
            <div className="mobileTaskInfoRow"><i><WalletCards size={15}/></i><p><span>状态 / 消耗</span><b><em className={statusTone}>{status}</em> {quotaUsed||'-'} 算力</b></p></div>
          </div>

          {referenceImages.length>0&&<div className="mobileTaskReferenceBlock">
            {referenceImages.map(img=><div className="mobileTaskReferenceItem" key={img.id}>
              <span>{img.roleLabel}</span>
              <img src={imageViewUrl(img)} alt={img.title||img.roleLabel} loading="lazy" decoding="async"/>
              {img.title&&<b>{img.title}</b>}
            </div>)}
          </div>}

          <div className="promptBox mobileTaskPrompt">
            <div><span>用户要求</span><button className="iconOnly" title="复制用户要求" aria-label="复制用户要求" onClick={onCopyPrompt} disabled={!displayPrompt}><Copy size={14}/></button></div>
            <p>{displayPrompt||'无'}</p>
          </div>

          {!isAdmin&&<div className="taskWatermarkControl mobileTaskWatermark">
            <div>
              <b>{'\u4f7f\u7528\u6c34\u5370'}</b>
              <small>{watermark.loading?'\u6b63\u5728\u8bfb\u53d6\u95e8\u5e97\u6c34\u5370\u914d\u7f6e':wmReady?'开启后会预览水印，下载时前端临时合成':watermark.canConfigure?'\u95e8\u5e97\u672a\u914d\u7f6e\u6c34\u5370':'\u95e8\u5e97\u672a\u914d\u7f6e\u6c34\u5370'}</small>
            </div>
            {wmReady?
              <label className="taskWatermarkToggle">
                <input type="checkbox" checked={useWatermark} onChange={e=>onWatermarkToggle(e.target.checked)}/>
                <i/>
              </label>
              :
              <button type="button" disabled={!watermark.canConfigure||watermark.loading} onClick={onWatermarkConfig}>{'\u53bb\u914d\u7f6e'}</button>}
          </div>}
        </section>
      </main>
    </section>
    {children}
  </div>;
}

function MobileProcessModal({
  detail,
  previewUrl,
  hasResult,
  result,
  imgSize,
  cropX,
  cropY,
  cropW,
  cropH,
  advancedMode,
  format,
  quality,
  maxWidth,
  processing,
  canSubmit,
  setAdvancedMode,
  setFormat,
  setQuality,
  setMaxWidth,
  onImageLoad,
  onClose,
  onSubmit,
  onCopySourceName
}){
  const sourceName=detail.originalName||String(detail.id||'');
  const advancedOptions=[
    ['none','不处理','不开启高级处理'],
    ['remove_bg','智能抠图','适合白底或浅色背景'],
    ['compress','图片压缩','重新编码并缩小尺寸'],
    ['convert','格式转换','输出 PNG / JPG / WebP']
  ];
  return <div className="mobileProcessMask">
    <section className="mobileProcessPanel" role="dialog" aria-modal="true" aria-label="处理参数">
      <header className="mobileProcessHeader">
        <div>
          <b>处理参数</b>
          <span>{processing?'正在处理':'移动端参数'}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>

      <main className="mobileProcessScroll">
        <section className="mobileProcessSource">
          <span>当前来源</span>
          <div>
            <b title={sourceName}>{sourceName}</b>
            <button type="button" onClick={onCopySourceName}>复制</button>
          </div>
        </section>

        <section className="mobileProcessPreview">
          <div className="mobileProcessPreviewHead">
            <span>图片预览</span>
            <em>{hasResult?`${result.width||'-'} × ${result.height||'-'}`:(imgSize.w&&imgSize.h?`${imgSize.w} × ${imgSize.h}`:'加载中')}</em>
          </div>
          <div className="mobileProcessStage">
            {previewUrl?<img src={previewUrl} onLoad={onImageLoad} alt={sourceName||'处理图片'} loading="lazy" decoding="async"/>:<div>暂无图片</div>}
          </div>
        </section>

        <section className="mobileProcessCard">
          <h3>基础处理</h3>
          <div className="mobileProcessSummary">
            <p><span>处理方式</span><b>移动端仅查看裁剪参数</b></p>
            <p><span>说明</span><b>裁剪拖拽编辑请在电脑端使用</b></p>
          </div>
        </section>

        <section className="mobileProcessCard">
          <h3>裁剪参数</h3>
          <div className="mobileProcessFieldList">
            <label><span>裁剪宽度</span><input type="text" value={cropW?`${cropW}px`:'未加载'} readOnly /></label>
            <label><span>裁剪高度</span><input type="text" value={cropH?`${cropH}px`:'未加载'} readOnly /></label>
            <label><span>X 坐标</span><input type="text" value={`${cropX}px`} readOnly /></label>
            <label><span>Y 坐标</span><input type="text" value={`${cropY}px`} readOnly /></label>
          </div>
        </section>

        <section className="mobileProcessCard">
          <h3>其他参数</h3>
          <div className="mobileProcessOptions">
            {advancedOptions.map(([k,b,s])=><button key={k} type="button" className={advancedMode===k?'active':''} onClick={()=>setAdvancedMode(k)}>
              <div><b>{b}</b><small>{s}</small></div>
              <span>{advancedMode===k?'●':'○'}</span>
            </button>)}
          </div>
          {(advancedMode==='compress'||advancedMode==='convert')&&<div className="mobileProcessFieldList">
            <label><span>输出格式</span><select value={format} onChange={e=>setFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></label>
            <label><span>输出质量：{quality}%</span><input type="range" min="30" max="100" value={quality} onChange={e=>setQuality(e.target.value)}/></label>
            {advancedMode==='compress'&&<label><span>最大宽度：{maxWidth}px</span><input type="range" min="800" max="2400" step="100" value={maxWidth} onChange={e=>setMaxWidth(Number(e.target.value))}/></label>}
          </div>}
        </section>

        {hasResult&&<section className="mobileProcessCard mobileProcessResult">
          <h3>处理结果</h3>
          <p>输出尺寸：{result.width||'-'} × {result.height||'-'}</p>
        </section>}
      </main>

      <footer className="mobileProcessFooter">
        <button type="button" className="ghost" onClick={onClose}>取消</button>
        <button type="button" className="primary" disabled={!canSubmit} onClick={onSubmit}>{processing?'处理中':'确认应用'}</button>
      </footer>
    </section>
  </div>;
}

function ImageProcessModal({detail,onClose,setMsg}){
  const [processing,setProcessing]=useState(false);
  const [result,setResult]=useState(null);
  const [basicMode,setBasicMode]=useState('crop');
  const [advancedMode,setAdvancedMode]=useState('none');
  const [format,setFormat]=useState('png');
  const [quality,setQuality]=useState(90);
  const [maxWidth,setMaxWidth]=useState(1600);
  const [imgSize,setImgSize]=useState({w:0,h:0});
  const [displayRect,setDisplayRect]=useState({left:0,top:0,width:0,height:0});
  const [crop,setCrop]=useState({x:12,y:14,w:70,h:56});
  const [drag,setDrag]=useState(null);
  const [isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(max-width: 860px)').matches);
  const stageRef=useRef(null);

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function syncRect(nextSize=imgSize){
    const stage=stageRef.current;
    if(!stage||!nextSize.w||!nextSize.h)return;
    const boxW=stage.clientWidth,boxH=stage.clientHeight;
    if(!boxW||!boxH)return;
    const imgRatio=nextSize.w/nextSize.h,boxRatio=boxW/boxH;
    let width=boxW,height=boxH,left=0,top=0;
    if(imgRatio>boxRatio){height=boxW/imgRatio;top=(boxH-height)/2}else{width=boxH*imgRatio;left=(boxW-width)/2}
    setDisplayRect({left,top,width,height});
  }
  useEffect(()=>{const onResize=()=>syncRect();window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize)},[imgSize]);
  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const mq=window.matchMedia('(max-width: 860px)');
    const update=()=>setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change',update);
    return()=>mq.removeEventListener?.('change',update);
  },[]);
  function onImageLoad(e){const next={w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight};setImgSize(next);requestAnimationFrame(()=>syncRect(next))}
  function pointToPercent(e){
    const box=stageRef.current?.getBoundingClientRect();
    if(!box||!displayRect.width||!displayRect.height)return{x:0,y:0};
    return {x:clamp(((e.clientX-(box.left+displayRect.left))/displayRect.width)*100,0,100),y:clamp(((e.clientY-(box.top+displayRect.top))/displayRect.height)*100,0,100)};
  }
  function startDrag(e,type){if(basicMode!=='crop')return;e.preventDefault();e.stopPropagation();setDrag({type,start:pointToPercent(e),origin:{...crop}})}
  function moveDrag(e){
    if(!drag)return;
    const p=pointToPercent(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y,base=drag.origin;
    if(drag.type==='move')setCrop({...base,x:clamp(base.x+dx,0,100-base.w),y:clamp(base.y+dy,0,100-base.h)});
    else setCrop({...base,w:clamp(base.w+dx,8,100-base.x),h:clamp(base.h+dy,8,100-base.y)});
  }
  function updateCropByPixel(field,value){
    const n=Math.max(20,Number(value)||20);
    if(!imgSize.w||!imgSize.h)return;
    if(field==='w')setCrop(c=>({...c,w:clamp((n/imgSize.w)*100,8,100-c.x)}));
    if(field==='h')setCrop(c=>({...c,h:clamp((n/imgSize.h)*100,8,100-c.y)}));
  }
  function applyRatio(ratio){
    if(!imgSize.w||!imgSize.h||ratio==='free')return;
    const [rw,rh]=ratio.split(':').map(Number);
    if(!rw||!rh)return;
    const target=rw/rh;
    setCrop(c=>{
      let pixelW=Math.round((c.w/100)*imgSize.w),pixelH=Math.round(pixelW/target);
      const maxW=Math.round(((100-c.x)/100)*imgSize.w),maxH=Math.round(((100-c.y)/100)*imgSize.h);
      if(pixelH>maxH){pixelH=maxH;pixelW=Math.round(pixelH*target)}
      if(pixelW>maxW){pixelW=maxW;pixelH=Math.round(pixelW/target)}
      return {...c,w:clamp((pixelW/imgSize.w)*100,8,100-c.x),h:clamp((pixelH/imgSize.h)*100,8,100-c.y)};
    });
  }
  const cropX=imgSize.w?Math.round((crop.x/100)*imgSize.w):0;
  const cropY=imgSize.h?Math.round((crop.y/100)*imgSize.h):0;
  const cropW=imgSize.w?Math.round((crop.w/100)*imgSize.w):0;
  const cropH=imgSize.h?Math.round((crop.h/100)*imgSize.h):0;
  function makePayload(operation){
    if(operation==='crop')return{operation:'crop',cropX,cropY,cropWidth:cropW,cropHeight:cropH,format,quality};
    if(operation==='compress')return{operation:'compress',format,quality,maxWidth};
    if(operation==='convert')return{operation:'convert',format,quality};
    return{operation};
  }
  async function submitProcess(){
    const queue=[];
    if(!isMobile&&basicMode==='crop')queue.push('crop');
    if(advancedMode!=='none')queue.push(advancedMode);
    if(!queue.length)return setMsg&&setMsg('请至少选择一个处理方式');
    try{
      setProcessing(true);
      let currentId=detail.id,finalData=null;
      for(const op of queue){finalData=await req(`/api/images/${currentId}/process`,{method:'POST',body:JSON.stringify(makePayload(op))});currentId=finalData.id||currentId}
      if(finalData){setResult(finalData);window.dispatchEvent(new CustomEvent('image-processed',{detail:finalData}));setMsg&&setMsg('图片处理成功，已自动写入生成记录')}
    }catch(e){setMsg&&setMsg(e.message||'图片处理失败')}
    finally{setProcessing(false)}
  }
  const previewUrl=imageViewUrl(result||detail);
  const hasResult=!!result;
  const canSubmit=!processing&&((!isMobile&&basicMode==='crop')||advancedMode!=='none');
  async function copySourceName(){
    try{
      await copyText(detail.originalName||String(detail.id||''));
      setMsg&&setMsg('文件名已复制');
    }catch{
      setMsg&&setMsg('复制失败');
    }
  }
  if(isMobile){
    return <ExternalMobileProcessModal
      detail={detail}
      previewUrl={previewUrl}
      hasResult={hasResult}
      result={result}
      imgSize={imgSize}
      cropX={cropX}
      cropY={cropY}
      cropW={cropW}
      cropH={cropH}
      advancedMode={advancedMode}
      format={format}
      quality={quality}
      maxWidth={maxWidth}
      processing={processing}
      canSubmit={canSubmit}
      setAdvancedMode={setAdvancedMode}
      setFormat={setFormat}
      setQuality={setQuality}
      setMaxWidth={setMaxWidth}
      onImageLoad={onImageLoad}
      onClose={onClose}
      onSubmit={submitProcess}
      onCopySourceName={copySourceName}
      setMsg={setMsg}
    />;
  }
  return <div className="cropShotMask">
    <div className="cropShotPanel">
      <header className="cropShotHeader"><div><h2>图片处理</h2><p>当前来源：{detail.originalName||detail.id}</p></div><button type="button" onClick={onClose}>× 关闭</button></header>
      <main className="cropShotBody">
        <section className="cropShotCanvasBox"><div className="cropShotCanvas"><div className="cropShotBadge">{hasResult?`${result.width||'-'} × ${result.height||'-'}`:(imgSize.w&&imgSize.h?`${imgSize.w} × ${imgSize.h}`:'加载中...')}{hasResult&&result.format?` / ${String(result.format).toUpperCase()}`:''}</div><div ref={stageRef} className="cropShotStage" onMouseMove={moveDrag} onMouseUp={()=>setDrag(null)} onMouseLeave={()=>setDrag(null)}>{previewUrl?<img src={previewUrl} onLoad={onImageLoad} loading="lazy" decoding="async"/>:<div className="cropShotEmpty">暂无图片</div>}{!hasResult&&basicMode==='crop'&&displayRect.width>0&&<div className="cropShotLayer" style={{left:displayRect.left,top:displayRect.top,width:displayRect.width,height:displayRect.height}}><div className="cropShotSelection" style={{left:`${crop.x}%`,top:`${crop.y}%`,width:`${crop.w}%`,height:`${crop.h}%`}} onMouseDown={e=>startDrag(e,'move')}><span>{cropW} × {cropH}</span><i onMouseDown={e=>startDrag(e,'resize')}></i></div></div>}</div></div></section>
        <div className="cropShotSide">
          <div className="cropShotCard"><h3>基础处理</h3>{[['none','不处理','保持原图不做基础处理'],['crop','裁剪','拖动裁剪框调整截取区域']].map(([k,b,s])=><button key={k} type="button" className={basicMode===k?'cropShotOption active':'cropShotOption'} onClick={()=>setBasicMode(k)}><div><b>{b}</b><small>{s}</small></div><span>{basicMode===k?'●':'○'}</span></button>)}{basicMode==='crop'&&<><div className="cropShotFields"><label><span>裁剪宽度(px)</span><input type="number" value={cropW||''} onChange={e=>updateCropByPixel('w',e.target.value)}/></label><label><span>裁剪高度(px)</span><input type="number" value={cropH||''} onChange={e=>updateCropByPixel('h',e.target.value)}/></label></div><div className="cropShotFields"><label><span>X 坐标</span><input type="number" value={cropX} readOnly /></label><label><span>Y 坐标</span><input type="number" value={cropY} readOnly /></label></div><div className="cropShotRatio"><span>快捷比例</span><div>{['free','1:1','4:3','3:4','16:9'].map(x=><button key={x} type="button" onClick={()=>applyRatio(x)}>{x==='free'?'自由':x}</button>)}</div></div></>}</div>
          <div className="cropShotCard"><h3>高级处理</h3>{[['none','不处理','不开启高级处理'],['remove_bg','智能抠图（透明背景）','适合白底/浅色背景'],['compress','图片压缩','重新编码并缩小尺寸'],['convert','格式转换','输出 PNG / JPG / WebP']].map(([k,b,s])=><button key={k} type="button" className={advancedMode===k?'cropShotOption active':'cropShotOption'} onClick={()=>setAdvancedMode(k)}><div><b>{b}</b><small>{s}</small></div><span>{advancedMode===k?'●':'○'}</span></button>)}{(basicMode==='crop'||advancedMode==='compress'||advancedMode==='convert')&&<label className="cropShotSingle"><span>输出格式</span><select value={format} onChange={e=>setFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></label>}{(advancedMode==='compress'||advancedMode==='convert'||format!=='png')&&<label className="cropShotSingle"><span>输出质量：{quality}%</span><input type="range" min="30" max="100" value={quality} onChange={e=>setQuality(e.target.value)}/></label>}{advancedMode==='compress'&&<label className="cropShotSingle"><span>最大宽度：{maxWidth}px</span><input type="range" min="800" max="2400" step="100" value={maxWidth} onChange={e=>setMaxWidth(Number(e.target.value))}/></label>}<div className="cropShotTip"><p>处理后会生成新图，并自动写入生成记录。</p></div></div>
          {hasResult&&<div className="cropShotCard cropShotResult"><h3>处理结果</h3><p>输出尺寸：{result.width} × {result.height}</p><button className="primary" onClick={()=>openImageDownload(result,setMsg)}>下载处理后的图片</button></div>}
        </div>
      </main>
      <footer className="cropShotFooter"><p>{processing?'正在处理，请稍候...':(hasResult?'处理完成，结果已写入记录。':'选择处理方式后，点击“开始处理”。')}</p><div><button type="button" className="cropShotGhost" onClick={onClose}>关闭</button><button type="button" className="cropShotPrimary" disabled={processing} onClick={submitProcess}>{processing?'处理中...':'开始处理'}</button></div></footer>
    </div>
  </div>
}

export{TaskDetailModal,ImageProcessModal};
