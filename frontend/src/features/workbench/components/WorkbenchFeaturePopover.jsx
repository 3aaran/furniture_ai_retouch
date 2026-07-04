import React from 'react';
import {createPortal} from 'react-dom';
import {Clapperboard,ImageIcon,X} from '../../../shared/icons/index.jsx';

function WorkbenchFeaturePopover({
  featurePopover,
  closeFeaturePopover,
  featureList,
  promotionFeatures,
  promotionFeatureIconMap,
  ops,
  op,
  mediaMode,
  selectPromotionFeature,
  selectBaseFeature,
  activateFeatureGroup
}){
  if(!featurePopover.open)return null;
  const group=featurePopover.group;
  const title=group==='base'?'选择基础功能':group==='promotion'?'选择宣传图功能':'选择视频功能';
  const items=group==='promotion'
    ? promotionFeatures.map(item=>[item.key,item.name,promotionFeatureIconMap[item.key]||ImageIcon,item.desc])
    : group==='video'
      ? [['video_generate','宣传视频生成',Clapperboard,'上传分镜图与描述，生成家具宣传短视频']]
      : featureList.map(([key,label,Icon])=>[key,label,Icon,ops[key]?.desc||'']);

  return createPortal(<>
    <button type="button" className="wbFeaturePopoverBackdrop" aria-label="关闭功能细节弹窗" onClick={closeFeaturePopover}/>
    <div className="wbFeaturePopover" style={{left:featurePopover.x,top:featurePopover.y}} role="menu" aria-label={title} onClick={e=>e.stopPropagation()}>
      <div className="wbFeaturePopoverHead"><b>{title}</b><button type="button" onClick={closeFeaturePopover} aria-label="关闭"><X size={16}/></button></div>
      <div className="wbFeaturePopoverList">
        {items.map(([key,label,Icon,desc])=>{
          const active=group==='promotion'?op===key:group==='video'?mediaMode==='video':op===key;
          const choose=()=>group==='promotion'?selectPromotionFeature(key):group==='video'?activateFeatureGroup('video'):selectBaseFeature(key);
          return <button key={key} type="button" className={active?'active':''} onClick={choose} role="menuitem">
            <span><Icon size={18}/></span>
            <strong>{label}</strong>
            {desc&&<small>{desc}</small>}
          </button>;
        })}
      </div>
    </div>
  </>,document.body);
}

export default WorkbenchFeaturePopover;
