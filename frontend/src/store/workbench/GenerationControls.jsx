import React from 'react';

export function GenerationControls({
  custom,
  setCustom,
  resolution,
  setResolution,
  ratio,
  setRatio,
  gen,
  cost,
  remainingQuota
}) {
  return <>
    <textarea className="wbPromptInput" placeholder="选填：如果有特殊要求，可以简短说明，例如：保留坐垫缝线、扶手木纹等。" value={custom} onChange={e=>setCustom(e.target.value)}/>

    <div className="wbBottomBar">
      <div className="wbControlGroup"><span>分辨率</span><div className="wbPills">{['1K','2K','4K'].map(item=><button key={item} type="button" className={resolution===item?'active':''} onClick={()=>setResolution(item)}>{item}</button>)}</div></div>
      <div className="wbControlGroup ratio"><span>比例</span><select className="wbSelect dark" value={ratio} onChange={e=>setRatio(e.target.value)}><option>自适应</option><option>1:1</option><option>4:3</option><option>3:4</option><option>16:9</option></select><small>当前 {ratio==='自适应'?'自适应原图':ratio}</small></div>
      <div className="wbActionGroup"><button className="wbGenerateBtn" onClick={gen}>生成效果</button><div className="wbGenerateMeta">消耗 {cost} 点算力<b>剩余：{remainingQuota}</b></div></div>
    </div>
  </>;
}

export default GenerationControls;
