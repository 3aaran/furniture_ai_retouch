import React from'react';

export default function ResourceSpaceTabs({
  space,
  setSpace,
  isSystemAdmin,
  selectedCount,
  openBatchCategoryModal,
  batchDeleteResources,
  clearResourceSelection
}){
  return <section className="resourceSpaceTabsV3">
    <div className="resourceSpaceTabButtonsV3">
      <button className={space==='SYSTEM'?'active':''} onClick={()=>setSpace('SYSTEM')}>系统空间</button>
      {!isSystemAdmin&&<button className={space==='STORE'?'active':''} onClick={()=>setSpace('STORE')}>门店空间</button>}
      {!isSystemAdmin&&<button className={space==='PERSONAL'?'active':''} onClick={()=>setSpace('PERSONAL')}>我的空间</button>}
    </div>
    {selectedCount>0&&<div className="resourceBatchBarV8">
      <b>已选 {selectedCount} 项</b>
      <button type="button" onClick={openBatchCategoryModal}>修改分类</button>
      <button type="button" className="danger" onClick={batchDeleteResources}>删除</button>
      <button type="button" className="ghost" onClick={clearResourceSelection}>取消选择</button>
    </div>}
  </section>;
}
