import React from 'react';
import {Image as ImageIcon} from 'lucide-react';
import {fallbackToOriginalImage} from '../../../appShared.jsx';

function WorkbenchStudioRecentStrip({
  recentItems,
  recentTypeName,
  setRecentHoverId,
  showRecentOriginal,
  moveRecentOriginal,
  hideRecentOriginal,
  openRecentTask,
  listImgSrc
}){
  const items=recentItems.slice(0,5);
  return <div className="wbStudioRecentStrip">
    <b>最近生成</b>
    <div>
      {items.length?items.map(item=>{
        const running=item.status==='queued'||item.status==='running';
        const failed=item.status==='failed';
        return <button
          key={item.id}
          type="button"
          className={running?'isLoading':failed?'isFailed':''}
          title={recentTypeName(item)}
          onMouseEnter={(e)=>{setRecentHoverId(item.id);showRecentOriginal(item,e);}}
          onMouseMove={(e)=>moveRecentOriginal(item,e)}
          onMouseLeave={()=>{setRecentHoverId(prev=>prev===item.id?'':prev);hideRecentOriginal();}}
          onClick={()=>openRecentTask(item)}
        >
          <img src={listImgSrc(item)} alt="最近生成" loading="lazy" decoding="async" onError={e=>fallbackToOriginalImage(e,item)}/>
          {running&&<i className="wbSpin"/>}
          {failed&&<em>失败</em>}
        </button>;
      }):Array.from({length:5}).map((_,index)=><span key={index} className="wbStudioRecentGhost"><ImageIcon size={28}/></span>)}
    </div>
  </div>;
}

export default WorkbenchStudioRecentStrip;
