import {useEffect,useState} from 'react';
import {fetchWorkbenchResources} from '../api/workbenchApi.js';
import {filterWorkbenchModalResources,filterWorkbenchResources,getCurrentWorkbenchTemplate} from '../model/workbenchResources.js';

export function useWorkbenchResourceLibrary({op,mediaMode,resTypeName}){
  const [resources,setResources]=useState([]);
  const [resourceKeyword,setResourceKeyword]=useState('');
  const [resourceScope,setResourceScope]=useState('SYSTEM');
  const [materialTab,setMaterialTab]=useState('material');
  const [selectedResource,setSelectedResource]=useState('');

  useEffect(()=>{
    fetchWorkbenchResources({pageSize:20}).then(data=>setResources(data.items||[])).catch(()=>{});
  },[]);

  useEffect(()=>{setSelectedResource('')},[op,materialTab,resourceScope,mediaMode]);

  function currentTemplate(){
    return getCurrentWorkbenchTemplate(resources,selectedResource);
  }

  function getResourceItems(){
    return filterWorkbenchResources({resources,resourceScope,op,materialTab,keyword:resourceKeyword});
  }

  function getModalItems(resourceModal){
    return filterWorkbenchModalResources({resources,resourceModal,resTypeName});
  }

  return {
    resources,
    setResources,
    resourceKeyword,
    setResourceKeyword,
    resourceScope,
    setResourceScope,
    materialTab,
    setMaterialTab,
    selectedResource,
    setSelectedResource,
    currentTemplate,
    getResourceItems,
    getModalItems
  };
}
