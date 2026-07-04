import React from 'react';
import{ChevronLeft,ChevronRight,Copy,Download,FileText,Flag,Hash,SlidersHorizontal,Trash2,User,WalletCards}from'lucide-react';
import{fmt,imageViewUrl}from'../../appShared.jsx';
import TaskWatermarkOverlay from'./TaskWatermarkOverlay.jsx';

export default function MobileTaskPreviewView({
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
            {resultUrl?<><img src={resultPreviewSrc} alt={detail.originalName||opLabel||'成品图'} onError={onPreviewError} loading="lazy" decoding="async"/>{watermarkActive&&<TaskWatermarkOverlay config={watermarkConfig}/>}</>:<span>暂无生成图</span>}
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
