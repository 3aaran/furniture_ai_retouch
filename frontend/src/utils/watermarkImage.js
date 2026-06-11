function clampNumber(value,min,max,fallback){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.max(min,Math.min(max,n));
}

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('image load failed'));
    img.src=src;
  });
}

async function loadImageViaFetch(url){
  let objectUrl='';
  try{
    const response=await fetch(url,{mode:'cors',credentials:'omit'});
    if(!response.ok)throw new Error(`fetch image failed: ${response.status}`);
    const blob=await response.blob();
    objectUrl=URL.createObjectURL(blob);
    const img=await loadImage(objectUrl);
    return {img,cleanup:()=>URL.revokeObjectURL(objectUrl)};
  }catch(error){
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function loadDrawableImage(url){
  try{
    return await loadImageViaFetch(url);
  }catch{
    const img=await loadImage(url);
    return {img,cleanup:()=>{}};
  }
}

function placement(config,canvasWidth,canvasHeight,markWidth,markHeight){
  const marginX=clampNumber(config.offsetX,0,canvasWidth,Math.round(canvasWidth*.025));
  const marginY=clampNumber(config.offsetY,0,canvasHeight,Math.round(canvasHeight*.025));
  switch(config.position||'bottom-right'){
    case 'top-left':
      return {x:marginX,y:marginY};
    case 'top-center':
      return {x:(canvasWidth-markWidth)/2+marginX,y:marginY};
    case 'top-right':
      return {x:canvasWidth-markWidth-marginX,y:marginY};
    case 'center-left':
      return {x:marginX,y:(canvasHeight-markHeight)/2+marginY};
    case 'center':
      return {x:(canvasWidth-markWidth)/2+marginX,y:(canvasHeight-markHeight)/2+marginY};
    case 'center-right':
      return {x:canvasWidth-markWidth-marginX,y:(canvasHeight-markHeight)/2+marginY};
    case 'bottom-left':
      return {x:marginX,y:canvasHeight-markHeight-marginY};
    case 'bottom-center':
      return {x:(canvasWidth-markWidth)/2+marginX,y:canvasHeight-markHeight-marginY};
    case 'bottom-right':
    default:
      return {x:canvasWidth-markWidth-marginX,y:canvasHeight-markHeight-marginY};
  }
}

function drawTextBlock(ctx,config,canvasWidth,canvasHeight){
  const text=String(config.text||'文字水印').trim();
  const subText=String(config.subText||'').trim();
  if(!text)return;
  const fontSize=clampNumber(config.fontSize,20,160,46);
  const subSize=Math.max(12,Math.round(fontSize*.42));
  const lineGap=Math.round(fontSize*.2);
  ctx.font=`900 ${fontSize}px sans-serif`;
  const textWidth=ctx.measureText(text).width;
  ctx.font=`800 ${subSize}px sans-serif`;
  const subWidth=subText?ctx.measureText(subText).width:0;
  const padX=config.style==='badge'?Math.round(fontSize*.75):config.style==='corner'?Math.round(fontSize*.35):0;
  const padY=config.style==='badge'?Math.round(fontSize*.45):0;
  const markWidth=Math.min(canvasWidth*.9,Math.max(textWidth,subWidth)+padX*2);
  const markHeight=fontSize+(subText?subSize+lineGap:0)+padY*2;
  const pos=placement(config,canvasWidth,canvasHeight,markWidth,markHeight);
  const rotate=(Number(config.rotate)||0)*Math.PI/180;

  ctx.save();
  ctx.translate(pos.x+markWidth/2,pos.y+markHeight/2);
  ctx.rotate(rotate);
  ctx.translate(-markWidth/2,-markHeight/2);
  ctx.textBaseline='top';
  ctx.shadowColor='rgba(0,0,0,.24)';
  ctx.shadowBlur=Math.max(4,fontSize*.18);
  ctx.shadowOffsetY=Math.max(1,fontSize*.05);
  if(config.style==='badge'){
    ctx.shadowColor='transparent';
    ctx.strokeStyle=config.color||'#f0d68a';
    ctx.lineWidth=Math.max(2,fontSize*.04);
    roundRect(ctx,0,0,markWidth,markHeight,markHeight/2);
    ctx.fillStyle='rgba(0,0,0,.42)';
    ctx.fill();
    ctx.stroke();
  }
  if(config.style==='corner'){
    ctx.shadowColor='transparent';
    ctx.fillStyle=config.color||'#f0d68a';
    ctx.fillRect(0,0,Math.max(3,fontSize*.08),markHeight);
  }
  ctx.font=`900 ${fontSize}px sans-serif`;
  ctx.fillStyle=config.color||'#f0d68a';
  ctx.fillText(text,padX,padY);
  if(subText){
    ctx.font=`800 ${subSize}px sans-serif`;
    ctx.fillStyle=config.accent||'#ffffff';
    ctx.fillText(subText,padX,padY+fontSize+lineGap);
  }
  ctx.restore();
}

function drawTiledText(ctx,config,canvasWidth,canvasHeight){
  const text=String(config.text||'文字水印').trim();
  const subText=String(config.subText||'').trim();
  if(!text)return;
  const fontSize=clampNumber(config.fontSize,20,160,46);
  const gap=clampNumber(config.gap,100,520,220);
  const rotate=(Number(config.rotate)||0)*Math.PI/180;
  ctx.save();
  ctx.translate(canvasWidth/2,canvasHeight/2);
  ctx.rotate(rotate);
  ctx.translate(-canvasWidth/2,-canvasHeight/2);
  ctx.font=`900 ${fontSize}px sans-serif`;
  ctx.fillStyle=config.color||'#f0d68a';
  ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,.18)';
  ctx.shadowBlur=Math.max(3,fontSize*.12);
  const label=subText?`${text}  ${subText}`:text;
  for(let y=-canvasHeight;y<canvasHeight*2;y+=gap){
    for(let x=-canvasWidth;x<canvasWidth*2;x+=gap){
      ctx.fillText(label,x,y);
    }
  }
  ctx.restore();
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function canvasToBlob(canvas){
  return new Promise((resolve,reject)=>{
    try{
      canvas.toBlob(blob=>{
        if(blob)resolve(blob);
        else reject(new Error('canvas export failed'));
      },'image/png',.92);
    }catch(error){
      reject(error);
    }
  });
}

export async function createWatermarkedImageBlob(imageUrl,watermarkConfig={}){
  if(!imageUrl)throw new Error('missing image url');
  const config={position:'bottom-right',opacity:80,...watermarkConfig,mode:'text'};
  if(!String(config.text||'').trim())throw new Error('missing watermark text');

  const {img,cleanup}=await loadDrawableImage(imageUrl);
  try{
    const canvas=document.createElement('canvas');
    canvas.width=img.naturalWidth||img.width;
    canvas.height=img.naturalHeight||img.height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('canvas unsupported');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.globalAlpha=clampNumber(config.opacity,0,100,80)/100;
    if(config.style==='tile')drawTiledText(ctx,config,canvas.width,canvas.height);
    else drawTextBlock(ctx,config,canvas.width,canvas.height);
    ctx.restore();
    return await canvasToBlob(canvas);
  }catch(error){
    if(error?.name==='SecurityError'){
      throw new Error('水印图片生成失败，请检查图片跨域配置');
    }
    throw error;
  }finally{
    cleanup();
  }
}

export function downloadBlob(blob,filename='image-watermark.png'){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function watermarkedFilename(name='image'){
  const clean=String(name||'image').replace(/[\\/:*?"<>|]/g,'_');
  const base=clean.replace(/\.[^.]+$/,'')||'image';
  return `${base}-watermark.png`;
}
