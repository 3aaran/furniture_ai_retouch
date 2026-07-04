import React from 'react';
import {createPortal} from 'react-dom';
import {Search} from '../../../shared/icons/index.jsx';
import {fallbackToOriginalImage,resTypeName} from '../../../appShared.jsx';

export function ResourcePickerModal({
  resourceModal,
  setResourceModal,
  modalItems,
  chooseResourceImage,
  imgSrc
}){
  if(!resourceModal.open)return null;

  const content=<div className="modalMask wbResourcePickerMask">
    <div className="wbResourceModal">
      <div className="modalHead">
        <h2>{resourceModal.target==='source'?'从资源库选择产品原图':'从资源库选择参考图'}</h2>
        <button onClick={()=>setResourceModal(modal=>({...modal,open:false}))}>×</button>
      </div>
      <div className="wbModalBar">
        <div className="wbSearchInput"><Search size={16}/><input placeholder="搜索资源名称/颜色/说明" value={resourceModal.keyword} onChange={event=>setResourceModal(modal=>({...modal,keyword:event.target.value}))}/></div>
        <select className="wbSelect" value={resourceModal.scope} onChange={event=>setResourceModal(modal=>({...modal,scope:event.target.value}))}><option value="ALL">全部空间</option><option value="SYSTEM">系统空间</option><option value="MERCHANT">门店空间</option></select>
      </div>
      <div className="wbModalGrid">
        {modalItems.length?modalItems.map(resource=><button key={resource.scope+'modal'+resource.id} className="wbModalResource" onClick={()=>chooseResourceImage(resource)}>
          {resource.imageUrl?<img src={imgSrc(resource)} alt={resource.name} onError={event=>fallbackToOriginalImage(event,resource)} loading="lazy" decoding="async"/>:<div className="wbResourcePlaceholder">{resTypeName[resource.resourceType]}</div>}
          <b>{resource.name}</b>
          <span>{resource.scope==='SYSTEM'?'系统':'门店'} / {resTypeName[resource.resourceType]}</span>
        </button>):<div className="empty big">暂无可选资源</div>}
      </div>
    </div>
  </div>;

  if(typeof document==='undefined')return content;
  return createPortal(content,document.body);
}

export default ResourcePickerModal;
