import React,{useEffect,useRef,useState}from'react';
import{Layers,Ticket,Image as ImageIcon,Users as UsersIcon,Brush,Download,Trash2,Eye,Search,WalletCards,Plus,Power,RotateCcw,Pencil,GripVertical,X}from'lucide-react';
import StoreUsers from'./users/InternalUsersPage.jsx';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,resTypeName}from'../appShared.jsx';
import{storeAdminPages,staffPages}from'../config/pageRegistry.jsx';
import{featureName}from'../config/uiText.js';
import{featureConfig}from'../config/featureConfig.jsx';
import WorkbenchUploadPanel from'./workbench/WorkbenchUploadPanel.jsx';
import GenerationControls from'./workbench/GenerationControls.jsx';
import ResourcePickerModal from'./workbench/ResourcePickerModal.jsx';
import WatermarkConfigModal from'./workbench/WatermarkConfigModal.jsx';

export const storeAdminNav=storeAdminPages;
export const staffNav=staffPages;

function Workbench({me,setMe,setMsg,goPage,TaskDetailModal}){
  function imgSrc(url){
    if(!url)return '';
    if(url.startsWith('http'))return url;
    return API+url;
  }

  const ops=Object.fromEntries(Object.entries(featureConfig).map(([key,item])=>[key,{label:item.name,desc:item.desc,cost:item.defaultCost}]));
  const [op,setOp]=useState('material');
  const [origin,setOrigin]=useState(null);
  const [reference,setReference]=useState(null);
  const [custom,setCustom]=useState('');
  const [resources,setResources]=useState([]);
  const [recent,setRecent]=useState([]);
  const [resolution,setResolution]=useState('2K');
  const [ratio,setRatio]=useState('自适应');
  const [resourceKeyword,setResourceKeyword]=useState('');
  const [resourceScope,setResourceScope]=useState('SYSTEM');
  const [materialTab,setMaterialTab]=useState('material');
  const [selectedResource,setSelectedResource]=useState('');
  const [recentKeyword,setRecentKeyword]=useState('');
  const [removeOpts,setRemoveOpts]=useState({whiteBg:false,mirror:false});
  const [enhanceOpts,setEnhanceOpts]=useState({focus:false,angle:'不变'});
  const [multiView,setMultiView]=useState('三角度视图');
  const [draggingSource,setDraggingSource]=useState(false);
  const [draggingRef,setDraggingRef]=useState(false);
  const [resourceModal,setResourceModal]=useState({open:false,target:'source',keyword:'',scope:'ALL'});
  const [taskDetail,setTaskDetail]=useState(null);
  const [watermarkOpen,setWatermarkOpen]=useState(false);
  const [resourceUploadOpen,setResourceUploadOpen]=useState(false);
  const [resourceUpload,setResourceUpload]=useState({name:'',resourceType:'material',objectName:'',colorName:'',description:''});
  const [resourceUploadFile,setResourceUploadFile]=useState(null);
  const [resourceUploadPreview,setResourceUploadPreview]=useState('');
  const [taskDetailLoading,setTaskDetailLoading]=useState(false);
  const [recentSourcePreview,setRecentSourcePreview]=useState(null);
  const [sourcePreviewCache,setSourcePreviewCache]=useState({});
  const [costSettings,setCostSettings]=useState({});
  const [recentHoverId,setRecentHoverId]=useState('');
  const recentPreviewHideTimer=useRef(null);

  useEffect(()=>{req('/api/resources?pageSize=999').then(d=>setResources(d.items||[])).catch(()=>{})},[]);
  useEffect(()=>{req('/api/settings/public').then(setCostSettings).catch(()=>{})},[]);
  useEffect(()=>{refreshRecent()},[]);
  useEffect(()=>{
    const raw=localStorage.getItem('pendingWorkbenchImage');
    if(!raw)return;
    try{
      const img=JSON.parse(raw);
      if(img?.id&&img?.url){
        setOrigin({...img,imageUrl:img.imageUrl||imgSrc(img.url)});
        setMsg('已将图片放入产品原图');
      }
    }catch{}
    localStorage.removeItem('pendingWorkbenchImage');
  },[]);
  useEffect(()=>{
    const onProcessed=()=>refreshRecent();
    window.addEventListener('image-processed',onProcessed);
    return ()=>window.removeEventListener('image-processed',onProcessed);
  },[]);
  useEffect(()=>{setSelectedResource('')},[op,materialTab,resourceScope]);
  useEffect(()=>()=>clearRecentPreviewTimer(),[]);

  function clearRecentPreviewTimer(){
    if(recentPreviewHideTimer.current){
      clearTimeout(recentPreviewHideTimer.current);
      recentPreviewHideTimer.current=null;
    }
  }

  async function showRecentOriginal(item,e){
    clearRecentPreviewTimer();
    const rect=e.currentTarget.getBoundingClientRect();
    const top=Math.max(130,Math.min(window.innerHeight-150,rect.top+rect.height/2));
    const cached=sourcePreviewCache[item.id];

    setRecentSourcePreview({
      id:item.id,
      title:ops[item.kind]?.label||item.kind,
      top,
      url:cached?.sourceUrl || item.sourceUrl || item.url,
      fallback:item.url,
      loading:!cached
    });

    if(cached) return;
    if(item.itemType==='task'||item.status){
      setRecentSourcePreview(prev=>prev&&prev.id===item.id?{...prev,url:item.sourceUrl||item.url,fallback:item.url,loading:false}:prev);
      return;
    }

    try{
      const d=await req(`/api/images/${item.id}/source`);
      const next={
        sourceUrl:d.sourceUrl || item.sourceUrl || item.url,
        sourceOriginalName:d.sourceOriginalName || '原图'
      };

      setSourcePreviewCache(prev=>({...prev,[item.id]:next}));

      setRecentSourcePreview(prev=>{
        if(!prev||prev.id!==item.id) return prev;
        return {
          ...prev,
          url:next.sourceUrl,
          sourceOriginalName:next.sourceOriginalName,
          loading:false
        };
      });
    }catch(err){
      setRecentSourcePreview(prev=>{
        if(!prev||prev.id!==item.id) return prev;
        return {...prev,url:item.sourceUrl||item.url,fallback:item.url,loading:false};
      });
    }
  }

  function moveRecentOriginal(item,e){
    const rect=e.currentTarget.getBoundingClientRect();
    setRecentSourcePreview(prev=>{
      if(!prev||prev.id!==item.id) return prev;
      return {
        ...prev,
        top:Math.max(130,Math.min(window.innerHeight-150,rect.top+rect.height/2))
      };
    });
  }

  function hideRecentOriginal(){
    clearRecentPreviewTimer();
    recentPreviewHideTimer.current=setTimeout(()=>{
      setRecentSourcePreview(null);
      recentPreviewHideTimer.current=null;
    },220);
  }

  function refreshRecent(){
    req('/api/ai/tasks/recent?pageSize=20').then(d=>setRecent(d.items||[])).catch(()=>{
      req('/api/images/recent?pageSize=20').then(d=>setRecent((d.items||[]).filter(i=>i.kind!=='original'))).catch(()=>{});
    });
  }

  function pollAiTask(taskId){
    const timer=setInterval(async()=>{
      try{
        const d=await req('/api/ai/tasks/'+taskId+'/status');
        if(d.user)setMe(d.user);
        setRecent(prev=>prev.map(x=>x.id===taskId?{...x,...d}:x));
        if(d.status==='succeeded'){
          clearInterval(timer);
          setMsg('图片生成成功');
          refreshRecent();
        }
        if(d.status==='failed'){
          clearInterval(timer);
          setMsg(d.refunded?'生成失败，算力已退回':'生成失败');
          refreshRecent();
        }
      }catch(e){clearInterval(timer);setMsg(e.message)}
    },2000);
  }

  async function uploadFile(img,type='source'){
    if(!img)return;
    const fd=new FormData();
    fd.append('image',img);
    try{
      const d=await reqForm('/api/images/upload',fd);

      if(!d?.id||!d?.url){
        setMsg('上传成功但后端没有返回图片ID或图片地址');
        return;
      }

      const uploadedImage={
        ...d,
        url:d.url,
        imageUrl:imgSrc(d.url)
      };

      console.log('[upload success]',uploadedImage);

      if(type==='source'){
        setOrigin(uploadedImage);
        setMsg('家具图片上传成功');
      }else{
        setReference(uploadedImage);
        setMsg('参考图上传成功');
      }

      refreshRecent();
    }catch(err){
      setMsg(err.message||'图片上传失败');
    }
  }

  async function chooseSource(e){ await uploadFile(e.target.files?.[0],'source') }
  async function chooseReference(e){ await uploadFile(e.target.files?.[0],'reference') }

  function clearSourceImage(){
    setOrigin(null);
    setMsg('已清除当前展示的家具原图');
  }

  function clearReferenceImage(){
    setReference(null);
    setMsg('已清除当前展示的参考图');
  }

  function continueWithImage(img){
    if(!img?.id||!img?.url)return setMsg('当前图片不可继续创作');
    setOrigin({...img,imageUrl:img.imageUrl||imgSrc(img.url)});
    setTaskDetail(null);
    goPage&&goPage('workbench');
    setMsg('已将图片放入产品原图');
  }

  function dropUpload(e,type='source'){
    e.preventDefault();
    e.stopPropagation();
    setDraggingSource(false);
    setDraggingRef(false);
    const file=e.dataTransfer?.files?.[0];
    if(file) uploadFile(file,type);
  }
  function dragOver(e,type='source'){
    e.preventDefault();
    e.stopPropagation();
    if(type==='source') setDraggingSource(true); else setDraggingRef(true);
  }
  function dragLeave(e,type='source'){
    e.preventDefault();
    e.stopPropagation();
    if(type==='source') setDraggingSource(false); else setDraggingRef(false);
  }

  function openResourceModal(target='source'){
    setResourceModal({open:true,target,keyword:'',scope:'ALL'});
  }

  async function chooseResourceImage(r){
    try{
      const url=r.imageUrl?.startsWith('http')?r.imageUrl:API+r.imageUrl;
      const resp=await fetch(url);
      const blob=await resp.blob();
      const ext=(blob.type||'image/png').split('/')[1]||'png';
      const file=new File([blob], `${r.name||'resource'}.${ext}`, {type:blob.type||'image/png'});
      await uploadFile(file,resourceModal.target);
      setResourceModal(m=>({...m,open:false}));
    }catch(e){setMsg('资源选择失败：'+e.message)}
  }

  function currentTemplate(){
    return resources.find(r=>String(r.id)===String(selectedResource));
  }

  function filteredResources(){
    return resources.filter(r=>{
      if(resourceScope!=='ALL' && r.scope!==resourceScope) return false;
      if(op==='material'){
        if(r.resourceType!==materialTab) return false;
      }else if(op==='replace_bg'){
        if(r.resourceType!=='scene') return false;
      }else{
        return false;
      }
      const kw=resourceKeyword.trim().toLowerCase();
      if(!kw) return true;
      return [r.name,r.objectName,r.colorName,r.description,r.mainCategoryName,r.subCategoryName].filter(Boolean).join(' ').toLowerCase().includes(kw);
    });
  }

  function modalResources(){
    return resources.filter(r=>{
      if(resourceModal.scope!=='ALL' && r.scope!==resourceModal.scope) return false;
      const kw=resourceModal.keyword.trim().toLowerCase();
      if(!kw)return true;
      return [r.name,r.objectName,r.colorName,r.description,r.mainCategoryName,r.subCategoryName,resTypeName[r.resourceType]].filter(Boolean).join(' ').toLowerCase().includes(kw);
    });
  }

  function calcWorkbenchCost(nextOp=op,nextResolution=resolution){
    const opMap={material:'cost_material',replace_bg:'cost_replace_bg',remove_bg:'cost_remove_bg',enhance:'cost_enhance',lineart:'cost_lineart',multiview:'cost_multiview'};
    const mulKeyMap={'1K':'resolution_multiplier_1k','2K':'resolution_multiplier_2k','4K':'resolution_multiplier_4k'};
    const defaultMul={'1K':1,'2K':2,'4K':4};
    const base=Number(costSettings[opMap[nextOp]] ?? ops[nextOp]?.cost ?? 0);
    const mul=Number(costSettings[mulKeyMap[nextResolution]] ?? defaultMul[nextResolution] ?? 2);
    return Math.max(0,Math.ceil(base*mul));
  }


  function buildGenerationOptions(){
    const tpl=currentTemplate();
    const base={resolution,ratio};

    if(op==='material'){
      return {
        ...base,
        materialName: tpl?.name || '',
        materialColor: tpl?.colorName || '',
        materialCategory: tpl?.subCategoryName || tpl?.mainCategoryName || tpl?.objectName || tpl?.category || '',
        resourceName: tpl?.name || '',
        templateName: tpl?.name || '',
        keepStructure:true,
        keepAngle:true,
        keepProportion:true
      };
    }

    if(op==='replace_bg'){
      return {
        ...base,
        sceneType: tpl?.name || tpl?.subCategoryName || tpl?.mainCategoryName || tpl?.category || '真实室内商业场景',
        sceneName: tpl?.name || '',
        sceneDesc: tpl?.description || '',
        resourceName: tpl?.name || '',
        templateName: tpl?.name || '',
        keepLighting:true,
        keepPerspective:true
      };
    }

    if(op==='remove_bg'){
      return {
        ...base,
        whiteBg:!!removeOpts.whiteBg,
        mirror:!!removeOpts.mirror,
        backgroundTone: removeOpts.whiteBg ? 'Pure white' : 'Warm white',
        shadowStyle:'柔和阴影'
      };
    }

    if(op==='enhance'){
      return {
        ...base,
        focus:!!enhanceOpts.focus,
        angle:enhanceOpts.angle || '不变',
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


  async function gen(){
    if(!origin)return setMsg('请先上传家具原图');
    try{
      const tpl=currentTemplate();
      const options=buildGenerationOptions();
      const d=await req('/api/ai/tasks',{
        method:'POST',
        body:JSON.stringify({
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
        })
      });
      if(d.user)setMe(d.user);
      setMsg('任务已提交，正在生成');
      if(d.task)setRecent(prev=>[d.task,...prev.filter(x=>x.id!==d.task.id)].slice(0,20));
      if(d.task?.id)pollAiTask(d.task.id);
    }catch(e){setMsg(e.message)}
  }


  async function deleteRecentTask(item,e){
    e?.stopPropagation?.();
    const taskId=String(item?.id||'').trim();
    if(!taskId) return;
    const ok=window.confirm('确认删除这张生成图片吗？删除后将无法恢复。');
    if(!ok) return;
    try{
      const d=await req('/api/ai/tasks/'+taskId,{method:'DELETE'});
      setRecent(prev=>prev.filter(x=>x.id!==taskId));
      if(taskDetail?.id===taskId) setTaskDetail(null);
      setMsg(d.message||'图片已删除');
      refreshRecent();
    }catch(err){
      setMsg(err.message||'删除失败');
    }
  }

  function renderRecentActionButton(icon,onClick,title,{danger=false,disabled=false}={}){
    return <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width:30,
        height:30,
        borderRadius:'50%',
        border:'1px solid '+(danger?'rgba(255,96,96,.35)':'rgba(255,255,255,.18)'),
        background:danger?'rgba(120,16,16,.72)':'rgba(0,0,0,.48)',
        color:'#fff',
        display:'grid',
        placeItems:'center',
        cursor:disabled?'not-allowed':'pointer',
        opacity:disabled?0.55:1,
        boxShadow:'0 8px 20px rgba(0,0,0,.24)'
      }}
    >{icon}</button>;
  }

  async function openRecentTask(item){
    try{
      if(item.status&&item.status!=='succeeded')return setMsg(item.errorMessage||'Task is still generating');
      setTaskDetailLoading(true);
      setTaskDetail(await req(item.itemType==='task'||item.status?('/api/ai/tasks/'+item.id):('/api/images/'+item.id+'/detail-rich')));
    }catch(e){
      setMsg(e.message);
    }finally{
      setTaskDetailLoading(false);
    }
  }

  function openWorkbenchResourceUpload(){
    const nextType=op==='replace_bg'?'scene':'material';
    setResourceUpload(u=>({
      ...u,
      resourceType:nextType,
      objectName:nextType==='scene'?'场景模板':'材质',
      colorName:'',
      description:''
    }));
    setResourceUploadOpen(true);
  }

  function chooseWorkbenchResourceFile(file){
    setResourceUploadFile(file||null);
    setResourceUploadPreview(file?URL.createObjectURL(file):'');
  }

  async function createWorkbenchResource(){
    try{
      if(!resourceUploadFile)return setMsg('请先选择资源图片');
      if(!resourceUpload.name.trim())return setMsg('请输入资源名称');
      const fd=new FormData();
      Object.entries(resourceUpload).forEach(([k,v])=>fd.append(k,v||''));
      fd.append('image',resourceUploadFile);
      await reqForm('/api/merchant/resources',fd);
      setMsg((me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN')?'门店资源已上传':'个人资源已上传');
      setResourceUploadOpen(false);
      setResourceUploadFile(null);
      setResourceUploadPreview('');
      const nextType=op==='replace_bg'?'scene':'material';
      setResourceUpload({name:'',resourceType:nextType,objectName:nextType==='scene'?'场景模板':'材质',colorName:'',description:''});
      const d=await req('/api/resources?pageSize=999');
      setResources(d.items||[]);
      setResourceScope((me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN')?'MERCHANT':'ALL');
    }catch(e){setMsg(e.message)}
  }

  const featureList=[
    ['material','材质替换','材质'],
    ['replace_bg','场景融合','场景'],
    ['remove_bg','背景净化','3D'],
    ['enhance','摄影增强','摄影'],
    ['lineart','线稿图','线稿'],
    ['multiview','多角度视图','视图']
  ];
  const resourceItems=filteredResources();
  const modalItems=modalResources();
  const selectedTpl=currentTemplate();
  const workbenchUploadMainOptions=resourceUpload.resourceType==='scene'
    ? ['场景模板']
    : resourceUpload.resourceType==='user_reference'
      ? ['产品']
      : ['材质','软体'];
  const defaultWorkbenchSubs={
    '材质':['木材','皮革','布艺','金属','石材','玻璃','板材'],
    '软体':['沙发','床垫','靠包','抱枕','软包'],
    '产品':['家具原图','结构参考','风格参考'],
    '场景模板':['客厅','卧室','餐厅','书房','展厅','电商白底']
  };
  const workbenchUploadSubOptions=Array.from(new Set([
    ...(defaultWorkbenchSubs[resourceUpload.objectName]||[]),
    ...resources
      .filter(r=>String(r.mainCategoryName||r.objectName||'')===String(resourceUpload.objectName||''))
      .map(r=>String(r.subCategoryName||r.colorName||'').trim())
      .filter(Boolean)
  ]));
  function changeWorkbenchUploadType(type){
    const main=type==='scene'?'场景模板':type==='user_reference'?'产品':'材质';
    setResourceUpload({...resourceUpload,resourceType:type,objectName:main,colorName:'',description:''});
  }
  function changeWorkbenchUploadMain(main){
    setResourceUpload({...resourceUpload,objectName:main,colorName:''});
  }
  const recentItems=recent.filter(i=>{
    const kw=recentKeyword.trim().toLowerCase();
    if(!kw)return true;
    return String(i.id).toLowerCase().includes(kw)||(ops[i.kind]?.label||i.kind||'').toLowerCase().includes(kw);
  }).slice(0,12);

  function renderLeftPanel(){
    if(op==='material' || op==='replace_bg'){
      return <>
        <div className="wbDescRow"><span className="wbMiniIcon">✓</span><p>{ops[op].desc}</p></div>
        <div className="wbSearchRow">
          <div className="wbSearchInput"><Search size={16}/><input placeholder="搜索资源..." value={resourceKeyword} onChange={e=>setResourceKeyword(e.target.value)}/></div>
          <select className="wbSelect" value={resourceScope} onChange={e=>setResourceScope(e.target.value)}>
            <option value="SYSTEM">系统空间</option>
            <option value="MERCHANT">门店空间</option>
            <option value="USER">个人空间</option>
            <option value="ALL">全部空间</option>
          </select>
        </div>
        <div className="wbSectionLabel">{op==='material'?'材质替换':'场景融合资源'}</div>
        <div className="wbResourceGrid">
          <button className="wbUploadCard" onClick={openWorkbenchResourceUpload}>
            <span>+</span>
            <b>上传</b>
          </button>
          {resourceItems.map(r=><button key={r.scope+r.id} className={selectedResource===String(r.id)?'wbResourceCard active':'wbResourceCard'} onClick={()=>setSelectedResource(String(r.id))}>
            {r.imageUrl?<img src={imgSrc(r.imageUrl)} alt={r.name}/>:<div className="wbResourcePlaceholder">{resTypeName[r.resourceType]}</div>}
            <b>{r.name}</b>
            <span>{r.scope==='SYSTEM'?'系统':'门店'} / {r.mainCategoryName||r.objectName||resTypeName[r.resourceType]}{(r.subCategoryName||r.colorName)?` / ${r.subCategoryName||r.colorName}`:''}</span>
          </button>)}
          {!resourceItems.length&&<div className="wbLibraryEmpty">暂无资源，点击加号上传</div>}
        </div>
      </>;
    }
    if(op==='remove_bg'){
      return <>
        <div className="wbDescRow"><span className="wbMiniIcon">3D</span><p>{ops[op].desc}</p></div>
        <div className="wbConfigTitle">生成配置</div>
        <div className="wbOptionCard">
          <div className="wbOptionRow"><div><b>白底图</b><span>纯白干净背景</span></div><label className="wbSwitch"><input type="checkbox" checked={removeOpts.whiteBg} onChange={e=>setRemoveOpts({...removeOpts,whiteBg:e.target.checked})}/><i/></label></div>
          <div className="wbOptionRow"><div><b>镜像产品</b><span>生成镜像感的产品图</span></div><label className="wbSwitch"><input type="checkbox" checked={removeOpts.mirror} onChange={e=>setRemoveOpts({...removeOpts,mirror:e.target.checked})}/><i/></label></div>
        </div>
      </>;
    }
    if(op==='enhance'){
      return <>
        <div className="wbDescRow"><span className="wbMiniIcon">●</span><p>{ops[op].desc}</p></div>
        <div className="wbConfigTitle">摄影增强选项</div>
        <div className="wbOptionCard">
          <div className="wbOptionRow"><div><b>产品聚焦</b><span>开启后突出产品并增强背景虚化</span></div><label className="wbSwitch"><input type="checkbox" checked={enhanceOpts.focus} onChange={e=>setEnhanceOpts({...enhanceOpts,focus:e.target.checked})}/><i/></label></div>
          <div className="wbAngleGroup"><b>角度</b><div className="wbPills">{['不变','正面','45度','侧面'].map(item=><button key={item} className={enhanceOpts.angle===item?'active':''} onClick={()=>setEnhanceOpts({...enhanceOpts,angle:item})}>{item}</button>)}</div></div>
        </div>
      </>;
    }
    if(op==='lineart'){
      return <div className="wbDescRow wbOnlyDesc"><span className="wbMiniIcon">≈</span><p>{ops[op].desc}</p></div>;
    }
    return <>
      <div className="wbDescRow"><span className="wbMiniIcon">●</span><p>{ops[op].desc}</p></div>
      <div className="wbConfigTitle">视图选项</div>
      <div className="wbOptionCard wbRadioList">
        <label className="wbRadioRow"><div><b>三角度视图</b><span>正面、45度角、侧面</span></div><input type="radio" name="mv" checked={multiView==='三角度视图'} onChange={()=>setMultiView('三角度视图')}/></label>
        <label className="wbRadioRow"><div><b>四角度视图</b><span>正面、45度角、侧面、背面</span></div><input type="radio" name="mv" checked={multiView==='四角度视图'} onChange={()=>setMultiView('四角度视图')}/></label>
      </div>
    </>;
  }

  return <>
  <div className="wbScreen">
    <div className="wbSidePanel">
      <div className="wbPanelTitle">功能选择</div>
      <div className="wbFeatureGrid">{featureList.map(([k,label,tag])=><button key={k} className={op===k?'wbFeatureBtn active':'wbFeatureBtn'} onClick={()=>setOp(k)}><span className="wbFeatureTag">{tag}</span><span>{label}</span></button>)}</div>
      <div className="wbDivider"/>
      {renderLeftPanel()}
    </div>

    <section className="wbCenterPanel">
      <WorkbenchUploadPanel
        origin={origin}
        reference={reference}
        selectedTpl={selectedTpl}
        imgSrc={imgSrc}
        draggingSource={draggingSource}
        draggingRef={draggingRef}
        chooseSource={chooseSource}
        chooseReference={chooseReference}
        dragOver={dragOver}
        dragLeave={dragLeave}
        dropUpload={dropUpload}
        openResourceModal={openResourceModal}
        onOpenWatermark={()=>setWatermarkOpen(true)}
        canConfigureWatermark={me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN'}
        clearSourceImage={clearSourceImage}
        clearReferenceImage={clearReferenceImage}
        setMsg={setMsg}
      />

      <GenerationControls
        custom={custom}
        setCustom={setCustom}
        resolution={resolution}
        setResolution={setResolution}
        ratio={ratio}
        setRatio={setRatio}
        gen={gen}
        cost={calcWorkbenchCost()}
        remainingQuota={me.quota}
      />
    </section>

    <div className="wbRightPanel">
      <div className="wbRightHeader"><b>最近生成</b><button onClick={refreshRecent}>↻</button></div>
      <div className="wbRecentSearch"><Search size={16}/><input placeholder="搜索任务ID..." value={recentKeyword} onChange={e=>setRecentKeyword(e.target.value)}/></div>

      <div className="wbRecentList">{recentItems.length?recentItems.map(item=>{
        const running=item.status==='queued'||item.status==='running';
        const failed=item.status==='failed';
        return <div
          className={running?'wbRecentItem isLoading':failed?'wbRecentItem isFailed':'wbRecentItem'}
          key={item.id}
          onMouseEnter={(e)=>{setRecentHoverId(item.id);showRecentOriginal(item,e);}}
          onMouseMove={(e)=>moveRecentOriginal(item,e)}
          onMouseLeave={()=>{setRecentHoverId(prev=>prev===item.id?'':prev);hideRecentOriginal();}}
          onClick={()=>openRecentTask(item)}
        >
          <div className="wbRecentThumb"><img src={imgSrc(item.url||item.previewUrl||item.sourceUrl)} alt="最近生成"/>{running&&<i className="wbSpin"/>}{failed&&<em>失败</em>}</div>
          <div className="wbRecentInfo"><b>{ops[item.kind||item.featureKey]?.label||item.featureName||item.kind}</b><span>{running?'生成中...':failed?'失败，已退回算力':fmt(item.createdAt||item.submittedAt)}</span><small>{item.id}</small></div>
          {!running&&!failed&&<div
            style={{
              position:'absolute',
              right:8,
              top:8,
              display:'flex',
              gap:6,
              opacity:recentHoverId===item.id?1:0,
              pointerEvents:recentHoverId===item.id?'auto':'none',
              transition:'opacity .18s ease',
              zIndex:3
            }}
          >
            {renderRecentActionButton(<RotateCcw size={14}/>,(e)=>{e.stopPropagation();setMsg('重生成按钮已预留，后续再接入逻辑');},'重生成',{disabled:true})}
            {renderRecentActionButton(<Download size={14}/>,(e)=>{e.stopPropagation();window.open(`${API}/api/images/${item.resultImage?.id||item.imageId}/download?token=${token()}`,'_blank');},'下载')}
            {renderRecentActionButton(<Trash2 size={14}/>,(e)=>deleteRecentTask(item,e),'删除',{danger:true})}
          </div>}
        </div>
      }):<div className="wbRecentEmpty">暂无生成记录</div>}</div>
      <button className="wbMoreBtn" onClick={()=>goPage&&goPage('images')}>查看更多记录</button>
    </div>
  </div>

  {recentSourcePreview&&<div
    style={{
      position:'fixed',
      right:'calc(var(--wb-right-width, 248px) + 18px)',
      top:recentSourcePreview.top,
      transform:'translateY(-50%)',
      width:320,
      height:240,
      borderRadius:20,
      overflow:'hidden',
      background:'#111',
      border:'1px solid rgba(242,213,140,.42)',
      boxShadow:'0 28px 80px rgba(0,0,0,.72)',
      zIndex:10000,
      pointerEvents:'auto'
    }}
    onMouseEnter={clearRecentPreviewTimer}
    onMouseLeave={hideRecentOriginal}
  >
    <div style={{
      position:'absolute',
      left:12,
      top:12,
      zIndex:2,
      maxWidth:'calc(100% - 24px)',
      padding:'6px 10px',
      borderRadius:999,
      background:'rgba(0,0,0,.58)',
      color:'#f2d58c',
      fontSize:13,
      fontWeight:900,
      whiteSpace:'nowrap',
      overflow:'hidden',
      textOverflow:'ellipsis'
    }}>
      {recentSourcePreview.loading?'正在读取原图...':`${recentSourcePreview.title} 原图`}
    </div>
    <img
      src={imgSrc(recentSourcePreview.url)}
      alt="原图预览"
      style={{width:'100%',height:'100%',objectFit:'cover',display:'block',background:'#fff'}}
      onError={(e)=>{
        if(e.currentTarget.dataset.fallback!=='1'){
          e.currentTarget.dataset.fallback='1';
          e.currentTarget.src=imgSrc(recentSourcePreview.fallback);
        }
      }}
    />
  </div>}

  {taskDetailLoading&&<div className="modalMask"><div className="empty big">加载中...</div></div>}
  {taskDetail&&!taskDetailLoading&&<TaskDetailModal
    detail={taskDetail}
    onClose={()=>setTaskDetail(null)}
    isAdmin={false}
    ops={ops}
    setMsg={setMsg}
    onDeleted={(id)=>{setRecent(prev=>prev.filter(x=>String(x.resultImage?.id||x.imageId||x.id)!==String(id)));refreshRecent()}}
    onUpdated={(image)=>{setTaskDetail(prev=>prev?{...prev,...image}:image);refreshRecent()}}
    taskList={recentItems}
    onSwitchTask={openRecentTask}
    onContinueImage={continueWithImage}
  />}

  <ResourcePickerModal resourceModal={resourceModal} setResourceModal={setResourceModal} modalItems={modalItems} chooseResourceImage={chooseResourceImage} imgSrc={imgSrc}/>
  <WatermarkConfigModal open={watermarkOpen} onClose={()=>setWatermarkOpen(false)} setMsg={setMsg}/>
  {resourceUploadOpen&&<div className="resourceUploadMaskV3">
    <div className="resourceUploadModalV3">
      <div className="resourceUploadHeadV3">
        <h2>上传资源</h2>
        <button type="button" onClick={()=>setResourceUploadOpen(false)}>×</button>
      </div>
      <div className="resourceUploadBodyV3">
        <label className="resourceDropV3">
          <input type="file" accept="image/*" onChange={e=>chooseWorkbenchResourceFile(e.target.files?.[0])}/>
          {resourceUploadPreview?<img src={resourceUploadPreview} alt="preview"/>:<>
            <ImageIcon size={46}/>
            <b>拖拽图片到这里，或选择文件</b>
            <span>用于材质替换或场景融合资源</span>
            <em>选择文件</em>
          </>}
        </label>
        <div className="resourceUploadSettingsV3">
          <h3>上传设置</h3>
          <p><b>空间：</b><span>{(me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN')?'门店空间':'个人空间'}</span><small>{(me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN')?' 当前门店共享使用':' 仅当前账号使用'}</small></p>
          <input placeholder="资源名称" value={resourceUpload.name} onChange={e=>setResourceUpload({...resourceUpload,name:e.target.value})}/>
          <select value={resourceUpload.resourceType} onChange={e=>changeWorkbenchUploadType(e.target.value)}>
            <option value="material">材质替换</option>
            <option value="scene">场景融合</option>
            <option value="user_reference">用户图</option>
          </select>
          <select value={resourceUpload.objectName} onChange={e=>changeWorkbenchUploadMain(e.target.value)}>
            {workbenchUploadMainOptions.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          <select value={resourceUpload.colorName} onChange={e=>setResourceUpload({...resourceUpload,colorName:e.target.value})}>
            <option value="">不设置子类别</option>
            {workbenchUploadSubOptions.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="resourceUploadFootV3">
        <button type="button" onClick={()=>setResourceUploadOpen(false)}>取消</button>
        <button className="primary" type="button" disabled={!resourceUploadFile||!resourceUpload.name.trim()} onClick={createWorkbenchResource}>开始上传</button>
      </div>
    </div>
  </div>}
  </>
}


function StoreResources({me,setMsg}){
  const isSystemAdmin=me?.role==='SYSTEM_ADMIN';
  const isStoreAdmin=me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN';
  const {query,setQuery,data,load}=usePaged('/api/merchant/resources',{keyword:'',resourceType:'',mainCategory:'',subCategory:'',status:'',scope:'MERCHANT',page:1,pageSize:24});
  const [sys,setSys]=useState([]);
  const [space,setSpace]=useState('SYSTEM');
  const [sysPage,setSysPage]=useState(1);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [categoryTree,setCategoryTree]=useState([]);
  const [categoryLoading,setCategoryLoading]=useState(false);
  const [categoryError,setCategoryError]=useState('');
  const [activeResourcePanel,setActiveResourcePanel]=useState('');
  const [renameTarget,setRenameTarget]=useState(null);
  const [renameValue,setRenameValue]=useState('');
  const [categoryForm,setCategoryForm]=useState(null);
  const [selectedResourceIds,setSelectedResourceIds]=useState(()=>new Set());
  const [batchCategoryOpen,setBatchCategoryOpen]=useState(false);
  const [batchDeleteOpen,setBatchDeleteOpen]=useState(false);
  const [batchMainCategory,setBatchMainCategory]=useState('');
  const [batchSubCategory,setBatchSubCategory]=useState('');
  const [detail,setDetail]=useState(null);
  const [dragging,setDragging]=useState(false);
  const [f,setF]=useState({name:'',resourceType:'material',objectName:'材质',colorName:'',description:''});
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState('');

  const pageSize=24;
  const canUpload=true;
  const defaultCategoryGroups=[
    {useKey:'material',useLabel:'材质替换',mains:[{name:'材质',subs:['北美白蜡木','北美胡桃木']},{name:'软体',subs:['布料','PU皮']}]},
    {useKey:'PRODUCT',useLabel:'产品图',mains:[{name:'产品',subs:['预设产品','AI生成']}]},
    {useKey:'scene',useLabel:'场景融合',mains:[{name:'场景模板',subs:['椅子场景','沙发场景']}]}
  ];
  const fixedMainCategories=['材质','软体','产品','场景模板'];
  const categoryScope=space==='SYSTEM'?'SYSTEM':space==='STORE'?'MERCHANT':'USER';

  function fixedCategoryUseLabel(main){
    if(main==='材质'||main==='软体')return '材质替换';
    if(main==='场景模板')return '场景融合';
    return '产品图';
  }

  function fixedCategoryResourceType(main){
    const group=categoryGroups.find(g=>g.name===main||g.rawName===main);
    if(group?.useLabel==='材质替换')return 'material';
    if(group?.useLabel==='场景融合')return 'scene';
    if(main==='材质'||main==='软体')return 'material';
    if(main==='场景模板')return 'scene';
    return 'user_reference';
  }

  function normalizeResourceMain(r){
    const raw=String(r.mainCategoryName||r.objectName||'').trim();
    return fixedMainCategories.includes(raw)?raw:'未分类';
  }

  function normalizeResourceSub(r){
    return String(r.subCategoryName||r.colorName||'').trim();
  }

  function resourceUseLabel(r){
    return fixedCategoryUseLabel(normalizeResourceMain(r));
  }

  async function loadCategories(){
    try{
      setCategoryLoading(true);
      setCategoryError('');
      const d=await req('/api/categories/tree?scope='+categoryScope);
      setCategoryTree(d.purposes||[]);
    }catch(e){
      setCategoryError(e.message||'分类数据读取失败');
      setMsg(e.message);
    }finally{
      setCategoryLoading(false);
    }
  }

  useEffect(()=>{
    req((isSystemAdmin?'/api/admin/resources':'/api/resources')+'?pageSize=999')
      .then(d=>setSys((d.items||[]).filter(x=>x.scope==='SYSTEM')))
      .catch(e=>setMsg(e.message));
  },[isSystemAdmin]);

  useEffect(()=>{
    setSysPage(1);
    setSelectedResourceIds(new Set());
  },[query.keyword,query.resourceType,query.mainCategory,query.subCategory,query.status,space]);

  useEffect(()=>{
    if(space==='STORE')setQuery(q=>({...q,scope:'MERCHANT',page:1}));
    if(space==='PERSONAL')setQuery(q=>({...q,scope:'USER',page:1}));
  },[space]);

  useEffect(()=>{loadCategories()},[categoryScope]);

  function chooseFile(img){
    setFile(img||null);
    setPreview(img?URL.createObjectURL(img):'');
  }

  function choose(e){
    chooseFile(e.target.files?.[0]);
  }

  function onDrop(e){
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    chooseFile(e.dataTransfer?.files?.[0]);
  }

  function resetUpload(){
    setF({name:'',resourceType:'material',objectName:'材质',colorName:'',description:''});
    setFile(null);
    setPreview('');
    setDragging(false);
  }

  function closeUpload(){
    setUploadOpen(false);
    setDragging(false);
  }

  async function create(){
    try{
      if(!file)return setMsg('请先选择资源图片');
      if(!f.name.trim())return setMsg('请输入资源名称');

      const fd=new FormData();
      Object.entries(f).forEach(([k,v])=>fd.append(k,v||''));
      fd.append('image',file);

      await reqForm(isSystemAdmin&&space==='SYSTEM'?'/api/admin/resources':'/api/merchant/resources',fd);
      setMsg(isSystemAdmin&&space==='SYSTEM'?'系统资源已上传':isStoreAdmin?'门店资源已上传':'个人资源已上传');
      resetUpload();
      setUploadOpen(false);
      if(!isSystemAdmin)setSpace(isStoreAdmin?'STORE':'PERSONAL');
      load();
      req((isSystemAdmin?'/api/admin/resources':'/api/resources')+'?pageSize=999').then(d=>setSys((d.items||[]).filter(x=>x.scope==='SYSTEM'))).catch(()=>{});
    }catch(e){
      setMsg(e.message);
    }
  }

  async function patch(id,status){
    try{
      await req(isSystemAdmin&&space==='SYSTEM'?('/api/admin/resources/'+id):('/api/merchant/resources/'+id),{method:'PATCH',body:JSON.stringify({status})});
      setMsg('状态已更新');
      load();
    }catch(e){
      setMsg(e.message);
    }
  }

  async function del(id){
    if(!confirm('确定删除该资源？'))return;
    try{
      await req(isSystemAdmin&&space==='SYSTEM'?('/api/admin/resources/'+id):('/api/merchant/resources/'+id),{method:'DELETE'});
      setMsg('资源已删除');
      load();
    }catch(e){
      setMsg(e.message);
    }
  }

  async function openDetail(id){
    try{
      const d=await req('/api/resources/'+id+'/detail');
      setDetail(d);
      setCategoryOpen(false);
      setRenameTarget(null);
      setActiveResourcePanel('detail');
    }catch(e){
      setMsg(e.message);
    }
  }

  function toggleResourceSelected(id,checked){
    setSelectedResourceIds(prev=>{
      const next=new Set(prev);
      if(checked)next.add(String(id));
      else next.delete(String(id));
      return next;
    });
  }

  function clearResourceSelection(){
    setSelectedResourceIds(new Set());
    setBatchCategoryOpen(false);
    setBatchDeleteOpen(false);
  }

  async function batchDeleteResources(){
    const ids=Array.from(selectedResourceIds);
    if(!ids.length)return;
    setBatchDeleteOpen(true);
  }

  async function confirmBatchDeleteResources(){
    const ids=Array.from(selectedResourceIds);
    if(!ids.length)return;
    try{
      for(const id of ids){
        await req(isSystemAdmin&&space==='SYSTEM'?('/api/admin/resources/'+id):('/api/merchant/resources/'+id),{method:'DELETE'});
      }
      setMsg(`已删除 ${ids.length} 个资源`);
      clearResourceSelection();
      load();
      req((isSystemAdmin?'/api/admin/resources':'/api/resources')+'?pageSize=999').then(d=>setSys((d.items||[]).filter(x=>x.scope==='SYSTEM'))).catch(()=>{});
    }catch(e){
      setMsg(e.message);
    }
  }

  function openBatchCategoryModal(){
    const firstMain=mainOptions[0]||'';
    setBatchMainCategory(firstMain);
    setBatchSubCategory('');
    setBatchCategoryOpen(true);
  }

  async function submitBatchCategory(){
    const ids=Array.from(selectedResourceIds);
    if(!ids.length)return;
    if(!batchMainCategory)return setMsg('请选择主分类');
    try{
      for(const id of ids){
        await req(isSystemAdmin&&space==='SYSTEM'?('/api/admin/resources/'+id):('/api/merchant/resources/'+id),{method:'PATCH',body:JSON.stringify({objectName:batchMainCategory,colorName:batchSubCategory})});
      }
      setMsg(`已修改 ${ids.length} 个资源的分类`);
      setBatchCategoryOpen(false);
      clearResourceSelection();
      load();
      req((isSystemAdmin?'/api/admin/resources':'/api/resources')+'?pageSize=999').then(d=>setSys((d.items||[]).filter(x=>x.scope==='SYSTEM'))).catch(()=>{});
    }catch(e){
      setMsg(e.message);
    }
  }

  function openRename(r,{keepDetail=false}={}){
    setCategoryOpen(false);
    if(!keepDetail){
      setDetail(null);
      setActiveResourcePanel('');
    }
    setRenameTarget(r);
    setRenameValue(r.name||'');
  }

  async function submitRename(){
    try{
      const name=renameValue.trim();
      if(!name)return setMsg('资源名称不能为空');
      await req(isSystemAdmin&&space==='SYSTEM'?('/api/admin/resources/'+renameTarget.id):('/api/merchant/resources/'+renameTarget.id),{method:'PATCH',body:JSON.stringify({name})});
      setMsg('资源已重命名');
      if(detail?.image?.id===renameTarget.id)setDetail({...detail,image:{...detail.image,name}});
      setRenameTarget(null);
      if(activeResourcePanel!=='detail')setActiveResourcePanel('');
      load();
      req((isSystemAdmin?'/api/admin/resources':'/api/resources')+'?pageSize=999').then(d=>setSys((d.items||[]).filter(x=>x.scope==='SYSTEM'))).catch(()=>{});
    }catch(e){
      setMsg(e.message);
    }
  }

  function matchSystem(r){
    const kw=String(query.keyword||'').trim().toLowerCase();
    const okKeyword=!kw||[r.name,r.objectName,r.colorName,r.mainCategoryName,r.subCategoryName,r.description,resTypeName[r.resourceType]]
      .some(v=>String(v||'').toLowerCase().includes(kw));
    const okType=!query.resourceType||r.resourceType===query.resourceType;
    const okMain=!query.mainCategory||normalizeResourceMain(r)===String(query.mainCategory);
    const okSub=!query.subCategory||normalizeResourceSub(r)===String(query.subCategory);
    const okStatus=!query.status||r.status===query.status;
    return okKeyword&&okType&&okMain&&okSub&&okStatus;
  }

  const systemItems=sys.filter(matchSystem);
  const systemPages=Math.max(1,Math.ceil(systemItems.length/pageSize));
  const systemDisplay=systemItems.slice((sysPage-1)*pageSize,sysPage*pageSize);

  const storeItems=data.items||[];
  const storePages=Math.max(1,Math.ceil((data.total||0)/(data.pageSize||pageSize)));
  const isSystem=space==='SYSTEM';
  const displayItems=isSystem?systemDisplay:storeItems;
  const total=isSystem?systemItems.length:(data.total||0);
  const currentPage=isSystem?sysPage:(data.page||query.page||1);
  const totalPages=isSystem?systemPages:storePages;

  function changePage(next){
    const page=Math.max(1,Math.min(totalPages,next));
    if(isSystem)setSysPage(page);
    else setQuery(q=>({...q,page}));
  }

  function imgUrl(r){
    if(!r.imageUrl)return '';
    return r.imageUrl.startsWith('http')?r.imageUrl:API+r.imageUrl;
  }

  function triggerSearch(){
    if(isSystem)setSysPage(1);
    else setQuery(q=>({...q,page:1}));
  }

  const categoryGroups=(()=>{
    if(categoryTree.length){
      return categoryTree.flatMap(p=>(p.mains||[]).map(main=>({
        id:main.id,
        name:main.name,
        rawName:main.name,
        useLabel:p.purposeName,
        purposeKey:p.purposeKey,
        subs:(main.subs||[]).map(sub=>sub.name).filter(Boolean),
        subItems:main.subs||[],
        canManage:main.canManage
      })));
    }
    const allFilterItems=[...sys,...(data.items||[])];
    const map=new Map();
    function add(main,sub,useLabel){
      const m=String(main||'').trim();
      if(!m)return;
      if(!map.has(m))map.set(m,{name:m,useLabel:useLabel||'产品图',subs:new Set()});
      if(sub)map.get(m).subs.add(String(sub).trim());
    }
    defaultCategoryGroups.forEach(group=>group.mains.forEach(main=>main.subs.forEach(sub=>add(main.name,sub,group.useLabel))));
    allFilterItems.forEach(r=>{
      const main=normalizeResourceMain(r);
      add(main,normalizeResourceSub(r),resourceUseLabel(r));
    });
    return fixedMainCategories
      .map(name=>map.get(name)||{name,useLabel:name==='材质'||name==='软体'?'材质替换':name==='场景模板'?'场景融合':'产品图',subs:new Set()})
      .map(item=>{
        const visibleSubs=Array.from(item.subs).filter(Boolean);
        return {...item,rawName:item.name,subs:visibleSubs};
      });
  })();
  const mainOptions=categoryGroups.map(g=>g.name);
  const selectedMain=categoryGroups.find(g=>g.name===query.mainCategory);
  const subOptions=selectedMain?.subs||[];
  const batchSelectedMain=categoryGroups.find(g=>g.name===batchMainCategory);
  const batchSubOptions=batchSelectedMain?.subs||[];
  const selectedCount=selectedResourceIds.size;
  const uploadMain=f.objectName||categoryGroups[0]?.name||'材质';
  const uploadSelectedMain=categoryGroups.find(g=>g.name===uploadMain);
  const uploadSubOptions=uploadSelectedMain?.subs||[];

  function changeUploadMain(main){
    setF({...f,objectName:main,colorName:'',resourceType:fixedCategoryResourceType(main)});
  }

  const hasSidePanel=categoryOpen||detail||renameTarget;
  const detailImage=detail?.image||null;
  const detailUrl=detailImage?.url?(detailImage.url.startsWith('http')?detailImage.url:API+detailImage.url):'';
  const detailCategory=detailImage?[detailImage.mainCategoryName,detailImage.subCategoryName].filter(Boolean).join(' / ')||'未分类':'';
  const categorySections=categoryTree.length?categoryTree:[
    {purposeKey:'user_reference',purposeName:'产品参考',mains:[]},
    {purposeKey:'material',purposeName:'材质替换',mains:[]},
    {purposeKey:'scene',purposeName:'场景融合',mains:[]}
  ];
  const categoryPurposeOptions=categorySections.map(section=>({key:section.purposeKey,name:section.purposeName}));
  const canCreateCategory=categoryScope!=='SYSTEM'||isSystemAdmin;

  function closeSidePanel(){
    setCategoryOpen(false);
    setDetail(null);
    setRenameTarget(null);
    setCategoryForm(null);
    setActiveResourcePanel('');
  }

  function openCategoryPanel(){
    setDetail(null);
    setRenameTarget(null);
    setCategoryOpen(true);
    setActiveResourcePanel('category');
  }

  async function createMainCategory(purposeKey='user_reference'){
    setCategoryForm({mode:'createMain',title:'创建主分类',label:'分类名称',value:'',purposeKey,sortOrder:0});
  }

  async function renameMainCategory(main){
    setCategoryForm({mode:'renameMain',title:'编辑主分类',label:'分类名称',value:main.name,main,sortOrder:main.sortOrder||0});
  }

  async function deleteMainCategory(main){
    setCategoryForm({mode:'deleteMain',title:'删除主分类',value:main.name,main,danger:true});
  }

  async function createSubCategory(main){
    setCategoryForm({mode:'createSub',title:'创建子分类',label:'分类名称',value:'',main,sortOrder:0});
  }

  async function renameSubCategory(sub){
    setCategoryForm({mode:'renameSub',title:'编辑子分类',label:'分类名称',value:sub.name,sub,sortOrder:sub.sortOrder||0});
  }

  async function deleteSubCategory(sub){
    setCategoryForm({mode:'deleteSub',title:'删除子分类',value:sub.name,sub,danger:true});
  }

  async function submitCategoryForm(){
    if(!categoryForm)return;
    const name=String(categoryForm.value||'').trim();
    if(!categoryForm.danger&&!name)return;
    try{
      if(categoryForm.mode==='createMain'){
        await req('/api/categories/main',{method:'POST',body:JSON.stringify({scope:categoryScope,purposeKey:categoryForm.purposeKey||'user_reference',name,sortOrder:Number(categoryForm.sortOrder||0)})});
        setMsg('主分类已创建');
      }else if(categoryForm.mode==='renameMain'){
        if(name===categoryForm.main.name)return setCategoryForm(null);
        await req('/api/categories/main/'+categoryForm.main.id,{method:'PATCH',body:JSON.stringify({name,sortOrder:Number(categoryForm.sortOrder||0)})});
        setMsg('主分类已重命名');
      }else if(categoryForm.mode==='deleteMain'){
        await req('/api/categories/main/'+categoryForm.main.id,{method:'PATCH',body:JSON.stringify({status:'DELETED'})});
        setMsg('主分类已删除');
      }else if(categoryForm.mode==='createSub'){
        await req('/api/categories/'+categoryForm.main.id+'/sub',{method:'POST',body:JSON.stringify({name,sortOrder:Number(categoryForm.sortOrder||0)})});
        setMsg('子分类已创建');
      }else if(categoryForm.mode==='renameSub'){
        if(name===categoryForm.sub.name)return setCategoryForm(null);
        await req('/api/categories/sub/'+categoryForm.sub.id,{method:'PATCH',body:JSON.stringify({name,sortOrder:Number(categoryForm.sortOrder||0)})});
        setMsg('子分类已重命名');
      }else if(categoryForm.mode==='deleteSub'){
        await req('/api/categories/sub/'+categoryForm.sub.id,{method:'PATCH',body:JSON.stringify({status:'DELETED'})});
        setMsg('子分类已删除');
      }
      setCategoryForm(null);
      loadCategories();
    }catch(e){
      setMsg(e.message);
    }
  }

  function formatResourceBytes(bytes){
    const n=Number(bytes||0);
    if(!n)return '-';
    if(n<1024)return `${n} B`;
    if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(2)} MB`;
  }

  return <div className="resourcePageV3">
    <section className="resourceToolbarV3">
      <div className="resourceSearchBoxV3">
        <Search size={22}/>
        <input
          placeholder="搜索资源名称..."
          value={query.keyword}
          onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}
          onKeyDown={e=>{if(e.key==='Enter')triggerSearch()}}
        />
      </div>

      <select value={query.mainCategory} onChange={e=>setQuery({...query,mainCategory:e.target.value,subCategory:'',page:1})}>
        <option value="">全部主分类</option>
        {[{name:'未分类',useLabel:'产品图'},...categoryGroups].map(v=><option key={v.name} value={v.name}>{v.name}　用于：{v.useLabel}</option>)}
      </select>

      <select value={query.subCategory} disabled={!query.mainCategory} onChange={e=>setQuery({...query,subCategory:e.target.value,page:1})}>
        <option value="">全部子类别</option>
        {subOptions.map(v=><option key={v} value={v}>{v}</option>)}
      </select>

      <button className="resourceManageCategoryV3" type="button" onClick={openCategoryPanel}>管理分类</button>

      {canUpload&&<button className="resourceUploadOpenV3" type="button" onClick={()=>setUploadOpen(true)}>
        <span>+</span> 上传文件
      </button>}
    </section>

    <section className="resourceSpaceTabsV3">
      <div className="resourceSpaceTabButtonsV3">
        <button className={space==='SYSTEM'?'active':''} onClick={()=>setSpace('SYSTEM')}>系统空间</button>
        {!isSystemAdmin&&isStoreAdmin&&<button className={space==='STORE'?'active':''} onClick={()=>setSpace('STORE')}>门店空间</button>}
        {!isSystemAdmin&&!isStoreAdmin&&<button className={space==='PERSONAL'?'active':''} onClick={()=>setSpace('PERSONAL')}>我的空间</button>}
      </div>
      {selectedCount>0&&<div className="resourceBatchBarV8">
        <b>已选 {selectedCount} 项</b>
        <button type="button" onClick={openBatchCategoryModal}>修改分类</button>
        <button type="button" className="danger" onClick={batchDeleteResources}>删除</button>
        <button type="button" className="ghost" onClick={clearResourceSelection}>取消选择</button>
      </div>}
    </section>

    {activeResourcePanel&&<section className={activeResourcePanel==='category'?'resourceActionPanelV7 categoryDrawerV7':activeResourcePanel==='detail'?'resourceActionPanelV7 detailDrawerV7':'resourceActionPanelV7'}>
      {activeResourcePanel==='category'&&<div className="resourceActionContentV7">
        <div className="resourceCategoryDrawerHeadV7">
          <div>
            <h2>分类管理</h2>
            <span>全部分类会在这里统一展示，可新增、重命名或删除可管理分类。</span>
          </div>
          <div className="resourceCategoryDrawerActionsV7">
            {canCreateCategory&&<button type="button" className="primary" onClick={()=>createMainCategory('user_reference')}><Plus size={16}/>创建主分类</button>}
            <button type="button" className="iconOnly" title="刷新" aria-label="刷新" onClick={loadCategories}><RotateCcw size={17}/></button>
            <button type="button" className="iconOnly" title="收起" aria-label="收起" onClick={closeSidePanel}><X size={18}/></button>
          </div>
        </div>
        {categoryLoading&&<div className="resourceSideStateV6">分类加载中...</div>}
        {categoryError&&<div className="resourceSideStateV6 error">{categoryError}</div>}
        <div className="resourceCategoryFlatV7">
          {categorySections.map(section=><section className="resourceCategorySectionInlineV6" key={section.purposeKey}>
            <div className="resourceCategoryPurposeV6">
              <h3>{section.purposeName}</h3>
              {canCreateCategory&&<button type="button" onClick={()=>createMainCategory(section.purposeKey)}><Plus size={14}/>新增</button>}
            </div>
            {(section.mains||[]).length?(section.mains||[]).map(main=><article className="resourceCategoryMainV6" key={main.id}>
              <div className="resourceCategoryMainHeadV6">
                <b>{main.name}</b>
                <span>{(main.subs||[]).length} 个子分类</span>
                {main.canManage&&<button type="button" onClick={()=>renameMainCategory(main)}><Pencil size={15}/></button>}
                {main.canManage&&!main.isFixed&&<button className="danger" type="button" onClick={()=>deleteMainCategory(main)}><Trash2 size={15}/></button>}
              </div>
              <div className="resourceCategorySubListV6">
                {(main.subs||[]).length?(main.subs||[]).map(sub=><div className="resourceCategorySubItemV6" key={sub.id}>
                  <span>{sub.name}</span>
                  {main.canManage&&<button type="button" onClick={()=>renameSubCategory(sub)}><Pencil size={14}/></button>}
                  {main.canManage&&<button className="danger" type="button" onClick={()=>deleteSubCategory(sub)}><Trash2 size={14}/></button>}
                </div>):<div className="resourceCategoryEmptyV6">暂无子分类</div>}
                {main.canManage&&<button className="resourceCategoryAddSubV6" type="button" onClick={()=>createSubCategory(main)}><Plus size={14}/>添加子分类</button>}
              </div>
            </article>):<div className="resourceCategoryEmptyV6">暂无主分类，点击“新增”创建</div>}
          </section>)}
        </div>
      </div>}

      {activeResourcePanel==='detail'&&detail&&detailImage&&<div className="resourceActionContentV7 resourceDetailFlatV7">
        <div className="resourceDetailImageV6">
          {detailUrl?<img src={detailUrl} alt={detailImage.name}/>:<span>暂无图片</span>}
        </div>
        <div>
          <div className="resourceDetailTitleV6">
            <h3>{detailImage.name}</h3>
            <button type="button" onClick={()=>openRename({id:detailImage.id,name:detailImage.name},{keepDetail:true})}><Pencil size={16}/></button>
            <button type="button" onClick={closeSidePanel}><X size={17}/></button>
          </div>
          <dl className="resourceDetailMetaV6">
            <dt>文件大小</dt><dd>{formatResourceBytes(detailImage.fileSize)}</dd>
            <dt>分辨率</dt><dd>{detailImage.width&&detailImage.height?`${detailImage.width} × ${detailImage.height}`:'-'}</dd>
            <dt>分类</dt><dd>{detailCategory}</dd>
            <dt>上传时间</dt><dd>{fmt(detailImage.createdAt)}</dd>
          </dl>
          <div className="resourceDetailActionsV6">
            <button type="button" onClick={()=>localStorage.setItem('pendingWorkbenchImage',JSON.stringify({id:detailImage.id,url:detailImage.url,name:detailImage.name}))}>智能工作台</button>
            <button type="button" onClick={()=>detailUrl&&window.open(detailUrl,'_blank')}>图片处理</button>
          </div>
        </div>
        <section className="resourceRelatedTasksV6">
          <h4>关联生成记录（{(detail.relatedTasks||[]).length}）</h4>
          {(detail.relatedTasks||[]).length?(detail.relatedTasks||[]).map(t=><article key={t.id}>
            <b>{featureName[t.featureKey]||t.featureKey||'AI任务'}</b>
            <span>{t.status} · {fmt(t.submittedAt)}</span>
          </article>):<div className="resourceCategoryEmptyV6">暂无关联生成记录</div>}
        </section>
      </div>}

    </section>}

    {renameTarget&&<div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setRenameTarget(null);}}>
      <div className="resourceCategoryModalV8 resourceRenameModalV8" role="dialog" aria-modal="true" aria-label="重命名资源">
        <h2>重命名资源</h2>
        <input className="resourceCategoryModalInputV8" value={renameValue} autoFocus placeholder="资源名称 *" onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitRename();}}/>
        <div className="resourceCategoryModalActionsV8">
          <button type="button" onClick={()=>setRenameTarget(null)}>取消</button>
          <button type="button" className="primary" disabled={!renameValue.trim()} onClick={submitRename}>保存</button>
        </div>
      </div>
    </div>}

    {batchCategoryOpen&&<div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setBatchCategoryOpen(false);}}>
      <div className="resourceCategoryModalV8 resourceBatchCategoryModalV8" role="dialog" aria-modal="true" aria-label="批量更改分类">
        <h2>批量更改分类（已选 {selectedCount} 项）</h2>
        <select className="resourceCategoryModalSelectV8" value={batchMainCategory} onChange={e=>{setBatchMainCategory(e.target.value);setBatchSubCategory('');}}>
          <option value="">主分类</option>
          {mainOptions.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
        <select className="resourceCategoryModalSelectV8" value={batchSubCategory} disabled={!batchMainCategory} onChange={e=>setBatchSubCategory(e.target.value)}>
          <option value="">子分类</option>
          {batchSubOptions.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
        <div className="resourceCategoryModalActionsV8">
          <button type="button" onClick={()=>setBatchCategoryOpen(false)}>取消</button>
          <button type="button" className="primary" disabled={!batchMainCategory} onClick={submitBatchCategory}>确定</button>
        </div>
      </div>
    </div>}

    {batchDeleteOpen&&<div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setBatchDeleteOpen(false);}}>
      <div className="resourceCategoryModalV8 danger resourceBatchDeleteModalV8" role="dialog" aria-modal="true" aria-label="批量删除资源">
        <h2>批量删除资源</h2>
        <p className="resourceCategoryModalTextV8">确认删除已选的 {selectedCount} 个资源？删除后资源不会再显示。</p>
        <div className="resourceCategoryModalActionsV8">
          <button type="button" onClick={()=>setBatchDeleteOpen(false)}>取消</button>
          <button type="button" className="danger" onClick={confirmBatchDeleteResources}>确认删除</button>
        </div>
      </div>
    </div>}

    {categoryForm&&<div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)setCategoryForm(null);}}>
      <div className={`resourceCategoryModalV8 ${categoryForm.danger?'danger':''}`} role="dialog" aria-modal="true" aria-label={categoryForm.title}>
        <h2>{categoryForm.title}</h2>
        {categoryForm.danger?<>
          <p className="resourceCategoryModalTextV8">确认删除“{categoryForm.value}”？删除后该分类不会再显示。</p>
        </>:<>
          <input className="resourceCategoryModalInputV8" value={categoryForm.value} autoFocus placeholder={`${categoryForm.label} *`} onChange={e=>setCategoryForm({...categoryForm,value:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')submitCategoryForm();}}/>
          {categoryForm.mode==='createMain'&&<select className="resourceCategoryModalSelectV8" value={categoryForm.purposeKey||''} onChange={e=>setCategoryForm({...categoryForm,purposeKey:e.target.value})}>
            {categoryPurposeOptions.map(option=><option key={option.key} value={option.key}>{option.name}</option>)}
          </select>}
        </>}
        <div className="resourceCategoryModalActionsV8">
          <button type="button" onClick={()=>setCategoryForm(null)}>取消</button>
          <button type="button" className={categoryForm.danger?'danger':'primary'} disabled={!categoryForm.danger&&!String(categoryForm.value||'').trim()} onClick={submitCategoryForm}>{categoryForm.danger?'确认删除':'保存'}</button>
        </div>
      </div>
    </div>}

    <div className="resourceInlineLayoutV6">
    <section className="resourceGridPanelV3">
      <div className="resourceGridV3">
        {displayItems.length?displayItems.map(r=>{
          const url=imgUrl(r);
          const canManage=(isSystemAdmin&&isSystem)||(!isSystem&&canUpload&&r.source!=='GENERATED_IMAGE');
          return <article className="resourceCardV3" key={space+'-'+r.id}>
            <label className="resourceSelectV3" title="勾选">
              <input type="checkbox" aria-label="勾选资源" checked={selectedResourceIds.has(String(r.id))} onChange={e=>toggleResourceSelected(r.id,e.target.checked)}/>
              <span></span>
            </label>

            <div className="resourceImageV3">
              {url?<img src={url} alt={r.name}/>:<div className="resourcePlaceholderV3">{resTypeName[r.resourceType]||'资源'}</div>}
              <div className="resourceHoverActionsV3">
                <button title="预览" onClick={()=>{setCategoryOpen(false);setRenameTarget(null);openDetail(r.id)}}><Eye size={18}/></button>
                {canManage&&<button title="重命名" onClick={()=>openRename(r)}><Pencil size={17}/></button>}
              </div>
            </div>

            <div className="resourceInfoV3">
              <b title={r.name}>{r.name}</b>
              <span>分类：{normalizeResourceMain(r)}{normalizeResourceSub(r)?` / ${normalizeResourceSub(r)}`:''}</span>
            </div>
          </article>
        }):<div className="empty big resourceEmptyV3">当前空间暂无资源或生成图片</div>}
      </div>

      <div className="resourcePagerV3">
        <div className="resourceTotalV3">共 {total} 条</div>
        <div className="resourcePageSizeV3">24 条/页</div>
        <div className="resourcePageButtonsV3">
          <button disabled={currentPage<=1} onClick={()=>changePage(1)}>«</button>
          <button disabled={currentPage<=1} onClick={()=>changePage(currentPage-1)}>‹</button>
          {Array.from({length:Math.min(7,totalPages)},(_,i)=>{
            let p=i+1;
            if(totalPages>7){
              if(currentPage<=4)p=i+1;
              else if(currentPage>=totalPages-3)p=totalPages-6+i;
              else p=currentPage-3+i;
            }
            return <button key={p} className={p===currentPage?'active':''} onClick={()=>changePage(p)}>{p}</button>
          })}
          {totalPages>7&&currentPage<totalPages-3&&<span>...</span>}
          {totalPages>7&&currentPage<totalPages-3&&<button onClick={()=>changePage(totalPages)}>{totalPages}</button>}
          <button disabled={currentPage>=totalPages} onClick={()=>changePage(currentPage+1)}>›</button>
          <button disabled={currentPage>=totalPages} onClick={()=>changePage(totalPages)}>»</button>
        </div>
        <div className="resourceJumpV3">跳至 <input type="number" min="1" max={totalPages} onKeyDown={e=>{if(e.key==='Enter')changePage(Number(e.currentTarget.value)||1)}}/> 页</div>
      </div>
    </section>

    {false&&hasSidePanel&&<aside className="resourceSidePanelV6">
      <header className="resourceSideHeadV6">
        <div>
          <h2>{categoryOpen?'分类管理':detail?'资源详情':'重命名资源'}</h2>
          <span>{categoryScope==='SYSTEM'?'系统空间':categoryScope==='MERCHANT'?'门店空间':'我的空间'}</span>
        </div>
        <button type="button" onClick={closeSidePanel}>×</button>
      </header>

      {categoryOpen&&<div className="resourceCategoryInlineV6">
        <div className="resourceCategoryTopV6">
          <button type="button" onClick={()=>createMainCategory('user_reference')}><Plus size={16}/>创建主分类</button>
          <button type="button" onClick={loadCategories}>刷新</button>
        </div>
        {categoryLoading&&<div className="resourceSideStateV6">分类加载中...</div>}
        {categoryError&&<div className="resourceSideStateV6 error">{categoryError}</div>}
        {categorySections.map(section=><section className="resourceCategorySectionInlineV6" key={section.purposeKey}>
          <div className="resourceCategoryPurposeV6">
            <h3>{section.purposeName}</h3>
            <button type="button" onClick={()=>createMainCategory(section.purposeKey)}><Plus size={14}/>新增</button>
          </div>
          {(section.mains||[]).length?(section.mains||[]).map(main=><article className="resourceCategoryMainV6" key={main.id}>
            <div className="resourceCategoryMainHeadV6">
              <b>{main.name}</b>
              <span>{(main.subs||[]).length} 个子分类</span>
              {main.canManage&&<button type="button" onClick={()=>renameMainCategory(main)}><Pencil size={15}/></button>}
              {main.canManage&&!main.isFixed&&<button className="danger" type="button" onClick={()=>deleteMainCategory(main)}><Trash2 size={15}/></button>}
            </div>
            <div className="resourceCategorySubListV6">
              {(main.subs||[]).length?(main.subs||[]).map(sub=><div className="resourceCategorySubItemV6" key={sub.id}>
                <span>{sub.name}</span>
                {main.canManage&&<button type="button" onClick={()=>renameSubCategory(sub)}><Pencil size={14}/></button>}
                {main.canManage&&<button className="danger" type="button" onClick={()=>deleteSubCategory(sub)}><Trash2 size={14}/></button>}
              </div>):<div className="resourceCategoryEmptyV6">暂无子分类</div>}
              {main.canManage&&<button className="resourceCategoryAddSubV6" type="button" onClick={()=>createSubCategory(main)}><Plus size={14}/>添加子分类</button>}
            </div>
          </article>):<div className="resourceCategoryEmptyV6">暂无主分类，点击“新增”创建</div>}
        </section>)}
      </div>}

      {detail&&detailImage&&<div className="resourceDetailInlineV6">
        <div className="resourceDetailImageV6">
          {detailUrl?<img src={detailUrl} alt={detailImage.name}/>:<span>暂无图片</span>}
        </div>
        <div className="resourceDetailTitleV6">
          <h3>{detailImage.name}</h3>
          <button type="button" onClick={()=>openRename({id:detailImage.id,name:detailImage.name})}><Pencil size={16}/></button>
        </div>
        <dl className="resourceDetailMetaV6">
          <dt>文件大小</dt><dd>{formatResourceBytes(detailImage.fileSize)}</dd>
          <dt>分辨率</dt><dd>{detailImage.width&&detailImage.height?`${detailImage.width} × ${detailImage.height}`:'-'}</dd>
          <dt>分类</dt><dd>{detailCategory}</dd>
          <dt>上传时间</dt><dd>{fmt(detailImage.createdAt)}</dd>
        </dl>
        <div className="resourceDetailActionsV6">
          <button type="button" onClick={()=>localStorage.setItem('pendingWorkbenchImage',JSON.stringify({id:detailImage.id,url:detailImage.url,name:detailImage.name}))}>智能工作台</button>
          <button type="button" onClick={()=>detailUrl&&window.open(detailUrl,'_blank')}>图片处理</button>
        </div>
        <section className="resourceRelatedTasksV6">
          <h4>关联生成记录（{(detail.relatedTasks||[]).length}）</h4>
          {(detail.relatedTasks||[]).length?(detail.relatedTasks||[]).map(t=><article key={t.id}>
            <b>{featureName[t.featureKey]||t.featureKey||'AI任务'}</b>
            <span>{t.status} · {fmt(t.submittedAt)}</span>
          </article>):<div className="resourceCategoryEmptyV6">暂无关联生成记录</div>}
        </section>
      </div>}

      {renameTarget&&<div className="resourceRenameInlineV6">
        <label>资源名称</label>
        <input autoFocus value={renameValue} onChange={e=>setRenameValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitRename()}}/>
        <div>
          <button type="button" onClick={()=>setRenameTarget(null)}>取消</button>
          <button className="primary" type="button" disabled={!renameValue.trim()} onClick={submitRename}>保存</button>
        </div>
      </div>}
    </aside>}
    </div>

    {uploadOpen&&<div className="resourceUploadMaskV3">
      <div className="resourceUploadModalV3">
        <div className="resourceUploadHeadV3">
          <h2>上传资源</h2>
          <button type="button" onClick={closeUpload}>×</button>
        </div>

        <div className="resourceUploadBodyV3">
          <label
            className={dragging?'resourceDropV3 dragging':'resourceDropV3'}
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)}
            onDrop={onDrop}
          >
            <input type="file" accept="image/*" onChange={choose}/>
            {preview?<img src={preview} alt="preview"/>:<>
              <ImageIcon size={46}/>
              <b>拖拽图片到这里，或选择文件</b>
              <span>支持批量上传，最多 50 个文件，仅支持图片</span>
              <em>选择文件</em>
            </>}
          </label>

          <div className="resourceUploadSettingsV3">
            <h3>上传设置</h3>
            <p><b>空间：</b><span>{isSystemAdmin&&space==='SYSTEM'?'系统空间':isStoreAdmin?'门店空间':'个人空间'}</span><small>{isStoreAdmin?' 当前门店共享使用':isSystemAdmin?' 平台资源全局可用':' 仅当前账号使用'}</small></p>

            <input placeholder="资源名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>

            <select value={uploadMain} onChange={e=>changeUploadMain(e.target.value)}>
              {categoryGroups.map(v=><option key={v.name} value={v.name}>{v.name}　用于：{v.useLabel}</option>)}
            </select>

            <select value={f.colorName} disabled={!uploadMain} onChange={e=>setF({...f,colorName:e.target.value})}>
              <option value="">选择子分类（可选）</option>
              {uploadSubOptions.map(v=><option key={v} value={v}>{v}</option>)}
            </select>

            <textarea placeholder="资源说明/可用于提示词的关键词" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
          </div>
        </div>

        <div className="resourceUploadFootV3">
          <button type="button" onClick={closeUpload}>取消</button>
          <button className="primary" type="button" disabled={!file||!f.name.trim()} onClick={create}>开始上传</button>
        </div>
      </div>
    </div>}
  </div>
}

function ResourceCategoryModal({groups,defaultGroups,onClose,onAdd,onRename,onDelete,onAddSub,onDeleteSub}){
  const [draft,setDraft]=useState({main:'材质',sub:''});
  const [editing,setEditing]=useState('');
  const useOrder=['产品图','材质替换','场景融合'];
  const fixedMains=new Set(['材质','软体','产品','场景模板']);
  const grouped=useOrder.map(useLabel=>({
    useLabel,
    groups:groups.filter(g=>g.useLabel===useLabel)
  })).filter(x=>x.groups.length);

  function createSub(main,useLabel){
    const sub=prompt('请输入子分类名称');
    if(sub&&sub.trim())onAddSub(main,sub.trim(),useLabel);
  }

  function addSubFromDraft(){
    const main=draft.main;
    const group=groups.find(g=>(g.rawName||g.name)===main);
    const sub=draft.sub.trim();
    if(!main||!sub)return;
    onAddSub(main,sub,group?.useLabel||'产品图');
    setDraft({...draft,sub:''});
  }

  return <div className="resourceCategoryMaskV3">
    <div className="resourceCategoryPanelV3">
      <header className="resourceCategoryHeadV3">
        <h2>分类管理</h2>
        <button type="button" onClick={onClose}><X size={30}/></button>
      </header>

      <section className="resourceCategoryCreateV3">
        <select value={draft.main} onChange={e=>setDraft({...draft,main:e.target.value})}>
          {groups.map(g=><option key={g.rawName||g.name} value={g.rawName||g.name}>{g.name}　用于：{g.useLabel}</option>)}
        </select>
        <input placeholder="新增子分类名称" value={draft.sub} onChange={e=>setDraft({...draft,sub:e.target.value})}/>
        <button type="button" onClick={addSubFromDraft}><Plus size={18}/>添加子分类</button>
      </section>

      <main className="resourceCategoryBodyV3">
        {grouped.map(section=><section className="resourceCategorySectionV3" key={section.useLabel}>
          <div className="resourceCategorySectionTitleV3">
            <h3>{section.useLabel}</h3>
            <span>{section.groups.length} 个主分类</span>
          </div>
          <div className="resourceCategoryCardsV3">
            {section.groups.map((main,index)=><article className="resourceCategoryCardV3" key={main.name}>
              <div className="resourceCategoryCardHeadV3">
                <span>#{index}</span>
                {editing===main.name
                  ? <input autoFocus value={main.name} onBlur={()=>setEditing('')} onChange={e=>onRename(main.name,e.target.value)}/>
                  : <b>{main.name}</b>}
                <small>用于：{main.useLabel}</small>
              </div>
              <div className="resourceCategorySubsV3">
                {main.subs.map((sub,subIndex)=><div className="resourceCategorySubV3" key={sub}>
                  <GripVertical size={16}/>
                  <span>{sub}</span>
                  <em>#{subIndex}</em>
                  <button title="编辑子分类" onClick={()=>{
                    const next=prompt('请输入新的子分类名称',sub);
                    if(next&&next.trim()&&next.trim()!==sub){
                      onDeleteSub(main.rawName||main.name,sub);
                      onAddSub(main.rawName||main.name,next.trim(),main.useLabel);
                    }
                  }}><Pencil size={17}/></button>
                  <button title="删除子分类" className="danger" onClick={()=>onDeleteSub(main.rawName||main.name,sub)}><Trash2 size={17}/></button>
                </div>)}
                <button className="resourceCategoryAddSubV3" type="button" onClick={()=>createSub(main.rawName||main.name,main.useLabel)}><Plus size={17}/>添加子分类</button>
              </div>
            </article>)}
          </div>
        </section>)}
      </main>
    </div>
  </div>
}


function StoreTasks({me,setMsg,TaskDetailModal,goPage}){
  const ops=featureName;
  const{query,setQuery,data}=usePaged('/api/images',{task:'ai',keyword:'',kind:'',startDate:'',endDate:'',pageSize:12});
  const[detail,setDetail]=useState(null);
  async function open(id){try{setDetail(await req('/api/images/'+id+'/detail-rich'))}catch(e){setMsg(e.message)}}
  useEffect(()=>{const id=localStorage.getItem('openTaskDetailId');if(id){open(id);localStorage.removeItem('openTaskDetailId')}},[]);
  const taskItems=data.items||[];
  function batch(){taskItems.slice(0,20).forEach((i,n)=>setTimeout(()=>window.open(`${API}/api/images/${i.id}/download?token=${token()}`,'_blank'),n*180))}
  return <div className="adminLogPage">
    <section className="pageHero"><div><h1>历史任务</h1><p>{me.role==='MERCHANT_OWNER'||me.role==='MERCHANT_ADMIN'?'查看本门店所有生成任务。':'仅查看本人生成任务。'}</p></div><button className="primary" onClick={batch}><Download size={17}/>批量下载</button></section>
    <section className="panel">
      <Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={batch}>
        <input placeholder="任务ID/功能/用户" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/>
        <select value={query.kind} onChange={e=>setQuery({...query,kind:e.target.value})}><option value="">全部功能</option>{Object.entries(ops).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <input type="date" value={query.startDate} onChange={e=>setQuery({...query,startDate:e.target.value})}/>
        <input type="date" value={query.endDate} onChange={e=>setQuery({...query,endDate:e.target.value})}/>
      </Toolbar>
      <div className="aiTaskGrid">{taskItems.map(i=><article className="taskCard" key={i.id}><div className="taskImg" onClick={()=>open(i.id)}><img src={API+i.url}/><b>{ops[i.kind]||i.kind}</b></div><div className="taskMeta"><strong>{i.userName||'-'}</strong><span>{fmt(i.createdAt)}</span><small>ID：{i.id}</small></div><div className="taskActions"><button onClick={()=>open(i.id)}><Eye size={16}/>详情</button><button onClick={()=>window.open(`${API}/api/images/${i.id}/download?token=${token()}`,'_blank')}><Download size={16}/>下载</button></div></article>)}</div>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {detail&&<TaskDetailModal
      detail={detail}
      onClose={()=>setDetail(null)}
      isAdmin={false}
      ops={ops}
      setMsg={setMsg}
      taskList={taskItems}
      onSwitchTask={(item)=>open(item.id)}
      onContinueImage={(img)=>{
        localStorage.setItem('pendingWorkbenchImage',JSON.stringify(img));
        setDetail(null);
        goPage&&goPage('workbench');
      }}
    />}
  </div>
}

function Promotion({setMsg}){const{query,setQuery,data}=usePaged('/api/merchant/promotion',{keyword:''});const[info,setInfo]=useState(null);useEffect(()=>{req('/api/merchant/promotion').then(setInfo).catch(e=>setMsg(e.message))},[]);const link=location.origin+(info?.inviteLink||'');return <div className="stack"><section className="panel"><h2><Ticket/>推广邀请</h2><div className="metrics"><div className="metric"><span>邀请码</span><b>{info?.inviteCode||'-'}</b></div><div className="metric"><span>邀请链接</span><b className="smallText">{link}</b></div></div><button onClick={()=>navigator.clipboard?.writeText(info?.inviteCode||'')}>复制邀请码</button><button onClick={()=>navigator.clipboard?.writeText(link)}>复制链接</button></section><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}><input placeholder="商家/联系人/手机号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/></Toolbar><Table cols={['商家','联系人','手机号','状态','创建时间']}>{data.items.map(a=><tr key={a.id}><td>{a.companyName}</td><td>{a.contactName}</td><td>{a.phone}</td><td><Badge v={a.status}/></td><td>{fmt(a.createdAt)}</td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section></div>}
function QuotaLogs({setMsg,TaskDetailModal}){
  const{query,setQuery,data}=usePaged('/api/merchant/quota-logs',{keyword:'',type:'',pageSize:10});
  const[detail,setDetail]=useState(null);
  const summary=data.summary||{};
  const typeOptions=[
    ['','全部类型'],
    ['AI_GENERATE','AI生成'],
    ['AUTO_RECHARGE','自动充值'],
    ['MANUAL_RECHARGE','人工充值']
  ];
  function typeText(t){return {AI_COST:'AI生成',AI_REFUND:'AI退款',RECHARGE:'人工充值',MANUAL_ADJUST:'人工充值',REDEEM:'自动充值',ACCOUNT_DELETE_RECYCLE:'自动充值'}[t]||t}
  function taskId(v){return v?String(v).slice(0,18):'-'}
  async function openTask(id){
    if(!id)return;
    try{
      setDetail(await req('/api/ai/tasks/'+id));
    }catch(e){
      setMsg&&setMsg(e.message||'任务详情读取失败');
    }
  }
  return <div className="quotaPageV2">
    <section className="quotaSummaryV2">
      <div className="quotaMetricV2 current"><span><WalletCards size={22}/>当前余额</span><b>{summary.currentBalance??0}</b></div>
      <div className="quotaMetricV2 income"><span>总收入</span><b>+{summary.totalIncome??0}</b></div>
      <div className="quotaMetricV2 expense"><span>总支出</span><b>{summary.totalExpense??0}</b></div>
    </section>

    <section className="quotaPanelV2">
      <div className="quotaToolbarV2">
        <div className="quotaSearchV2"><Search size={18}/><input placeholder="搜索任务、用户或操作人" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}/></div>
        <select value={query.type} onChange={e=>setQuery({...query,type:e.target.value,page:1})}>
          {typeOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="quotaTableWrapV2">
        <table className="quotaTableV2">
          <thead><tr><th>时间</th><th>类型</th><th>变动算力</th><th>变动后余额</th><th>关联任务</th></tr></thead>
          <tbody>
            {(data.items||[]).length?data.items.map(l=>{
              const n=Number(l.signedAmount??l.amount??0);
              return <tr key={l.id}>
                <td>{fmt(l.created_at)}</td>
                <td><span className={'quotaTypeBadgeV2 '+(n>=0?'plus':'minus')}>{l.typeLabel||typeText(l.type)}</span></td>
                <td><b className={n>=0?'quotaNumPlusV2':'quotaNumMinusV2'}>{n>=0?`+${n}`:n}</b></td>
                <td>{l.balanceAfter??'-'}</td>
                <td>{l.related_task_id?<button className="quotaTaskLinkV2" type="button" onClick={()=>openTask(l.related_task_id)}>{taskId(l.related_task_id)}</button>:<code>-</code>}</td>
              </tr>
            }):<tr><td colSpan="5"><div className="empty big">暂无额度流水</div></td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {detail&&<TaskDetailModal detail={detail} onClose={()=>setDetail(null)} isAdmin={false} ops={featureName} setMsg={setMsg} taskList={[]} />}
  </div>
}
function Placeholder(){return <section className="panel"><h2>该模块暂不在本次修改范围</h2><p className="hint">当前版本优先拆分页面结构，后续可以继续按模块细化。</p></section>}


export{Workbench,StoreResources,StoreUsers,StoreTasks,Promotion,QuotaLogs};
