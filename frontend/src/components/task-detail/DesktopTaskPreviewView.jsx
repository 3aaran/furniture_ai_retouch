import React from'react';
import{ChevronLeft,ChevronRight,Copy,Download,FileText,Flag,Hash,SlidersHorizontal,Trash2,User,WalletCards}from'lucide-react';
import{fmt,imageViewUrl}from'../../appShared.jsx';

function DesktopTaskPreviewView({
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
  sourceUrl,
  sourceImageSrc,
  sourceImageId,
  resultUrl,
  resultPreviewSrc,
  imageId,
  currentIndex,
  total,
  canPrev,
  canNext,
  busy,
  isAdmin,
  onClose,
  onPrev,
  onNext,
  onOpenProcess,
  onSave,
  onDelete,
  onCopyPrompt,
  onContinueImage,
  onPreviewError,
  children
}){
  return <div className="taskPreviewOverlay taskPreviewWindowMode">
    <div className="taskPreviewTop">
      <div><b><span className="taskDesktopTitle">任务对比预览</span><span className="taskMobileTitle">任务预览</span></b><span>{currentIndex>=0?currentIndex+1:1} / {total}</span></div>
      <div className="taskPreviewTopBtns">
        <button disabled={!canPrev} onClick={onPrev}><ChevronLeft size={22}/></button>
        <button disabled={!canNext} onClick={onNext}><ChevronRight size={22}/></button>
        <button onClick={onClose}>×</button>
      </div>
    </div>
    <div className="taskPreviewBody">
      <div className="taskComparePanel">
        <div className="compareCol">
          <div className="compareHead"><h3>产品图片</h3>{!isAdmin&&<button onClick={()=>onContinueImage({id:sourceImageId,url:sourceUrl,originalName:detail.sourceOriginalName})}>以此图继续创作</button>}</div>
          <div className="taskImageFrame">{sourceUrl?<img src={sourceImageSrc} loading="lazy" decoding="async"/>:<span>无原图</span>}</div>
        </div>
        <div className="compareCol">
          <div className="compareHead"><h3>生成结果</h3>{!isAdmin&&<button onClick={()=>onContinueImage({id:imageId,url:resultUrl,originalName:detail.originalName})}>以此图继续创作</button>}</div>
          <div className="taskImageFrame">{resultUrl?<img src={resultPreviewSrc} onError={onPreviewError} loading="lazy" decoding="async"/>:<span>无生成图</span>}</div>
        </div>
      </div>
      <div className="taskMobileActionBar" aria-label="任务操作">
        <button type="button" onClick={onOpenProcess}><SlidersHorizontal size={20}/><span>参数</span></button>
        <button type="button" className="primary" onClick={onSave}><Download size={20}/><span>保存</span></button>
        {!isAdmin&&<button type="button" className="danger" onClick={onDelete} disabled={!!busy}><Trash2 size={20}/><span>删除</span></button>}
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

          <div className="promptBox"><div><span>用户要求</span><button className="iconOnly" title="复制用户要求" aria-label="复制用户要求" onClick={onCopyPrompt} disabled={!displayPrompt}><Copy size={14}/></button></div><p>{displayPrompt||'无'}</p></div>
        </div>
        <div className="taskDetailActions">
          <button className="outlineGold iconOnly" title="图片处理" aria-label="图片处理" onClick={onOpenProcess}><SlidersHorizontal size={18}/></button>
          <button className="primary iconOnly" title="下载原图" aria-label="下载原图" onClick={onSave}><Download size={18}/></button>
          {!isAdmin&&<button className="danger iconOnly" title={busy==='delete'?'删除中':'删除图片'} aria-label="删除图片" onClick={onDelete} disabled={!!busy}><Trash2 size={18}/></button>}
        </div>
      </div>
    </div>
    {children}
  </div>;
}

export default DesktopTaskPreviewView;
