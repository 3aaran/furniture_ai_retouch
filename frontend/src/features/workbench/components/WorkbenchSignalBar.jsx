import React,{useState} from 'react';
import {RevealText} from '../../../shared/effects/index.jsx';

function WorkbenchSignalBar({title,actions=[],recentCount=0,onOpenRecent}){
  const [openAction,setOpenAction]=useState(-1);

  function activateAction(action,index,event){
    if(action.options?.length){
      event.preventDefault();
      event.stopPropagation();
      setOpenAction(current=>current===index?-1:index);
      return;
    }
    setOpenAction(-1);
    action.onClick?.(event);
  }

  function selectOption(action,value){
    action.onSelect?.(value);
    setOpenAction(-1);
  }

  return <div className="furnitureWorkbenchSignal">
    <div className="furnitureSignalHeader">
      <div className="furnitureSignalMain">
        <span>AI STUDIO</span>
        <RevealText text={title}/>
      </div>
      <button className="wbSignalRecentButton" type="button" onClick={onOpenRecent}>
        <span>最近生成</span><b>{recentCount}</b>
      </button>
    </div>
    <div className="rbDataPulseStrip wbSignalActions" aria-label="当前页面状态">
      {actions.map((action,index)=><div className="wbSignalActionWrap" key={`${action.label}-${index}`}>
        <button
          className="wbSignalAction"
          type="button"
          aria-haspopup={action.options?.length?'menu':undefined}
          aria-expanded={action.options?.length?openAction===index:undefined}
          onClick={event=>activateAction(action,index,event)}
        >{action.label}</button>
        {action.options?.length&&openAction===index?<div className="wbSignalOptionMenu" role="menu" aria-label={`${action.label}选项`}>
          {action.options.map(option=><button key={option} type="button" className={option===action.value?'active':''} onClick={()=>selectOption(action,option)}>{option}</button>)}
        </div>:null}
      </div>)}
    </div>
  </div>;
}

export default WorkbenchSignalBar;
