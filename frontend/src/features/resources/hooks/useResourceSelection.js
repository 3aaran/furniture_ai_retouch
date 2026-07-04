import {useState} from 'react';

export function useResourceSelection(){
  const [selectedResourceIds,setSelectedResourceIds]=useState(()=>new Set());
  const selectedCount=selectedResourceIds.size;

  function toggleResourceSelected(id,checked){
    setSelectedResourceIds(prev=>{
      const next=new Set(prev);
      if(checked)next.add(String(id));
      else next.delete(String(id));
      return next;
    });
  }

  function clearResourceSelection(){
    setSelectedResourceIds(new Set());
  }

  return {
    selectedResourceIds,
    selectedCount,
    toggleResourceSelected,
    clearResourceSelection
  };
}
