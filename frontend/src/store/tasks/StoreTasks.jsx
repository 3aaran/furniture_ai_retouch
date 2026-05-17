import React,{useEffect,useState}from'react';
import{Download,Eye}from'lucide-react';
import{API,token,req,fmt,usePaged,Pagination,Toolbar,imageViewUrl}from'../../appShared.jsx';
import{featureName}from'../../config/uiText.js';

export default function StoreTasks({me,setMsg,TaskDetailModal,goPage}){
  const ops=featureName;
  const{query,setQuery,data}=usePaged('/api/images',{task:'ai',keyword:'',kind:'',startDate:'',endDate:'',pageSize:12});
  const[detail,setDetail]=useState(null);
  async function open(id){try{setDetail(await req('/api/images/'+id+'/detail-rich'))}catch(e){setMsg(e.message)}}
  useEffect(()=>{const id=localStorage.getItem('openTaskDetailId');if(id){open(id);localStorage.removeItem('openTaskDetailId')}},[]);
  const taskItems=data.items||[];
  function batch(){taskItems.slice(0,20).forEach((i,n)=>setTimeout(()=>window.open(`${API}/api/images/${i.id}/download?token=${token()}`,'_blank'),n*180))}
  return <div className="adminLogPage">
    <section className="pageHero"><div><h1>历史任务</h1><p></p></div><button className="primary" onClick={batch}><Download size={17}/>批量下载</button></section>
    <section className="panel">
      <Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={batch}>
        <input placeholder="任务ID/功能/用户" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/>
        <select value={query.kind} onChange={e=>setQuery({...query,kind:e.target.value})}><option value="">全部功能</option>{Object.entries(ops).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <input type="date" value={query.startDate} onChange={e=>setQuery({...query,startDate:e.target.value})}/>
        <input type="date" value={query.endDate} onChange={e=>setQuery({...query,endDate:e.target.value})}/>
      </Toolbar>
      <div className="aiTaskGrid">{taskItems.map(i=><article className="taskCard" key={i.id}><div className="taskImg" onClick={()=>open(i.id)}><img src={imageViewUrl(i)}/><b>{ops[i.kind]||i.kind}</b></div><div className="taskMeta"><strong>{i.userName||'-'}</strong><span>{fmt(i.createdAt)}</span><small>ID：{i.id}</small></div><div className="taskActions"><button onClick={()=>open(i.id)}><Eye size={16}/>详情</button><button onClick={()=>window.open(`${API}/api/images/${i.id}/download?token=${token()}`,'_blank')}><Download size={16}/>下载</button></div></article>)}</div>
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
