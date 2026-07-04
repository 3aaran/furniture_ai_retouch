import {getFeatureDisplayName} from '../../../config/uiText.js';

export function getRecentSourceId(item,cached){
  return cached?.sourceId||item?.originImage?.id||item?.sourceImageId||item?.originImageId||'';
}

export function getRecentResultId(item){
  return item?.resultImage?.id||item?.imageId||'';
}

export function getRecentTypeName(item,ops){
  const key=item?.featureKey||item?.operation||item?.kind;
  return ops?.[key]?.label||getFeatureDisplayName(item?.featureName,'')||getFeatureDisplayName(key,'AI任务');
}

export function getRecentPreviewSrc(preview,imgSrc,useFallback=false){
  if(!preview)return '';
  if(useFallback){
    if(preview.fallbackImageId)return imgSrc({id:preview.fallbackImageId,url:preview.fallback});
    return imgSrc(preview.fallback);
  }
  if(preview.sourceId)return imgSrc({id:preview.sourceId,url:preview.url});
  return imgSrc(preview.url);
}

export function mergeRecentItems(taskItems=[],imageItems=[]){
  const hiddenKinds=new Set(['ORIGINAL','UPLOAD','WATERMARK','RESOURCE']);
  const visibleImages=(imageItems||[]).filter(i=>!hiddenKinds.has(String(i.kind||'').toUpperCase()));
  const seen=new Set();
  return [...(taskItems||[]),...visibleImages]
    .filter(item=>{
      const id=String(item.resultImage?.id||item.imageId||item.id||'');
      if(!id||seen.has(id))return false;
      seen.add(id);
      return true;
    })
    .sort((a,b)=>new Date(b.createdAt||b.submittedAt||0)-new Date(a.createdAt||a.submittedAt||0))
    .slice(0,20);
}
