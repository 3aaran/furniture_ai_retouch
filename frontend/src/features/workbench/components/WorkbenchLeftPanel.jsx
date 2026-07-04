import React from 'react';
import {Search} from 'lucide-react';
import {fallbackToOriginalImage} from '../../../appShared.jsx';
import {isPromotionFeatureKey,promotionOptionChoices,promotionOptionDefaults} from '../../../store/workbench/promotionFeatures.js';

function WorkbenchLeftPanel({
  mediaMode,
  op,
  ops,
  promotionOptions,
  updatePromotionOption,
  resourceKeyword,
  setResourceKeyword,
  resourceScope,
  setResourceScope,
  resourceItems,
  openWorkbenchResourceUpload,
  selectedResource,
  setSelectedResource,
  listImgSrc,
  resTypeName,
  removeOpts,
  setRemoveOpts,
  enhanceOpts,
  setEnhanceOpts,
  multiView,
  setMultiView
}){
  function promotionSelect(label,key,choices){
    const opts={...(promotionOptionDefaults[op]||{}),...(promotionOptions[op]||{})};
    return <label className="wbPromoField">
      <span>{label}</span>
      <select className="wbSelect" value={opts[key]||''} onChange={e=>updatePromotionOption(key,e.target.value)}>
        {choices.map(item=>{
          const value=typeof item==='string'?item:item.value;
          const text=typeof item==='string'?item:item.label;
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
    </label>;
  }

  if(mediaMode==='video'){
    return <div className="wbVideoConfigSlot" aria-label="宣传视频生成配置预留区"/>;
  }

  if(isPromotionFeatureKey(op)){
    const opts={...(promotionOptionDefaults[op]||{}),...(promotionOptions[op]||{})};
    if(op==='promo_main_image'){
      return <>
        <div className="wbConfigTitle">固定要求</div>
        <div className="wbOptionCard wbPromoFormCard">
          {promotionSelect('背景风格','mainBackground',promotionOptionChoices.mainBackground)}
          {promotionSelect('主图构图','mainComposition',promotionOptionChoices.mainComposition)}
          {promotionSelect('留白要求','mainWhitespace',promotionOptionChoices.mainWhitespace)}
        </div>
      </>;
    }
    if(op==='promo_poster_image'){
      return <>
        <div className="wbConfigTitle">海报要求</div>
        <div className="wbOptionCard wbPromoFormCard">
          {promotionSelect('海报文字','posterTextMode',[
            {value:'auto',label:'自动生成短文案'},
            {value:'custom',label:'使用自定义文案'},
            {value:'none',label:'不生成文字'}
          ])}
          {opts.posterTextMode==='custom'&&<label className="wbPromoField full">
            <span>文案内容</span>
            <textarea className="wbPromoTextarea" value={opts.posterText||''} onChange={e=>updatePromotionOption('posterText',e.target.value)} placeholder={'例如：舒适入座\n自然木质'}/>
          </label>}
          {promotionSelect('文案区域','posterCopyPlacement',promotionOptionChoices.posterCopyPlacement)}
          {promotionSelect('海报氛围','posterTone',promotionOptionChoices.posterTone)}
        </div>
      </>;
    }
    return <>
      <div className="wbConfigTitle">细节要求</div>
      <div className="wbOptionCard wbPromoFormCard">
        {promotionSelect('细节排版','detailLayout',promotionOptionChoices.detailLayout)}
        {promotionSelect('细节重点','detailFocus',promotionOptionChoices.detailFocus)}
        {promotionSelect('文字策略','detailTextMode',promotionOptionChoices.detailTextMode)}
      </div>
    </>;
  }

  if(op==='material'||op==='replace_bg'){
    return <>
      <div className="wbDescRow"><span className="wbMiniIcon">✓</span><p>{ops[op].desc}</p></div>
      <div className="wbSearchRow">
        <div className="wbSearchInput"><Search size={16}/><input placeholder="搜索资源..." value={resourceKeyword} onChange={e=>setResourceKeyword(e.target.value)}/></div>
        <select className="wbSelect" value={resourceScope} onChange={e=>setResourceScope(e.target.value)}>
          <option value="SYSTEM">系统空间</option>
          <option value="MERCHANT">门店空间</option>
          <option value="USER">个人空间</option>
          <option value="ALL">全部空间</option>
        </select>
      </div>
      <div className="wbSectionLabel">{op==='material'?'材质替换':'场景融合资源'}</div>
      <div className="wbResourceGrid">
        <button className="wbUploadCard" onClick={openWorkbenchResourceUpload}>
          <span>+</span>
          <b>上传</b>
        </button>
        {resourceItems.map(resource=><button key={resource.scope+resource.id} className={selectedResource===String(resource.id)?'wbResourceCard active':'wbResourceCard'} onClick={()=>setSelectedResource(String(resource.id))}>
          {resource.imageUrl?<img src={listImgSrc(resource)} alt={resource.name} onError={e=>fallbackToOriginalImage(e,resource)} loading="lazy" decoding="async"/>:<div className="wbResourcePlaceholder">{resTypeName[resource.resourceType]}</div>}
          <b>{resource.name}</b>
          <span>{resource.scope==='SYSTEM'?'系统':'门店'} / {resource.mainCategoryName||resource.objectName||resTypeName[resource.resourceType]}{(resource.subCategoryName||resource.colorName)?` / ${resource.subCategoryName||resource.colorName}`:''}</span>
        </button>)}
        {!resourceItems.length&&<div className="wbLibraryEmpty">暂无资源，点击加号上传</div>}
      </div>
    </>;
  }

  if(op==='remove_bg'){
    return <>
      <div className="wbDescRow"><span className="wbMiniIcon">3D</span><p>{ops[op].desc}</p></div>
      <div className="wbConfigTitle">生成配置</div>
      <div className="wbOptionCard">
        <div className="wbOptionRow"><div><b>白底图</b><span>纯白干净背景</span></div><label className="wbSwitch"><input type="checkbox" checked={removeOpts.whiteBg} onChange={e=>setRemoveOpts({...removeOpts,whiteBg:e.target.checked})}/><i/></label></div>
        <div className="wbOptionRow"><div><b>镜像产品</b><span>生成镜像感的产品图</span></div><label className="wbSwitch"><input type="checkbox" checked={removeOpts.mirror} onChange={e=>setRemoveOpts({...removeOpts,mirror:e.target.checked})}/><i/></label></div>
      </div>
    </>;
  }

  if(op==='enhance'){
    return <>
      <div className="wbDescRow"><span className="wbMiniIcon">●</span><p>{ops[op].desc}</p></div>
      <div className="wbConfigTitle">摄影增强选项</div>
      <div className="wbOptionCard">
        <div className="wbOptionRow"><div><b>产品聚焦</b><span>开启后突出产品并增强背景虚化</span></div><label className="wbSwitch"><input type="checkbox" checked={enhanceOpts.focus} onChange={e=>setEnhanceOpts({...enhanceOpts,focus:e.target.checked})}/><i/></label></div>
        <div className="wbAngleGroup"><b>角度</b><div className="wbPills">{['不变','正面','45度','侧面'].map(item=><button key={item} className={enhanceOpts.angle===item?'active':''} onClick={()=>setEnhanceOpts({...enhanceOpts,angle:item})}>{item}</button>)}</div></div>
      </div>
    </>;
  }

  if(op==='lineart'){
    return <div className="wbDescRow wbOnlyDesc"><span className="wbMiniIcon">≈</span><p>{ops[op].desc}</p></div>;
  }

  return <>
    <div className="wbDescRow"><span className="wbMiniIcon">●</span><p>{ops[op].desc}</p></div>
    <div className="wbConfigTitle">视图选项</div>
    <div className="wbOptionCard wbRadioList">
      <label className="wbRadioRow"><div><b>三角度视图</b><span>正面、45度角、侧面</span></div><input type="radio" name="mv" checked={multiView==='三角度视图'} onChange={()=>setMultiView('三角度视图')}/></label>
      <label className="wbRadioRow"><div><b>四角度视图</b><span>正面、45度角、侧面、背面</span></div><input type="radio" name="mv" checked={multiView==='四角度视图'} onChange={()=>setMultiView('四角度视图')}/></label>
    </div>
  </>;
}

export default WorkbenchLeftPanel;
