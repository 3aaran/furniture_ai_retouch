import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Droplet } from 'lucide-react';

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
  setMsg,
  watermarkOverlay=null,
  generatedImageUrl=''
}) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [comparePercent, setComparePercent] = useState(50);
  const compareRef = useRef(null);

  function updateCompareFromEvent(event){
    const rect=compareRef.current?.getBoundingClientRect?.();
    if(!rect?.width)return;
    const clientX=event.clientX ?? event.touches?.[0]?.clientX ?? rect.left+rect.width/2;
    const next=Math.max(0,Math.min(100,((clientX-rect.left)/rect.width)*100));
    setComparePercent(next);
  }

  function startCompareDrag(event){
    event.preventDefault();
    event.stopPropagation();
    updateCompareFromEvent(event);
    const move=e=>updateCompareFromEvent(e);
    const up=()=>{
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up,{once:true});
  }

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
        {origin ? <div className={generatedImageUrl?'wbPreviewWrap hasCompare':'wbPreviewWrap'} ref={compareRef} style={generatedImageUrl?{'--compare-left':`${comparePercent}%`}:undefined}>
          {generatedImageUrl ? <>
            <img
              key={`${origin.id}-source`}
              className="wbPreview wbCompareImage wbCompareSourceImage"
              src={origin.imageUrl || imgSrc(origin.url)}
              loading="lazy"
              decoding="async"
              alt="产品原图"
              onError={e => setMsg('图片已上传，但前端加载图片失败：' + e.currentTarget.src)}
            />
            <div className="wbCompareGeneratedLayer" style={{clipPath:`inset(0 0 0 ${comparePercent}%)`}}>
              <img
                className="wbPreview wbCompareImage wbCompareResultImage"
                src={generatedImageUrl}
                loading="lazy"
                decoding="async"
                alt="生成图"
                onError={() => setMsg('生成图加载失败，请到历史任务查看')}
              />
            </div>
            <button className="wbCompareHandle" type="button" style={{left:`${comparePercent}%`}} onPointerDown={startCompareDrag} onClick={e=>{e.preventDefault();e.stopPropagation();}} aria-label="拖动查看原图和生成图对比"><span>‹ ›</span></button>
          </> : <img
            key={origin.id}
            className="wbPreview"
            src={origin.imageUrl || imgSrc(origin.url)}
            loading="lazy"
            decoding="async"
            alt="产品原图"
            onError={e => setMsg('图片已上传，但前端加载图片失败：' + e.currentTarget.src)}
          />}
          {watermarkOverlay}
          <button className="wbClearImageBtn" type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); clearSourceImage?.(); }}>清除</button>
          {origin.uploadStatus && <span className={`wbUploadStatus ${origin.uploadStatus}`}>
            {origin.uploadStatus === 'uploading' ? '上传中' : origin.uploadStatus === 'failed' ? '上传失败' : '上传成功'}
          </span>}
        </div> : <div className="wbUploadInner">
          <div className="wbUploadCircle">+</div>
          <b>点击上传家具图片</b>
          <em>或</em>
          <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); openResourceModal('source'); }}>从资源库选择</button>
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
            {referenceOpen ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}
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
              loading="lazy"
              decoding="async"
              alt="参考图"
              onError={e => setMsg('参考图已上传，但前端加载失败：' + e.currentTarget.src)}
            />
            <button className="wbClearImageBtn small" type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); clearReferenceImage?.(); }}>清除</button>
            {reference.uploadStatus && <span className={`wbUploadStatus ${reference.uploadStatus}`}>
              {reference.uploadStatus === 'uploading' ? '上传中' : reference.uploadStatus === 'failed' ? '上传失败' : '上传成功'}
            </span>}
          </div> : <>
            <span>+</span>
            <em>上传参考图</em>
          </>}
        </label>
        <button className="wbGhostBtn" type="button" onClick={e => { e.stopPropagation(); openResourceModal('reference'); }}>从资源库选择</button>
        {selectedTpl && <div className="wbSelectedTip">已选择资源模板：{selectedTpl.name}</div>}
      </div>}
    </div>
  </>;
}

export default WorkbenchUploadPanel;
