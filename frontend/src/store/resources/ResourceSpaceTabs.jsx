import React from'react';
import{Box,ChevronDown,ChevronLeft,ChevronRight,FolderTree,Globe2,Grid3X3,Plus,Search,Settings,Store,Upload,UserRound}from'lucide-react';

export default function ResourceSpaceTabs({
  space,
  setSpace,
  isSystemAdmin,
  selectedCount,
  openBatchCategoryModal,
  batchDeleteResources,
  clearResourceSelection,
  categorySections=[],
  query,
  setQuery,
  canManageCurrentSpace,
  openCategoryPanel,
  sidebarCollapsed=false,
  setSidebarCollapsed,
  canUpload,
  openUpload,
  triggerSearch,
  gridCols=3,
  gridRows=3,
  setGridCols,
  setGridRows,
  pageSize=9
}){
  const activeMain=String(query?.mainCategory||'');
  const activeSub=String(query?.subCategory||'');
  const spaceTabs=[
    {key:'SYSTEM',label:'系统空间',icon:<Globe2 size={15}/>},
    ...(!isSystemAdmin?[{key:'STORE',label:'门店空间',icon:<Store size={15}/>},{key:'PERSONAL',label:'我的空间',icon:<UserRound size={15}/>}]:[])
  ];
  function chooseSpace(nextSpace){
    setSpace(nextSpace);
    setQuery?.(q=>({...q,mainCategory:'',subCategory:'',page:1}));
  }
  function chooseCategory(mainCategory='',subCategory=''){
    setQuery?.(q=>({...q,mainCategory,subCategory,page:1}));
  }
  function mainName(main){return String(main?.name||main?.rawName||'').trim();}
  function subName(sub){return String(sub?.name||sub||'').trim();}
  return <aside className="resourceSpaceTabsV3">
    <button type="button" className="resourceSideCollapseV10" onClick={()=>setSidebarCollapsed?.(!sidebarCollapsed)} title={sidebarCollapsed?'展开分类栏':'收起分类栏'}>
      {sidebarCollapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}<span>{sidebarCollapsed?'展开':'收起'}</span>
    </button>
    <div className="resourceSideBlockV10 resourceSideSpaceSwitchV10">
      <h3><Box size={15}/>资源空间</h3>
      <div className="resourceSideSpaceButtonsV10">
        {spaceTabs.map(tab=><button type="button" key={tab.key} title={tab.label} className={space===tab.key?'active':''} onClick={()=>chooseSpace(tab.key)}>{tab.icon}<span>{tab.label}</span></button>)}
      </div>
    </div>

    <div className="resourceSideBlockV10 resourceSideToolsV10">
      <h3><Search size={15}/>检索显示</h3>
      <label className="resourceSideSearchV10">
        <Search size={16}/>
        <input
          placeholder="搜索资产或提示词..."
          value={query.keyword}
          onChange={e=>setQuery?.({...query,keyword:e.target.value,page:1})}
          onKeyDown={e=>{if(e.key==='Enter')triggerSearch?.()}}
        />
      </label>
      <div className="resourceSideGridControlV10" title={`当前显示 ${gridCols} × ${gridRows}，共 ${pageSize} 张`}>
        <div><Grid3X3 size={15}/><span>显示布局</span></div>
        <div className="resourceSideGridSelectsV10">
          <select value={gridCols} onChange={e=>setGridCols?.(Number(e.target.value))}>{[2,3,4,5].map(n=><option key={n} value={n}>{n}列</option>)}</select>
          <select value={gridRows} onChange={e=>setGridRows?.(Number(e.target.value))}>{[2,3,4,5].map(n=><option key={n} value={n}>{n}行</option>)}</select>
        </div>
      </div>
    </div>

    <div className="resourceSideBlockV10">
      <h3><FolderTree size={15}/>{space==='SYSTEM'?'系统分类':space==='STORE'?'门店分类':'个人分类'}</h3>
      <button type="button" className={!activeMain&&!activeSub?'resourceSidePrimaryV10 active':'resourceSidePrimaryV10'} onClick={()=>chooseCategory('','')}>
        <span>全部资产</span><ChevronRight size={15}/>
      </button>
      <div className="resourceSideTreeV10">
        {categorySections.map(section=><div className="resourceSidePurposeV10" key={section.purposeKey||section.purposeName}>
          <div className="resourceSidePurposeTitleV10">{section.purposeName}</div>
          {(section.mains||[]).length?(section.mains||[]).map(main=>{
            const name=mainName(main);
            const subs=main.subs||[];
            if(!name)return null;
            const mainActive=activeMain===name&&!activeSub;
            return <div className="resourceSideMainGroupV10" key={main.id||name}>
              <button type="button" className={mainActive?'active':''} onClick={()=>chooseCategory(name,'')}>
                <span>{name}</span>{subs.length?<ChevronDown size={15}/>:<ChevronRight size={15}/>} 
              </button>
              {!!subs.length&&<div className="resourceSideSubTreeV10">
                {subs.map(sub=>{
                  const s=subName(sub);
                  return <button key={sub?.id||s} type="button" className={activeMain===name&&activeSub===s?'active':''} onClick={()=>chooseCategory(name,s)}>{s}</button>
                })}
              </div>}
            </div>
          }):<div className="resourceSideEmptyV10">暂无分类</div>}
        </div>)}
      </div>
    </div>

    {selectedCount>0&&<div className="resourceBatchBarV8">
      <b>已选 {selectedCount} 项</b>
      <button type="button" onClick={openBatchCategoryModal}>修改分类</button>
      <button type="button" className="danger" onClick={batchDeleteResources}>删除</button>
      <button type="button" className="ghost" onClick={clearResourceSelection}>取消选择</button>
    </div>}

    <div className="resourceSideCategoryActionsV10">
      {canUpload&&<button type="button" title="上传文件" className="resourceSideUploadV10" onClick={openUpload}><Upload size={15}/><span>上传文件</span></button>}
      {canManageCurrentSpace&&<>
        <button type="button" title="添加分类" className="resourceSideCreateV10" onClick={openCategoryPanel}><Plus size={15}/><span>添加分类</span></button>
        <button type="button" title="管理分类" className="resourceSideManageV10" onClick={openCategoryPanel}><Settings size={15}/><span>管理分类</span></button>
      </>}
    </div>
  </aside>;
}
