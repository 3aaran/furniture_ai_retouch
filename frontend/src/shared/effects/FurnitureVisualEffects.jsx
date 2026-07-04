import React,{useEffect,useMemo,useRef,useState}from'react';

function normalizeItems(items){
  return (items||[]).map(item=>String(item||'').trim()).filter(Boolean).slice(0,6);
}

export function AuroraLayer({variant='workbench',className=''}){
  return <div className={`rbAuroraLayer rbAuroraLayer--${variant} ${className}`} aria-hidden="true">
    <span className="orb one"/>
    <span className="orb two"/>
    <span className="orb three"/>
  </div>;
}

export function SpotlightCard({children,className='',spotlightColor='rgba(240,214,138,.20)',...props}){
  const cardRef=useRef(null);
  function handleMouseMove(e){
    const node=cardRef.current;
    if(!node)return;
    const rect=node.getBoundingClientRect();
    node.style.setProperty('--rb-mouse-x',`${e.clientX-rect.left}px`);
    node.style.setProperty('--rb-mouse-y',`${e.clientY-rect.top}px`);
    node.style.setProperty('--rb-spotlight-color',spotlightColor);
  }
  return <div ref={cardRef} className={`rbSpotlightCard ${className}`} onMouseMove={handleMouseMove} {...props}>{children}</div>;
}

export function RevealText({text='',as:Tag='b',className=''}){
  const chars=useMemo(()=>Array.from(String(text||'')),[text]);
  return <Tag className={`rbRevealText ${className}`} aria-label={String(text||'')}>
    {chars.map((ch,index)=><span key={`${ch}-${index}`} style={{'--rb-i':index}} aria-hidden="true">{ch===' '?'\u00a0':ch}</span>)}
  </Tag>;
}

export function DataPulseStrip({items=[],className=''}){
  const normalized=normalizeItems(items);
  if(!normalized.length)return null;
  return <div className={`rbDataPulseStrip ${className}`} aria-label="当前页面状态">
    {normalized.map((item,index)=><span key={`${item}-${index}`} style={{'--rb-i':index}}>{item}</span>)}
  </div>;
}

function clampNumber(value,min,max){
  return Math.max(min,Math.min(max,value));
}

export function WheelNumberPager({currentPage=1,totalPages=1,onChange,className='',windowSize=4}){
  const safeTotal=Math.max(1,Number(totalPages)||1);
  const safeCurrent=clampNumber(Number(currentPage)||1,1,safeTotal);
  const size=Math.max(1,Math.min(Number(windowSize)||4,safeTotal));
  const preferredStart=clampNumber(safeCurrent<=2?1:safeCurrent-1,1,Math.max(1,safeTotal-size+1));
  const [start,setStart]=useState(preferredStart);

  useEffect(()=>{
    setStart(prev=>{
      const maxStart=Math.max(1,safeTotal-size+1);
      const next=clampNumber(prev,1,maxStart);
      if(safeCurrent<next||safeCurrent>next+size-1)return preferredStart;
      return next;
    });
  },[preferredStart,safeCurrent,safeTotal,size]);

  const maxStart=Math.max(1,safeTotal-size+1);
  const pageNumbers=Array.from({length:size},(_,index)=>start+index).filter(page=>page<=safeTotal);

  function handleWheel(e){
    if(safeTotal<=size)return;
    e.preventDefault();
    e.stopPropagation();
    const direction=e.deltaY>0?1:-1;
    setStart(prev=>clampNumber(prev+direction,1,maxStart));
  }
  function gotoPage(page){
    const next=clampNumber(page,1,safeTotal);
    onChange?.(next);
  }

  return <div className={`rbWheelPager ${className}`} onWheel={handleWheel} title="滚轮只浏览页码，点击数字才跳转页面">
    <button type="button" disabled={safeCurrent<=1} onClick={()=>gotoPage(1)} aria-label="第一页">«</button>
    <button type="button" disabled={safeCurrent<=1} onClick={()=>gotoPage(safeCurrent-1)} aria-label="上一页">‹</button>
    {start>1&&<span className="rbWheelPagerDots">…</span>}
    <div className="rbWheelPagerWindow" aria-label="页码滚动视窗">
      {pageNumbers.map(page=><button key={page} type="button" className={page===safeCurrent?'active':''} onClick={()=>gotoPage(page)} aria-current={page===safeCurrent?'page':undefined}>{page}</button>)}
    </div>
    {start+size-1<safeTotal&&<span className="rbWheelPagerDots">…</span>}
    <button type="button" disabled={safeCurrent>=safeTotal} onClick={()=>gotoPage(safeCurrent+1)} aria-label="下一页">›</button>
    <button type="button" disabled={safeCurrent>=safeTotal} onClick={()=>gotoPage(safeTotal)} aria-label="最后一页">»</button>
    <span className="rbWheelPagerHint">滚轮浏览页码</span>
  </div>;
}
