import React from 'react';

function watermarkPlacement(config={}){
  const x=Number(config.offsetX||0);
  const y=Number(config.offsetY||0);
  const position=config.position||'center';
  const map={
    'top-left':{left:x,top:y},
    'top-center':{left:`calc(50% + ${x}px)`,top:y,transform:'translateX(-50%)'},
    'top-right':{right:x,top:y},
    'center-left':{left:x,top:'50%',transform:'translateY(-50%)'},
    center:{left:`calc(50% + ${x}px)`,top:'50%',transform:'translate(-50%,-50%)'},
    'center-right':{right:x,top:'50%',transform:'translateY(-50%)'},
    'bottom-left':{left:x,bottom:y},
    'bottom-center':{left:`calc(50% + ${x}px)`,bottom:y,transform:'translateX(-50%)'},
    'bottom-right':{right:x,bottom:y}
  };
  return map[position]||map.center;
}

function normalizeTextWatermark(config={}){
  return {
    ...config,
    mode:'text',
    text:String(config.text||'').trim(),
    image:'',
    imageId:'',
    imageUrl:''
  };
}

export default function TaskWatermarkOverlay({config}){
  const textConfig=normalizeTextWatermark(config||{});
  if(!textConfig.text)return null;
  if(textConfig.style==='tile'){
    const items=Array.from({length:40});
    return <div
      className="taskWatermarkTile"
      style={{
        color:textConfig.color||'#f0d68a',
        opacity:Number(textConfig.opacity||100)/100,
        fontSize:`${Math.max(14,Number(textConfig.fontSize||46)*0.34)}px`,
        transform:`rotate(${Number(textConfig.rotate||0)}deg)`,
        gap:`${Math.max(12,Number(textConfig.gap||220)*0.12)}px`
      }}
    >
      {items.map((_,i)=><span key={i}>{textConfig.text}{textConfig.subText?<small style={{color:textConfig.accent||'#fff'}}>{textConfig.subText}</small>:null}</span>)}
    </div>;
  }
  const baseStyle={
    ...watermarkPlacement(textConfig),
    opacity:Number(textConfig.opacity||100)/100
  };
  return <div className={`taskWatermarkText ${textConfig.style||'signature'}`} style={{...baseStyle,color:textConfig.color||'#f0d68a',fontSize:`${Math.max(16,Number(textConfig.fontSize||46)*0.5)}px`,transform:`${baseStyle.transform||''} rotate(${Number(textConfig.rotate||0)}deg)`}}>
    <b>{textConfig.text}</b>
    {textConfig.subText&&<small style={{color:textConfig.accent||'#fff'}}>{textConfig.subText}</small>}
  </div>;
}
