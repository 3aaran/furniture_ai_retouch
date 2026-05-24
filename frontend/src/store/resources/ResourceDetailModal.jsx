import React from'react';
import{X}from'lucide-react';
import{fmt,imageViewUrl}from'../../appShared.jsx';
import{getDisplayStatusName,getFeatureDisplayName}from'../../config/uiText.js';

function fileSize(bytes){
  const n=Number(bytes||0);
  if(!n)return '-';
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(2)} MB`;
}

export default function ResourceDetailModal({detail,onClose,onUse}){
  const image=detail?.image||{};
  const tasks=detail?.relatedTasks||[];
  const category=[image.mainCategoryName,image.subCategoryName].filter(Boolean).join(' / ')||'未分类';
  return <div className="resourceDetailMaskV3">
    <div className="resourceDetailPanelV3">
      <header className="resourceDetailHeadV3">
        <h2>资源详情</h2>
        <button type="button" onClick={onClose}><X size={28}/></button>
      </header>
      <main className="resourceDetailBodyV3">
        <section className="resourceDetailPreviewV3">
          {image.url?<img src={imageViewUrl(image)} alt={image.name}/>:<div>暂无图片</div>}
        </section>
        <aside className="resourceDetailInfoV3">
          <h3>{image.name}</h3>
          <dl>
            <dt>文件大小</dt><dd>{fileSize(image.fileSize)}</dd>
            <dt>分辨率</dt><dd>{image.width&&image.height?`${image.width} × ${image.height}`:'-'}</dd>
            <dt>分类</dt><dd>{category}</dd>
            <dt>上传时间</dt><dd>{fmt(image.createdAt)}</dd>
          </dl>
          <div className="resourceDetailActionsV3">
            <button className="primary" type="button" onClick={()=>onUse&&onUse(image)}>智能工作台</button>
            <button type="button" onClick={()=>image.url&&window.open(imageViewUrl(image),'_blank')}>图片处理</button>
          </div>
          <section className="resourceRelatedTasksV3">
            <h4>关联生成记录（{tasks.length}）</h4>
            {tasks.length?tasks.map(task=><article key={task.id}>
              <b>{getFeatureDisplayName(task.featureKey,'AI任务')}</b>
              <span>{getDisplayStatusName(task.status)} · {fmt(task.submittedAt)}</span>
              <small>{task.id}</small>
            </article>):<p>暂无关联生成记录</p>}
          </section>
        </aside>
      </main>
    </div>
  </div>;
}
