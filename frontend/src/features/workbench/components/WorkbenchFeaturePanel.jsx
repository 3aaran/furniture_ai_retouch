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
    <div className="wbFeatureNavBlock">
      <div className="wbMobileDrawerHead">
        <div><span>{currentFeatureMode}</span><b>{currentFeatureLabel}</b></div>
        <button type="button" className="wbDrawerClose" onClick={()=>setLeftDrawerOpen(false)} aria-label="关闭功能选择"><X size={18}/></button>
      </div>
      <div className="wbSectionTabs wbMainFeatureBranches" aria-label="功能主分支">
        <button type="button" className={featureGroup==='base'&&mediaMode==='image'?'active':''} onClick={event=>openFeaturePopover('base',event)}>基础</button>
        <button type="button" className={featureGroup==='promotion'&&mediaMode==='image'?'active':''} onClick={event=>openFeaturePopover('promotion',event)}>宣传图</button>
        <button type="button" disabled title="宣传短视频正在开发中">宣传短视频（开发中）</button>
      </div>
      <div className="wbDivider"/>
    </div>
    {children}
  </>;
}

export default WorkbenchFeaturePanel;
