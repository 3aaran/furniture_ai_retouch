import React from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog.jsx';

function RenameResourceModal({renameTarget,renameValue,setRenameValue,setRenameTarget,submitRename}){
  if(!renameTarget)return null;
  return <div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setRenameTarget(null);}}>
    <div className="resourceCategoryModalV8 resourceRenameModalV8" role="dialog" aria-modal="true" aria-label="重命名资源">
      <h2>重命名资源</h2>
      <input className="resourceCategoryModalInputV8" value={renameValue} autoFocus placeholder="资源名称 *" onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitRename();}}/>
      <div className="resourceCategoryModalActionsV8">
        <button type="button" onClick={()=>setRenameTarget(null)}>取消</button>
        <button type="button" className="primary" disabled={!renameValue.trim()} onClick={submitRename}>保存</button>
      </div>
    </div>
  </div>;
}

function BatchCategoryModal({
  open,
  selectedCount,
  batchMainCategory,
  setBatchMainCategory,
  batchSubCategory,
  setBatchSubCategory,
  mainOptions,
  batchSubOptions,
  setBatchCategoryOpen,
  submitBatchCategory
}){
  if(!open)return null;
  return <div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setBatchCategoryOpen(false);}}>
    <div className="resourceCategoryModalV8 resourceBatchCategoryModalV8" role="dialog" aria-modal="true" aria-label="批量更改分类">
      <h2>批量更改分类（已选 {selectedCount} 项）</h2>
      <select className="resourceCategoryModalSelectV8" value={batchMainCategory} onChange={e=>{setBatchMainCategory(e.target.value);setBatchSubCategory('');}}>
        <option value="">不分类</option>
        {mainOptions.map(name=><option key={name} value={name}>{name}</option>)}
      </select>
      <select className="resourceCategoryModalSelectV8" value={batchSubCategory} disabled={!batchMainCategory} onChange={e=>setBatchSubCategory(e.target.value)}>
        <option value="">子分类</option>
        {batchSubOptions.map(name=><option key={name} value={name}>{name}</option>)}
      </select>
      <div className="resourceCategoryModalActionsV8">
        <button type="button" onClick={()=>setBatchCategoryOpen(false)}>取消</button>
        <button type="button" className="primary" onClick={submitBatchCategory}>确定</button>
      </div>
    </div>
  </div>;
}

function CategoryFormModal({categoryForm,setCategoryForm,categoryPurposeOptions,submitCategoryForm}){
  if(!categoryForm)return null;
  return <div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setCategoryForm(null);}}>
    <div className={`resourceCategoryModalV8 ${categoryForm.danger?'danger':''}`} role="dialog" aria-modal="true" aria-label={categoryForm.title}>
      <h2>{categoryForm.title}</h2>
      {categoryForm.danger?<>
        <p className="resourceCategoryModalTextV8">确认删除“{categoryForm.value}”？删除后该分类不会再显示。</p>
      </>:<>
        <input className="resourceCategoryModalInputV8" value={categoryForm.value} autoFocus placeholder={`${categoryForm.label} *`} onChange={e=>setCategoryForm({...categoryForm,value:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')submitCategoryForm();}}/>
        {categoryForm.mode==='createMain'&&<select className="resourceCategoryModalSelectV8" value={categoryForm.purposeKey||''} onChange={e=>setCategoryForm({...categoryForm,purposeKey:e.target.value})}>
          {categoryPurposeOptions.map(option=><option key={option.key} value={option.key}>{option.name}</option>)}
        </select>}
      </>}
      <div className="resourceCategoryModalActionsV8">
        <button type="button" onClick={()=>setCategoryForm(null)}>取消</button>
        <button type="button" className={categoryForm.danger?'danger':'primary'} disabled={!categoryForm.danger&&!String(categoryForm.value||'').trim()} onClick={submitCategoryForm}>{categoryForm.danger?'确认删除':'保存'}</button>
      </div>
    </div>
  </div>;
}

function ResourceModals(props){
  const {
    batchDeleteOpen,
    selectedCount,
    setBatchDeleteOpen,
    confirmBatchDeleteResources
  }=props;
  return <>
    <RenameResourceModal {...props}/>
    <BatchCategoryModal {...props} open={props.batchCategoryOpen}/>
    <ConfirmDialog
      open={batchDeleteOpen}
      title="批量删除资源"
      message={`确认删除已选的 ${selectedCount} 个资源？删除后资源不会再显示。`}
      confirmText="确认删除"
      danger
      onClose={()=>setBatchDeleteOpen(false)}
      onConfirm={confirmBatchDeleteResources}
    />
    <CategoryFormModal {...props}/>
  </>;
}

export default ResourceModals;
