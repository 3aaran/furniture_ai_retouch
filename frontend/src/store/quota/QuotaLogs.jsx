import React,{useState}from'react';
import{Search,WalletCards}from'lucide-react';
import{req,fmt,usePaged,Pagination}from'../../appShared.jsx';
import{featureName}from'../../config/uiText.js';

export default function QuotaLogs({setMsg,TaskDetailModal}){
  const{query,setQuery,data}=usePaged('/api/merchant/quota-logs',{keyword:'',type:'',pageSize:10});
  const[detail,setDetail]=useState(null);
  const summary=data.summary||{};
  const typeOptions=[
    ['','全部类型'],
    ['AI_GENERATE','AI生成'],
    ['AUTO_RECHARGE','自动充值'],
    ['MANUAL_RECHARGE','人工充值']
  ];
  function typeText(t){return {AI_COST:'AI生成',AI_REFUND:'AI退款',RECHARGE:'人工充值',MANUAL_ADJUST:'人工充值',REDEEM:'自动充值',ACCOUNT_DELETE_RECYCLE:'自动充值'}[t]||t}
  function taskId(v){return v?String(v).slice(0,18):'-'}
  async function openTask(id){
    if(!id)return;
    try{
      setDetail(await req('/api/ai/tasks/'+id));
    }catch(e){
      setMsg&&setMsg(e.message||'任务详情读取失败');
    }
  }
  return <div className="quotaPageV2">
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
                <td>{fmt(l.created_at)}</td>
                <td><span className={'quotaTypeBadgeV2 '+(n>=0?'plus':'minus')}>{l.typeLabel||typeText(l.type)}</span></td>
                <td><b className={n>=0?'quotaNumPlusV2':'quotaNumMinusV2'}>{n>=0?`+${n}`:n}</b></td>
                <td>{l.balanceAfter??'-'}</td>
                <td>{l.related_task_id?<button className="quotaTaskLinkV2" type="button" onClick={()=>openTask(l.related_task_id)}>{taskId(l.related_task_id)}</button>:<code>-</code>}</td>
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
