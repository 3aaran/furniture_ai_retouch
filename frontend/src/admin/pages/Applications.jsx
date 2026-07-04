import React,{useEffect,useState}from'react';
import{Bell,Building2,CheckCircle2,Download,Eye,Image as ImageIcon,Phone,Plus,Power,Search,SlidersHorizontal,Ticket,Trash2,UserRound,Video,WalletCards,X,XCircle}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../../appShared.jsx';
import{featureName,getFeatureDisplayName,getTargetScopeDisplayName}from'../../config/uiText.js';

function Applications({setMsg}){
  const{query,setQuery,data,load}=usePaged('/api/admin/applications',{status:'PENDING',keyword:'',pageSize:10});
  const[selected,setSelected]=useState([]),[review,setReview]=useState(null),[quota,setQuota]=useState(500),[reason,setReason]=useState('资料不完整，暂不通过');
  const pending=(data.items||[]).filter(a=>a.status==='PENDING');
  const allPendingSelected=pending.length>0&&pending.every(a=>selected.includes(a.id));
  function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
  function toggleAll(){setSelected(allPendingSelected?selected.filter(id=>!pending.some(a=>a.id===id)):[...new Set([...selected,...pending.map(a=>a.id)])])}
  function openApprove(ids){setReview({type:'approve',ids:Array.isArray(ids)?ids:[ids]});setQuota(500)}
  function openReject(ids){setReview({type:'reject',ids:Array.isArray(ids)?ids:[ids]});setReason('资料不完整，暂不通过')}
  async function submitReview(){
    try{
      if(review.type==='approve'){
        const results=[];
        for(const id of review.ids)results.push((await req('/api/admin/applications/'+id+'/approve',{method:'POST',body:JSON.stringify({quota:Number(quota)||0})})).account);
        setMsg(review.ids.length===1?`已通过：门店管理员 ${results[0].phone} / 初始密码 ${results[0].password} / 邀请码 ${results[0].merchantCode}`:`已批量通过 ${review.ids.length} 个申请`);
      }else{
        for(const id of review.ids)await req('/api/admin/applications/'+id+'/reject',{method:'POST',body:JSON.stringify({reason})});
        setMsg(review.ids.length===1?'已驳回申请':`已批量驳回 ${review.ids.length} 个申请`);
      }
      setReview(null);setSelected([]);load();
    }catch(e){setMsg(e.message)}
  }
  return <div className="adminModernPage reviewPageV9">
    <section className="adminHeroV9"><div><span>入驻审核</span><h1>商家申请审核</h1></div><div className="adminHeroStatsV9"><b>{data.total||0}</b><small>当前筛选结果</small></div></section>
    <section className="adminPanelV9">
      <div className="adminFiltersV9"><div className="adminSearchV9"><Search size={18}/><input placeholder="商家 / 联系人 / 手机号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}/></div><select value={query.status} onChange={e=>{setSelected([]);setQuery({...query,status:e.target.value,page:1})}}><option value="">全部状态</option><option value="PENDING">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已驳回</option></select><button className="primary" onClick={()=>setQuery(q=>({...q,page:1}))}><Search size={16}/>查询</button></div>
      <div className="adminBatchBarV9"><label className="adminCheckV9"><input type="checkbox" checked={allPendingSelected} onChange={toggleAll}/><span></span>选择本页待审核</label><em>已选 {selected.length} 项</em><button disabled={!selected.length} onClick={()=>openApprove(selected)}><CheckCircle2 size={16}/>批量通过</button><button className="danger" disabled={!selected.length} onClick={()=>openReject(selected)}><XCircle size={16}/>批量驳回</button></div>
      <div className="reviewCardsV9">{(data.items||[]).length?(data.items||[]).map(a=><article className="reviewCardV9" key={a.id}><label className="adminCheckV9 floating"><input type="checkbox" disabled={a.status!=='PENDING'} checked={selected.includes(a.id)} onChange={()=>toggle(a.id)}/><span></span></label><div className="reviewIconV9"><Building2 size={24}/></div><div className="reviewMainV9"><h3>{a.companyName}</h3><p>{a.note||'未填写申请说明'}</p><div><span><UserRound size={14}/>{a.contactName}</span><span><Phone size={14}/>{a.phone}</span><span>邀请码：{a.inviteCode||'-'}</span></div></div><div className="reviewSideV9"><Badge v={a.status}/><small>{fmt(a.createdAt)}</small>{a.status==='PENDING'?<div className="reviewActionsV9"><button className="primary" onClick={()=>openApprove(a.id)}>通过</button><button className="danger" onClick={()=>openReject(a.id)}>驳回</button></div>:<b>已处理</b>}</div></article>):<div className="empty big">暂无申请</div>}</div>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {review&&<ReviewModal review={review} quota={quota} setQuota={setQuota} reason={reason} setReason={setReason} onClose={()=>setReview(null)} onSubmit={submitReview}/>}  
  </div>;
}
function ReviewModal({review,quota,setQuota,reason,setReason,onClose,onSubmit}){
  return <div className="adminModalMaskV9" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="adminReviewModalV9"><button className="modalCloseV9" onClick={onClose}><X size={22}/></button><div className={review.type==='approve'?'modalBadgeV9 approve':'modalBadgeV9 reject'}>{review.type==='approve'?<CheckCircle2/>:<XCircle/>}</div><h2>{review.type==='approve'?'审核通过':'驳回申请'}</h2>{review.type==='approve'?<label>发放初始额度<input type="number" value={quota} onChange={e=>setQuota(e.target.value)} autoFocus/></label>:<label>驳回原因<textarea value={reason} onChange={e=>setReason(e.target.value)} autoFocus/></label>}<div className="modalActionsV9"><button onClick={onClose}>取消</button><button className={review.type==='approve'?'primary':'danger'} onClick={onSubmit}>{review.type==='approve'?'确认通过':'确认驳回'}</button></div></div></div>;
}

export default Applications;
