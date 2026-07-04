export function getWorkbenchResourceText(resource,resTypeName={}){
  return [resource?.name,resource?.objectName,resource?.colorName,resource?.description,resource?.mainCategoryName,resource?.subCategoryName,resTypeName[resource?.resourceType]]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterWorkbenchResources({resources=[],resourceScope='ALL',op,materialTab,keyword=''}){
  const kw=String(keyword||'').trim().toLowerCase();
  return resources.filter(resource=>{
    if(resourceScope!=='ALL'&&resource.scope!==resourceScope)return false;
    if(op==='material'){
      if(resource.resourceType!==materialTab)return false;
    }else if(op==='replace_bg'){
      if(resource.resourceType!=='scene')return false;
    }else{
      return false;
    }
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
