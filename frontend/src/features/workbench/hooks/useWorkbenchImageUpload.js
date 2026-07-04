import {useEffect,useRef,useState} from 'react';
import {compressImageForUpload,createLocalPreviewUrl,revokeLocalPreviewUrl} from '../../../utils/imageUpload.js';
import {uploadImage as uploadImageFile} from '../api/workbenchApi.js';

export function useWorkbenchImageUpload({imgSrc,setMsg,refreshRecent,setTaskDetail,goPage}){
  const [origin,setOrigin]=useState(null);
  const [reference,setReference]=useState(null);
  const [draggingSource,setDraggingSource]=useState(false);
  const [draggingRef,setDraggingRef]=useState(false);
  const [resourceModal,setResourceModal]=useState({open:false,target:'source',keyword:'',scope:'ALL'});
  const uploadSeqRef=useRef({source:0,reference:0});
  const uploadPreviewUrlsRef=useRef({source:'',reference:''});

  useEffect(()=>()=>Object.values(uploadPreviewUrlsRef.current).forEach(revokeLocalPreviewUrl),[]);

  function replaceUploadPreview(type,url=''){
    revokeLocalPreviewUrl(uploadPreviewUrlsRef.current[type]);
    uploadPreviewUrlsRef.current[type]=url;
  }

  async function uploadFile(file,type='source'){
    if(!file)return;
    const seq=(uploadSeqRef.current[type]||0)+1;
    uploadSeqRef.current[type]=seq;
    const localPreviewUrl=createLocalPreviewUrl(file);
    replaceUploadPreview(type,localPreviewUrl);
    const localImage={
      id:`local-${type}-${seq}`,
      originalName:file.name||'local-preview',
      localPreviewUrl,
      imageUrl:localPreviewUrl,
      uploadStatus:'uploading'
    };
    if(type==='source')setOrigin(localImage);
    else setReference(localImage);
    setMsg?.(type==='source'?'家具图片上传中':'参考图上传中');

    const formData=new FormData();
    try{
      const compressedImage=await compressImageForUpload(file);
      formData.append('image',compressedImage);
      const result=await uploadImageFile(formData);
      if(uploadSeqRef.current[type]!==seq){
        revokeLocalPreviewUrl(localPreviewUrl);
        return;
      }

      if(!result?.id||!result?.url){
        const failed={...localImage,uploadStatus:'failed',uploadError:'上传成功但后端没有返回图片编号或图片地址'};
        if(type==='source')setOrigin(failed);
        else setReference(failed);
        setMsg?.('上传成功但后端没有返回图片编号或图片地址');
        return;
      }

      const uploadedImage={...result,url:result.url,imageUrl:imgSrc(result),uploadStatus:'success'};
      if(type==='source'){
        setOrigin(uploadedImage);
        setMsg?.('家具图片上传成功');
      }else{
        setReference(uploadedImage);
        setMsg?.('参考图上传成功');
      }
      replaceUploadPreview(type,'');
      refreshRecent?.();
    }catch(err){
      if(uploadSeqRef.current[type]===seq){
        const failed={...localImage,uploadStatus:'failed',uploadError:err.message||'图片上传失败'};
        if(type==='source')setOrigin(failed);
        else setReference(failed);
      }else{
        revokeLocalPreviewUrl(localPreviewUrl);
      }
      setMsg?.(err.message||'图片上传失败');
    }
  }

  async function chooseSource(e){
    await uploadFile(e.target.files?.[0],'source');
    e.target.value='';
  }

  async function chooseReference(e){
    await uploadFile(e.target.files?.[0],'reference');
    e.target.value='';
  }

  function clearSourceImage(){
    uploadSeqRef.current.source+=1;
    replaceUploadPreview('source','');
    setOrigin(null);
    setMsg?.('已清除当前展示的家具原图');
  }

  function clearReferenceImage(){
    uploadSeqRef.current.reference+=1;
    replaceUploadPreview('reference','');
    setReference(null);
    setMsg?.('已清除当前展示的参考图');
  }

  function continueWithImage(image){
    if(!image?.id||!image?.url)return setMsg?.('当前图片不可继续创作');
    uploadSeqRef.current.source+=1;
    replaceUploadPreview('source','');
    setOrigin({...image,imageUrl:image.imageUrl||imgSrc(image)});
    setTaskDetail?.(null);
    goPage?.('workbench');
    setMsg?.('已将图片放入产品原图');
  }

  function dropUpload(e,type='source'){
    e.preventDefault();
    e.stopPropagation();
    setDraggingSource(false);
    setDraggingRef(false);
    const file=e.dataTransfer?.files?.[0];
    if(file)uploadFile(file,type);
  }

  function dragOver(e,type='source'){
    e.preventDefault();
    e.stopPropagation();
    if(type==='source')setDraggingSource(true);
    else setDraggingRef(true);
  }

  function dragLeave(e,type='source'){
    e.preventDefault();
    e.stopPropagation();
    if(type==='source')setDraggingSource(false);
    else setDraggingRef(false);
  }

  function openResourceModal(target='source'){
    setResourceModal({open:true,target,keyword:'',scope:'ALL'});
  }

  async function chooseResourceImage(resource){
    try{
      const picked={
        ...resource,
        id:resource.id,
        url:resource.imageUrl||resource.url,
        imageUrl:imgSrc(resource),
        originalName:resource.name||resource.originalName||'resource'
      };
      if(resourceModal.target==='source'){
        uploadSeqRef.current.source+=1;
        replaceUploadPreview('source','');
        setOrigin(picked);
        setMsg?.('已选择产品原图');
      }else{
        uploadSeqRef.current.reference+=1;
        replaceUploadPreview('reference','');
        setReference(picked);
        setMsg?.('已选择参考图');
      }
      setResourceModal(modal=>({...modal,open:false}));
    }catch(e){
      setMsg?.('资源选择失败：'+e.message);
    }
  }

  return {
    origin,
    setOrigin,
    reference,
    setReference,
    draggingSource,
    draggingRef,
    resourceModal,
    setResourceModal,
    chooseSource,
    chooseReference,
    clearSourceImage,
    clearReferenceImage,
    continueWithImage,
    dropUpload,
    dragOver,
    dragLeave,
    openResourceModal,
    chooseResourceImage
  };
}
