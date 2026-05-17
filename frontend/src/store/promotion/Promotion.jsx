import React,{useEffect,useState}from'react';
import{Ticket}from'lucide-react';
import{req,fmt,Badge,usePaged,Pagination,Table,Toolbar}from'../../appShared.jsx';

export default function Promotion({setMsg}){
  const{query,setQuery,data}=usePaged('/api/merchant/promotion',{keyword:''});
  const[info,setInfo]=useState(null);
  useEffect(()=>{req('/api/merchant/promotion').then(setInfo).catch(e=>setMsg(e.message))},[]);
  const link=location.origin+(info?.inviteLink||'');
  return <div className="stack">
    <section className="panel">
      <h2><Ticket/>推广邀请</h2>
      <div className="metrics">
        <div className="metric"><span>邀请码</span><b>{info?.inviteCode||'-'}</b></div>
        <div className="metric"><span>邀请链接</span><b className="smallText">{link}</b></div>
      </div>
      <button onClick={()=>navigator.clipboard?.writeText(info?.inviteCode||'')}>复制邀请码</button>
      <button onClick={()=>navigator.clipboard?.writeText(link)}>复制链接</button>
    </section>
    <section className="panel">
      <Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}>
        <input placeholder="商家/联系人/手机号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/>
      </Toolbar>
      <Table cols={['商家','联系人','手机号','状态','创建时间']}>{data.items.map(a=><tr key={a.id}><td>{a.companyName}</td><td>{a.contactName}</td><td>{a.phone}</td><td><Badge v={a.status}/></td><td>{fmt(a.createdAt)}</td></tr>)}</Table>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
  </div>
}
