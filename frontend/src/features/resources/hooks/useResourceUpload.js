import {useEffect,useRef,useState} from 'react';
import {compressImageForUpload,createLocalPreviewUrl,revokeLocalPreviewUrl} from '../../../utils/imageUpload.js';
import {uploadResource} from '../api/resourcesApi.js';

const initialForm={name:'',resourceType:'user_reference',objectName:'',colorName:'',description:''};

export function useResourceUpload({
  categoryScope,
  isSystemAdmin,
  space,
  query,
  setMsg,
  setSys,
  setData,
  setSpace,
  resolveResourceType
}){
  const [uploadOpen,setUploadOpen]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [f,setF]=useState(initialForm);
  const [files,setFiles]=useState([]);
  const [preview,setPreview]=useState('');
  const [uploadStatus,setUploadStatus]=useState('');
  const previewUrlRef=useRef('');

  useEffect(()=>()=>revokeLocalPreviewUrl(previewUrlRef.current),[]);

  function chooseFiles(list){
    const picked=Array.from(list||[]).filter(img=>String(img.type||'').startsWith('image/')).slice(0,50);
    revokeLocalPreviewUrl(previewUrlRef.current);
    const nextPreview=picked[0]?createLocalPreviewUrl(picked[0]):'';
    previewUrlRef.current=nextPreview;
    setFiles(picked);
    setPreview(nextPreview);
    setUploadStatus(picked.length?'已选择':'');
  }

  function choose(e){
    chooseFiles(e.target.files);
  }

  function onDrop(e){
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    chooseFiles(e.dataTransfer?.files);
  }

  function resetUpload(){
    revokeLocalPreviewUrl(previewUrlRef.current);
    previewUrlRef.current='';
    setF(initialForm);
    setFiles([]);
    setPreview('');
    setUploadStatus('');
    setDragging(false);
  }

  function closeUpload(){
    setUploadOpen(false);
    resetUpload();
  }

  function changeUploadMain(main){
    setF(current=>({
      ...current,
      objectName:main,
      colorName:'',
      resourceType:main?(resolveResourceType?.(main)||'user_reference'):'user_reference'
    }));
  }

  async function create(){
    try{
      if(!files.length)return setMsg?.('请先选择资源图片');

      const fd=new FormData();
      const main=String(f.objectName||'').trim();
      Object.entries({...f,objectName:main==='未分类'?'':main,colorName:main?f.colorName:''}).forEach(([k,v])=>fd.append(k,v||''));
      if(files.length>1)fd.set('name','');
      fd.append('scope',categoryScope);
      setUploadStatus('上传中');
      const uploadFiles=await Promise.all(files.map(img=>compressImageForUpload(img)));
      uploadFiles.forEach(img=>fd.append('image',img));

      const isSystemUpload=isSystemAdmin&&space==='SYSTEM';
      const result=await uploadResource(fd,{isSystemAdmin:isSystemUpload});
      const count=Number(result?.count||files.length||1);
      setMsg?.(`${isSystemUpload?'系统资源':categoryScope==='MERCHANT'?'门店资源':'个人资源'}已上传 ${count} 个`);
      setUploadStatus('上传成功');

      const inserted=Array.isArray(result?.items)?result.items:[].concat(result?.item||[]).filter(Boolean);
      if(inserted.length){
        if(isSystemUpload){
          setSys?.(prev=>[...inserted,...prev.filter(item=>!inserted.some(next=>String(next.id)===String(item.id)))]);
        }else{
          setData?.(prev=>({
            ...prev,
            items:[...inserted,...(prev.items||[]).filter(item=>!inserted.some(next=>String(next.id)===String(item.id)))].slice(0,prev.pageSize||query.pageSize||20),
            total:Number(prev.total||0)+inserted.length
          }));
        }
      }

      resetUpload();
      setUploadOpen(false);
      if(!isSystemAdmin)setSpace?.(categoryScope==='MERCHANT'?'STORE':'PERSONAL');
    }catch(e){
      setUploadStatus('上传失败');
      setMsg?.(e.message);
    }
  }

  return {
    uploadOpen,
    setUploadOpen,
    dragging,
    setDragging,
    f,
    setF,
    files,
    preview,
    uploadStatus,
    choose,
    onDrop,
    resetUpload,
    closeUpload,
    changeUploadMain,
    create
  };
}
