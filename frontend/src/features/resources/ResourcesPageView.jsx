import React from'react';
import{AuroraLayer}from'../../shared/effects/index.jsx';
import{ResourceActionPanel,ResourceGridSection,ResourceModals,ResourceSignalBar,ResourceSpaceTabs,ResourceToolbar,ResourceUploadModal}from'./components/index.jsx';

function ResourcesPageView({
  sidebarCollapsed,
  gridCols,
  gridRows,
  pageSize,
  query,
  setQuery,
  triggerSearch,
  setGridCols,
  setGridRows,
  space,
  setSpace,
  isSystemAdmin,
  selectedCount,
  openBatchCategoryModal,
  batchDeleteResources,
  resetResourceSelection,
  categorySections,
  canManageCurrentSpace,
  openCategoryPanel,
  setSidebarCollapsed,
  canUpload,
  openUpload,
  activeResourcePanel,
  canCreateCategory,
  categoryLoading,
  categoryError,
  createMainCategory,
  renameMainCategory,
  deleteMainCategory,
  createSubCategory,
  renameSubCategory,
  deleteSubCategory,
  loadCategories,
  closeSidePanel,
  detail,
  detailImage,
  detailUrl,
  detailCategory,
  updateDetailImageSize,
  openRename,
  modalsProps,
  resourceSignalItems,
  displayItems,
  selectedResourceIds,
  toggleResourceSelected,
  openPreview,
  total,
  currentPage,
  totalPages,
  changePage,
  uploadOpen,
  uploadProps
}){
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
      openUpload={openUpload}
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

    <ResourceModals {...modalsProps}/>

    <div className="resourceInlineLayoutV6">
      <ResourceSignalBar items={resourceSignalItems}/>
      <ResourceGridSection
        displayItems={displayItems}
        space={space}
        canManageCurrentSpace={canManageCurrentSpace}
        selectedResourceIds={selectedResourceIds}
        toggleResourceSelected={toggleResourceSelected}
        onPreview={openPreview}
        openRename={openRename}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        changePage={changePage}
      />
    </div>

    {uploadOpen&&<ResourceUploadModal {...uploadProps}/>}
  </div>;
}

export default ResourcesPageView;
