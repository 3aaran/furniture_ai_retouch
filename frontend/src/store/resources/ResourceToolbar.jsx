import React from'react';
import{Search}from'lucide-react';

export default function ResourceToolbar({
  query,
  setQuery,
  triggerSearch,
  categoryGroups,
  subOptions,
  canManageCurrentSpace,
  openCategoryPanel,
  canUpload,
  openUpload
}){
  return <section className="resourceToolbarV3">
    <div className="resourceSearchBoxV3">
      <Search size={22}/>
      <input
        placeholder="搜索资源名称..."
        value={query.keyword}
        onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}
        onKeyDown={e=>{if(e.key==='Enter')triggerSearch()}}
      />
    </div>

    <select value={query.mainCategory} onChange={e=>setQuery({...query,mainCategory:e.target.value,subCategory:'',page:1})}>
      <option value="">全部主分类</option>
      <option value="未分类">未分类</option>
      {categoryGroups.map(v=><option key={v.name} value={v.name}>{v.name}　用于：{v.useLabel}</option>)}
    </select>

    <select value={query.subCategory} disabled={!query.mainCategory} onChange={e=>setQuery({...query,subCategory:e.target.value,page:1})}>
      <option value="">全部子类别</option>
      {subOptions.map(v=><option key={v} value={v}>{v}</option>)}
    </select>

    {canManageCurrentSpace&&<button className="resourceManageCategoryV3" type="button" onClick={openCategoryPanel}>管理分类</button>}

    {canUpload&&<button className="resourceUploadOpenV3" type="button" onClick={openUpload}>
      <span>+</span> 上传文件
    </button>}
  </section>;
}
