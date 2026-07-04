import {
  defaultCategoryGroups,
  fixedMainCategories,
  normalizeResourceMain,
  normalizeResourceSub,
  resourceUseLabel
} from '../../../store/resources/resourceModel.js';

export function buildResourceCategoryGroups({categoryTree=[],systemItems=[],dataItems=[]}){
  const mergeDefaultGroups=(groups=[])=>{
    const map=new Map();
    const addGroup=(group)=>{
      if(!group?.name)return;
      const key=String(group.name);
      const existing=map.get(key);
      if(existing){
        const subs=new Set([...(existing.subs||[]),...(group.subs||[])].filter(Boolean));
        map.set(key,{...existing,...group,subs:Array.from(subs),canManage:existing.canManage||group.canManage});
      }else{
        map.set(key,{...group,subs:Array.from(group.subs||[]).filter(Boolean)});
      }
    };
    defaultCategoryGroups.forEach(section=>section.mains.forEach(main=>addGroup({
      name:main.name,
      rawName:main.name,
      useLabel:section.useLabel,
      purposeKey:section.useKey,
      subs:[],
      subItems:[],
      canManage:false
    })));
    groups.forEach(addGroup);
    return Array.from(map.values());
  };

  if(categoryTree.length){
    return mergeDefaultGroups(categoryTree.flatMap(p=>(p.mains||[]).map(main=>({
      id:main.id,
      name:main.name,
      rawName:main.name,
      useLabel:p.purposeName,
      purposeKey:p.purposeKey,
      subs:(main.subs||[]).map(sub=>sub.name).filter(Boolean),
      subItems:main.subs||[],
      canManage:main.canManage
    }))));
  }

  const allFilterItems=[...(systemItems||[]),...(dataItems||[])];
  const map=new Map();
  function add(main,sub,useLabel){
    const m=String(main||'').trim();
    if(!m)return;
    if(!map.has(m))map.set(m,{name:m,useLabel:useLabel||'产品图',subs:new Set()});
    if(sub)map.get(m).subs.add(String(sub).trim());
  }
  defaultCategoryGroups.forEach(group=>group.mains.forEach(main=>add(main.name,'',group.useLabel)));
  allFilterItems.forEach(r=>{
    const main=normalizeResourceMain(r);
    add(main,normalizeResourceSub(r),resourceUseLabel(r));
  });
  return mergeDefaultGroups(fixedMainCategories
    .map(name=>map.get(name)||{name,useLabel:name==='材质'||name==='软体'?'材质替换':name==='场景模板'?'场景融合':'产品图',subs:new Set()})
    .map(item=>{
      const visibleSubs=Array.from(item.subs).filter(Boolean);
      return {...item,rawName:item.name,subs:visibleSubs};
    }));
}

export function buildResourceCategorySections(categoryTree=[]){
  return categoryTree.length?categoryTree:[
    {purposeKey:'user_reference',purposeName:'产品参考',mains:[]},
    {purposeKey:'material',purposeName:'材质替换',mains:[]},
    {purposeKey:'scene',purposeName:'场景融合',mains:[]}
  ];
}

export function getResourceMainOptions(categoryGroups=[]){
  return categoryGroups.map(g=>g.name);
}

export function getResourceSubOptions(categoryGroups=[],mainCategory=''){
  const selected=categoryGroups.find(g=>g.name===mainCategory);
  return selected?.subs||[];
}

export function getResourceCategoryPurposeOptions(categorySections=[]){
  return categorySections.map(section=>({key:section.purposeKey,name:section.purposeName}));
}
