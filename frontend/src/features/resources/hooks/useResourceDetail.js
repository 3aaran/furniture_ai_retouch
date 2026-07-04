import {useState} from 'react';
import {imageViewUrl} from '../../../appShared.jsx';
import {fetchResourceDetail} from '../api/resourcesApi.js';

export function useResourceDetail({setMsg,onOpen}={}){
  const [detail,setDetail]=useState(null);
  const detailImage=detail?.image||null;
  const detailUrl=detailImage?imageViewUrl(detailImage):'';
  const detailCategory=detailImage?[detailImage.mainCategoryName,detailImage.subCategoryName].filter(Boolean).join(' / ')||'未分类':'';

  async function openDetail(id){
    try{
      const next=await fetchResourceDetail(id);
      setDetail(next);
      onOpen?.();
    }catch(e){
      setMsg?.(e.message);
    }
  }

  function clearDetail(){
    setDetail(null);
  }

  function updateDetailName(id,name){
    setDetail(prev=>prev?.image?.id===id?{...prev,image:{...prev.image,name}}:prev);
  }

  function updateDetailImageSize(e){
    const width=Number(e.currentTarget?.naturalWidth||0);
    const height=Number(e.currentTarget?.naturalHeight||0);
    const currentWidth=Number(detailImage?.width||0);
    const currentHeight=Number(detailImage?.height||0);
    if(!width||!height||(currentWidth&&currentHeight))return;
    setDetail(prev=>prev?.image?{...prev,image:{...prev.image,width,height}}:prev);
  }

  return {
    detail,
    detailImage,
    detailUrl,
    detailCategory,
    openDetail,
    clearDetail,
    updateDetailName,
    updateDetailImageSize
  };
}

export function detailResolutionText(image){
  const width=Number(image?.width||0);
  const height=Number(image?.height||0);
  return width&&height?`${width} × ${height}`:'-';
}
