import React,{useEffect,useState}from'react';
import{Copy,Link as LinkIcon,Ticket}from'lucide-react';
import{req,fmt,usePaged,Pagination,Table,Toolbar}from'../../appShared.jsx';

function quotaText(v){
  return `${Number(v||0)} 算力`;
}

function ratioText(v){
  return `${Math.round(Number(v||0)*100)}%`;
}

async function writeClipboard(text){
  if(navigator.clipboard?.writeText){
    try{
      await navigator.clipboard.writeText(text);
      return;
    }catch{}
  }
  const el=document.createElement('textarea');
  el.value=text;
  el.setAttribute('readonly','');
  el.style.position='fixed';
  el.style.left='-9999px';
  document.body.appendChild(el);
  el.select();
  const ok=document.execCommand('copy');
  document.body.removeChild(el);
  if(!ok) throw new Error('复制失败');
}

export default function Promotion({setMsg}){
  const{query,setQuery,data}=usePaged('/api/merchant/promotion',{keyword:'',status:'',startDate:'',endDate:''});
  const[info,setInfo]=useState(null);
  useEffect(()=>{req('/api/merchant/promotion').then(setInfo).catch(e=>setMsg(e.message))},[]);
  const inviteCode=data.inviteCode||info?.inviteCode||'';
  const invitePath=data.inviteLink||info?.inviteLink||(inviteCode?`/#/apply?invite=${encodeURIComponent(inviteCode)}`:'');
  const link=invitePath?new URL(invitePath,location.origin).toString():'';
  const summary=data.summary||info?.summary||{};

  async function copyText(text,label){
    if(!text){ setMsg(`${label}为空`); return; }
    try{
      await writeClipboard(text);
      setMsg(`${label}已复制`);
    }catch{
      setMsg(`${label}复制失败，请手动复制`);
    }
  }

  function resetFilters(){
    setQuery(q=>({page:1,pageSize:q.pageSize||10,keyword:'',status:'',startDate:'',endDate:''}));
  }

  return <div className="stack">
    <section className="panel">
      <div className="panelTitle">
        <h2><Ticket/>推广邀请</h2>
        <div className="seg">
          <button type="button" onClick={()=>copyText(inviteCode,'邀请码')}><Copy size={16}/>复制邀请码</button>
          <button type="button" className="primary" onClick={()=>copyText(link,'邀请链接')}><LinkIcon size={16}/>复制邀请链接</button>
        </div>
      </div>
      <div className="metrics">
        <div className="metric"><span>邀请码</span><b>{inviteCode||'-'}</b></div>
        <div className="metric"><span>已邀请门店</span><b>{Number(summary.invitedCount||0)}</b></div>
        <div className="metric"><span>已通过门店</span><b>{Number(summary.approvedCount||0)}</b></div>
        <div className="metric"><span>累计邀请收益</span><b>{quotaText(summary.benefitQuota)}</b></div>
      </div>
      <div className="metric">
        <span>邀请链接</span>
        <b className="smallText">{link||'-'}</b>
      </div>
    </section>

    <section className="panel">
      <Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}>
        <input placeholder="搜索门店、联系人、手机号、编号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/>
        <select value={query.status} onChange={e=>setQuery({...query,status:e.target.value,page:1})}>
          <option value="">全部状态</option>
          <option value="PENDING">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
        </select>
        <input type="date" value={query.startDate} onChange={e=>setQuery({...query,startDate:e.target.value,page:1})}/>
        <input type="date" value={query.endDate} onChange={e=>setQuery({...query,endDate:e.target.value,page:1})}/>
        <button type="button" onClick={resetFilters}>重置</button>
      </Toolbar>
      <Table cols={['邀请门店','被邀请门店','充值额度','分成比例','收益','是否结算','产生时间']}>
        {(data.items||[]).map(a=><tr key={a.id}>
          <td><b>{a.inviterMerchantName||'-'}</b><br/><small className="muted">编号：{a.inviterMerchantCode||'-'}</small></td>
          <td><b>{a.invitedMerchantName||a.companyName||'-'}</b><br/><small className="muted">编号：{a.invitedMerchantCode||'-'}</small></td>
          <td>{quotaText(a.rechargeQuota)}</td>
          <td>{ratioText(a.shareRatio)}</td>
          <td><b>{quotaText(a.benefitQuota)}</b></td>
          <td><span className={'badge '+(a.settlementStatus==='已结算'?'success':a.settlementStatus==='不结算'?'rejected':'pending')}>{a.settlementStatus||'未结算'}</span></td>
          <td>{fmt(a.generatedAt)}</td>
        </tr>)}
      </Table>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
  </div>;
}
