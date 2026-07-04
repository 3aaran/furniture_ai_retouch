export function wbWatermarkPlacement(config={}){
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

export function wbTextWatermarkConfig(config={}){
  return {...config,mode:'text',text:String(config.text||'').trim(),image:'',imageId:'',imageUrl:''};
}
