import React from 'react';
import {WandSparkles} from '../../../shared/icons/index.jsx';

function WorkbenchMobileSubmitPanel({custom,setCustom,isPromotionSelected,gen,calcWorkbenchCost,quota}){
  return <section className="wbMobileSubmitPanel" aria-label="生成设置">
    <label>
      <span>特殊要求（选填）</span>
      <textarea
        value={custom}
        onChange={event=>setCustom(event.target.value)}
        placeholder="可填写画面氛围、重点细节或其他特殊要求..."
      />
    </label>
    <button className="wbGenerateBtn wbMobileGenerateButton" type="button" onClick={gen}>
      <WandSparkles size={20}/>{isPromotionSelected?'生成宣传图':'生成图片'}
    </button>
    <div className="wbGenerateMeta">消耗 {calcWorkbenchCost()} 点算力 <b>剩余：{quota}</b></div>
  </section>;
}

export default WorkbenchMobileSubmitPanel;
