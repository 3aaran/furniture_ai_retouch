import React,{useEffect,useState}from'react';
import{Bell,BrainCircuit,Building2,CheckCircle2,Download,Eye,Image as ImageIcon,Phone,Plus,Power,Search,SlidersHorizontal,Ticket,Trash2,UserRound,Video,WalletCards,X,XCircle}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName,imageViewUrl,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../appShared.jsx';
import{adminPages,adminNavGroups as configuredAdminNavGroups}from'../config/pageRegistry.jsx';
import{featureName,getFeatureDisplayName,getTargetScopeDisplayName}from'../config/uiText.js';
import{TaskDetailModal}from'../components/TaskDetailModal.jsx';

export const adminNav=adminPages;
export const adminNavGroups=configuredAdminNavGroups;

const AI_MODEL_OPTIONS=[
  {label:'本地模拟',provider:'mock',modelName:'local-mock-model',baseUrl:'',apiPath:''},
  {label:'智谱 CogView-3-Flash',provider:'zhipu',modelName:'cogview-3-flash',baseUrl:'',apiPath:'https://open.bigmodel.cn/api/paas/v4/images/generations'},
  {label:'GPT Image 2',provider:'gpt-image-2',modelName:'gpt-image-2',baseUrl:'',apiPath:'https://api.lk888.ai/v1/media/generate'},
  {label:'自定义 HTTP',provider:'custom',modelName:'custom-image-model',baseUrl:'',apiPath:''}
];
const modelOptionValue=o=>`${o.provider}::${o.modelName}`;
function findModelOption(provider,modelName){
  return AI_MODEL_OPTIONS.find(o=>o.provider===(provider||'')&&o.modelName===(modelName||''))||AI_MODEL_OPTIONS.find(o=>o.provider===(provider||''))||AI_MODEL_OPTIONS[0];
}
function ModelSelect({value,onChange}){
  return <select value={value} onChange={e=>onChange(e.target.value)}>{AI_MODEL_OPTIONS.map(o=><option key={modelOptionValue(o)} value={modelOptionValue(o)}>{o.label}</option>)}</select>;
}
function updateAiModelSelection(setAi,value){
  const option=AI_MODEL_OPTIONS.find(o=>modelOptionValue(o)===value)||AI_MODEL_OPTIONS[0];
  setAi(ai=>({...ai,providerConfig:{...(ai?.providerConfig||{}),provider:option.provider,defaultModel:option.modelName,defaultApiPath:option.apiPath,baseUrl:''},features:(ai?.features||[]).map(f=>({...f,provider:option.provider,modelName:option.modelName,apiPath:option.apiPath}))}));
}
function updateFeatureModelSelection(setAi,index,value){
  const option=AI_MODEL_OPTIONS.find(o=>modelOptionValue(o)===value)||AI_MODEL_OPTIONS[0];
  setAi(ai=>{const next={...ai,features:[...(ai?.features||[])]};next.features[index]={...next.features[index],provider:option.provider,modelName:option.modelName,apiPath:option.apiPath};return next});
}

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
function AiConfig({setMsg}){
  const[ai,setAi]=useState(null);
  useEffect(()=>{req('/api/admin/ai/config').then(setAi).catch(e=>setMsg(e.message))},[]);
  function updateProvider(k,v){setAi(a=>({...a,providerConfig:{...(a?.providerConfig||{}),[k]:v}}))}
  function updateFeature(i,k,v){setAi(a=>{const next={...a,features:[...(a?.features||[])]};next.features[i]={...next.features[i],[k]:v};return next})}
  async function save(){try{await req('/api/admin/ai/config',{method:'POST',body:JSON.stringify(ai)});setMsg('AI模型配置已保存');req('/api/admin/ai/config').then(setAi).catch(()=>{})}catch(e){setMsg(e.message)}}
  return <section className="panel settings aiConfigPageV2"><h2><BrainCircuit/> AI 模型配置</h2>{!ai?<div className="empty">AI 配置加载中...</div>:<><div className="aiConfigBoxV2"><h3>全局模型服务</h3><div className="grid2"><label>模型服务<ModelSelect value={modelOptionValue(findModelOption(ai.providerConfig?.provider,ai.providerConfig?.defaultModel))} onChange={v=>updateAiModelSelection(setAi,v)}/></label><label>接口密钥<input placeholder={ai.providerConfig?.apiKeyMasked||'保存后自动脱敏显示'} value={ai.providerConfig?.apiKey||''} onChange={e=>updateProvider('apiKey',e.target.value)}/></label><label className="full">接口路径地址<input placeholder="https://example.com/v1/images/generations" value={ai.providerConfig?.defaultApiPath||''} onChange={e=>updateProvider('defaultApiPath',e.target.value)}/></label></div><label className="check"><input type="checkbox" checked={!!ai.providerConfig?.enabled} onChange={e=>updateProvider('enabled',e.target.checked)}/> 启用 AI 生成功能</label></div><div className="aiConfigBoxV2"><h3>功能模型映射</h3><div className="aiFeatureTableV2"><div className="aiFeatureHeadV2"><b>功能</b><b>启用</b><b>模型来源</b><b>模型名称</b><b>接口路径地址</b></div>{(ai.features||[]).map((f,i)=><div className="aiFeatureRowV2" key={f.featureKey}><span>{getFeatureDisplayName(f.featureKey,f.featureName||'未知功能')}</span><input type="checkbox" checked={!!f.enabled} onChange={e=>updateFeature(i,'enabled',e.target.checked)}/><input readOnly value={f.provider||''}/><ModelSelect value={modelOptionValue(findModelOption(f.provider,f.modelName))} onChange={v=>updateFeatureModelSelection(setAi,i,v)}/><input placeholder="可为该功能单独填写完整接口地址" value={f.apiPath||''} onChange={e=>updateFeature(i,'apiPath',e.target.value)}/></div>)}</div></div><button className="submit" onClick={save}>保存 AI 配置</button></>}</section>;
}

function Resources({setMsg}){
  const{query,setQuery,data,load}=usePaged('/api/admin/resources',{keyword:'',resourceType:'',status:''});
  const[f,setF]=useState({name:'',resourceType:'material',objectName:'',colorName:'',description:'',imageUrl:''}),[file,setFile]=useState(null),[preview,setPreview]=useState('');
  function chooseFile(e){const img=e.target.files?.[0];setFile(img||null);setPreview(img?URL.createObjectURL(img):'')}
  async function create(){try{const fd=new FormData();Object.entries(f).forEach(([k,v])=>fd.append(k,v??''));if(file)fd.append('image',file);await reqForm('/api/admin/resources',fd);setMsg('资源已创建');setF({name:'',resourceType:'material',objectName:'',colorName:'',description:'',imageUrl:''});setFile(null);setPreview('');load()}catch(e){setMsg(e.message)}}
  async function patch(id,status){try{await req('/api/admin/resources/'+id,{method:'PATCH',body:JSON.stringify({status})});load()}catch(e){setMsg(e.message)}}
  async function del(id){if(!confirm('删除系统资源？'))return;try{await req('/api/admin/resources/'+id,{method:'DELETE'});load()}catch(e){setMsg(e.message)}}
  return <div className="stack"><section className="panel"><h2><Plus/>新增系统资源</h2><div className="resourceCreate"><label className="uploadBox resourceUpload"><input type="file" accept="image/*" onChange={chooseFile}/>{preview?<img src={preview} loading="lazy" decoding="async"/>:<><ImageIcon size={36}/><b>上传资源图片</b></>}</label><div className="resourceForm"><div className="grid2"><input placeholder="资源名称" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><select value={f.resourceType} onChange={e=>setF({...f,resourceType:e.target.value})}>{Object.entries(resTypeName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input placeholder="物体/适用对象" value={f.objectName} onChange={e=>setF({...f,objectName:e.target.value})}/><input placeholder="颜色/色系" value={f.colorName} onChange={e=>setF({...f,colorName:e.target.value})}/><input placeholder="图片URL（可选）" value={f.imageUrl} onChange={e=>setF({...f,imageUrl:e.target.value})}/></div><textarea placeholder="资源说明" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><button className="primary" onClick={create}>创建资源</button></div></div></section><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}><input placeholder="名称/物体/颜色" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.resourceType} onChange={e=>setQuery({...query,resourceType:e.target.value})}><option value="">全部类型</option>{Object.entries(resTypeName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="ACTIVE">上架</option><option value="DISABLED">下架</option></select></Toolbar><div className="resourceGrid">{(data.items||[]).map(r=><div className="resourceCard" key={r.id}>{r.imageUrl?<img src={imageListUrl(r)} onError={e=>fallbackToOriginalImage(e,r)} loading="lazy" decoding="async"/>:<div className="resourcePh">{resTypeName[r.resourceType]}</div>}<b>{r.name}</b><span>{resTypeName[r.resourceType]} · {r.objectName||'-'} · {r.colorName||'-'}</span><p>{r.description}</p><div><button onClick={()=>patch(r.id,r.status==='ACTIVE'?'DISABLED':'ACTIVE')}>{r.status==='ACTIVE'?'下架':'上架'}</button><button className="danger" onClick={()=>del(r.id)}><Trash2 size={14}/>删除</button></div></div>)}</div><Pagination data={data} setQuery={setQuery}/></section></div>;
}

function SettingsPage({setMsg}){
  const[s,setS]=useState({});
  function formatStorageSetting(v){
    const n=Number(v||0);
    if(!Number.isFinite(n)||n<=0)return v||'';
    if(n%(1024**3)===0)return `${n/(1024**3)}GB`;
    if(n%(1024**2)===0)return `${n/(1024**2)}MB`;
    return `${(n/(1024**3)).toFixed(2)}GB`;
  }
  useEffect(()=>{req('/api/admin/settings').then(d=>setS({
    video_default_duration_seconds:'10',
    video_max_duration_seconds:'30',
    announcement_retention_days:'30',
    announcement_user_max_count:'50',
    ...d,
    user_storage_limit_bytes:formatStorageSetting(d.user_storage_limit_bytes)
  })).catch(e=>setMsg(e.message))},[]);
  async function save(){try{await req('/api/admin/settings',{method:'PATCH',body:JSON.stringify(s)});setMsg('系统配置已保存')}catch(e){setMsg(e.message)}}
  const groups=[
    {key:'storage',title:'图片存储',icon:<ImageIcon size={22}/>,tone:'blue',items:[['user_storage_limit_bytes','用户图片存储上限']]},
    {key:'quota',title:'额度基础',icon:<WalletCards size={22}/>,tone:'gold',items:[['recharge_ratio','额度换算比例'],['trial_account_hours','体验账号有效小时']]},
    {key:'cost',title:'AI 功能消耗',icon:<SlidersHorizontal size={22}/>,tone:'green',items:[['cost_remove_bg','背景净化'],['cost_replace_bg','场景融合'],['cost_enhance','摄影增强'],['cost_material','材质替换'],['cost_multiview','多角度视图'],['cost_lineart','线稿图'],['cost_video_generate','宣传视频生成']]},
    {key:'video',title:'视频生成',icon:<Video size={22}/>,tone:'blue',items:[['video_default_duration_seconds','默认视频时长（秒）'],['video_max_duration_seconds','最大视频时长（秒）']]},
    {key:'announcement',title:'公告邮箱',icon:<Bell size={22}/>,tone:'gold',items:[['announcement_retention_days','公告默认保留天数'],['announcement_user_max_count','每个用户最多显示公告数']]},
    {key:'resolution',title:'分辨率倍率',icon:<ImageIcon size={22}/>,tone:'blue',items:[['resolution_multiplier_1k','1K 倍率'],['resolution_multiplier_2k','2K 倍率'],['resolution_multiplier_4k','4K 倍率']]},
    {key:'invite',title:'推广奖励',icon:<Ticket size={22}/>,tone:'rose',items:[['invite_new_store_reward_ratio','新注册门店奖励比例'],['invite_source_store_reward_ratio','邀请门店奖励比例']]}
  ];
  const update=(key,value)=>setS({...s,[key]:value});
  return <section className="adminModernPage settingsPageV9"><div className="adminHeroV9 settingsHeroV9"><div><span>平台规则</span><h1>系统配置</h1></div><div className="settingsHeroNoteV9"><b>{groups.reduce((n,g)=>n+g.items.length,0)}</b><small>项业务参数</small></div></div><div className="settingsLayoutV9">{groups.map(group=><section className={`settingsGroupV9 ${group.tone}`} key={group.key}><header><div className="settingsGroupIconV9">{group.icon}</div><div><h2>{group.title}</h2></div></header><div className="settingsFieldsV9">{group.items.map(([k,label])=><label className="settingsFieldV9" key={k}><span>{label}</span><input value={s[k]||''} placeholder={k==='user_storage_limit_bytes'?'例如 5GB':''} onChange={e=>update(k,e.target.value)}/>{k==='user_storage_limit_bytes'&&<small>支持 5GB、500MB 这类写法，保存后同步到所有非平台管理员账号。</small>}</label>)}</div></section>)}</div><div className="settingsSaveBarV9"><button className="submit" onClick={save}>保存配置</button></div></section>;
}

function AdminLogs({setMsg}){
  const ops=featureName;
  const {query,setQuery,data}=usePaged('/api/admin/task-images',{keyword:'',operation:'',startDate:'',endDate:'',pageSize:12});
  const [selected,setSelected]=useState([]),[detail,setDetail]=useState(null),[loadingDetail,setLoadingDetail]=useState(false);
  function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
  function batchDownload(){const ids=(selected.length?selected:(data.items||[]).map(x=>x.id)).filter(Boolean);if(!ids.length)return setMsg('暂无可下载的图片');window.open(`${API}/api/admin/task-images/batch-download?ids=${encodeURIComponent(ids.join(','))}&token=${token()}`,'_blank')}
  async function openDetail(id){try{setLoadingDetail(true);const d=await req('/api/images/'+id+'/detail-rich');setDetail(d)}catch(e){setMsg(e.message)}finally{setLoadingDetail(false)}}
  const items=data.items||[];
  return <div className="adminLogPage adminLogV5"><section className="adminLogIntro">{/* <button className="primary" onClick={batchDownload}><Download size={17}/>批量下载压缩包</button> */}</section>
  <section className="panel aiTaskPanel"><div className="toolbar"><div className="filterGroup"><input placeholder="搜索商家 / 用户 / 任务编号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.operation} onChange={e=>setQuery({...query,operation:e.target.value,page:1})}><option value="">全部功能</option>{Object.entries(ops).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input type="date" value={query.startDate} onChange={e=>setQuery({...query,startDate:e.target.value,page:1})}/><input type="date" value={query.endDate} onChange={e=>setQuery({...query,endDate:e.target.value,page:1})}/><button className="primary" onClick={()=>setQuery(q=>({...q,page:1}))}><Search size={16}/>查询</button></div></div><div className="aiTaskGrid">{items.length?items.map(it=><article key={it.id} className={'taskCard '+(selected.includes(it.id)?'checked':'')}><label className="selectDot"><input type="checkbox" checked={selected.includes(it.id)} onChange={()=>toggle(it.id)}/><span></span></label><div className="taskImg" onClick={()=>openDetail(it.id)}><img src={imageListUrl(it)} onError={e=>fallbackToOriginalImage(e,it)} loading="lazy" decoding="async"/><b>{getFeatureDisplayName(it.featureKey||it.operation||it.kind,'AI任务')}</b></div><div className="taskMeta"><strong>{it.companyName||'未绑定商家'}</strong><span>{it.userName||it.phone||it.username||'-'} · {fmt(it.createdAt)}</span><small>编号：{it.id}</small></div><div className="taskActions"><button onClick={()=>openDetail(it.id)}><Eye size={16}/>查看详情</button><button onClick={()=>openImageDownload(it,setMsg)}><Download size={16}/>下载</button></div></article>):<div className="empty big">暂无AI生成任务</div>}</div><Pagination data={data} setQuery={setQuery}/></section>{loadingDetail&&<div className="modalMask"><div className="empty big">加载中...</div></div>}{detail&&<TaskDetailModal detail={detail} onClose={()=>setDetail(null)} isAdmin={true} ops={ops} setMsg={setMsg} taskList={items} onSwitchTask={(item)=>openDetail(item.id)}/>}</div>;
}

function Feedbacks({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/feedbacks',{status:'',keyword:''});async function handle(id,status){const reply=prompt('处理说明/回复内容')||'';try{await req('/api/admin/feedbacks/'+id,{method:'PATCH',body:JSON.stringify({status,reply})});setMsg('反馈已处理');load()}catch(e){setMsg(e.message)}}return <section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={()=>window.open(API+'/api/export/admin/feedbacks?token='+token())}><input placeholder="标题/内容/用户/商家" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="PENDING">待处理</option><option value="PROCESSING">处理中</option><option value="RESOLVED">已解决</option><option value="REJECTED">已驳回</option></select></Toolbar><Table cols={['商家','用户','联系方式','标题','内容','状态','回复','提交时间','操作']}>{(data.items||[]).map(f=><tr key={f.id}><td>{f.companyName||'-'}</td><td>{f.userName||f.userPhone||'-'}</td><td>{f.contact||'-'}</td><td>{f.title}</td><td>{f.content}</td><td><Badge v={f.status}/></td><td>{f.reply||'-'}</td><td>{fmt(f.created_at)}</td><td><button onClick={()=>handle(f.id,'PROCESSING')}>处理中</button><button className="primary" onClick={()=>handle(f.id,'RESOLVED')}>解决</button><button className="danger" onClick={()=>handle(f.id,'REJECTED')}>驳回</button></td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section>}
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
function RedeemCodes({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/redeem-codes',{status:'',keyword:''});const[f,setF]=useState({count:10,quota:50,maxUses:1,targetScope:'ALL',validDays:30});const[codes,setCodes]=useState([]);async function create(){try{const d=await req('/api/admin/redeem-codes/batch',{method:'POST',body:JSON.stringify(f)});setMsg(d.message);setCodes(d.codes||[]);load()}catch(e){setMsg(e.message)}}return <div className="stack"><section className="panel"><h2><Ticket/>批量创建兑换码</h2><div className="grid2"><label>数量<input type="number" value={f.count} onChange={e=>setF({...f,count:e.target.value})}/></label><label>每个额度<input type="number" value={f.quota} onChange={e=>setF({...f,quota:e.target.value})}/></label><label>可兑换次数<input type="number" value={f.maxUses} onChange={e=>setF({...f,maxUses:e.target.value})}/></label><label>有效天数<input type="number" value={f.validDays} onChange={e=>setF({...f,validDays:e.target.value})}/></label><label>使用对象<select value={f.targetScope} onChange={e=>setF({...f,targetScope:e.target.value})}><option value="ALL">全部</option><option value="MERCHANT_OWNER">门店管理员</option><option value="MERCHANT_USER">门店人员</option><option value="TRIAL">体验账户</option></select></label></div><button className="primary" onClick={create}>创建兑换码</button>{codes.length>0&&<textarea readOnly value={codes.join('\n')}/>}</section><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={()=>window.open(API+'/api/export/admin/redeem-codes?token='+token())}><input placeholder="兑换码" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="ACTIVE">启用</option><option value="DISABLED">禁用</option><option value="EXPIRED">过期</option></select></Toolbar><Table cols={['兑换码','额度','次数','对象','状态','有效期','创建时间']}>{(data.items||[]).map(c=><tr key={c.id}><td>{c.code}</td><td>{c.quota}</td><td>{c.used_count}/{c.max_uses}</td><td>{getTargetScopeDisplayName(c.target_scope)}</td><td><Badge v={c.status}/></td><td>{fmt(c.valid_until)}</td><td>{fmt(c.created_at)}</td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section></div>}
export{Dashboard,Applications,Merchants,AiConfig,Resources,SettingsPage,AdminLogs,Feedbacks,Announcements,RedeemCodes};
