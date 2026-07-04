import React,{useEffect,useState}from'react';
import{Download,Eye}from'lucide-react';
import{req,fmt,usePaged,Pagination,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../../appShared.jsx';
import{featureName,getFeatureDisplayName}from'../../config/uiText.js';

export default function StoreTasks({me,setMsg,TaskDetailModal,goPage}){
  const ops=featureName;
  const{query,setQuery,data}=usePaged('/api/images',{task:'ai',keyword:'',kind:'',status:'',timeRange:'',user:'',startDate:'',endDate:'',pageSize:12});
  const[detail,setDetail]=useState(null);
  async function open(id){try{setDetail(await req('/api/images/'+id+'/detail-rich'))}catch(e){setMsg(e.message)}}
  useEffect(()=>{const id=localStorage.getItem('openTaskDetailId');if(id){open(id);localStorage.removeItem('openTaskDetailId')}},[]);
  const taskItems=data.items||[];
  const finishedCount=taskItems.filter(i=>String(i.status||'succeeded').toLowerCase()==='succeeded').length;
  const runningCount=taskItems.filter(i=>['queued','pending','running'].includes(String(i.status||'').toLowerCase())).length;
  const failedCount=taskItems.filter(i=>String(i.status||'').toLowerCase()==='failed').length;
  function batch(){taskItems.slice(0,20).forEach((i,n)=>setTimeout(()=>openImageDownload(i,setMsg),n*180))}
  function updateTimeRange(value){
    const today=new Date();
    const fmtDate=date=>date.toISOString().slice(0,10);
    if(!value)return setQuery({...query,timeRange:'',startDate:'',endDate:'',page:1});
    const days=Number(value);
    const start=new Date(today);
    start.setDate(today.getDate()-days+1);
    setQuery({...query,timeRange:value,startDate:fmtDate(start),endDate:fmtDate(today),page:1});
  }
  return <div className="adminLogPage stitchHistoryPage">
    <section className="stitchHistoryHero">
      <div>
        <span>HISTORY CENTER</span>
        <h2>生成历史</h2>
        <p>按任务、状态、时间和用户筛选图片生成记录，快速回看结果、下载图片或继续处理。</p>
      </div>
      <div className="stitchHistoryStats">
        <article><span>当前页任务</span><b>{taskItems.length}</b></article>
        <article><span>已完成</span><b>{finishedCount}</b></article>
        <article><span>生成中</span><b>{runningCount}</b></article>
        <article><span>失败</span><b>{failedCount}</b></article>
      </div>
    </section>
    <section className="panel stitchHistoryPanel">
      <div className="filterGroup historyTaskFilters">
        <input placeholder="任务编号 / 功能 / 用户" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}/>
        <select value={query.kind} onChange={e=>setQuery({...query,kind:e.target.value,page:1})}><option value="">全部功能</option>{Object.entries(ops).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select value={query.status} onChange={e=>setQuery({...query,status:e.target.value,page:1})}><option value="">全部状态</option><option value="succeeded">已完成</option><option value="running">生成中</option><option value="failed">失败</option></select>
        <select value={query.timeRange} onChange={e=>updateTimeRange(e.target.value)}><option value="">全部时间</option><option value="1">今天</option><option value="7">近 7 天</option><option value="30">近 30 天</option></select>
        <select value={query.user} onChange={e=>setQuery({...query,user:e.target.value,page:1})}><option value="">全部用户</option></select>
      </div>
      <div className="aiTaskGrid">{taskItems.length?taskItems.map(i=><article className="taskCard" key={i.id}><div className="taskImg" onClick={()=>open(i.id)}><img src={imageListUrl(i)} onError={e=>fallbackToOriginalImage(e,i)} loading="lazy" decoding="async"/><b>{getFeatureDisplayName(i.featureKey||i.operation||i.kind,'AI任务')}</b></div><div className="taskMeta"><strong>{i.userName||'-'}</strong><span>{fmt(i.createdAt)}</span><small>编号：{i.id}</small></div><div className="taskActions"><button onClick={()=>open(i.id)}><Eye size={16}/>详情</button><button onClick={()=>openImageDownload(i,setMsg)}><Download size={16}/>下载</button></div></article>):<div className="empty big">暂无历史任务</div>}</div>
      {taskItems.length>0&&<Pagination data={data} setQuery={setQuery}/>}
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
