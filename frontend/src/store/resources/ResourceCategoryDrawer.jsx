import React,{useMemo,useState}from'react';
import{GripVertical,Pencil,Plus,Trash2,X}from'lucide-react';
import{req}from'../../appShared.jsx';

const purposeOptions=[
  {key:'user_reference',label:'产品参考'},
  {key:'material',label:'材质替换'},
  {key:'scene',label:'场景融合'}
];

function CategoryForm({type,initial,onCancel,onSubmit}){
  const [form,setForm]=useState({
    name:initial?.name||'',
    purposeKey:initial?.purposeKey||'user_reference',
    sortOrder:initial?.sortOrder||0
  });
  const isMain=type==='main';
  const disabled=!form.name.trim()||(isMain&&!form.purposeKey);
  return <div className="resourceCategoryDialogMaskV3">
    <div className="resourceCategoryDialogV3">
      <header>
        <h3>{isMain?'创建主分类':'添加子分类'}</h3>
        <button type="button" onClick={onCancel}><X size={22}/></button>
      </header>
      <div className="resourceCategoryDialogBodyV3">
        <label>分类名称<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        {isMain&&<label>功能类型/用途<select value={form.purposeKey} onChange={e=>setForm({...form,purposeKey:e.target.value})}>
          {purposeOptions.map(v=><option key={v.key} value={v.key}>{v.label}</option>)}
        </select></label>}
        <label>排序<input type="number" min="0" value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:e.target.value})}/></label>
        <p>{isMain?'主分类用于资源用途筛选。':'子分类用于资源精细筛选与提示词语义补充。'}</p>
      </div>
      <footer>
        <button type="button" onClick={onCancel}>取消</button>
        <button className="primary" type="button" disabled={disabled} onClick={()=>onSubmit({...form,name:form.name.trim(),sortOrder:Number(form.sortOrder||0)})}>保存</button>
      </footer>
    </div>
  </div>;
}

const emptyPurposes=[
  {purposeKey:'user_reference',purposeName:'产品参考',mains:[]},
  {purposeKey:'material',purposeName:'材质替换',mains:[]},
  {purposeKey:'scene',purposeName:'场景融合',mains:[]}
];

export default function ResourceCategoryDrawer({purposes=[],scope,canCreateMain,loading,error,onClose,onRefresh,setMsg}){
  const [dialog,setDialog]=useState(null);
  const [drag,setDrag]=useState(null);
  const sections=useMemo(()=>{
    const list=Array.isArray(purposes)?purposes:[];
    return list.length?list.map(p=>({...p,mains:Array.isArray(p.mains)?p.mains:[]})):emptyPurposes;
  },[purposes]);
  const allowCreateMain=useMemo(()=>canCreateMain||sections.some(p=>p.mains.some(m=>m.canManage))||scope!=='SYSTEM',[canCreateMain,sections,scope]);

  function moveItem(list,fromId,toId){
    const next=[...list];
    const from=next.findIndex(x=>x.id===fromId);
    const to=next.findIndex(x=>x.id===toId);
    if(from<0||to<0||from===to)return next;
    const [item]=next.splice(from,1);
    next.splice(to,0,item);
    return next;
  }

  async function saveOrder(type,items){
    try{
      await req('/api/categories/reorder',{method:'PATCH',body:JSON.stringify({items:items.map((item,index)=>({type,id:item.id,sortOrder:(index+1)*10}))})});
      setMsg&&setMsg('排序已更新');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  function dropMain(section,target){
    if(drag?.type!=='main'||drag.purposeKey!==section.purposeKey)return;
    setDrag(null);
    saveOrder('main',moveItem(section.mains,drag.id,target.id));
  }

  function dropSub(main,target){
    if(drag?.type!=='sub'||drag.mainId!==main.id)return;
    setDrag(null);
    saveOrder('sub',moveItem(main.subs,drag.id,target.id));
  }

  async function saveMain(form){
    try{
      await req('/api/categories/main',{method:'POST',body:JSON.stringify({...form,scope})});
      setDialog(null);
      setMsg&&setMsg('主分类已创建');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  async function saveSub(main,form){
    try{
      await req(`/api/categories/${main.id}/sub`,{method:'POST',body:JSON.stringify(form)});
      setDialog(null);
      setMsg&&setMsg('子分类已创建');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  async function renameMain(main){
    const name=prompt('请输入新的主分类名称',main.name);
    if(!name||!name.trim()||name.trim()===main.name)return;
    try{
      await req(`/api/categories/main/${main.id}`,{method:'PATCH',body:JSON.stringify({name:name.trim()})});
      setMsg&&setMsg('主分类已重命名');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  async function renameSub(sub){
    const name=prompt('请输入新的子分类名称',sub.name);
    if(!name||!name.trim()||name.trim()===sub.name)return;
    try{
      await req(`/api/categories/sub/${sub.id}`,{method:'PATCH',body:JSON.stringify({name:name.trim()})});
      setMsg&&setMsg('子分类已重命名');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  async function deleteMain(main){
    if(!confirm(`确定删除主分类“${main.name}”？`))return;
    try{
      await req(`/api/categories/main/${main.id}`,{method:'PATCH',body:JSON.stringify({status:'DELETED'})});
      setMsg&&setMsg('主分类已删除');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  async function deleteSub(sub){
    if(!confirm(`确定删除子分类“${sub.name}”？`))return;
    try{
      await req(`/api/categories/sub/${sub.id}`,{method:'PATCH',body:JSON.stringify({status:'DELETED'})});
      setMsg&&setMsg('子分类已删除');
      onRefresh&&onRefresh();
    }catch(e){setMsg&&setMsg(e.message)}
  }

  return <div className="resourceCategoryMaskV3">
    <aside className="resourceCategoryPanelV3">
      <header className="resourceCategoryHeadV3">
        <div>
          <h2>分类管理</h2>
          <span>{scope==='SYSTEM'?'系统空间':scope==='MERCHANT'?'门店空间':'我的空间'}</span>
        </div>
        <div className="resourceCategoryHeadActionsV3">
          {allowCreateMain&&<button className="resourceCategoryCreateMainV3" type="button" onClick={()=>setDialog({type:'main'})}><Plus size={17}/>创建主分类</button>}
          <button className="resourceCategoryCloseV3" type="button" onClick={onClose}><X size={30}/></button>
        </div>
      </header>

      <main className="resourceCategoryBodyV3">
        {loading&&<div className="resourceCategoryStateV3">分类数据加载中...</div>}
        {error&&<div className="resourceCategoryStateV3 error">
          <b>分类接口读取失败</b>
          <span>{error}</span>
          <button type="button" onClick={onRefresh}>重新加载</button>
        </div>}
        {!loading&&sections.map(section=><section className="resourceCategorySectionV3" key={section.purposeKey}>
          <div className="resourceCategorySectionTitleV3">
            <h3>{section.purposeName}</h3>
            <span>{section.mains.length} 个主分类</span>
          </div>
          <div className="resourceCategoryCardsV3">
            {section.mains.map(main=><article
              className="resourceCategoryCardV3"
              key={main.id}
              draggable={main.canManage}
              onDragStart={()=>main.canManage&&setDrag({type:'main',id:main.id,purposeKey:section.purposeKey})}
              onDragOver={e=>drag?.type==='main'&&drag.purposeKey===section.purposeKey&&e.preventDefault()}
              onDrop={()=>dropMain(section,main)}
            >
              <div className="resourceCategoryCardHeadV3">
                {main.canManage&&<GripVertical size={18}/>}
                <b>{main.name}</b>
                <small>{main.scope==='SYSTEM'?'系统':main.scope==='MERCHANT'?'门店':'个人'}</small>
                {main.canManage&&<button title="重命名主分类" onClick={()=>renameMain(main)}><Pencil size={17}/></button>}
                {main.canManage&&!main.isFixed&&<button title="删除主分类" className="danger" onClick={()=>deleteMain(main)}><Trash2 size={17}/></button>}
              </div>
              <div className="resourceCategorySubsV3">
                {main.subs.length?main.subs.map(sub=><div
                  className="resourceCategorySubV3"
                  key={sub.id}
                  draggable={main.canManage}
                  onDragStart={()=>main.canManage&&setDrag({type:'sub',id:sub.id,mainId:main.id})}
                  onDragOver={e=>drag?.type==='sub'&&drag.mainId===main.id&&e.preventDefault()}
                  onDrop={()=>dropSub(main,sub)}
                >
                  {main.canManage&&<GripVertical size={16}/>}
                  <span>{sub.name}</span>
                  {main.canManage&&<button title="编辑子分类" onClick={()=>renameSub(sub)}><Pencil size={17}/></button>}
                  {main.canManage&&<button title="删除子分类" className="danger" onClick={()=>deleteSub(sub)}><Trash2 size={17}/></button>}
                </div>):<div className="resourceCategoryNoSubV3">暂无子分类</div>}
                {main.canManage&&<button className="resourceCategoryAddSubV3" type="button" onClick={()=>setDialog({type:'sub',main})}><Plus size={17}/>添加子分类</button>}
              </div>
            </article>)}
          </div>
        </section>)}
      </main>
    </aside>
    {dialog?.type==='main'&&<CategoryForm type="main" onCancel={()=>setDialog(null)} onSubmit={saveMain}/>}
    {dialog?.type==='sub'&&<CategoryForm type="sub" onCancel={()=>setDialog(null)} onSubmit={form=>saveSub(dialog.main,form)}/>}
  </div>;
}
