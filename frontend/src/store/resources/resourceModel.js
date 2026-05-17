export const defaultCategoryGroups=[
  {useKey:'material',useLabel:'材质替换',mains:[{name:'材质',subs:[]},{name:'软体',subs:[]}]},
  {useKey:'PRODUCT',useLabel:'产品图',mains:[{name:'产品',subs:[]}]},
  {useKey:'scene',useLabel:'场景融合',mains:[{name:'场景模板',subs:[]}]}
];

export const fixedMainCategories=['材质','软体','产品','场景模板'];

export function fixedCategoryUseLabel(main){
  if(main==='材质'||main==='软体')return '材质替换';
  if(main==='场景模板')return '场景融合';
  return '产品图';
}

export function normalizeResourceMain(r){
  const raw=String(r.mainCategoryName||r.objectName||'').trim();
  return fixedMainCategories.includes(raw)?raw:'未分类';
}

export function normalizeResourceSub(r){
  return String(r.subCategoryName||r.colorName||'').trim();
}

export function resourceUseLabel(r){
  return fixedCategoryUseLabel(normalizeResourceMain(r));
}
