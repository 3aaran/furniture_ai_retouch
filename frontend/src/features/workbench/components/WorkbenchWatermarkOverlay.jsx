import React from 'react';
import {wbTextWatermarkConfig,wbWatermarkPlacement} from '../model/workbenchWatermark.js';

function WorkbenchWatermarkOverlay({config}){
  const textConfig=wbTextWatermarkConfig(config||{});
  if(!textConfig.text)return null;
  if(textConfig.style==='tile'){
    const items=Array.from({length:40});
    return <div className="taskWatermarkTile wbCanvasWatermark" style={{color:textConfig.color||'#f0d68a',opacity:Number(textConfig.opacity||100)/100,fontSize:`${Math.max(14,Number(textConfig.fontSize||46)*0.34)}px`,transform:`rotate(${Number(textConfig.rotate||0)}deg)`,gap:`${Math.max(12,Number(textConfig.gap||220)*0.12)}px`}}>
      {items.map((_,i)=><span key={i}>{textConfig.text}{textConfig.subText?<small style={{color:textConfig.accent||'#fff'}}>{textConfig.subText}</small>:null}</span>)}
    </div>;
  }
  const baseStyle={...wbWatermarkPlacement(textConfig),opacity:Number(textConfig.opacity||100)/100};
  return <div className={`taskWatermarkText wbCanvasWatermark ${textConfig.style||'signature'}`} style={{...baseStyle,color:textConfig.color||'#f0d68a',fontSize:`${Math.max(16,Number(textConfig.fontSize||46)*0.5)}px`,transform:`${baseStyle.transform||''} rotate(${Number(textConfig.rotate||0)}deg)`}}>
    <b>{textConfig.text}</b>
    {textConfig.subText&&<small style={{color:textConfig.accent||'#fff'}}>{textConfig.subText}</small>}
  </div>;
}

export default WorkbenchWatermarkOverlay;
