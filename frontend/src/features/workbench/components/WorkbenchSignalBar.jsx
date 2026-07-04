import React from 'react';
import {DataPulseStrip,RevealText} from '../../../shared/effects/index.jsx';

function WorkbenchSignalBar({title,items=[]}){
  return <div className="furnitureWorkbenchSignal">
    <div className="furnitureSignalMain">
      <span>AI STUDIO</span>
      <RevealText text={title}/>
    </div>
    <DataPulseStrip items={items}/>
  </div>;
}

export default WorkbenchSignalBar;
