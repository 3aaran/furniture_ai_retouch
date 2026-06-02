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
  remainingQuota,
  ratioOptions=['自适应','1:1','4:3','3:4','16:9'],
  resolutionOptions=['1K','2K','4K'],
  promptPlaceholder='选填：如有特殊要求，可以简短说明',
  generateLabel='生成效果'
}) {
  return <>
    <textarea
      className="wbPromptInput"
      placeholder={promptPlaceholder}
      value={custom}
      onChange={e=>setCustom(e.target.value)}
    />

    <div className="wbBottomBar">
      <div className="wbControlGroup">
        <span>分辨率</span>
        <div className="wbPills">
          {resolutionOptions.map(item=>
            <button key={item} type="button" className={resolution===item?'active':''} onClick={()=>setResolution(item)}>{item}</button>
          )}
        </div>
      </div>
      <div className="wbControlGroup ratio">
        <span>比例</span>
        <select className="wbSelect dark" value={ratio} onChange={e=>setRatio(e.target.value)}>
          {ratioOptions.map(item=><option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="wbActionGroup">
        <button className="wbGenerateBtn" onClick={gen}>{generateLabel}</button>
        <div className="wbGenerateMeta">消耗 {cost} 点算力 <b>剩余：{remainingQuota}</b></div>
      </div>
    </div>
  </>;
}

export default GenerationControls;
