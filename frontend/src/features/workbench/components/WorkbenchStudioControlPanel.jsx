import React from 'react';
import {ImageIcon,WandSparkles} from '../../../shared/icons/index.jsx';
import {BASE_RATIO_OPTIONS,BASE_RESOLUTION_OPTIONS} from '../model/workbenchOptions.js';

function StudioReferenceUpload({reference,draggingRef,dragOver,dragLeave,dropUpload,chooseReference,imgSrc,setMsg,clearReferenceImage,openResourceModal}){
  return <div className="wbStudioReferenceCard">
    <div className="wbStudioPanelTitle">上传参考图</div>
    <label className={draggingRef?'wbStudioReferenceUpload isDragging':'wbStudioReferenceUpload'} onDragOver={e=>dragOver(e,'reference')} onDragLeave={e=>dragLeave(e,'reference')} onDrop={e=>dropUpload(e,'reference')}>
      <input key={reference?.id||'studio-empty-reference'} type="file" accept="image/*" onChange={chooseReference}/>
      {reference?<div className="wbStudioRefPreview">
        <img src={reference.imageUrl||imgSrc(reference.url)} alt="参考图" loading="lazy" decoding="async" onError={()=>setMsg('参考图已上传，但前端加载失败')}/>
        <button type="button" onClick={e=>{e.preventDefault();e.stopPropagation();clearReferenceImage?.();}}>清除</button>
      </div>:<div className="wbStudioReferenceEmpty">
        <ImageIcon size={24}/>
        <b>点击或拖拽上传参考图</b>
      </div>}
    </label>
    <button className="wbStudioResourcePick" type="button" onClick={()=>openResourceModal('reference')}>从资源库选择参考图</button>
  </div>;
}

function StudioLightControls({studioLight,setStudioLight}){
  return <div className="wbStudioLightCard">
    <div className="wbStudioPanelTitle">环境光效</div>
    <label>
      <span>强度</span><b>{studioLight.strength}%</b>
      <input type="range" min="0" max="100" value={studioLight.strength} onChange={e=>setStudioLight(value=>({...value,strength:Number(e.target.value)}))}/>
    </label>
    <label>
      <span>色温</span><b>{studioLight.colorTemp}K</b>
      <input type="range" min="2500" max="7500" step="100" value={studioLight.colorTemp} onChange={e=>setStudioLight(value=>({...value,colorTemp:Number(e.target.value)}))}/>
    </label>
  </div>;
}

function WorkbenchStudioControlPanel({
  currentFeatureLabel,
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
  setMsg,
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
  me
}){
  return <>
    <div className="wbStudioPanelHead">
      <b>AI 指令</b>
      <span>{currentFeatureLabel}</span>
    </div>
    <textarea
      className="wbPromptInput wbStudioPromptInput"
      placeholder={isPromotionSelected?'描述您想要生成的场景细节、卖点文案或画面氛围...':'描述您想要生成的场景细节...'}
      value={custom}
      onChange={e=>setCustom(e.target.value)}
    />
    <StudioReferenceUpload
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
    />
    <StudioLightControls studioLight={studioLight} setStudioLight={setStudioLight}/>
    <div className="wbStudioOutputControls">
      <div className="wbControlGroup">
        <span>分辨率</span>
        <div className="wbPills">
          {BASE_RESOLUTION_OPTIONS.map(item=><button key={item} type="button" className={resolution===item?'active':''} onClick={()=>setResolution(item)}>{item}</button>)}
        </div>
      </div>
      <div className="wbControlGroup ratio">
        <span>比例</span>
        <select className="wbSelect dark" value={ratio} onChange={e=>setRatio(e.target.value)}>
          {BASE_RATIO_OPTIONS.map(item=><option key={item}>{item}</option>)}
        </select>
      </div>
    </div>
    <button className="wbGenerateBtn wbStudioGenerateBtn" type="button" onClick={gen}>
      <WandSparkles size={22}/>{isPromotionSelected?'生成宣传图':'生成效果'}
    </button>
    <div className="wbGenerateMeta wbStudioGenerateMeta">消耗 {calcWorkbenchCost()} 点算力 <b>剩余：{me.quota}</b></div>
  </>;
}

export default WorkbenchStudioControlPanel;
