import React from'react';
import{Image as ImageIcon}from'lucide-react';

export default function WorkbenchResourceUploadModal({
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
  onClose
}){
  const isStoreAdmin=me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN';
  return <div className="resourceUploadMaskV3">
    <div className="resourceUploadModalV3">
      <div className="resourceUploadHeadV3">
        <h2>上传资源</h2>
        <button type="button" onClick={onClose}>×</button>
      </div>
      <div className="resourceUploadBodyV3">
        <label className="resourceDropV3">
          <input type="file" accept="image/*" onChange={e=>chooseWorkbenchResourceFile(e.target.files?.[0])}/>
          {resourceUploadPreview?<img src={resourceUploadPreview} alt="preview"/>:<>
            <ImageIcon size={46}/>
            <b>拖拽图片到这里，或选择文件</b>
            <span>用于材质替换或场景融合资源</span>
            <em>选择文件</em>
          </>}
        </label>
        <div className="resourceUploadSettingsV3">
          <h3>上传设置</h3>
          <p><b>空间：</b><span>{isStoreAdmin?'门店空间':'个人空间'}</span><small>{isStoreAdmin?' 当前门店共享使用':' 仅当前账号使用'}</small></p>
          <input placeholder="资源名称" value={resourceUpload.name} onChange={e=>setResourceUpload({...resourceUpload,name:e.target.value})}/>
          <select value={resourceUpload.resourceType} onChange={e=>changeWorkbenchUploadType(e.target.value)}>
            <option value="material">材质替换</option>
            <option value="scene">场景融合</option>
            <option value="user_reference">用户图</option>
          </select>
          <select value={resourceUpload.objectName} onChange={e=>changeWorkbenchUploadMain(e.target.value)}>
            {workbenchUploadMainOptions.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          <select value={resourceUpload.colorName} onChange={e=>setResourceUpload({...resourceUpload,colorName:e.target.value})}>
            <option value="">不设置子类别</option>
            {workbenchUploadSubOptions.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="resourceUploadFootV3">
        <button type="button" onClick={onClose}>取消</button>
        <button className="primary" type="button" disabled={!resourceUploadFile||!resourceUpload.name.trim()} onClick={createWorkbenchResource}>开始上传</button>
      </div>
    </div>
  </div>;
}
