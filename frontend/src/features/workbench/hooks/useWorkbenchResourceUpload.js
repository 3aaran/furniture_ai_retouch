import {useEffect,useState} from 'react';
import {compressImageForUpload,createLocalPreviewUrl,revokeLocalPreviewUrl} from '../../../utils/imageUpload.js';
import {uploadWorkbenchResource} from '../api/workbenchApi.js';

const defaultWorkbenchSubs={
  '材质':['木材','皮革','布艺','金属','石材','玻璃','板材'],
  '软体':['沙发','床垫','靠包','抱枕','软包'],
  '产品':['家具原图','结构参考','风格参考'],
  '场景模板':['客厅','卧室','餐厅','书房','展厅','电商白底']
};

function initialUploadForOperation(op){
  const type=op==='replace_bg'?'scene':'material';
  return {name:'',resourceType:type,objectName:type==='scene'?'场景模板':'材质',colorName:'',description:''};
}

export function useWorkbenchResourceUpload({op,me,resources,setResources,setResourceScope,setMsg}){
  const [resourceUploadOpen,setResourceUploadOpen]=useState(false);
  const [resourceUpload,setResourceUpload]=useState(()=>initialUploadForOperation(op));
  const [resourceUploadFile,setResourceUploadFile]=useState(null);
  const [resourceUploadPreview,setResourceUploadPreview]=useState('');

  useEffect(()=>()=>revokeLocalPreviewUrl(resourceUploadPreview),[resourceUploadPreview]);

  const workbenchUploadMainOptions=resourceUpload.resourceType==='scene'
    ? ['场景模板']
    : resourceUpload.resourceType==='user_reference'
      ? ['产品']
      : ['材质','软体'];

  const workbenchUploadSubOptions=Array.from(new Set([
    ...(defaultWorkbenchSubs[resourceUpload.objectName]||[]),
    ...(resources||[])
      .filter(r=>String(r.mainCategoryName||r.objectName||'')===String(resourceUpload.objectName||''))
      .map(r=>String(r.subCategoryName||r.colorName||'').trim())
      .filter(Boolean)
  ]));

  function openWorkbenchResourceUpload(){
    const next=initialUploadForOperation(op);
    setResourceUpload(upload=>({...upload,...next}));
    setResourceUploadOpen(true);
  }

  function chooseWorkbenchResourceFile(file){
    revokeLocalPreviewUrl(resourceUploadPreview);
    setResourceUploadFile(file||null);
    const url=file?createLocalPreviewUrl(file):'';
    setResourceUploadPreview(url);
  }

  function closeWorkbenchResourceUpload(){
    setResourceUploadOpen(false);
    setResourceUploadFile(null);
    revokeLocalPreviewUrl(resourceUploadPreview);
    setResourceUploadPreview('');
  }

  function changeWorkbenchUploadType(type){
    const main=type==='scene'?'场景模板':type==='user_reference'?'产品':'材质';
    setResourceUpload(upload=>({...upload,resourceType:type,objectName:main,colorName:'',description:''}));
  }

  function changeWorkbenchUploadMain(main){
    setResourceUpload(upload=>({...upload,objectName:main,colorName:''}));
  }

  async function createWorkbenchResource(){
    try{
      if(!resourceUploadFile)return setMsg?.('请先选择资源图片');
      if(!resourceUpload.name.trim())return setMsg?.('请输入资源名称');
      const fd=new FormData();
      Object.entries(resourceUpload).forEach(([key,value])=>fd.append(key,value||''));
      fd.append('image',await compressImageForUpload(resourceUploadFile));
      const result=await uploadWorkbenchResource(fd);
      setMsg?.((me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN')?'门店资源已上传':'个人资源已上传');
      closeWorkbenchResourceUpload();
      setResourceUpload(initialUploadForOperation(op));
      const inserted=Array.isArray(result?.items)?result.items:[].concat(result?.item||[]).filter(Boolean);
      if(inserted.length)setResources(prev=>[...inserted,...prev.filter(item=>!inserted.some(next=>String(next.id)===String(item.id)))]);
      setResourceScope((me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN')?'MERCHANT':'ALL');
    }catch(e){
      setMsg?.(e.message);
    }
  }

  return {
    resourceUploadOpen,
    setResourceUploadOpen,
    resourceUpload,
    setResourceUpload,
    resourceUploadFile,
    resourceUploadPreview,
    workbenchUploadMainOptions,
    workbenchUploadSubOptions,
    openWorkbenchResourceUpload,
    chooseWorkbenchResourceFile,
    closeWorkbenchResourceUpload,
    changeWorkbenchUploadType,
    changeWorkbenchUploadMain,
    createWorkbenchResource
  };
}
