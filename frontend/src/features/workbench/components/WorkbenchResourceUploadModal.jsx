import React from'react';
import{ImageIcon}from'../../../shared/icons/index.jsx';

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
          <input type="file" accept="image/*" onChange={event=>chooseWorkbenchResourceFile(event.target.files?.[0])}/>
          {resourceUploadPreview?
            <img src={resourceUploadPreview} alt="preview" loading="lazy" decoding="async"/>
            :
            <>
              <ImageIcon size={46}/>
              <b>拖拽图片到这里，或选择文件</b>
              <em>选择文件</em>
            </>}
        </label>
        <div className="resourceUploadSettingsV3">
          <h3>上传设置</h3>
          <p><b>空间：</b><span>{isStoreAdmin?'门店空间':'个人空间'}</span></p>
          <input placeholder="资源名称" value={resourceUpload.name} onChange={event=>setResourceUpload({...resourceUpload,name:event.target.value})}/>
          <select value={resourceUpload.resourceType} onChange={event=>changeWorkbenchUploadType(event.target.value)}>
            <option value="material">材质替换</option>
            <option value="scene">场景融合</option>
            <option value="user_reference">用户图</option>
          </select>
          <select value={resourceUpload.objectName} onChange={event=>changeWorkbenchUploadMain(event.target.value)}>
            {workbenchUploadMainOptions.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
          <select value={resourceUpload.colorName} onChange={event=>setResourceUpload({...resourceUpload,colorName:event.target.value})}>
            <option value="">不设置子类别</option>
            {workbenchUploadSubOptions.map(value=><option key={value} value={value}>{value}</option>)}
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
