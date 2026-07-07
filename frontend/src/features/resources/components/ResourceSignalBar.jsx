import React from 'react';
import {DataPulseStrip,RevealText} from '../../../shared/effects/index.jsx';

function ResourceSignalBar({items=[],onOpenFilters}){
  return <section className="furnitureAssetSignal">
    <button className="resourceSignalEntry" type="button" onClick={onOpenFilters} aria-label="打开资产筛选">
      <div className="furnitureSignalMain">
        <span>ASSET LIBRARY</span>
        <RevealText text="资产库智能管理"/>
      </div>
      <DataPulseStrip items={items}/>
    </button>
  </section>;
}

export default ResourceSignalBar;
