import {useEffect,useState} from 'react';
import {fetchWorkbenchResources} from '../api/workbenchApi.js';
import {buildWorkbenchResourceCategoryOptions,filterWorkbenchModalResources,filterWorkbenchResources,getCurrentWorkbenchTemplate} from '../model/workbenchResources.js';

export function useWorkbenchResourceLibrary({op,mediaMode,resTypeName}){
  const [resources,setResources]=useState([]);
  const [resourceKeyword,setResourceKeyword]=useState('');
  const [resourceScope,setResourceScope]=useState('SYSTEM');
  const [materialTab,setMaterialTab]=useState('material');
  const [resourceMainCategory,setResourceMainCategory]=useState('');
  const [resourceSubCategory,setResourceSubCategory]=useState('');
  const [selectedResource,setSelectedResource]=useState('');

  useEffect(()=>{
    fetchWorkbenchResources({pageSize:200}).then(data=>setResources(data.items||[])).catch(()=>{});
  },[]);

  useEffect(()=>{setResourceMainCategory('');setResourceSubCategory('')},[op,materialTab,resourceScope,mediaMode]);
  useEffect(()=>{setResourceSubCategory('')},[resourceMainCategory]);
  useEffect(()=>{setSelectedResource('')},[op,materialTab,resourceScope,resourceMainCategory,resourceSubCategory,mediaMode]);

  function currentTemplate(){
    return getCurrentWorkbenchTemplate(resources,selectedResource);
  }

  function getResourceCategoryOptions(){
    return buildWorkbenchResourceCategoryOptions({resources,resourceScope,op,materialTab});
  }

  function getResourceItems(){
    return filterWorkbenchResources({resources,resourceScope,op,materialTab,keyword:resourceKeyword,mainCategory:resourceMainCategory,subCategory:resourceSubCategory});
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
    resourceMainCategory,
    setResourceMainCategory,
    resourceSubCategory,
    setResourceSubCategory,
    selectedResource,
    setSelectedResource,
    currentTemplate,
    getResourceCategoryOptions,
    getResourceItems,
    getModalItems
  };
}
