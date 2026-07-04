import {useState} from 'react';
import {deleteResource,updateResource} from '../api/resourcesApi.js';

export function useResourceBatchActions({
  selectedResourceIds,
  resetResourceSelection,
  isSystemAdmin,
  space,
  categoryScope,
  load,
  loadSystemResources,
  setMsg
}){
  const [batchCategoryOpen,setBatchCategoryOpen]=useState(false);
  const [batchDeleteOpen,setBatchDeleteOpen]=useState(false);
  const [batchMainCategory,setBatchMainCategory]=useState('');
  const [batchSubCategory,setBatchSubCategory]=useState('');
  const isSystemResourceAdmin=isSystemAdmin&&space==='SYSTEM';

  function openBatchCategoryModal(){
    setBatchMainCategory('');
    setBatchSubCategory('');
    setBatchCategoryOpen(true);
  }

  function closeBatchState(){
    setBatchCategoryOpen(false);
    setBatchDeleteOpen(false);
  }

  function batchDeleteResources(){
    const ids=Array.from(selectedResourceIds||[]);
    if(!ids.length)return;
    setBatchDeleteOpen(true);
  }

  async function confirmBatchDeleteResources(){
    const ids=Array.from(selectedResourceIds||[]);
    if(!ids.length)return;
    try{
      for(const id of ids){
        await deleteResource(id,{isSystemAdmin:isSystemResourceAdmin});
      }
      setMsg?.(`已删除 ${ids.length} 个资源`);
      resetResourceSelection?.();
      load?.();
      loadSystemResources?.().catch?.(()=>{});
    }catch(e){
      setMsg?.(e.message);
    }
  }

  async function submitBatchCategory(){
    const ids=Array.from(selectedResourceIds||[]);
    if(!ids.length)return;
    try{
      for(const id of ids){
        await updateResource(id,{objectName:batchMainCategory,colorName:batchSubCategory,scope:categoryScope},{isSystemAdmin:isSystemResourceAdmin});
      }
      setMsg?.(`已修改 ${ids.length} 个资源的分类`);
      setBatchCategoryOpen(false);
      resetResourceSelection?.();
      load?.();
      loadSystemResources?.().catch?.(()=>{});
    }catch(e){
      setMsg?.(e.message);
    }
  }

  return {
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
  };
}
