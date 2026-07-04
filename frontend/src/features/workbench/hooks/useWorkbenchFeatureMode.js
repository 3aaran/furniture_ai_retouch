import {useState} from 'react';
import {DEFAULT_PROMOTION_KEY,getPromotionFeature,isPromotionFeatureKey} from '../model/promotionFeatures.js';
import {BASE_RATIO_OPTIONS,BASE_RESOLUTION_OPTIONS} from '../model/workbenchOptions.js';

export function useWorkbenchFeatureMode(){
  const [op,setOp]=useState('material');
  const [featureGroup,setFeatureGroup]=useState('base');
  const [mediaMode,setMediaMode]=useState('image');
  const [resolution,setResolution]=useState('2K');
  const [ratio,setRatio]=useState('自适应');
  const [featurePopover,setFeaturePopover]=useState({open:false,group:'base',x:0,y:0});

  function resetImageOutputOptions(){
    setRatio(value=>BASE_RATIO_OPTIONS.includes(value)?value:'自适应');
    setResolution(value=>BASE_RESOLUTION_OPTIONS.includes(value)?value:'2K');
  }

  function openFeaturePopover(group,event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const fallbackRect=event?.currentTarget?.getBoundingClientRect?.();
    const x=Math.min(window.innerWidth-330,Math.max(16,Number(event?.clientX||fallbackRect?.right||260)+12));
    const y=Math.min(window.innerHeight-280,Math.max(88,Number(event?.clientY||fallbackRect?.top||160)-16));
    setFeaturePopover({open:true,group,x,y});
  }

  function closeFeaturePopover(){
    setFeaturePopover(prev=>({...prev,open:false}));
  }

  function activateFeatureGroup(group){
    if(group==='base'){
      setFeatureGroup('base');
      setMediaMode('image');
      setOp(current=>isPromotionFeatureKey(current)?'material':current);
      resetImageOutputOptions();
      closeFeaturePopover();
      return;
    }
    if(group==='promotion'){
      setFeatureGroup('promotion');
      setMediaMode('image');
      setOp(current=>isPromotionFeatureKey(current)?current:DEFAULT_PROMOTION_KEY);
      resetImageOutputOptions();
      closeFeaturePopover();
      return;
    }
    setFeatureGroup('video');
    setMediaMode('video');
    closeFeaturePopover();
  }

  function selectPromotionFeature(key){
    const feature=getPromotionFeature(key);
    setFeatureGroup('promotion');
    setMediaMode('image');
    setOp(feature.key);
    resetImageOutputOptions();
    closeFeaturePopover();
  }

  function selectBaseFeature(key){
    setFeatureGroup('base');
    setMediaMode('image');
    setOp(key);
    resetImageOutputOptions();
    closeFeaturePopover();
  }

  return {
    op,
    setOp,
    featureGroup,
    setFeatureGroup,
    mediaMode,
    setMediaMode,
    resolution,
    setResolution,
    ratio,
    setRatio,
    featurePopover,
    setFeaturePopover,
    openFeaturePopover,
    closeFeaturePopover,
    activateFeatureGroup,
    selectPromotionFeature,
    selectBaseFeature,
    isPromotionSelected:isPromotionFeatureKey(op)
  };
}
