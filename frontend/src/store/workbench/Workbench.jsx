import React,{useEffect,useRef,useState}from'react';
import{Layers,Users as UsersIcon,Brush,Download,Trash2,Eye,Search,Plus,Power}from'lucide-react';
import{API,token,req,reqForm,fmt,resTypeName,imageViewUrl,assetUrl}from'../../appShared.jsx';
import{getFeatureDisplayName}from'../../config/uiText.js';
import{featureConfig}from'../../config/featureConfig.jsx';
import WorkbenchUploadPanel from'./WorkbenchUploadPanel.jsx';
import GenerationControls from'./GenerationControls.jsx';
import ResourcePickerModal from'./ResourcePickerModal.jsx';
import WorkbenchResourceUploadModal from'./WorkbenchResourceUploadModal.jsx';
import WatermarkConfigModal from'./WatermarkConfigModal.jsx';
import ConfirmDialog from'../../components/ConfirmDialog.jsx';

function Workbench({me,setMe,setMsg,goPage,TaskDetailModal}){
  function imgSrc(input){
    if(!input)return '';
    if(typeof input==='object')return imageViewUrl(input);
    if(String(input).startsWith('http'))return input;
    return assetUrl(input);
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
  const [deleteTarget,setDeleteTarget]=useState(null);
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
        setOrigin({...img,imageUrl:img.imageUrl||imgSrc(img)});
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

  function getRecentSourceId(item,cached){
    return cached?.sourceId||item?.originImage?.id||item?.sourceImageId||item?.originImageId||'';
  }

  function getRecentResultId(item){
    return item?.resultImage?.id||item?.imageId||'';
  }

  function recentTypeName(item){
    const key=item?.featureKey||item?.operation||item?.kind;
    return ops[key]?.label||getFeatureDisplayName(item?.featureName,'')||getFeatureDisplayName(key,'AI任务');
  }

  function recentPreviewSrc(preview,useFallback=false){
    if(!preview)return '';
    if(useFallback){
      if(preview.fallbackImageId)return imgSrc({id:preview.fallbackImageId,url:preview.fallback});
      return imgSrc(preview.fallback);
    }
    if(preview.sourceId)return imgSrc({id:preview.sourceId,url:preview.url});
    return imgSrc(preview.url);
  }

  async function showRecentOriginal(item,e){
    clearRecentPreviewTimer();
    const rect=e.currentTarget.getBoundingClientRect();
    const top=Math.max(130,Math.min(window.innerHeight-150,rect.top+rect.height/2));
    const cached=sourcePreviewCache[item.id];
    const isTaskItem=item.itemType==='task'||item.status;

    setRecentSourcePreview({
      id:item.id,
      sourceId:getRecentSourceId(item,cached),
      fallbackImageId:getRecentResultId(item),
      title:recentTypeName(item),
      top,
      url:cached?.sourceUrl || item.sourceUrl || item.originImage?.url || item.url,
      fallback:item.resultUrl || item.url,
      loading:!cached&&!isTaskItem
    });

    if(cached) return;
    if(isTaskItem)return;

    try{
      const d=await req(`/api/images/${item.id}/source`);
      const next={
        sourceId:d.sourceId,
        sourceUrl:d.sourceUrl || item.sourceUrl || item.url,
        sourceOriginalName:d.sourceOriginalName || '原图'
      };

      setSourcePreviewCache(prev=>({...prev,[item.id]:next}));

      setRecentSourcePreview(prev=>{
        if(!prev||prev.id!==item.id) return prev;
        return {
          ...prev,
          sourceId:next.sourceId,
          url:next.sourceUrl,
          sourceOriginalName:next.sourceOriginalName,
          loading:false
        };
      });
    }catch(err){
      setRecentSourcePreview(prev=>{
        if(!prev||prev.id!==item.id) return prev;
        return {...prev,url:item.sourceUrl||item.originImage?.url||item.url,fallback:item.resultUrl||item.url,loading:false};
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
    Promise.allSettled([
      req('/api/ai/tasks/recent?pageSize=20'),
      req('/api/images/recent?pageSize=20')
    ]).then(results=>{
      const taskItems=results[0].status==='fulfilled'?(results[0].value.items||[]):[];
      const imageItems=results[1].status==='fulfilled'?(results[1].value.items||[]).filter(i=>i.kind!=='original'):[];
      const seen=new Set();
      const items=[...taskItems,...imageItems]
        .filter(item=>{
          const id=String(item.resultImage?.id||item.imageId||item.id||'');
          if(!id||seen.has(id))return false;
          seen.add(id);
          return true;
        })
        .sort((a,b)=>new Date(b.createdAt||b.submittedAt||0)-new Date(a.createdAt||a.submittedAt||0))
        .slice(0,20);
      setRecent(items);
    }).catch(()=>{});
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
          setMsg(d.statusMessage||d.errorMessage||'生成图片失败：模型服务异常');
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
        setMsg('上传成功但后端没有返回图片编号或图片地址');
        return;
      }

      const uploadedImage={
        ...d,
        url:d.url,
        imageUrl:imgSrc(d)
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
    setOrigin({...img,imageUrl:img.imageUrl||imgSrc(img)});
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
      const picked={
        ...r,
        id:r.id,
        url:r.imageUrl||r.url,
        imageUrl:imgSrc(r),
        originalName:r.name||r.originalName||'resource'
      };
      if(resourceModal.target==='source'){
        setOrigin(picked);
        setMsg('已选择产品原图');
      }else{
        setReference(picked);
        setMsg('已选择参考图');
      }
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
    setDeleteTarget(item);
  }

  async function confirmDeleteRecentTask(){
    const item=deleteTarget;
    const taskId=String(item?.id||'').trim();
    if(!taskId) return;
    try{
      const d=await req('/api/ai/tasks/'+taskId,{method:'DELETE'});
      setRecent(prev=>prev.filter(x=>x.id!==taskId));
      if(taskDetail?.id===taskId) setTaskDetail(null);
      setDeleteTarget(null);
      setMsg(d.message||'图片已删除');
      refreshRecent();
    }catch(err){
      setMsg(err.message||'删除失败');
    }finally{
      setDeleteTarget(null);
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
      if(item.status&&item.status!=='succeeded')return setMsg(item.statusMessage||item.errorMessage||(item.status==='failed'?'生成图片失败：模型服务异常':'任务正在生成'));
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
    return String(i.id).toLowerCase().includes(kw)||recentTypeName(i).toLowerCase().includes(kw);
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
            {r.imageUrl?<img src={imgSrc(r)} alt={r.name}/>:<div className="wbResourcePlaceholder">{resTypeName[r.resourceType]}</div>}
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
      <div className="wbRecentSearch"><Search size={16}/><input placeholder="搜索任务编号..." value={recentKeyword} onChange={e=>setRecentKeyword(e.target.value)}/></div>

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
          <div className="wbRecentThumb"><img src={imgSrc(item)} alt="最近生成"/>{running&&<i className="wbSpin"/>}{failed&&<em>失败</em>}</div>
          <div className="wbRecentInfo"><b>{recentTypeName(item)}</b><span>{running?'生成中...':failed?'失败，已退回算力':fmt(item.createdAt||item.submittedAt)}</span><small>{item.id}</small></div>
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
      src={recentPreviewSrc(recentSourcePreview)}
      alt="原图预览"
      style={{width:'100%',height:'100%',objectFit:'cover',display:'block',background:'#fff'}}
      onError={(e)=>{
        if(e.currentTarget.dataset.fallback!=='1'){
          e.currentTarget.dataset.fallback='1';
          e.currentTarget.src=recentPreviewSrc(recentSourcePreview,true);
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
  <ConfirmDialog
    open={!!deleteTarget}
    title="删除图片"
    message="确认删除这张生成图片吗？删除后将无法恢复。"
    confirmText="确认删除"
    danger
    onClose={()=>setDeleteTarget(null)}
    onConfirm={confirmDeleteRecentTask}
  />
  {resourceUploadOpen&&<WorkbenchResourceUploadModal
    me={me}
    resourceUpload={resourceUpload}
    setResourceUpload={setResourceUpload}
    resourceUploadFile={resourceUploadFile}
    resourceUploadPreview={resourceUploadPreview}
    chooseWorkbenchResourceFile={chooseWorkbenchResourceFile}
    changeWorkbenchUploadType={changeWorkbenchUploadType}
    changeWorkbenchUploadMain={changeWorkbenchUploadMain}
    workbenchUploadMainOptions={workbenchUploadMainOptions}
    workbenchUploadSubOptions={workbenchUploadSubOptions}
    createWorkbenchResource={createWorkbenchResource}
    onClose={()=>setResourceUploadOpen(false)}
  />}
  </>
}

export default Workbench;

