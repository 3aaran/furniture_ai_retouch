import React,{useMemo,useState}from'react';
import{Building2,ChevronRight,Clock3,CreditCard,Eye,ListChecks,Search,Sparkles,WalletCards,X}from'lucide-react';
import{req,fmt,usePaged,Pagination}from'../../../appShared.jsx';
import{featureName,getFeatureDisplayName}from'../../../config/uiText.js';

export default function QuotaLogs({me,setMsg,TaskDetailModal}){
  const isAdmin=me?.role==='SYSTEM_ADMIN';
  const initQuery=useMemo(()=>isAdmin?{keyword:'',view:'usage',period:'week',pageSize:12}:{keyword:'',type:'',pageSize:10},[isAdmin]);
  const{query,setQuery,data}=usePaged(isAdmin?'/api/admin/quota-logs':'/api/merchant/quota-logs',initQuery);
  const[detail,setDetail]=useState(null);
  const[adminDetail,setAdminDetail]=useState(null);
  const summary=data.summary||{};

  function taskId(v){return v?String(v).slice(0,18):'-'}
  function merchantTypeText(t){
    const text=String(t||'');
    return {AI_COST:'AI生成',AI_REFUND:'AI退款',RECHARGE:'人工充值',MANUAL_ADJUST:'人工充值',REDEEM:'自动充值',ACCOUNT_DELETE_RECYCLE:'自动充值'}[text]||(/[\u4e00-\u9fa5]/.test(text)?text:'其他记录');
  }
  async function openTask(id){
    if(!id)return;
    try{
      setDetail(await req('/api/ai/tasks/'+id));
    }catch(e){
      setMsg&&setMsg(e.message||'任务详情读取失败');
    }
  }

  async function openAdminDetail(row){
    try{
      setAdminDetail({...row,loading:true,items:[]});
      const d=await req(`/api/admin/quota-logs/detail?view=${query.view||'usage'}&period=${query.period||'week'}&merchantId=${encodeURIComponent(row.merchantId||'')}&periodKey=${encodeURIComponent(row.periodKey||'')}`);
      setAdminDetail({...row,view:query.view||'usage',period:query.period||'week',items:d.items||[],loading:false});
    }catch(e){
      setAdminDetail(null);
      setMsg&&setMsg(e.message||'明细读取失败');
    }
  }

  if(isAdmin){
    const view=query.view||'usage';
    const period=query.period||'week';
    const periodOptions=[['week','每周'],['month','每月'],['quarter','每季度']];
    return <div className="quotaPageV2 adminQuotaPageV4 stitchQuotaPage">
      <section className="stitchTopUpHero">
        <div><span>QUOTA LEDGER</span><h2>额度明细</h2><p>按周期查看门店大模型调用、算力消耗和充值情况。</p></div>
        <strong>{view==='usage'?'门店消耗':'门店充值'} · {periodOptions.find(([k])=>k===period)?.[1]||'每周'}</strong>
      </section>
      <section className="quotaSummaryV2 adminQuotaSummaryV4">
        <div className="quotaMetricV2 income"><span><Sparkles size={22}/>成功调用大模型</span><b>{summary.successCalls??0}</b><small>只统计成功完成的 AI 任务</small></div>
        <div className="quotaMetricV2 expense"><span><WalletCards size={22}/>门店消耗额度</span><b>{summary.usageQuota??0}</b><small>成功任务实际消耗算力</small></div>
        <div className="quotaMetricV2 current"><span><CreditCard size={22}/>门店充值额度</span><b>+{summary.rechargeQuota??0}</b><small>系统或平台管理员充值</small></div>
      </section>

      <section className="quotaPanelV2 adminQuotaPanelV4">
        <div className="adminQuotaTabsV4">
          <button type="button" className={view==='usage'?'active':''} onClick={()=>setQuery({...query,view:'usage',page:1})}><ListChecks size={17}/>门店消耗</button>
          <button type="button" className={view==='recharge'?'active':''} onClick={()=>setQuery({...query,view:'recharge',page:1})}><CreditCard size={17}/>门店充值</button>
        </div>
        <div className="adminQuotaPeriodTabsV4">
          {periodOptions.map(([k,label])=><button key={k} type="button" className={period===k?'active':''} onClick={()=>setQuery({...query,period:k,page:1})}>{label}</button>)}
        </div>

        <div className="quotaToolbarV2 adminQuotaToolbarV4">
          <div className="quotaSearchV2"><Search size={18}/><input placeholder="搜索门店、用户或任务" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}/></div>
        </div>

        <div className="adminQuotaListV4">
          {(data.items||[]).length?(data.items||[]).map(row=>{
            const isUsage=view==='usage';
            const amount=isUsage?Number(row.usageQuota||0):Number(row.rechargeQuota||0);
            const count=isUsage?Number(row.successCalls||0):Number(row.rechargeCount||0);
            return <article className={isUsage?'adminQuotaItemV4 usage':'adminQuotaItemV4 recharge'} key={`${view}-${row.merchantId}-${row.periodKey}`}>
              <div className="adminQuotaMerchantV4">
                <i><Building2 size={18}/></i>
                <div><b>{row.companyName||'未绑定门店'}</b><span>{row.periodLabel||`${row.periodStart||''} - ${row.periodEnd||''}`}</span></div>
              </div>
              <div className="adminQuotaStatV4">
                <span>{isUsage?'成功调用':'充值笔数'}</span>
                <b>{count}</b>
              </div>
              <div className={isUsage?'adminQuotaAmountV4 minus':'adminQuotaAmountV4 plus'}>
                {isUsage?`-${amount}`:`+${amount}`}<small>算力</small>
              </div>
              <button type="button" className="adminQuotaDetailBtnV4" onClick={()=>openAdminDetail(row)}><Eye size={16}/>详情<ChevronRight size={16}/></button>
            </article>
          }):<div className="empty big">{view==='usage'?'暂无门店消耗记录':'暂无门店充值记录'}</div>}
        </div>
        <Pagination data={data} setQuery={setQuery}/>
      </section>

      {adminDetail&&<AdminQuotaDetailModal detail={adminDetail} onClose={()=>setAdminDetail(null)} />}
    </div>;
  }

  const typeOptions=[
    ['','全部类型'],
    ['AI_GENERATE','AI生成'],
    ['AUTO_RECHARGE','自动充值'],
    ['MANUAL_RECHARGE','人工充值']
  ];

  return <div className="quotaPageV2 stitchQuotaPage">
    <section className="stitchTopUpHero">
      <div><span>TOP UP CENTER</span><h2>算力中心</h2><p>查看当前余额、收入支出和每一次 AI 任务扣费记录。</p></div>
      <strong>{summary.currentBalance??0} 算力</strong>
    </section>
    <section className="quotaSummaryV2">
      <div className="quotaMetricV2 current"><span><WalletCards size={22}/>当前余额</span><b>{summary.currentBalance??0}</b></div>
      <div className="quotaMetricV2 income"><span>总收入</span><b>+{summary.totalIncome??0}</b></div>
      <div className="quotaMetricV2 expense"><span>总支出</span><b>{summary.totalExpense??0}</b></div>
    </section>

    <section className="quotaPanelV2">
      <div className="quotaToolbarV2">
        <div className="quotaSearchV2"><Search size={18}/><input placeholder="搜索任务、用户或操作人" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}/></div>
        <select value={query.type} onChange={e=>setQuery({...query,type:e.target.value,page:1})}>
          {typeOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="quotaTableWrapV2">
        <table className="quotaTableV2">
          <thead><tr><th>时间</th><th>类型</th><th>变动算力</th><th>变动后余额</th><th>关联任务</th></tr></thead>
          <tbody>
            {(data.items||[]).length?data.items.map(l=>{
              const n=Number(l.signedAmount??l.amount??0);
              return <tr key={l.id}>
                <td data-label="时间">{fmt(l.created_at)}</td>
                <td data-label="类型"><span className={'quotaTypeBadgeV2 '+(n>=0?'plus':'minus')}>{l.typeLabel||merchantTypeText(l.type)}</span></td>
                <td data-label="变动算力"><b className={n>=0?'quotaNumPlusV2':'quotaNumMinusV2'}>{n>=0?`+${n}`:n}</b></td>
                <td data-label="变动后余额">{l.balanceAfter??'-'}</td>
                <td data-label="关联任务">{l.related_task_id?<button className="quotaTaskLinkV2" type="button" onClick={()=>openTask(l.related_task_id)}>{taskId(l.related_task_id)}</button>:<code>-</code>}</td>
              </tr>
            }):<tr><td colSpan="5"><div className="empty big">暂无额度流水</div></td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {detail&&<TaskDetailModal detail={detail} onClose={()=>setDetail(null)} isAdmin={false} ops={featureName} setMsg={setMsg} taskList={[]} />}
  </div>
}

function AdminQuotaDetailModal({detail,onClose}){
  const isUsage=detail.view==='usage';
  const total=isUsage
    ? (detail.items||[]).reduce((s,x)=>s+Number(x.cost||0),0)
    : (detail.items||[]).reduce((s,x)=>s+Number(x.amount||0),0);
  return <div className="adminQuotaDetailMaskV4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="adminQuotaDetailModalV4">
      <header>
        <div>
          <span>{isUsage?'门店消耗详情':'门店充值详情'}</span>
          <h2>{detail.companyName||'未绑定门店'}</h2>
          <p>{detail.periodLabel||`${detail.periodStart||''} - ${detail.periodEnd||''}`} · 共 {detail.items?.length||0} 条 · {isUsage?'消耗':'充值'} {total} 算力</p>
        </div>
        <button type="button" onClick={onClose}><X size={22}/></button>
      </header>
      <main>
        {detail.loading?<div className="empty big">正在读取明细...</div>:(detail.items||[]).length?(detail.items||[]).map(item=>isUsage
          ? <article className="adminQuotaDetailRowV4" key={item.id}>
              <div><b>{getFeatureDisplayName(item.featureKey,'AI任务')}</b><span><Clock3 size={14}/>{fmt(item.finishedAt||item.submittedAt)}</span></div>
              <div><small>使用账号</small><b>{item.userName||item.userPhone||'-'}</b></div>
              <div><small>模型</small><b>{item.modelName||item.provider||'-'}</b></div>
              <strong>-{Number(item.cost||0)} 算力</strong>
            </article>
          : <article className="adminQuotaDetailRowV4 recharge" key={item.id}>
              <div><b>{item.remark||'门店充值'}</b><span><Clock3 size={14}/>{fmt(item.created_at)}</span></div>
              <div><small>操作人</small><b>{item.operatorName||item.operatorPhone||'系统'}</b></div>
              <div><small>充值后余额</small><b>{item.balance_after??'-'}</b></div>
              <strong>+{Number(item.amount||0)} 算力</strong>
            </article>
        ):<div className="empty big">暂无明细</div>}
      </main>
    </div>
  </div>;
}
