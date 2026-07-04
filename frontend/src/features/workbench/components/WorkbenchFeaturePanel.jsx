import React from 'react';
import {X} from '../../../shared/icons/index.jsx';

function WorkbenchFeaturePanel({
  currentFeatureMode,
  currentFeatureLabel,
  setLeftDrawerOpen,
  featureGroup,
  mediaMode,
  openFeaturePopover,
  children
}){
  return <>
    <div className="wbMobileDrawerHead">
      <div><span>{currentFeatureMode}</span><b>{currentFeatureLabel}</b></div>
      <button type="button" className="wbDrawerClose" onClick={()=>setLeftDrawerOpen(false)} aria-label="关闭功能侧栏"><X size={18}/></button>
    </div>
    <div className="wbSectionTabs wbMainFeatureBranches" aria-label="功能主分支">
      <button type="button" className={featureGroup==='base'&&mediaMode==='image'?'active':''} onClick={event=>openFeaturePopover('base',event)}>基础</button>
      <button type="button" className={featureGroup==='promotion'&&mediaMode==='image'?'active':''} onClick={event=>openFeaturePopover('promotion',event)}>宣传图</button>
      <button type="button" className={mediaMode==='video'?'active':''} onClick={event=>openFeaturePopover('video',event)}>宣传短视频</button>
    </div>
    <div className="wbDivider"/>
    {children}
  </>;
}

export default WorkbenchFeaturePanel;
