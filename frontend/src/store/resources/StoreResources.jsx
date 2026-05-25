import React,{useEffect,useState}from'react';
import{Trash2,Plus,RotateCcw,Pencil,X}from'lucide-react';
import{API,req,reqForm,fmt,usePaged,resTypeName,imageViewUrl}from'../../appShared.jsx';
import{getDisplayStatusName,getFeatureDisplayName}from'../../config/uiText.js';
import ConfirmDialog from'../../components/ConfirmDialog.jsx';
import ResourceCard from'./ResourceCard.jsx';
import ResourceSpaceTabs from'./ResourceSpaceTabs.jsx';
import ResourceToolbar from'./ResourceToolbar.jsx';
import ResourceUploadModal from'./ResourceUploadModal.jsx';
import{defaultCategoryGroups,fixedMainCategories,fixedCategoryUseLabel,normalizeResourceMain,normalizeResourceSub,resourceUseLabel}from'./resourceModel.js';

function StoreResources({me,setMsg}){
  const isSystemAdmin=me?.role==='SYSTEM_ADMIN';
  const isStoreAdmin=me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN';
  const {query,setQuery,data,load}=usePaged('/api/merchant/resources',{keyword:'',resourceType:'',mainCategory:'',subCategory:'',status:'',scope:'MERCHANT',page:1,pageSize:24});
  const [sys,setSys]=useState([]);
  const [space,setSpace]=useState(isSystemAdmin?'SYSTEM':isStoreAdmin?'STORE':'PERSONAL');
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
  const [f,setF]=useState({name:'',resourceType:'user_reference',objectName:'',colorName:'',description:''});
  const [files,setFiles]=useState([]);
  const [preview,setPreview]=useState('');

  const pageSize=24;
  const canUpload=(isSystemAdmin&&space==='SYSTEM')||(isStoreAdmin&&space==='STORE')||(!isSystemAdmin&&space==='PERSONAL');
  const canManageCurrentSpace=(isSystemAdmin&&space==='SYSTEM')||(isStoreAdmin&&space==='STORE')||(!isSystemAdmin&&space==='PERSONAL');
  const categoryScope=space==='SYSTEM'?'SYSTEM':space==='STORE'?'MERCHANT':'USER';

  function fixedCategoryResourceType(main){
    const group=categoryGroups.find(g=>g.name===main||g.rawName===main);
    if(group?.useLabel==='材质替换')return 'material';
    if(group?.useLabel==='场景融合')return 'scene';
    if(main==='材质'||main==='软体')return 'material';
    if(main==='场景模板')return 'scene';
    return 'user_reference';
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

  function chooseFiles(list){
    const picked=Array.from(list||[]).filter(img=>String(img.type||'').startsWith('image/')).slice(0,50);
    setFiles(picked);
    setPreview(picked[0]?URL.createObjectURL(picked[0]):'');
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
    setF({name:'',resourceType:'user_reference',objectName:'',colorName:'',description:''});
    setFiles([]);
    setPreview('');
    setDragging(false);
  }

  function closeUpload(){
    setUploadOpen(false);
    setDragging(false);
  }

  async function create(){
    try{
      if(!files.length)return setMsg('请先选择资源图片');

      const fd=new FormData();
      const main=String(f.objectName||'').trim();
      Object.entries({...f,objectName:main==='未分类'?'':main,colorName:main?f.colorName:''}).forEach(([k,v])=>fd.append(k,v||''));
      if(files.length>1)fd.set('name','');
      fd.append('scope',categoryScope);
      files.forEach(img=>fd.append('image',img));

      const result=await reqForm(isSystemAdmin&&space==='SYSTEM'?'/api/admin/resources':'/api/merchant/resources',fd);
      const count=Number(result?.count||files.length||1);
      setMsg(`${isSystemAdmin&&space==='SYSTEM'?'系统资源':categoryScope==='MERCHANT'?'门店资源':'个人资源'}已上传 ${count} 个`);
      resetUpload();
      setUploadOpen(false);
      if(!isSystemAdmin)setSpace(categoryScope==='MERCHANT'?'STORE':'PERSONAL');
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
    setBatchMainCategory('');
    setBatchSubCategory('');
    setBatchCategoryOpen(true);
  }

  async function submitBatchCategory(){
    const ids=Array.from(selectedResourceIds);
    if(!ids.length)return;
    try{
      for(const id of ids){
        await req(isSystemAdmin&&space==='SYSTEM'?('/api/admin/resources/'+id):('/api/merchant/resources/'+id),{method:'PATCH',body:JSON.stringify({objectName:batchMainCategory,colorName:batchSubCategory,scope:categoryScope})});
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
    return imageViewUrl(r);
  }

  function triggerSearch(){
    if(isSystem)setSysPage(1);
    else setQuery(q=>({...q,page:1}));
  }

  const categoryGroups=(()=>{
    const mergeDefaultGroups=(groups=[])=>{
      const map=new Map();
      const addGroup=(group)=>{
        if(!group?.name)return;
        const key=String(group.name);
        const existing=map.get(key);
        if(existing){
          const subs=new Set([...(existing.subs||[]),...(group.subs||[])].filter(Boolean));
          map.set(key,{...existing,...group,subs:Array.from(subs),canManage:existing.canManage||group.canManage});
        }else{
          map.set(key,{...group,subs:Array.from(group.subs||[]).filter(Boolean)});
        }
      };
      defaultCategoryGroups.forEach(section=>section.mains.forEach(main=>addGroup({
        name:main.name,
        rawName:main.name,
        useLabel:section.useLabel,
        purposeKey:section.useKey,
        subs:[],
        subItems:[],
        canManage:false
      })));
      groups.forEach(addGroup);
      return Array.from(map.values());
    };
    if(categoryTree.length){
      return mergeDefaultGroups(categoryTree.flatMap(p=>(p.mains||[]).map(main=>({
        id:main.id,
        name:main.name,
        rawName:main.name,
        useLabel:p.purposeName,
        purposeKey:p.purposeKey,
        subs:(main.subs||[]).map(sub=>sub.name).filter(Boolean),
        subItems:main.subs||[],
        canManage:main.canManage
      }))));
    }
    const allFilterItems=[...sys,...(data.items||[])];
    const map=new Map();
    function add(main,sub,useLabel){
      const m=String(main||'').trim();
      if(!m)return;
      if(!map.has(m))map.set(m,{name:m,useLabel:useLabel||'产品图',subs:new Set()});
      if(sub)map.get(m).subs.add(String(sub).trim());
    }
    defaultCategoryGroups.forEach(group=>group.mains.forEach(main=>add(main.name,'',group.useLabel)));
    allFilterItems.forEach(r=>{
      const main=normalizeResourceMain(r);
      add(main,normalizeResourceSub(r),resourceUseLabel(r));
    });
    return mergeDefaultGroups(fixedMainCategories
      .map(name=>map.get(name)||{name,useLabel:name==='材质'||name==='软体'?'材质替换':name==='场景模板'?'场景融合':'产品图',subs:new Set()})
      .map(item=>{
        const visibleSubs=Array.from(item.subs).filter(Boolean);
        return {...item,rawName:item.name,subs:visibleSubs};
      }));
  })();
  const mainOptions=categoryGroups.map(g=>g.name);
  const selectedMain=categoryGroups.find(g=>g.name===query.mainCategory);
  const subOptions=selectedMain?.subs||[];
  const batchSelectedMain=categoryGroups.find(g=>g.name===batchMainCategory);
  const batchSubOptions=batchSelectedMain?.subs||[];
  const selectedCount=selectedResourceIds.size;
  const uploadMain=f.objectName||'';
  const uploadSelectedMain=uploadMain?categoryGroups.find(g=>g.name===uploadMain):null;
  const uploadSubOptions=uploadSelectedMain?.subs||[];

  function changeUploadMain(main){
    setF({...f,objectName:main,colorName:'',resourceType:main?fixedCategoryResourceType(main):'user_reference'});
  }

  const hasSidePanel=categoryOpen||detail||renameTarget;
  const detailImage=detail?.image||null;
  const detailUrl=detailImage?imageViewUrl(detailImage):'';
  const detailCategory=detailImage?[detailImage.mainCategoryName,detailImage.subCategoryName].filter(Boolean).join(' / ')||'未分类':'';

  function detailResolutionText(image){
    const width=Number(image?.width||0);
    const height=Number(image?.height||0);
    return width&&height?`${width} × ${height}`:'-';
  }

  function updateDetailImageSize(e){
    const width=Number(e.currentTarget?.naturalWidth||0);
    const height=Number(e.currentTarget?.naturalHeight||0);
    const currentWidth=Number(detailImage?.width||0);
    const currentHeight=Number(detailImage?.height||0);
    if(!width||!height||(currentWidth&&currentHeight))return;
    setDetail(prev=>prev?.image?{...prev,image:{...prev.image,width,height}}:prev);
  }
  const categorySections=categoryTree.length?categoryTree:[
    {purposeKey:'user_reference',purposeName:'产品参考',mains:[]},
    {purposeKey:'material',purposeName:'材质替换',mains:[]},
    {purposeKey:'scene',purposeName:'场景融合',mains:[]}
  ];
  const categoryPurposeOptions=categorySections.map(section=>({key:section.purposeKey,name:section.purposeName}));
  const canCreateCategory=canManageCurrentSpace;

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
    <ResourceToolbar
      query={query}
      setQuery={setQuery}
      triggerSearch={triggerSearch}
      categoryGroups={categoryGroups}
      subOptions={subOptions}
      canManageCurrentSpace={canManageCurrentSpace}
      openCategoryPanel={openCategoryPanel}
      canUpload={canUpload}
      openUpload={()=>setUploadOpen(true)}
    />

    <ResourceSpaceTabs
      space={space}
      setSpace={setSpace}
      isSystemAdmin={isSystemAdmin}
      selectedCount={selectedCount}
      openBatchCategoryModal={openBatchCategoryModal}
      batchDeleteResources={batchDeleteResources}
      clearResourceSelection={clearResourceSelection}
    />

    {activeResourcePanel&&<section className={activeResourcePanel==='category'?'resourceActionPanelV7 categoryDrawerV7':activeResourcePanel==='detail'?'resourceActionPanelV7 detailDrawerV7':'resourceActionPanelV7'}>
      {activeResourcePanel==='category'&&<div className="resourceActionContentV7">
        <div className="resourceCategoryDrawerHeadV7">
          <div><h2>分类管理</h2></div>
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
          {detailUrl?<img src={detailUrl} alt={detailImage.name} onLoad={updateDetailImageSize}/>:<span>暂无图片</span>}
        </div>
        <div>
          <div className="resourceDetailTitleV6">
            <h3>{detailImage.name}</h3>
            <button type="button" onClick={()=>openRename({id:detailImage.id,name:detailImage.name},{keepDetail:true})}><Pencil size={16}/></button>
            <button type="button" onClick={closeSidePanel}><X size={17}/></button>
          </div>
          <dl className="resourceDetailMetaV6">
            <dt>文件大小</dt><dd>{formatResourceBytes(detailImage.fileSize)}</dd>
            <dt>分辨率</dt><dd>{detailResolutionText(detailImage)}</dd>
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
            <b>{getFeatureDisplayName(t.featureKey,'AI任务')}</b>
            <span>{getDisplayStatusName(t.status)} · {fmt(t.submittedAt)}</span>
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
          <option value="">不分类</option>
          {mainOptions.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
        <select className="resourceCategoryModalSelectV8" value={batchSubCategory} disabled={!batchMainCategory} onChange={e=>setBatchSubCategory(e.target.value)}>
          <option value="">子分类</option>
          {batchSubOptions.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
        <div className="resourceCategoryModalActionsV8">
          <button type="button" onClick={()=>setBatchCategoryOpen(false)}>取消</button>
          <button type="button" className="primary" onClick={submitBatchCategory}>确定</button>
        </div>
      </div>
    </div>}

    <ConfirmDialog
      open={batchDeleteOpen}
      title="批量删除资源"
      message={`确认删除已选的 ${selectedCount} 个资源？删除后资源不会再显示。`}
      confirmText="确认删除"
      danger
      onClose={()=>setBatchDeleteOpen(false)}
      onConfirm={confirmBatchDeleteResources}
    />

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
        {displayItems.length?displayItems.map(r=><ResourceCard
          key={space+'-'+r.id}
          resource={r}
          space={space}
          url={imgUrl(r)}
          canManage={canManageCurrentSpace&&r.source!=='GENERATED_IMAGE'}
          checked={selectedResourceIds.has(String(r.id))}
          onSelect={toggleResourceSelected}
          onPreview={id=>{setCategoryOpen(false);setRenameTarget(null);openDetail(id)}}
          onRename={openRename}
          normalizeResourceMain={normalizeResourceMain}
          normalizeResourceSub={normalizeResourceSub}
        />):<div className="empty big resourceEmptyV3">当前空间暂无资源或生成图片</div>}
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
          {detailUrl?<img src={detailUrl} alt={detailImage.name} onLoad={updateDetailImageSize}/>:<span>暂无图片</span>}
        </div>
        <div className="resourceDetailTitleV6">
          <h3>{detailImage.name}</h3>
          <button type="button" onClick={()=>openRename({id:detailImage.id,name:detailImage.name})}><Pencil size={16}/></button>
        </div>
        <dl className="resourceDetailMetaV6">
          <dt>文件大小</dt><dd>{formatResourceBytes(detailImage.fileSize)}</dd>
          <dt>分辨率</dt><dd>{detailResolutionText(detailImage)}</dd>
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
            <b>{getFeatureDisplayName(t.featureKey,'AI任务')}</b>
            <span>{getDisplayStatusName(t.status)} · {fmt(t.submittedAt)}</span>
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

    {uploadOpen&&<ResourceUploadModal
      dragging={dragging}
      setDragging={setDragging}
      onDrop={onDrop}
      choose={choose}
      preview={preview}
      files={files}
      categoryScope={categoryScope}
      f={f}
      setF={setF}
      uploadMain={uploadMain}
      changeUploadMain={changeUploadMain}
      categoryGroups={categoryGroups}
      uploadSubOptions={uploadSubOptions}
      closeUpload={closeUpload}
      create={create}
    />}
  </div>
}

export default StoreResources;



