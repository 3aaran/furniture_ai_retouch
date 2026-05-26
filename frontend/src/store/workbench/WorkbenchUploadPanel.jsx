import React, { useState } from 'react';
import { ChevronDown, Droplet } from 'lucide-react';

export function WorkbenchUploadPanel({
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
  onOpenWatermark,
  canConfigureWatermark=false,
  clearSourceImage,
  clearReferenceImage,
  setMsg
}) {
  const [referenceOpen, setReferenceOpen] = useState(false);

  return <>
    <div className="wbMainBlock">
      <div className="wbSourceHead">
        <div className="wbBlockTitle">产品原图</div>
        {canConfigureWatermark&&<button className="wbWatermarkBtn" type="button" onClick={onOpenWatermark}>
          <Droplet size={17}/>水印配置
        </button>}
      </div>
      <label className={draggingSource ? 'wbUploadBox isDragging' : 'wbUploadBox'} onDragOver={e => dragOver(e, 'source')} onDragLeave={e => dragLeave(e, 'source')} onDrop={e => dropUpload(e, 'source')}>
        <input key={origin?.id || 'empty-source'} type="file" accept="image/*" onChange={chooseSource}/>
        {origin ? <div className="wbPreviewWrap">
          <img
            key={origin.id}
            className="wbPreview"
            src={origin.imageUrl || imgSrc(origin.url)}
            alt="产品原图"
            onError={e => setMsg('图片已上传，但前端加载图片失败：' + e.currentTarget.src)}
          />
          <button className="wbClearImageBtn" type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); clearSourceImage?.(); }}>清除</button>
        </div> : <div className="wbUploadInner">
          <div className="wbUploadCircle">+</div>
          <b>点击上传家具图片</b>
          <em>或</em>
          <button type="button" onClick={e => { e.preventDefault(); openResourceModal('source'); }}>从资源库选择</button>
        </div>}
      </label>
    </div>

    <div className={referenceOpen ? 'wbRefCard isOpen' : 'wbRefCard'}>
      <div className="wbRefHeader">
        <div>
          <b>参考图（可选）</b>
        </div>
        <div className="wbRefHeaderActions">
          <strong>{reference ? '已添加' : '未添加'}</strong>
          <button
            className="wbRefToggle"
            type="button"
            title={referenceOpen ? '收起参考图' : '展开参考图'}
            aria-label={referenceOpen ? '收起参考图' : '展开参考图'}
            aria-expanded={referenceOpen}
            onClick={() => setReferenceOpen(v => !v)}
          >
            <ChevronDown size={18}/>
          </button>
        </div>
      </div>
      {referenceOpen && <div className="wbRefBody">
        <label className={draggingRef ? 'wbRefUpload isDragging' : 'wbRefUpload'} onDragOver={e => dragOver(e, 'reference')} onDragLeave={e => dragLeave(e, 'reference')} onDrop={e => dropUpload(e, 'reference')}>
          <input key={reference?.id || 'empty-reference'} type="file" accept="image/*" onChange={chooseReference}/>
          {reference ? <div className="wbRefPreviewWrap">
            <img
              key={reference.id}
              src={reference.imageUrl || imgSrc(reference.url)}
              alt="参考图"
              onError={e => setMsg('参考图已上传，但前端加载失败：' + e.currentTarget.src)}
            />
            <button className="wbClearImageBtn small" type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); clearReferenceImage?.(); }}>清除</button>
          </div> : <>
            <span>+</span>
            <em>上传参考图</em>
          </>}
        </label>
        <button className="wbGhostBtn" type="button" onClick={() => openResourceModal('reference')}>从资源库选择</button>
        {selectedTpl && <div className="wbSelectedTip">已选择资源模板：{selectedTpl.name}</div>}
      </div>}
    </div>
  </>;
}

export default WorkbenchUploadPanel;
