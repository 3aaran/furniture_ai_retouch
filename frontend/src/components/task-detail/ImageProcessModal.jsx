import React,{useEffect,useRef,useState}from'react';
import{req,imageViewUrl,openImageDownload}from'../../appShared.jsx';
import ExternalMobileProcessModal from'./MobileProcessModal.jsx';
import{copyText}from'./clipboard.js';

function ImageProcessModal({detail,onClose,setMsg}){
  const [processing,setProcessing]=useState(false);
  const [result,setResult]=useState(null);
  const [basicMode,setBasicMode]=useState('crop');
  const [advancedMode,setAdvancedMode]=useState('none');
  const [format,setFormat]=useState('png');
  const [quality,setQuality]=useState(90);
  const [maxWidth,setMaxWidth]=useState(1600);
  const [imgSize,setImgSize]=useState({w:0,h:0});
  const [displayRect,setDisplayRect]=useState({left:0,top:0,width:0,height:0});
  const [crop,setCrop]=useState({x:12,y:14,w:70,h:56});
  const [drag,setDrag]=useState(null);
  const [isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(max-width: 860px)').matches);
  const stageRef=useRef(null);

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function syncRect(nextSize=imgSize){
    const stage=stageRef.current;
    if(!stage||!nextSize.w||!nextSize.h)return;
    const boxW=stage.clientWidth,boxH=stage.clientHeight;
    if(!boxW||!boxH)return;
    const imgRatio=nextSize.w/nextSize.h,boxRatio=boxW/boxH;
    let width=boxW,height=boxH,left=0,top=0;
    if(imgRatio>boxRatio){height=boxW/imgRatio;top=(boxH-height)/2}else{width=boxH*imgRatio;left=(boxW-width)/2}
    setDisplayRect({left,top,width,height});
  }
  useEffect(()=>{const onResize=()=>syncRect();window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize)},[imgSize]);
  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const mq=window.matchMedia('(max-width: 860px)');
    const update=()=>setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change',update);
    return()=>mq.removeEventListener?.('change',update);
  },[]);
  function onImageLoad(e){const next={w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight};setImgSize(next);requestAnimationFrame(()=>syncRect(next))}
  function pointToPercent(e){
    const box=stageRef.current?.getBoundingClientRect();
    if(!box||!displayRect.width||!displayRect.height)return{x:0,y:0};
    return {x:clamp(((e.clientX-(box.left+displayRect.left))/displayRect.width)*100,0,100),y:clamp(((e.clientY-(box.top+displayRect.top))/displayRect.height)*100,0,100)};
  }
  function startDrag(e,type){if(basicMode!=='crop')return;e.preventDefault();e.stopPropagation();setDrag({type,start:pointToPercent(e),origin:{...crop}})}
  function moveDrag(e){
    if(!drag)return;
    const p=pointToPercent(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y,base=drag.origin;
    if(drag.type==='move')setCrop({...base,x:clamp(base.x+dx,0,100-base.w),y:clamp(base.y+dy,0,100-base.h)});
    else setCrop({...base,w:clamp(base.w+dx,8,100-base.x),h:clamp(base.h+dy,8,100-base.y)});
  }
  function updateCropByPixel(field,value){
    const n=Math.max(20,Number(value)||20);
    if(!imgSize.w||!imgSize.h)return;
    if(field==='w')setCrop(c=>({...c,w:clamp((n/imgSize.w)*100,8,100-c.x)}));
    if(field==='h')setCrop(c=>({...c,h:clamp((n/imgSize.h)*100,8,100-c.y)}));
  }
  function applyRatio(ratio){
    if(!imgSize.w||!imgSize.h||ratio==='free')return;
    const [rw,rh]=ratio.split(':').map(Number);
    if(!rw||!rh)return;
    const target=rw/rh;
    setCrop(c=>{
      let pixelW=Math.round((c.w/100)*imgSize.w),pixelH=Math.round(pixelW/target);
      const maxW=Math.round(((100-c.x)/100)*imgSize.w),maxH=Math.round(((100-c.y)/100)*imgSize.h);
      if(pixelH>maxH){pixelH=maxH;pixelW=Math.round(pixelH*target)}
      if(pixelW>maxW){pixelW=maxW;pixelH=Math.round(pixelW/target)}
      return {...c,w:clamp((pixelW/imgSize.w)*100,8,100-c.x),h:clamp((pixelH/imgSize.h)*100,8,100-c.y)};
    });
  }
  const cropX=imgSize.w?Math.round((crop.x/100)*imgSize.w):0;
  const cropY=imgSize.h?Math.round((crop.y/100)*imgSize.h):0;
  const cropW=imgSize.w?Math.round((crop.w/100)*imgSize.w):0;
  const cropH=imgSize.h?Math.round((crop.h/100)*imgSize.h):0;
  function makePayload(operation){
    if(operation==='crop')return{operation:'crop',cropX,cropY,cropWidth:cropW,cropHeight:cropH,format,quality};
    if(operation==='compress')return{operation:'compress',format,quality,maxWidth};
    if(operation==='convert')return{operation:'convert',format,quality};
    return{operation};
  }
  async function submitProcess(){
    const queue=[];
    if(!isMobile&&basicMode==='crop')queue.push('crop');
    if(advancedMode!=='none')queue.push(advancedMode);
    if(!queue.length)return setMsg&&setMsg('请至少选择一个处理方式');
    try{
      setProcessing(true);
      let currentId=detail.id,finalData=null;
      for(const op of queue){finalData=await req(`/api/images/${currentId}/process`,{method:'POST',body:JSON.stringify(makePayload(op))});currentId=finalData.id||currentId}
      if(finalData){setResult(finalData);window.dispatchEvent(new CustomEvent('image-processed',{detail:finalData}));setMsg&&setMsg('图片处理成功，已自动写入生成记录')}
    }catch(e){setMsg&&setMsg(e.message||'图片处理失败')}
    finally{setProcessing(false)}
  }
  const previewUrl=imageViewUrl(result||detail);
  const hasResult=!!result;
  const canSubmit=!processing&&((!isMobile&&basicMode==='crop')||advancedMode!=='none');
  async function copySourceName(){
    try{
      await copyText(detail.originalName||String(detail.id||''));
      setMsg&&setMsg('文件名已复制');
    }catch{
      setMsg&&setMsg('复制失败');
    }
  }
  if(isMobile){
    return <ExternalMobileProcessModal
      detail={detail}
      previewUrl={previewUrl}
      hasResult={hasResult}
      result={result}
      imgSize={imgSize}
      cropX={cropX}
      cropY={cropY}
      cropW={cropW}
      cropH={cropH}
      advancedMode={advancedMode}
      format={format}
      quality={quality}
      maxWidth={maxWidth}
      processing={processing}
      canSubmit={canSubmit}
      setAdvancedMode={setAdvancedMode}
      setFormat={setFormat}
      setQuality={setQuality}
      setMaxWidth={setMaxWidth}
      onImageLoad={onImageLoad}
      onClose={onClose}
      onSubmit={submitProcess}
      onCopySourceName={copySourceName}
      setMsg={setMsg}
    />;
  }
  return <div className="cropShotMask">
    <div className="cropShotPanel">
      <header className="cropShotHeader"><div><h2>图片处理</h2><p>当前来源：{detail.originalName||detail.id}</p></div><button type="button" onClick={onClose}>× 关闭</button></header>
      <main className="cropShotBody">
        <section className="cropShotCanvasBox"><div className="cropShotCanvas"><div className="cropShotBadge">{hasResult?`${result.width||'-'} × ${result.height||'-'}`:(imgSize.w&&imgSize.h?`${imgSize.w} × ${imgSize.h}`:'加载中...')}{hasResult&&result.format?` / ${String(result.format).toUpperCase()}`:''}</div><div ref={stageRef} className="cropShotStage" onMouseMove={moveDrag} onMouseUp={()=>setDrag(null)} onMouseLeave={()=>setDrag(null)}>{previewUrl?<img src={previewUrl} onLoad={onImageLoad} loading="lazy" decoding="async"/>:<div className="cropShotEmpty">暂无图片</div>}{!hasResult&&basicMode==='crop'&&displayRect.width>0&&<div className="cropShotLayer" style={{left:displayRect.left,top:displayRect.top,width:displayRect.width,height:displayRect.height}}><div className="cropShotSelection" style={{left:`${crop.x}%`,top:`${crop.y}%`,width:`${crop.w}%`,height:`${crop.h}%`}} onMouseDown={e=>startDrag(e,'move')}><span>{cropW} × {cropH}</span><i onMouseDown={e=>startDrag(e,'resize')}></i></div></div>}</div></div></section>
        <div className="cropShotSide">
          <div className="cropShotCard"><h3>基础处理</h3>{[['none','不处理','保持原图不做基础处理'],['crop','裁剪','拖动裁剪框调整截取区域']].map(([k,b,s])=><button key={k} type="button" className={basicMode===k?'cropShotOption active':'cropShotOption'} onClick={()=>setBasicMode(k)}><div><b>{b}</b><small>{s}</small></div><span>{basicMode===k?'●':'○'}</span></button>)}{basicMode==='crop'&&<><div className="cropShotFields"><label><span>裁剪宽度(px)</span><input type="number" value={cropW||''} onChange={e=>updateCropByPixel('w',e.target.value)}/></label><label><span>裁剪高度(px)</span><input type="number" value={cropH||''} onChange={e=>updateCropByPixel('h',e.target.value)}/></label></div><div className="cropShotFields"><label><span>X 坐标</span><input type="number" value={cropX} readOnly /></label><label><span>Y 坐标</span><input type="number" value={cropY} readOnly /></label></div><div className="cropShotRatio"><span>快捷比例</span><div>{['free','1:1','4:3','3:4','16:9'].map(x=><button key={x} type="button" onClick={()=>applyRatio(x)}>{x==='free'?'自由':x}</button>)}</div></div></>}</div>
          <div className="cropShotCard"><h3>高级处理</h3>{[['none','不处理','不开启高级处理'],['remove_bg','智能抠图（透明背景）','适合白底/浅色背景'],['compress','图片压缩','重新编码并缩小尺寸'],['convert','格式转换','输出 PNG / JPG / WebP']].map(([k,b,s])=><button key={k} type="button" className={advancedMode===k?'cropShotOption active':'cropShotOption'} onClick={()=>setAdvancedMode(k)}><div><b>{b}</b><small>{s}</small></div><span>{advancedMode===k?'●':'○'}</span></button>)}{(basicMode==='crop'||advancedMode==='compress'||advancedMode==='convert')&&<label className="cropShotSingle"><span>输出格式</span><select value={format} onChange={e=>setFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></label>}{(advancedMode==='compress'||advancedMode==='convert'||format!=='png')&&<label className="cropShotSingle"><span>输出质量：{quality}%</span><input type="range" min="30" max="100" value={quality} onChange={e=>setQuality(e.target.value)}/></label>}{advancedMode==='compress'&&<label className="cropShotSingle"><span>最大宽度：{maxWidth}px</span><input type="range" min="800" max="2400" step="100" value={maxWidth} onChange={e=>setMaxWidth(Number(e.target.value))}/></label>}<div className="cropShotTip"><p>处理后会生成新图，并自动写入生成记录。</p></div></div>
          {hasResult&&<div className="cropShotCard cropShotResult"><h3>处理结果</h3><p>输出尺寸：{result.width} × {result.height}</p><button className="primary" onClick={()=>openImageDownload(result,setMsg)}>下载处理后的图片</button></div>}
        </div>
      </main>
      <footer className="cropShotFooter"><p>{processing?'正在处理，请稍候...':(hasResult?'处理完成，结果已写入记录。':'选择处理方式后，点击“开始处理”。')}</p><div><button type="button" className="cropShotGhost" onClick={onClose}>关闭</button><button type="button" className="cropShotPrimary" disabled={processing} onClick={submitProcess}>{processing?'处理中...':'开始处理'}</button></div></footer>
    </div>
  </div>
}

export default ImageProcessModal;
export{ImageProcessModal};
