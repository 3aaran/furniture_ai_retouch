import React from 'react';
import{ConfirmDialog}from '../../../shared/ui/index.jsx';
import ResourcePickerModal from './ResourcePickerModal.jsx';
import WorkbenchResourceUploadModal from './WorkbenchResourceUploadModal.jsx';
import WatermarkConfigModal from './WatermarkConfigModal.jsx';

function WorkbenchModals({
  TaskDetailModal,
  taskDetailLoading,
  taskDetail,
  setTaskDetail,
  ops,
  setMsg,
  setRecent,
  refreshRecent,
  recentItems,
  openRecentTask,
  continueWithImage,
  resourceModal,
  setResourceModal,
  modalItems,
  chooseResourceImage,
  listImgSrc,
  watermarkOpen,
  setWatermarkOpen,
  loadWorkbenchWatermark,
  deleteTarget,
  setDeleteTarget,
  confirmDeleteRecentTask,
  resourceUploadOpen,
  me,
  resourceUpload,
  setResourceUpload,
  resourceUploadFile,
  resourceUploadPreview,
  chooseWorkbenchResourceFile,
  changeWorkbenchUploadType,
  changeWorkbenchUploadMain,
  workbenchUploadMainOptions,
  workbenchUploadSubOptions,
  createWorkbenchResource,
  closeWorkbenchResourceUpload
}){
  return <>
    {taskDetailLoading&&<div className="modalMask"><div className="empty big">加载中...</div></div>}
    {taskDetail&&!taskDetailLoading&&<TaskDetailModal
      detail={taskDetail}
      onClose={()=>setTaskDetail(null)}
      isAdmin={false}
      ops={ops}
      setMsg={setMsg}
      onDeleted={(id)=>{setRecent(prev=>prev.filter(item=>String(item.resultImage?.id||item.imageId||item.id)!==String(id)));refreshRecent();}}
      onUpdated={(image)=>{setTaskDetail(prev=>prev?{...prev,...image}:image);refreshRecent();}}
      taskList={recentItems}
      onSwitchTask={openRecentTask}
      onContinueImage={continueWithImage}
    />}

    <ResourcePickerModal resourceModal={resourceModal} setResourceModal={setResourceModal} modalItems={modalItems} chooseResourceImage={chooseResourceImage} imgSrc={listImgSrc}/>
    <WatermarkConfigModal open={watermarkOpen} onClose={()=>{setWatermarkOpen(false);loadWorkbenchWatermark();}} setMsg={setMsg}/>
    <ConfirmDialog
      open={!!deleteTarget}
      title="删除图片"
      message="确认删除这张生成图片吗？删除后将无法恢复。"
      confirmText="确认删除"
      danger
      onClose={()=>setDeleteTarget(null)}
      onConfirm={confirmDeleteRecentTask}
    />
    {resourceUploadOpen&&<WorkbenchResourceUploadModal
      me={me}
      resourceUpload={resourceUpload}
      setResourceUpload={setResourceUpload}
      resourceUploadFile={resourceUploadFile}
      resourceUploadPreview={resourceUploadPreview}
      chooseWorkbenchResourceFile={chooseWorkbenchResourceFile}
      changeWorkbenchUploadType={changeWorkbenchUploadType}
      changeWorkbenchUploadMain={changeWorkbenchUploadMain}
      workbenchUploadMainOptions={workbenchUploadMainOptions}
      workbenchUploadSubOptions={workbenchUploadSubOptions}
      createWorkbenchResource={createWorkbenchResource}
      onClose={closeWorkbenchResourceUpload}
    />}
  </>;
}

export default WorkbenchModals;
