import {useEffect,useRef,useState} from 'react';
import {compressImageForUpload,createLocalPreviewUrl,revokeLocalPreviewUrl} from '../../../utils/imageUpload.js';
import {uploadImage as uploadImageFile} from '../api/workbenchApi.js';
import {appendReferenceImages,MAX_REFERENCE_IMAGES} from '../model/workbenchReferences.js';

export function useWorkbenchImageUpload({imgSrc,setMsg,refreshRecent,setTaskDetail,goPage}){
  const [origin,setOrigin]=useState(null);
  const [references,setReferences]=useState([]);
  const [draggingSource,setDraggingSource]=useState(false);
  const [draggingRef,setDraggingRef]=useState(false);
  const [resourceModal,setResourceModal]=useState({open:false,target:'source',keyword:'',scope:'ALL'});
  const uploadSeqRef=useRef(0);
  const sourceUploadRef=useRef(0);
  const previewUrlsRef=useRef(new Map());

  useEffect(()=>()=>{
    for(const url of previewUrlsRef.current.values())revokeLocalPreviewUrl(url);
  },[]);

  function rememberPreview(key,url){
    const previous=previewUrlsRef.current.get(key);
    if(previous)revokeLocalPreviewUrl(previous);
    if(url)previewUrlsRef.current.set(key,url);
    else previewUrlsRef.current.delete(key);
  }

  async function uploadSource(file){
    if(!file)return;
    const seq=sourceUploadRef.current+1;
    sourceUploadRef.current=seq;
    const localPreviewUrl=createLocalPreviewUrl(file);
    rememberPreview('source',localPreviewUrl);
    const localImage={id:`local-source-${seq}`,originalName:file.name||'local-preview',localPreviewUrl,imageUrl:localPreviewUrl,uploadStatus:'uploading'};
    setOrigin(localImage);
    setMsg?.('家具图片上传中');
    try{
      const compressedImage=await compressImageForUpload(file);
      const formData=new FormData();
      formData.append('image',compressedImage);
      const result=await uploadImageFile(formData);
      if(sourceUploadRef.current!==seq)return revokeLocalPreviewUrl(localPreviewUrl);
      if(!result?.id||!result?.url)throw new Error('上传成功但后端没有返回图片编号或图片地址');
      setOrigin({...result,url:result.url,imageUrl:imgSrc(result),uploadStatus:'success'});
      rememberPreview('source','');
      setMsg?.('家具图片上传成功');
      refreshRecent?.();
    }catch(error){
      if(sourceUploadRef.current===seq)setOrigin({...localImage,uploadStatus:'failed',uploadError:error.message||'图片上传失败'});
      setMsg?.(error.message||'图片上传失败');
    }
  }

  async function uploadReferenceFile(file){
    const seq=uploadSeqRef.current+1;
    uploadSeqRef.current=seq;
    const localId=`local-reference-${seq}`;
    const localPreviewUrl=createLocalPreviewUrl(file);
    rememberPreview(localId,localPreviewUrl);
    const localImage={id:localId,originalName:file.name||'local-preview',localPreviewUrl,imageUrl:localPreviewUrl,uploadStatus:'uploading'};
    setReferences(current=>appendReferenceImages(current,[localImage]));
    try{
      const compressedImage=await compressImageForUpload(file);
      const formData=new FormData();
      formData.append('image',compressedImage);
      const result=await uploadImageFile(formData);
      if(!result?.id||!result?.url)throw new Error('上传成功但后端没有返回图片编号或图片地址');
      const uploadedImage={...result,url:result.url,imageUrl:imgSrc(result),uploadStatus:'success'};
      setReferences(current=>appendReferenceImages(current.map(image=>image.id===localId?uploadedImage:image),[]));
      rememberPreview(localId,'');
      refreshRecent?.();
      return true;
    }catch(error){
      setReferences(current=>current.map(image=>image.id===localId?{...localImage,uploadStatus:'failed',uploadError:error.message||'图片上传失败'}:image));
      return false;
    }
  }

  async function uploadReferenceFiles(files){
    const selected=Array.from(files||[]).slice(0,MAX_REFERENCE_IMAGES-references.length);
    if(!selected.length){
      setMsg?.(`最多添加 ${MAX_REFERENCE_IMAGES} 张参考图`);
      return;
    }
    setMsg?.(`正在上传 ${selected.length} 张参考图`);
    const results=await Promise.all(selected.map(uploadReferenceFile));
    const successCount=results.filter(Boolean).length;
    setMsg?.(successCount===selected.length?`${successCount} 张参考图上传成功`:`参考图上传完成：成功 ${successCount} 张，失败 ${selected.length-successCount} 张`);
  }

  async function chooseSource(event){
    await uploadSource(event.target.files?.[0]);
    event.target.value='';
  }

  async function chooseReference(event){
    await uploadReferenceFiles(event.target.files);
    event.target.value='';
  }

  function clearSourceImage(){
    sourceUploadRef.current+=1;
    rememberPreview('source','');
    setOrigin(null);
    setMsg?.('已清除当前展示的家具原图');
  }

  function removeReferenceImage(imageId){
    rememberPreview(imageId,'');
    setReferences(current=>current.filter(image=>image.id!==imageId));
    setMsg?.('已移除参考图');
  }

  function continueWithImage(image){
    if(!image?.id||!image?.url)return setMsg?.('当前图片不可继续创作');
    sourceUploadRef.current+=1;
    rememberPreview('source','');
    setOrigin({...image,imageUrl:image.imageUrl||imgSrc(image)});
    setTaskDetail?.(null);
    goPage?.('workbench');
    setMsg?.('已将图片放入产品原图');
  }

  function dropUpload(event,type='source'){
    event.preventDefault();
    event.stopPropagation();
    setDraggingSource(false);
    setDraggingRef(false);
    if(type==='source')uploadSource(event.dataTransfer?.files?.[0]);
    else uploadReferenceFiles(event.dataTransfer?.files);
  }

  function dragOver(event,type='source'){
    event.preventDefault();
    event.stopPropagation();
    if(type==='source')setDraggingSource(true);
    else setDraggingRef(true);
  }

  function dragLeave(event,type='source'){
    event.preventDefault();
    event.stopPropagation();
    if(type==='source')setDraggingSource(false);
    else setDraggingRef(false);
  }

  function openResourceModal(target='source'){
    setResourceModal({open:true,target,keyword:'',scope:'ALL'});
  }

  async function chooseResourceImage(resource){
    try{
      const picked={...resource,id:resource.id,url:resource.imageUrl||resource.url,imageUrl:imgSrc(resource),originalName:resource.name||resource.originalName||'resource'};
      if(resourceModal.target==='source'){
        sourceUploadRef.current+=1;
        rememberPreview('source','');
        setOrigin(picked);
        setMsg?.('已选择产品原图');
      }else{
        setReferences(current=>{
          const next=appendReferenceImages(current,[picked]);
          setMsg?.(next.length===current.length?'该参考图已添加或已达到数量上限':'已添加参考图');
          return next;
        });
      }
      setResourceModal(modal=>({...modal,open:false}));
    }catch(error){
      setMsg?.('资源选择失败：'+error.message);
    }
  }

  return {
    origin,setOrigin,references,setReferences,draggingSource,draggingRef,resourceModal,setResourceModal,
    chooseSource,chooseReference,clearSourceImage,removeReferenceImage,continueWithImage,dropUpload,
    dragOver,dragLeave,openResourceModal,chooseResourceImage
  };
}
