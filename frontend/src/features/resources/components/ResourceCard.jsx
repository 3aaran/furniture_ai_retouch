import React from'react';
import{Eye,Pencil}from'../../../shared/icons/index.jsx';
import{fallbackToOriginalImage,fmt,resTypeName}from'../../../appShared.jsx';
import{IconButton}from'../../../shared/ui/index.jsx';

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
  const mainName=normalizeResourceMain(resource);
  const subName=normalizeResourceSub(resource);
  const typeName=resTypeName[resource.resourceType]||'资产';
  const desc=resource.description||`${mainName}${subName?` / ${subName}`:''}`||typeName;
  return <article className="resourceCardV3" key={space+'-'+resource.id}>
    {canManage&&<label className="resourceSelectV3" title="勾选">
      <input type="checkbox" aria-label="勾选资源" checked={checked} onChange={e=>onSelect(resource.id,e.target.checked)}/>
      <span></span>
    </label>}

    <div className="resourceImageV3">
      {url?<img src={url} alt={resource.name} onError={e=>fallbackToOriginalImage(e,resource)} loading="lazy" decoding="async"/>:<div className="resourcePlaceholderV3">{resTypeName[resource.resourceType]||'资源'}</div>}
      <div className="resourceHoverActionsV3">
        <IconButton title="预览" icon={<Eye size={18}/>} onClick={()=>onPreview(resource.id)}/>
        {canManage&&<IconButton title="重命名" icon={<Pencil size={17}/>} onClick={()=>onRename(resource)}/>}
      </div>
    </div>

    <div className="resourceInfoV3">
      <div className="resourceTitleRowV9"><b title={resource.name}>{resource.name}</b><em>#{resource.id}</em></div>
      <p title={desc}>“{desc}”</p>
      <div className="resourceMetaRowV9">
        <span>{fmt(resource.createdAt)||'--'}</span>
        <i><u></u>{typeName}</i>
      </div>
    </div>
  </article>;
}
