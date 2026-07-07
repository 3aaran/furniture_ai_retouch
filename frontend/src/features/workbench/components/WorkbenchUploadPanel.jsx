import React,{useState}from'react';
import{ChevronDown,ChevronUp}from'../../../shared/icons/index.jsx';
import{MAX_REFERENCE_IMAGES}from'../model/workbenchReferences.js';

export function WorkbenchUploadPanel({
  origin,
  references=[],
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
  removeReferenceImage,
  setMsg,
  generatedImageUrl=''
}){
  const [referenceOpen,setReferenceOpen]=useState(false);

  return <>
    <div className="wbMainBlock">
      <div className="wbSourceHead">
        <div className="wbBlockTitle">产品原图</div>
      </div>
      <label className={draggingSource?'wbUploadBox isDragging':'wbUploadBox'} onDragOver={event=>dragOver(event,'source')} onDragLeave={event=>dragLeave(event,'source')} onDrop={event=>dropUpload(event,'source')}>
        <input key={origin?.id||'empty-source'} type="file" accept="image/*" onChange={chooseSource}/>
        {origin?<div className="wbPreviewWrap">
          <img
            key={origin.id}
            className="wbPreview"
            src={origin.imageUrl||imgSrc(origin.url)}
            loading="lazy"
            decoding="async"
            alt="产品原图"
            onError={event=>setMsg('图片已上传，但前端加载图片失败：'+event.currentTarget.src)}
          />
          <button className="wbClearImageBtn" type="button" onClick={event=>{event.preventDefault();event.stopPropagation();clearSourceImage?.();}}>清除</button>
          {origin.uploadStatus&&<span className={`wbUploadStatus ${origin.uploadStatus}`}>
            {origin.uploadStatus==='uploading'?'上传中':origin.uploadStatus==='failed'?'上传失败':'上传成功'}
          </span>}
        </div>:<div className="wbUploadInner">
          <div className="wbUploadCircle">+</div>
          <b>点击上传家具图片</b>
          <em>或</em>
          <button type="button" onClick={event=>{event.preventDefault();event.stopPropagation();openResourceModal('source');}}>从资源库选择</button>
        </div>}
      </label>
    </div>

    <div className={referenceOpen?'wbRefCard isOpen':'wbRefCard'}>
      <div className="wbRefHeader">
        <div>
          <b>参考图（可选）</b>
        </div>
        <div className="wbRefHeaderActions">
          <strong>{references.length?`已添加 ${references.length}/${MAX_REFERENCE_IMAGES}`:'未添加'}</strong>
          <button
            className="wbRefToggle"
            type="button"
            title={referenceOpen?'收起参考图':'展开参考图'}
            aria-label={referenceOpen?'收起参考图':'展开参考图'}
            aria-expanded={referenceOpen}
            onClick={()=>setReferenceOpen(value=>!value)}
          >
            {referenceOpen?<ChevronUp size={17}/>:<ChevronDown size={17}/>} 
          </button>
        </div>
      </div>
      {referenceOpen&&<div className="wbRefBody">
        <label className={draggingRef?'wbRefUpload isDragging':'wbRefUpload'} onDragOver={event=>dragOver(event,'reference')} onDragLeave={event=>dragLeave(event,'reference')} onDrop={event=>dropUpload(event,'reference')}>
          <input type="file" accept="image/*" multiple onChange={chooseReference}/>
          <span>+</span>
          <em>{references.length?'继续添加':'上传参考图'}</em>
        </label>
        {references.map((reference,index)=><div className="wbRefPreviewWrap" key={reference.id||index}>
          <img
            src={reference.imageUrl||imgSrc(reference.url)}
            loading="lazy"
            decoding="async"
            alt={`参考图 ${index+1}`}
            onError={event=>setMsg('参考图已上传，但前端加载失败：'+event.currentTarget.src)}
          />
          <button className="wbClearImageBtn small" type="button" onClick={()=>removeReferenceImage?.(reference.id)}>移除</button>
          {reference.uploadStatus&&<span className={`wbUploadStatus ${reference.uploadStatus}`}>
            {reference.uploadStatus==='uploading'?'上传中':reference.uploadStatus==='failed'?'上传失败':'上传成功'}
          </span>}
        </div>)}
        <button className="wbGhostBtn" type="button" onClick={event=>{event.stopPropagation();openResourceModal('reference');}}>从资源库选择</button>
        {selectedTpl&&<div className="wbSelectedTip">已选择资源模板：{selectedTpl.name}</div>}
      </div>}
    </div>
  </>;
}

export default WorkbenchUploadPanel;
