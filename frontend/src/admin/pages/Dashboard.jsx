import React,{useEffect,useState}from'react';
import{Bell,Building2,CheckCircle2,Download,Eye,Image as ImageIcon,Phone,Plus,Power,Search,SlidersHorizontal,Ticket,Trash2,UserRound,Video,WalletCards,X,XCircle}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../../appShared.jsx';
import{featureName,getFeatureDisplayName,getTargetScopeDisplayName}from'../../config/uiText.js';

function Dashboard({setMsg}){
  const[ov,setOv]=useState(null),[stats,setStats]=useState(null),[range,setRange]=useState('month');
  useEffect(()=>{req('/api/admin/overview').then(setOv).catch(e=>setMsg(e.message))},[]);
  useEffect(()=>{req('/api/admin/stats?range='+range).then(setStats).catch(e=>setMsg(e.message))},[range]);
  const cards=[['商家总数',ov?.merchants?.total||0],['启用商家',ov?.merchants?.active||0],['待审申请',ov?.applications?.pending||0],['本月收入','￥'+Number(ov?.finance?.income||0).toFixed(2)],['本月成本','￥'+Number(ov?.finance?.cost||0).toFixed(2)],['图片资产',ov?.images?.totalImages||0]];
  return <div className="stack">
    <div className="metrics">{cards.map(c=><div className="metric" key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}</div>
    <section className="panel"><div className="panelTitle"><h2>运营趋势</h2><div className="seg"><button className={range==='month'?'on':''} onClick={()=>setRange('month')}>月</button><button className={range==='quarter'?'on':''} onClick={()=>setRange('quarter')}>季度</button><button className={range==='year'?'on':''} onClick={()=>setRange('year')}>年</button></div></div><LineChart data={stats?.trend||[]}/></section>
    <section className="panel"><h2>AI消耗分布</h2><div className="bars">{(stats?.ops||[]).map(o=><div key={o.operation}><span>{getFeatureDisplayName(o.operation,'未知功能')}</span><i style={{width:Math.min(100,Number(o.count)*12)+'%'}}/><b>{o.count} 次 / {o.quota} 额度</b></div>)}</div></section>
  </div>;
}
function LineChart({data}){const w=900,h=240,p=34,max=Math.max(10,...data.flatMap(d=>[Number(d.income||0),Number(d.cost||0)]));const pts=k=>data.map((d,i)=>`${p+i*(w-2*p)/Math.max(1,data.length-1)},${h-p-Number(d[k]||0)/max*(h-2*p)}`).join(' ');return <svg className="chart" viewBox={`0 0 ${w} ${h}`}><line x1={p} y1={h-p} x2={w-p} y2={h-p}/><polyline points={pts('income')} fill="none" className="income"/><polyline points={pts('cost')} fill="none" className="cost"/><text x="38" y="28">收入 / 成本</text></svg>}

export default Dashboard;
