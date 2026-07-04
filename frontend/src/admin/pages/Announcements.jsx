import React,{useEffect,useState}from'react';
import{Bell,Building2,CheckCircle2,Download,Eye,Image as ImageIcon,Phone,Plus,Power,Search,SlidersHorizontal,Ticket,Trash2,UserRound,Video,WalletCards,X,XCircle}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../../appShared.jsx';
import{featureName,getFeatureDisplayName,getTargetScopeDisplayName}from'../../config/uiText.js';

function AnnouncementCreateModal({form,setForm,onClose,onSubmit}){
  return <div className="adminModalMaskV9" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="announcementCreateModalV9">
      <button className="modalCloseV9" onClick={onClose}><X size={22}/></button>
      <div className="modalBadgeV9 approve"><Bell/></div>
      <h2>发布公告</h2>
      <div className="announcementFormV9">
        <label>发送对象<select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}>
          <option value="ALL">全体用户</option>
          <option value="MERCHANT">门店管理员</option>
        </select></label>
        <label>公告标题<input autoFocus placeholder="请输入公告标题" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label className="full">公告内容<textarea placeholder="请输入公告完整内容" value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
      </div>
      <div className="modalActionsV9"><button onClick={onClose}>取消</button><button className="primary" onClick={onSubmit}>确认发布</button></div>
    </div>
  </div>;
}
function Announcements({setMsg}){
  const{query,setQuery,data,load}=usePaged('/api/admin/announcements',{audience:'',keyword:''});
  const[open,setOpen]=useState(false);
  const[f,setF]=useState({title:'',content:'',audience:'ALL'});
  async function create(){
    try{
      await req('/api/admin/announcements',{method:'POST',body:JSON.stringify(f)});
      setMsg('公告已发布');
      setF({title:'',content:'',audience:'ALL'});
      setOpen(false);
      load();
    }catch(e){setMsg(e.message)}
  }
  return <div className="stack announcementAdminPageV9">
    <section className="panel">
      <div className="announcementToolbarV9">
        <div className="filterGroup">
          <input placeholder="标题/内容" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/>
          <select value={query.audience} onChange={e=>setQuery({...query,audience:e.target.value})}>
            <option value="">全部对象</option>
            <option value="ALL">全体用户</option>
            <option value="MERCHANT">门店管理员</option>
            <option value="ADMIN">平台管理员</option>
          </select>
          <button className="primary" onClick={()=>setQuery(q=>({...q,page:1}))}><Search size={16}/>查询</button>
        </div>
        <button className="primary" onClick={()=>setOpen(true)}><Plus size={16}/>发布公告</button>
      </div>
      <Table cols={['标题','对象','内容','保留至','发布时间']}>{(data.items||[]).map(a=><tr key={a.id}><td>{a.title}</td><td>{a.audience==='MERCHANT'?'门店管理员':audName[a.audience]||a.audience}</td><td>{a.content}</td><td>{fmt(a.valid_until)}</td><td>{fmt(a.created_at)}</td></tr>)}</Table>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {open&&<AnnouncementCreateModal form={f} setForm={setF} onClose={()=>setOpen(false)} onSubmit={create}/>}
  </div>;
}

export default Announcements;
