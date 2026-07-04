import React,{useEffect,useState}from'react';
import{Bell,Building2,CheckCircle2,Download,Eye,Image as ImageIcon,Phone,Plus,Power,Search,SlidersHorizontal,Ticket,Trash2,UserRound,Video,WalletCards,X,XCircle}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../../appShared.jsx';
import{featureName,getFeatureDisplayName,getTargetScopeDisplayName}from'../../config/uiText.js';

function Merchants({setMsg}){
  const{query,setQuery,data,load}=usePaged('/api/admin/merchants',{status:'',keyword:'',pageSize:10});
  const[detail,setDetail]=useState(null),[delta,setDelta]=useState(0),[loadingDetail,setLoadingDetail]=useState(false);
  async function open(id){try{setLoadingDetail(true);const d=await req('/api/admin/merchants/'+id);setDetail(d);setDelta(0)}catch(e){setMsg(e.message)}finally{setLoadingDetail(false)}}
  async function status(m){try{await req('/api/admin/merchants/'+m.id+'/status',{method:'PATCH',body:JSON.stringify({status:m.status==='ACTIVE'?'DISABLED':'ACTIVE',announce:true})});setMsg('商家状态已更新');load();if(detail?.merchant?.id===m.id)open(m.id)}catch(e){setMsg(e.message)}}
  async function saveConfig(){try{const d=await req('/api/admin/merchants/'+detail.merchant.id+'/config',{method:'PATCH',body:JSON.stringify({quotaDelta:Number(delta),announce:true})});setDelta(0);load();await open(detail.merchant.id);setMsg(d.message||'商家额度已调整')}catch(e){setMsg(e.message)}}
  return <div className="adminModernPage merchantsPageV9">
    <section className="adminHeroV9 merchantHeroV9"><div><span>商家运营</span><h1>商家管理</h1></div><button onClick={()=>window.open(API+'/api/export/merchants?token='+token())}><Download size={17}/>导出商家</button></section>
    <section className="adminPanelV9">
      <div className="adminFiltersV9 merchantFiltersV9"><div className="adminSearchV9"><Search size={18}/><input placeholder="名称 / 联系人 / 手机号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}/></div><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value,page:1})}><option value="">全部状态</option><option value="ACTIVE">启用</option><option value="DISABLED">禁用</option></select><button className="primary" onClick={()=>setQuery(q=>({...q,page:1}))}><Search size={16}/>查询</button></div>
      <div className="merchantGridV9">{(data.items||[]).length?(data.items||[]).map(m=><article className="merchantCardV9" key={m.id}><header><div className="merchantAvatarV9">{String(m.companyName||'商').slice(0,1)}</div><div><h3>{m.companyName}</h3><span>编号 {m.merchantCode}</span></div><Badge v={m.status}/></header><div className="merchantInfoV9"><span><UserRound size={15}/>{m.contactName||'-'}</span><span><Phone size={15}/>{m.phone||'-'}</span><span><WalletCards size={15}/>{m.quota} 算力</span></div><footer><button onClick={()=>open(m.id)}><Eye size={16}/>详情</button><button onClick={()=>status(m)}><Power size={16}/>{m.status==='ACTIVE'?'禁用':'启用'}</button></footer></article>):<div className="empty big">暂无商家</div>}</div>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {(detail||loadingDetail)&&<MerchantDetailModal loading={loadingDetail} detail={detail} delta={delta} setDelta={setDelta} onClose={()=>setDetail(null)} onSave={saveConfig}/>} 
  </div>;
}
function MerchantDetailModal({loading,detail,delta,setDelta,onClose,onSave}){
  const[tab,setTab]=useState('users');
  return <div className="adminModalMaskV9" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="merchantDetailModalV9">
      {loading?<div className="empty big">加载中...</div>:<>
        <button className="modalCloseV9" onClick={onClose}><X size={22}/></button>
        <div className="merchantDetailScrollV9">
          <header className="merchantDetailHeadV9">
            <div className="merchantAvatarV9 large">{String(detail.merchant.companyName||'商').slice(0,1)}</div>
            <div><h2>{detail.merchant.companyName}</h2><p>商家编号 {detail.merchant.merchantCode}</p></div>
            <Badge v={detail.merchant.status}/>
          </header>
          <div className="merchantMetricGridV9">
            <div><span>剩余额度</span><b>{detail.merchant.quota}</b></div>
            <div><span>联系人</span><b>{detail.merchant.contactName||'-'}</b></div>
            <div><span>手机号</span><b>{detail.merchant.phone||'-'}</b></div>
          </div>
          <div className="quotaAdjustV9"><label>发放/扣减额度<input type="number" value={delta} onChange={e=>setDelta(e.target.value)} placeholder="可输入负数"/></label><button className="primary" onClick={onSave}><SlidersHorizontal size={16}/>保存调整并公告</button></div>
          <div className="merchantDetailTabsV9">
            <button type="button" className={tab==='users'?'active':''} onClick={()=>setTab('users')}>商家下账号</button>
            <button type="button" className={tab==='quota'?'active':''} onClick={()=>setTab('quota')}>最近额度记录</button>
          </div>
          <section className="merchantDetailTabPanelV9">
            {tab==='users'
              ? <Table cols={['账号','姓名','角色','额度','状态']}>{(detail.users||[]).map(u=><tr key={u.id}><td>{u.phone||u.username}</td><td>{u.displayName}</td><td>{roleName[u.role]}</td><td>{u.quota}</td><td><Badge v={u.status}/></td></tr>)}</Table>
              : <Table cols={['类型','额度','时间']}>{(detail.quotaLogs||[]).map(l=><tr key={l.id}><td>{getStatusName(l.type)}</td><td>{l.amount}</td><td>{fmt(l.created_at)}</td></tr>)}</Table>}
          </section>
        </div>
      </>}
    </div>
  </div>;
}

export default Merchants;
