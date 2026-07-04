import React,{useEffect,useState}from'react';
import{usePaged,resTypeName}from'../../appShared.jsx';
import{AuroraLayer}from'../../shared/effects/index.jsx';
import{ResourceActionPanel,ResourceGridSection,ResourceModals,ResourceSignalBar,ResourceSpaceTabs,ResourceToolbar,ResourceUploadModal}from'./components/index.jsx';
import{useResourceBatchActions,useResourceCategories,useResourceDetail,useResourcePagination,useResourceRename,useResourceSelection,useResourceUpload}from'./hooks/index.js';
import{deleteResource,fetchAdminResources,fetchPublicResources,updateResource}from'./api/index.js';
import{buildResourceCategoryGroups,buildResourceCategorySections,fixedCategoryUseLabel,getResourceCategoryPurposeOptions,getResourceMainOptions,getResourceSubOptions,normalizeResourceMain,normalizeResourceSub}from'./model/index.js';

function ResourcesPage({me,setMsg}){
  const isSystemAdmin=me?.role==='SYSTEM_ADMIN';
  const isStoreAdmin=me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN';
  const [gridCols,setGridCols]=useState(3);
  const [gridRows,setGridRows]=useState(3);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const pageSize=gridCols*gridRows;
  const {query,setQuery,data,setData,load}=usePaged('/api/merchant/resources',{keyword:'',resourceType:'',mainCategory:'',subCategory:'',status:'',scope:'MERCHANT',page:1,pageSize});
  const [sys,setSys]=useState([]);
  const [space,setSpace]=useState(isSystemAdmin?'SYSTEM':isStoreAdmin?'STORE':'PERSONAL');
  const [sysPage,setSysPage]=useState(1);
  const [activeResourcePanel,setActiveResourcePanel]=useState('');
  const {selectedResourceIds,selectedCount,toggleResourceSelected,clearResourceSelection}=useResourceSelection();
  const {detail,detailImage,detailUrl,detailCategory,openDetail,clearDetail,updateDetailName,updateDetailImageSize}=useResourceDetail({
    setMsg,
    onOpen:()=>{
      setCategoryOpen(false);
      setRenameTarget(null);
      setActiveResourcePanel('detail');
    }
  });
  const canUpload=(isSystemAdmin&&space==='SYSTEM')||(isStoreAdmin&&space==='STORE')||(!isSystemAdmin&&space==='PERSONAL');
  const canManageCurrentSpace=(isSystemAdmin&&space==='SYSTEM')||(isStoreAdmin&&space==='STORE')||(!isSystemAdmin&&space==='PERSONAL');
  const categoryScope=space==='SYSTEM'?'SYSTEM':space==='STORE'?'MERCHANT':'USER';
  const {
    categoryOpen,
    setCategoryOpen,
    categoryTree,
    categoryLoading,
    categoryError,
    categoryForm,
    setCategoryForm,
    loadCategories,
    createMainCategory,
    renameMainCategory,
    deleteMainCategory,
    createSubCategory,
    renameSubCategory,
    deleteSubCategory,
    submitCategoryForm
  }=useResourceCategories({categoryScope,setMsg});

  function fixedCategoryResourceType(main){
    const group=categoryGroups.find(item=>item.name===main||item.rawName===main);
    if(group?.useLabel==='材质替换')return 'material';
    if(group?.useLabel==='场景融合')return 'scene';
    if(main==='材质'||main==='软体')return 'material';
    if(main==='场景模板')return 'scene';
    return 'user_reference';
  }

  const {uploadOpen,setUploadOpen,dragging,setDragging,f,setF,files,preview,uploadStatus,choose,onDrop,closeUpload,changeUploadMain,create}=useResourceUpload({
    categoryScope,
    isSystemAdmin,
    space,
    query,
    setMsg,
    setSys,
    setData,
    setSpace,
    resolveResourceType:fixedCategoryResourceType
  });

  function loadSystemResources(){
    const loader=isSystemAdmin?fetchAdminResources:fetchPublicResources;
    return loader({pageSize:20}).then(result=>setSys((result.items||[]).filter(item=>item.scope==='SYSTEM')));
  }

  const {
    batchCategoryOpen,
    setBatchCategoryOpen,
    batchDeleteOpen,
    setBatchDeleteOpen,
    batchMainCategory,
    setBatchMainCategory,
    batchSubCategory,
    setBatchSubCategory,
    openBatchCategoryModal,
    closeBatchState,
    batchDeleteResources,
    confirmBatchDeleteResources,
    submitBatchCategory
  }=useResourceBatchActions({
    selectedResourceIds,
    resetResourceSelection,
    isSystemAdmin,
    space,
    categoryScope,
    load,
    loadSystemResources,
    setMsg
  });

  const {renameTarget,setRenameTarget,renameValue,setRenameValue,openRename,submitRename}=useResourceRename({
    isSystemAdmin,
    space,
    activeResourcePanel,
    setActiveResourcePanel,
    setCategoryOpen,
    clearDetail,
    updateDetailName,
    load,
    loadSystemResources,
    setMsg
  });

  useEffect(()=>{
    loadSystemResources().catch(error=>setMsg(error.message));
  },[isSystemAdmin]);

  useEffect(()=>{
    setSysPage(1);
    resetResourceSelection();
  },[query.keyword,query.resourceType,query.mainCategory,query.subCategory,query.status,space]);

  useEffect(()=>{
    setSysPage(1);
    setQuery(value=>Number(value.pageSize)===pageSize?value:{...value,page:1,pageSize});
  },[pageSize]);

  useEffect(()=>{
    if(space==='STORE')setQuery(value=>({...value,scope:'MERCHANT',page:1}));
    if(space==='PERSONAL')setQuery(value=>({...value,scope:'USER',page:1}));
  },[space]);

  async function patch(id,status){
    try{
      await updateResource(id,{status},{isSystemAdmin:isSystemAdmin&&space==='SYSTEM'});
      setMsg('状态已更新');
      load();
    }catch(error){
      setMsg(error.message);
    }
  }

  async function del(id){
    if(!confirm('确定删除该资源？'))return;
    try{
      await deleteResource(id,{isSystemAdmin:isSystemAdmin&&space==='SYSTEM'});
      setMsg('资源已删除');
      load();
    }catch(error){
      setMsg(error.message);
    }
  }

  function resetResourceSelection(){
    clearResourceSelection();
    closeBatchState?.();
  }

  function matchSystem(resource){
    const kw=String(query.keyword||'').trim().toLowerCase();
    const okKeyword=!kw||[resource.name,resource.objectName,resource.colorName,resource.mainCategoryName,resource.subCategoryName,resource.description,resTypeName[resource.resourceType]]
      .some(value=>String(value||'').toLowerCase().includes(kw));
    const okType=!query.resourceType||resource.resourceType===query.resourceType;
    const okMain=!query.mainCategory||normalizeResourceMain(resource)===String(query.mainCategory);
    const okSub=!query.subCategory||normalizeResourceSub(resource)===String(query.subCategory);
    const okStatus=!query.status||resource.status===query.status;
    return okKeyword&&okType&&okMain&&okSub&&okStatus;
  }

  const systemItems=sys.filter(matchSystem);
  const {isSystem,displayItems,total,currentPage,totalPages,changePage}=useResourcePagination({
    space,
    systemItems,
    data,
    query,
    pageSize,
    sysPage,
    setSysPage,
    setQuery
  });
  const spaceLabel=space==='SYSTEM'?'系统空间':space==='STORE'?'门店空间':'个人空间';
  const resourceSignalItems=[spaceLabel,`共 ${total} 条`,selectedResourceIds.size?`已选 ${selectedResourceIds.size}`:'未选择',`${gridCols}列 × ${gridRows}行`];

  function triggerSearch(){
    if(isSystem)setSysPage(1);
    else setQuery(value=>({...value,page:1}));
  }

  const categoryGroups=buildResourceCategoryGroups({categoryTree,systemItems:sys,dataItems:data.items||[]});
  const mainOptions=getResourceMainOptions(categoryGroups);
  const subOptions=getResourceSubOptions(categoryGroups,query.mainCategory);
  const batchSubOptions=getResourceSubOptions(categoryGroups,batchMainCategory);
  const uploadMain=f.objectName||'';
  const uploadSubOptions=getResourceSubOptions(categoryGroups,uploadMain);

  const categorySections=buildResourceCategorySections(categoryTree);
  const categoryPurposeOptions=getResourceCategoryPurposeOptions(categorySections);
  const canCreateCategory=canManageCurrentSpace;

  function closeSidePanel(){
    setCategoryOpen(false);
    clearDetail();
    setRenameTarget(null);
    setCategoryForm(null);
    setActiveResourcePanel('');
  }

  function openCategoryPanel(){
    clearDetail();
    setRenameTarget(null);
    setCategoryOpen(true);
    setActiveResourcePanel('category');
  }

  return <div className={`resourcePageV3 ${sidebarCollapsed?'resourcePageCollapsedV10':''}`} style={{'--resource-cols':gridCols}}>
    <AuroraLayer variant="resources"/>
    <ResourceToolbar
      query={query}
      setQuery={setQuery}
      triggerSearch={triggerSearch}
      gridCols={gridCols}
      gridRows={gridRows}
      setGridCols={setGridCols}
      setGridRows={setGridRows}
      pageSize={pageSize}
    />

    <ResourceSpaceTabs
      space={space}
      setSpace={setSpace}
      isSystemAdmin={isSystemAdmin}
      selectedCount={selectedCount}
      openBatchCategoryModal={openBatchCategoryModal}
      batchDeleteResources={batchDeleteResources}
      clearResourceSelection={resetResourceSelection}
      categorySections={categorySections}
      query={query}
      setQuery={setQuery}
      canManageCurrentSpace={canManageCurrentSpace}
      openCategoryPanel={openCategoryPanel}
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      canUpload={canUpload}
      openUpload={()=>setUploadOpen(true)}
      triggerSearch={triggerSearch}
      gridCols={gridCols}
      gridRows={gridRows}
      setGridCols={setGridCols}
      setGridRows={setGridRows}
      pageSize={pageSize}
    />

    <ResourceActionPanel
      activeResourcePanel={activeResourcePanel}
      canCreateCategory={canCreateCategory}
      categorySections={categorySections}
      categoryLoading={categoryLoading}
      categoryError={categoryError}
      createMainCategory={createMainCategory}
      renameMainCategory={renameMainCategory}
      deleteMainCategory={deleteMainCategory}
      createSubCategory={createSubCategory}
      renameSubCategory={renameSubCategory}
      deleteSubCategory={deleteSubCategory}
      loadCategories={loadCategories}
      closeSidePanel={closeSidePanel}
      detail={detail}
      detailImage={detailImage}
      detailUrl={detailUrl}
      detailCategory={detailCategory}
      updateDetailImageSize={updateDetailImageSize}
      openRename={openRename}
    />

    <ResourceModals
      renameTarget={renameTarget}
      renameValue={renameValue}
      setRenameValue={setRenameValue}
      setRenameTarget={setRenameTarget}
      submitRename={submitRename}
      batchCategoryOpen={batchCategoryOpen}
      selectedCount={selectedCount}
      batchMainCategory={batchMainCategory}
      setBatchMainCategory={setBatchMainCategory}
      batchSubCategory={batchSubCategory}
      setBatchSubCategory={setBatchSubCategory}
      mainOptions={mainOptions}
      batchSubOptions={batchSubOptions}
      setBatchCategoryOpen={setBatchCategoryOpen}
      submitBatchCategory={submitBatchCategory}
      batchDeleteOpen={batchDeleteOpen}
      setBatchDeleteOpen={setBatchDeleteOpen}
      confirmBatchDeleteResources={confirmBatchDeleteResources}
      categoryForm={categoryForm}
      setCategoryForm={setCategoryForm}
      categoryPurposeOptions={categoryPurposeOptions}
      submitCategoryForm={submitCategoryForm}
    />

    <div className="resourceInlineLayoutV6">
      <ResourceSignalBar items={resourceSignalItems}/>
      <ResourceGridSection
        displayItems={displayItems}
        space={space}
        canManageCurrentSpace={canManageCurrentSpace}
        selectedResourceIds={selectedResourceIds}
        toggleResourceSelected={toggleResourceSelected}
        onPreview={id=>{setCategoryOpen(false);setRenameTarget(null);openDetail(id)}}
        openRename={openRename}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        changePage={changePage}
      />
    </div>

    {uploadOpen&&<ResourceUploadModal
      dragging={dragging}
      setDragging={setDragging}
      onDrop={onDrop}
      choose={choose}
      preview={preview}
      files={files}
      categoryScope={categoryScope}
      f={f}
      setF={setF}
      uploadMain={uploadMain}
      changeUploadMain={changeUploadMain}
      categoryGroups={categoryGroups}
      uploadSubOptions={uploadSubOptions}
      closeUpload={closeUpload}
      create={create}
      uploadStatus={uploadStatus}
    />}
  </div>;
}

export default ResourcesPage;
