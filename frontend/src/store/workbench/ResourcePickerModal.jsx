import React from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { resTypeName } from '../../appShared.jsx';

export function ResourcePickerModal({
  resourceModal,
  setResourceModal,
  modalItems,
  chooseResourceImage,
  imgSrc
}) {
  if (!resourceModal.open) return null;

  const content = <div className="modalMask wbResourcePickerMask">
    <div className="wbResourceModal">
      <div className="modalHead">
        <h2>{resourceModal.target==='source'?'从资源库选择产品原图':'从资源库选择参考图'}</h2>
        <button onClick={()=>setResourceModal(m=>({...m,open:false}))}>×</button>
      </div>
      <div className="wbModalBar">
        <div className="wbSearchInput"><Search size={16}/><input placeholder="搜索资源名称/颜色/说明" value={resourceModal.keyword} onChange={e=>setResourceModal(m=>({...m,keyword:e.target.value}))}/></div>
        <select className="wbSelect" value={resourceModal.scope} onChange={e=>setResourceModal(m=>({...m,scope:e.target.value}))}><option value="ALL">全部空间</option><option value="SYSTEM">系统空间</option><option value="MERCHANT">门店空间</option></select>
      </div>
      <div className="wbModalGrid">
        {modalItems.length?modalItems.map(r=><button key={r.scope+'modal'+r.id} className="wbModalResource" onClick={()=>chooseResourceImage(r)}>
          {r.imageUrl?<img src={imgSrc(r)} alt={r.name} loading="lazy" decoding="async"/>:<div className="wbResourcePlaceholder">{resTypeName[r.resourceType]}</div>}
          <b>{r.name}</b>
          <span>{r.scope==='SYSTEM'?'系统':'门店'} / {resTypeName[r.resourceType]}</span>
        </button>):<div className="empty big">暂无可选资源</div>}
      </div>
    </div>
  </div>;

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

export default ResourcePickerModal;
