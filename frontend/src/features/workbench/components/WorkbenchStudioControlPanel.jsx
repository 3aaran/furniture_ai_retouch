import React from 'react';
import {ImageIcon,WandSparkles} from '../../../shared/icons/index.jsx';
import {BASE_RATIO_OPTIONS,BASE_RESOLUTION_OPTIONS} from '../model/workbenchOptions.js';
import {MAX_REFERENCE_IMAGES} from '../model/workbenchReferences.js';

function StudioReferenceUpload({references=[],draggingRef,dragOver,dragLeave,dropUpload,chooseReference,imgSrc,setMsg,removeReferenceImage,openResourceModal}){
  return <div className="wbStudioReferenceCard">
    <div className="wbStudioPanelTitle">上传参考图（{references.length}/{MAX_REFERENCE_IMAGES}）</div>
    <label className={draggingRef?'wbStudioReferenceUpload isDragging':'wbStudioReferenceUpload'} onDragOver={e=>dragOver(e,'reference')} onDragLeave={e=>dragLeave(e,'reference')} onDrop={e=>dropUpload(e,'reference')}>
      <input type="file" accept="image/*" multiple onChange={chooseReference}/>
      <div className="wbStudioReferenceEmpty">
        <ImageIcon size={24}/>
        <b>{references.length?'继续添加参考图':'点击或拖拽上传参考图'}</b>
      </div>
    </label>
    {references.length>0&&<div className="wbStudioReferenceList">
      {references.map((reference,index)=><div className="wbStudioRefPreview" key={reference.id||index}>
        <img src={reference.imageUrl||imgSrc(reference.url)} alt={`参考图 ${index+1}`} loading="lazy" decoding="async" onError={()=>setMsg('参考图已上传，但前端加载失败')}/>
        <button type="button" onClick={()=>removeReferenceImage?.(reference.id)}>移除</button>
      </div>)}
    </div>}
    <button className="wbStudioResourcePick" type="button" onClick={()=>openResourceModal('reference')}>从资源库选择参考图</button>
  </div>;
}

function WorkbenchStudioControlPanel({
  currentFeatureLabel,
  isPromotionSelected,
  custom,
  setCustom,
  references,
  draggingRef,
  dragOver,
  dragLeave,
  dropUpload,
  chooseReference,
  imgSrc,
  setMsg,
  removeReferenceImage,
  openResourceModal,
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
      references={references}
      draggingRef={draggingRef}
      dragOver={dragOver}
      dragLeave={dragLeave}
      dropUpload={dropUpload}
      chooseReference={chooseReference}
      imgSrc={imgSrc}
      setMsg={setMsg}
      removeReferenceImage={removeReferenceImage}
      openResourceModal={openResourceModal}
    />
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
