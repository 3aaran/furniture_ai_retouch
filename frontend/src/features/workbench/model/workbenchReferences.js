export const MAX_REFERENCE_IMAGES=9;

function imageKey(image={}){
  return String(image.id||image.imageId||image.url||image.imageUrl||image.localPreviewUrl||'').trim();
}

export function appendReferenceImages(current=[],incoming=[]){
  const result=[];
  const seen=new Set();
  for(const image of [...current,...incoming]){
    const key=imageKey(image);
    if(!key||seen.has(key))continue;
    seen.add(key);
    result.push(image);
    if(result.length>=MAX_REFERENCE_IMAGES)break;
  }
  return result;
}

export function referenceImageIds(images=[]){
  return images.map(image=>image?.id||image?.imageId).filter(Boolean).slice(0,MAX_REFERENCE_IMAGES);
}
