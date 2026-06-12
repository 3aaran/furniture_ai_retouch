import React from'react';
import{Image as ImageIcon}from'lucide-react';

export default function ResourceUploadModal({
  dragging,
  setDragging,
  onDrop,
  choose,
  preview,
  files,
  categoryScope,
  f,
  setF,
  uploadMain,
  changeUploadMain,
  categoryGroups,
  uploadSubOptions,
  closeUpload,
  create,
  uploadStatus
}){
  return <div className="resourceUploadMaskV3">
    <div className="resourceUploadModalV3">
      <div className="resourceUploadHeadV3">
        <h2>上传资源</h2>
        <button type="button" onClick={closeUpload}>×</button>
      </div>

      <div className="resourceUploadBodyV3">
        <label
          className={dragging?'resourceDropV3 dragging':'resourceDropV3'}
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
        >
          <input type="file" accept="image/*" multiple onChange={choose}/>
          {preview?
            <>
              <img src={preview} alt="preview" loading="lazy" decoding="async"/>
              {uploadStatus&&<strong className={`resourceUploadStatusV3 ${uploadStatus==='上传失败'?'failed':uploadStatus==='上传成功'?'success':'uploading'}`}>{uploadStatus}</strong>}
              {files.length>1&&<span>已选择 {files.length} 张图片</span>}
            </>
            :
            <>
              <ImageIcon size={46}/>
              <b>拖拽图片到这里，或选择文件</b>
              <em>选择文件</em>
            </>}
        </label>

        <div className="resourceUploadSettingsV3">
          <h3>上传设置</h3>
          <p><b>空间：</b><span>{categoryScope==='SYSTEM'?'系统空间':categoryScope==='MERCHANT'?'门店空间':'个人空间'}</span></p>

          <input placeholder={files.length>1?'批量上传将使用图片原名':'资源名称（可选，默认使用图片原名）'} value={f.name} disabled={files.length>1} onChange={e=>setF({...f,name:e.target.value})}/>

          <select value={uploadMain} onChange={e=>changeUploadMain(e.target.value)}>
            <option value="">不分类</option>
            {categoryGroups.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}
          </select>

          <select value={f.colorName} disabled={!uploadMain} onChange={e=>setF({...f,colorName:e.target.value})}>
            <option value="">选择子分类（可选）</option>
            {uploadSubOptions.map(v=><option key={v} value={v}>{v}</option>)}
          </select>

          <textarea placeholder="资源说明/可用于提示词的关键词" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
        </div>
      </div>

      <div className="resourceUploadFootV3">
        <button type="button" onClick={closeUpload}>取消</button>
        <button className="primary" type="button" disabled={!files.length} onClick={create}>开始上传{files.length>1?`（${files.length} 张）`:''}</button>
      </div>
    </div>
  </div>;
}
