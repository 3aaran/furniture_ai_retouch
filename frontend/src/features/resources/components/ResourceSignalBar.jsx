import React from 'react';
import {DataPulseStrip,RevealText} from '../../../shared/effects/index.jsx';

function ResourceSignalBar({items=[]}){
  return <section className="furnitureAssetSignal">
    <div className="furnitureSignalMain">
      <span>ASSET LIBRARY</span>
      <RevealText text="资产库智能管理"/>
    </div>
    <DataPulseStrip items={items}/>
  </section>;
}

export default ResourceSignalBar;
