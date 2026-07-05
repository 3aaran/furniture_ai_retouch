function normalizeCategoryValue(value){
  return String(value||'').trim();
}

export function getWorkbenchResourceMainCategory(resource){
  return normalizeCategoryValue(resource?.mainCategoryName||resource?.objectName)||'未分类';
}

export function getWorkbenchResourceSubCategory(resource){
  return normalizeCategoryValue(resource?.subCategoryName||resource?.colorName);
}

function matchesWorkbenchResourceType(resource,op,materialTab){
  if(op==='material')return resource.resourceType===materialTab;
  if(op==='replace_bg')return resource.resourceType==='scene';
  return false;
}

function getScopedTypedResources({resources=[],resourceScope='ALL',op,materialTab}){
  return resources.filter(resource=>{
    if(resourceScope!=='ALL'&&resource.scope!==resourceScope)return false;
    return matchesWorkbenchResourceType(resource,op,materialTab);
  });
}

export function buildWorkbenchResourceCategoryOptions({resources=[],resourceScope='ALL',op,materialTab}){
  const scoped=getScopedTypedResources({resources,resourceScope,op,materialTab});
  const mainMap=new Map();
  scoped.forEach(resource=>{
    const main=getWorkbenchResourceMainCategory(resource);
    const sub=getWorkbenchResourceSubCategory(resource);
    if(!mainMap.has(main))mainMap.set(main,new Set());
    if(sub)mainMap.get(main).add(sub);
  });
  return Array.from(mainMap.entries())
    .map(([name,subs])=>({name,subs:Array.from(subs).sort((a,b)=>a.localeCompare(b,'zh-Hans-CN'))}))
    .sort((a,b)=>a.name.localeCompare(b.name,'zh-Hans-CN'));
}

export function getWorkbenchResourceText(resource,resTypeName={}){
  return [resource?.name,resource?.objectName,resource?.colorName,resource?.description,resource?.mainCategoryName,resource?.subCategoryName,resTypeName[resource?.resourceType]]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterWorkbenchResources({resources=[],resourceScope='ALL',op,materialTab,keyword='',mainCategory='',subCategory=''}){
  const kw=String(keyword||'').trim().toLowerCase();
  return getScopedTypedResources({resources,resourceScope,op,materialTab}).filter(resource=>{
    if(mainCategory&&getWorkbenchResourceMainCategory(resource)!==mainCategory)return false;
    if(subCategory&&getWorkbenchResourceSubCategory(resource)!==subCategory)return false;
    if(!kw)return true;
    return [resource.name,resource.objectName,resource.colorName,resource.description,resource.mainCategoryName,resource.subCategoryName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(kw);
  });
}

export function filterWorkbenchModalResources({resources=[],resourceModal={},resTypeName={}}){
  const kw=String(resourceModal.keyword||'').trim().toLowerCase();
  return resources.filter(resource=>{
    if(resourceModal.scope!=='ALL'&&resource.scope!==resourceModal.scope)return false;
    if(!kw)return true;
    return getWorkbenchResourceText(resource,resTypeName).includes(kw);
  });
}

export function getCurrentWorkbenchTemplate(resources=[],selectedResource=''){
  return resources.find(resource=>String(resource.id)===String(selectedResource));
}
