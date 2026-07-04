import {buildPromotionOptions,isPromotionFeatureKey} from './promotionFeatures.js';

const COST_KEY_BY_OPERATION={
  material:'cost_material',
  replace_bg:'cost_replace_bg',
  remove_bg:'cost_remove_bg',
  enhance:'cost_enhance',
  lineart:'cost_lineart',
  multiview:'cost_multiview',
  promo_main_image:'cost_replace_bg',
  promo_poster_image:'cost_replace_bg',
  promo_detail_image:'cost_enhance'
};

const RESOLUTION_MULTIPLIER_KEY={
  '1K':'resolution_multiplier_1k',
  '2K':'resolution_multiplier_2k',
  '4K':'resolution_multiplier_4k'
};

const DEFAULT_RESOLUTION_MULTIPLIER={
  '1K':1,
  '2K':2,
  '4K':4
};

export function calculateWorkbenchCost({costSettings={},ops={},nextOp,nextResolution}){
  const base=Number(costSettings[COST_KEY_BY_OPERATION[nextOp]] ?? ops[nextOp]?.cost ?? 0);
  const multiplier=Number(costSettings[RESOLUTION_MULTIPLIER_KEY[nextResolution]] ?? DEFAULT_RESOLUTION_MULTIPLIER[nextResolution] ?? 2);
  return Math.max(0,Math.ceil(base*multiplier));
}

export function buildWorkbenchGenerationOptions({
  op,
  tpl,
  resolution,
  ratio,
  studioLight,
  removeOpts,
  enhanceOpts,
  multiView,
  promotionOptions
}){
  const base={
    resolution,
    ratio,
    lightStrength:studioLight.strength,
    colorTemperature:studioLight.colorTemp
  };

  if(isPromotionFeatureKey(op)){
    return buildPromotionOptions({
      featureKey:op,
      ratio,
      resolution,
      ...(promotionOptions[op]||{})
    });
  }

  if(op==='material'){
    return {
      ...base,
      materialName:tpl?.name||'',
      materialColor:tpl?.colorName||'',
      materialCategory:tpl?.subCategoryName||tpl?.mainCategoryName||tpl?.objectName||tpl?.category||'',
      resourceName:tpl?.name||'',
      templateName:tpl?.name||'',
      keepStructure:true,
      keepAngle:true,
      keepProportion:true
    };
  }

  if(op==='replace_bg'){
    return {
      ...base,
      sceneType:tpl?.name||tpl?.subCategoryName||tpl?.mainCategoryName||tpl?.category||'真实室内商业场景',
      sceneName:tpl?.name||'',
      sceneDesc:tpl?.description||'',
      resourceName:tpl?.name||'',
      templateName:tpl?.name||'',
      keepLighting:true,
      keepPerspective:true
    };
  }

  if(op==='remove_bg'){
    return {
      ...base,
      whiteBg:!!removeOpts.whiteBg,
      mirror:!!removeOpts.mirror,
      backgroundTone:removeOpts.whiteBg?'Pure white':'Warm white',
      shadowStyle:'柔和阴影'
    };
  }

  if(op==='enhance'){
    return {
      ...base,
      focus:!!enhanceOpts.focus,
      angle:enhanceOpts.angle||'不变',
      enhanceSharpness:true,
      enhanceLight:true,
      enhanceTexture:true,
      enhanceColor:true,
      commercialStyle:true
    };
  }

  if(op==='lineart'){
    return {
      ...base,
      lineStyle:'Simple line art',
      lineColor:'黑色',
      keepDetailLevel:'中等',
      withShadow:false
    };
  }

  if(op==='multiview'){
    const viewCount=multiView==='三角度视图'?3:4;
    return {
      ...base,
      view:multiView,
      viewCount,
      layoutType:viewCount===3?'横排':'宫格',
      backgroundStyle:'纯白'
    };
  }

  return base;
}

export function buildAiTaskPayload({origin,op,tpl,custom,reference,resolution,ratio,options}){
  return {
    originImageId:origin.id,
    featureKey:op,
    selectedResourceId:tpl?.id||null,
    selectedResourceSnapshot:tpl?{
      id:tpl.id,
      imageId:tpl.id,
      name:tpl.name,
      resourceType:tpl.resourceType,
      mainCategoryName:tpl.mainCategoryName||tpl.objectName||'',
      subCategoryName:tpl.subCategoryName||tpl.colorName||'',
      imageUrl:tpl.imageUrl||''
    }:null,
    functionalReferenceImageId:null,
    templatePrompt:tpl?(tpl.description||tpl.name):'',
    userPrompt:custom.trim(),
    userReferenceImageIds:reference?[reference.id]:[],
    referenceImageIds:reference?[reference.id]:[],
    resolution,
    ratio,
    options
  };
}
