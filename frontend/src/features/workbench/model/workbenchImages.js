import {assetUrl,imageListUrl,imageViewUrl} from '../../../appShared.jsx';

export function workbenchImageSrc(input){
  if(!input)return '';
  if(typeof input==='object'&&input.localPreviewUrl)return input.localPreviewUrl;
  if(typeof input==='object')return imageViewUrl(input);
  if(String(input).startsWith('http'))return input;
  return assetUrl(input);
}

export function workbenchListImageSrc(input){
  if(!input)return '';
  if(typeof input==='object')return imageListUrl(input);
  if(String(input).startsWith('http'))return input;
  return assetUrl(input);
}

export function isRecentTaskItem(item){
  return item?.itemType==='task'||['pending','running','succeeded','failed'].includes(String(item?.status||'').toLowerCase());
}

export function recentImageId(item){
  return String(item?.resultImage?.id||item?.imageId||item?.id||'').trim();
}
