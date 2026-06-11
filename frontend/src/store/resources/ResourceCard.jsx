import React from'react';
import{Eye,Pencil}from'lucide-react';
import{resTypeName}from'../../appShared.jsx';

export default function ResourceCard({
  resource,
  space,
  url,
  canManage,
  checked,
  onSelect,
  onPreview,
  onRename,
  normalizeResourceMain,
  normalizeResourceSub
}){
  return <article className="resourceCardV3" key={space+'-'+resource.id}>
    {canManage&&<label className="resourceSelectV3" title="勾选">
      <input type="checkbox" aria-label="勾选资源" checked={checked} onChange={e=>onSelect(resource.id,e.target.checked)}/>
      <span></span>
    </label>}

    <div className="resourceImageV3">
      {url?<img src={url} alt={resource.name} loading="lazy" decoding="async"/>:<div className="resourcePlaceholderV3">{resTypeName[resource.resourceType]||'资源'}</div>}
      <div className="resourceHoverActionsV3">
        <button title="预览" onClick={()=>onPreview(resource.id)}><Eye size={18}/></button>
        {canManage&&<button title="重命名" onClick={()=>onRename(resource)}><Pencil size={17}/></button>}
      </div>
    </div>

    <div className="resourceInfoV3">
      <b title={resource.name}>{resource.name}</b>
      <span>分类：{normalizeResourceMain(resource)}{normalizeResourceSub(resource)?` / ${normalizeResourceSub(resource)}`:''}</span>
    </div>
  </article>;
}
