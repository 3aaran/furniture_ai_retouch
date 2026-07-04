import React from 'react';
import {Plus,RotateCcw,Pencil,Trash2,X} from '../../../shared/icons/index.jsx';
import {fmt} from '../../../appShared.jsx';
import {getDisplayStatusName,getFeatureDisplayName} from '../../../config/uiText.js';
import {detailResolutionText} from '../hooks/useResourceDetail.js';

function formatResourceBytes(bytes){
  const n=Number(bytes||0);
  if(!n)return '-';
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(2)} MB`;
}

function ResourceCategoryPanel({
  canCreateCategory,
  categorySections,
  categoryLoading,
  categoryError,
  createMainCategory,
  renameMainCategory,
  deleteMainCategory,
  createSubCategory,
  renameSubCategory,
  deleteSubCategory,
  loadCategories,
  closeSidePanel
}){
  return <div className="resourceActionContentV7">
    <div className="resourceCategoryDrawerHeadV7">
      <div><h2>分类管理</h2></div>
      <div className="resourceCategoryDrawerActionsV7">
        {canCreateCategory&&<button type="button" className="primary" onClick={()=>createMainCategory('user_reference')}><Plus size={16}/>创建主分类</button>}
        <button type="button" className="iconOnly" title="刷新" aria-label="刷新" onClick={loadCategories}><RotateCcw size={17}/></button>
        <button type="button" className="iconOnly" title="收起" aria-label="收起" onClick={closeSidePanel}><X size={18}/></button>
      </div>
    </div>
    {categoryLoading&&<div className="resourceSideStateV6">分类加载中...</div>}
    {categoryError&&<div className="resourceSideStateV6 error">{categoryError}</div>}
    <div className="resourceCategoryFlatV7">
      {categorySections.map(section=><section className="resourceCategorySectionInlineV6" key={section.purposeKey}>
        <div className="resourceCategoryPurposeV6">
          <h3>{section.purposeName}</h3>
          {canCreateCategory&&<button type="button" onClick={()=>createMainCategory(section.purposeKey)}><Plus size={14}/>新增</button>}
        </div>
        {(section.mains||[]).length?(section.mains||[]).map(main=><article className="resourceCategoryMainV6" key={main.id}>
          <div className="resourceCategoryMainHeadV6">
            <b>{main.name}</b>
            <span>{(main.subs||[]).length} 个子分类</span>
            {main.canManage&&<button type="button" onClick={()=>renameMainCategory(main)}><Pencil size={15}/></button>}
            {main.canManage&&!main.isFixed&&<button className="danger" type="button" onClick={()=>deleteMainCategory(main)}><Trash2 size={15}/></button>}
          </div>
          <div className="resourceCategorySubListV6">
            {(main.subs||[]).length?(main.subs||[]).map(sub=><div className="resourceCategorySubItemV6" key={sub.id}>
              <span>{sub.name}</span>
              {main.canManage&&<button type="button" onClick={()=>renameSubCategory(sub)}><Pencil size={14}/></button>}
              {main.canManage&&<button className="danger" type="button" onClick={()=>deleteSubCategory(sub)}><Trash2 size={14}/></button>}
            </div>):<div className="resourceCategoryEmptyV6">暂无子分类</div>}
            {main.canManage&&<button className="resourceCategoryAddSubV6" type="button" onClick={()=>createSubCategory(main)}><Plus size={14}/>添加子分类</button>}
          </div>
        </article>):<div className="resourceCategoryEmptyV6">暂无主分类，点击“新增”创建</div>}
      </section>)}
    </div>
  </div>;
}

function ResourceDetailPanel({
  detail,
  detailImage,
  detailUrl,
  detailCategory,
  updateDetailImageSize,
  openRename,
  closeSidePanel
}){
  if(!detail||!detailImage)return null;
  return <div className="resourceActionContentV7 resourceDetailFlatV7">
    <div className="resourceDetailImageV6">
      {detailUrl?<img src={detailUrl} alt={detailImage.name} onLoad={updateDetailImageSize} loading="lazy" decoding="async"/>:<span>暂无图片</span>}
    </div>
    <div>
      <div className="resourceDetailTitleV6">
        <h3>{detailImage.name}</h3>
        <button type="button" onClick={()=>openRename({id:detailImage.id,name:detailImage.name},{keepDetail:true})}><Pencil size={16}/></button>
        <button type="button" onClick={closeSidePanel}><X size={17}/></button>
      </div>
      <dl className="resourceDetailMetaV6">
        <dt>文件大小</dt><dd>{formatResourceBytes(detailImage.fileSize)}</dd>
        <dt>分辨率</dt><dd>{detailResolutionText(detailImage)}</dd>
        <dt>分类</dt><dd>{detailCategory}</dd>
        <dt>上传时间</dt><dd>{fmt(detailImage.createdAt)}</dd>
      </dl>
      <div className="resourceDetailActionsV6">
        <button type="button" onClick={()=>localStorage.setItem('pendingWorkbenchImage',JSON.stringify({id:detailImage.id,url:detailImage.url,name:detailImage.name}))}>智能工作台</button>
        <button type="button" onClick={()=>detailUrl&&window.open(detailUrl,'_blank')}>图片处理</button>
      </div>
    </div>
    <section className="resourceRelatedTasksV6">
      <h4>关联生成记录（{(detail.relatedTasks||[]).length}）</h4>
      {(detail.relatedTasks||[]).length?(detail.relatedTasks||[]).map(t=><article key={t.id}>
        <b>{getFeatureDisplayName(t.featureKey,'AI任务')}</b>
        <span>{getDisplayStatusName(t.status)} · {fmt(t.submittedAt)}</span>
      </article>):<div className="resourceCategoryEmptyV6">暂无关联生成记录</div>}
    </section>
  </div>;
}

function ResourceActionPanel(props){
  const {activeResourcePanel}=props;
  if(!activeResourcePanel)return null;
  return <section className={activeResourcePanel==='category'?'resourceActionPanelV7 categoryDrawerV7':activeResourcePanel==='detail'?'resourceActionPanelV7 detailDrawerV7':'resourceActionPanelV7'}>
    {activeResourcePanel==='category'&&<ResourceCategoryPanel {...props}/>} 
    {activeResourcePanel==='detail'&&<ResourceDetailPanel {...props}/>} 
  </section>;
}

export default ResourceActionPanel;
