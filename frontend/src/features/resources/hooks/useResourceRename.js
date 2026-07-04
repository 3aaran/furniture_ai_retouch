import {useState} from 'react';
import {updateResource} from '../api/resourcesApi.js';

export function useResourceRename({
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
}){
  const [renameTarget,setRenameTarget]=useState(null);
  const [renameValue,setRenameValue]=useState('');

  function openRename(resource,{keepDetail=false}={}){
    setCategoryOpen(false);
    if(!keepDetail){
      clearDetail?.();
      setActiveResourcePanel('');
    }
    setRenameTarget(resource);
    setRenameValue(resource.name||'');
  }

  async function submitRename(){
    try{
      const name=renameValue.trim();
      if(!name)return setMsg?.('资源名称不能为空');
      await updateResource(renameTarget.id,{name},{isSystemAdmin:isSystemAdmin&&space==='SYSTEM'});
      setMsg?.('资源已重命名');
      updateDetailName?.(renameTarget.id,name);
      setRenameTarget(null);
      if(activeResourcePanel!=='detail')setActiveResourcePanel('');
      load?.();
      loadSystemResources?.().catch?.(()=>{});
    }catch(e){
      setMsg?.(e.message);
    }
  }

  return {
    renameTarget,
    setRenameTarget,
    renameValue,
    setRenameValue,
    openRename,
    submitRename
  };
}
