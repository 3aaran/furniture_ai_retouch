import React,{useEffect,useState}from'react';
import{Ticket,Search,Download,Plus,Power,Trash2,Eye,Image as ImageIcon}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName}from'../appShared.jsx';
import{adminPages,adminNavGroups as configuredAdminNavGroups}from'../config/pageRegistry.jsx';
import{featureName}from'../config/uiText.js';

export const adminNav=adminPages;
export const adminNavGroups=configuredAdminNavGroups;

const AI_MODEL_OPTIONS=[
  {label:'本地模拟',provider:'mock',modelName:'local-mock-model',baseUrl:'',apiPath:''},
  {label:'智谱 CogView-3-Flash',provider:'zhipu',modelName:'cogview-3-flash',baseUrl:'https://open.bigmodel.cn',apiPath:'/api/paas/v4/images/generations'},
  {label:'GPT Image 2（锦潮AI）',provider:'gpt-image-2',modelName:'gpt-image-2',baseUrl:'https://api.lk888.ai',apiPath:'/v1/media/generate'},
  {label:'阿里云通义万相',provider:'aliyun',modelName:'wanx2.1-imageedit',baseUrl:'',apiPath:''},
  {label:'即梦图片模型',provider:'jimeng',modelName:'jimeng-image',baseUrl:'',apiPath:''},
  {label:'自定义 HTTP',provider:'custom',modelName:'custom-image-model',baseUrl:'',apiPath:''}
];
const modelOptionValue=o=>`${o.provider}::${o.modelName}`;
function findModelOption(provider,modelName){
  return AI_MODEL_OPTIONS.find(o=>o.provider===(provider||'')&&o.modelName===(modelName||''))||AI_MODEL_OPTIONS.find(o=>o.provider===(provider||''))||AI_MODEL_OPTIONS[0];
}
function applyAiModel(ai,option,{syncFeatures=false}={}){
  const prev=ai?.providerConfig||{};
  const next={...(ai||{}),providerConfig:{...prev,provider:option.provider,defaultModel:option.modelName,defaultApiPath:option.apiPath}};
  if(option.baseUrl&&!prev.baseUrl)next.providerConfig.baseUrl=option.baseUrl;
  if(syncFeatures){
    next.features=(ai?.features||[]).map(f=>({...f,provider:option.provider,modelName:option.modelName,apiPath:option.apiPath}));
  }
  return next;
}
function updateAiModelSelection(setAi,value){
  const option=AI_MODEL_OPTIONS.find(o=>modelOptionValue(o)===value)||AI_MODEL_OPTIONS[0];
  setAi(a=>applyAiModel(a,option,{syncFeatures:true}));
}
function updateFeatureModelSelection(setAi,index,value){
  const option=AI_MODEL_OPTIONS.find(o=>modelOptionValue(o)===value)||AI_MODEL_OPTIONS[0];
  setAi(a=>{const next={...(a||{}),features:[...(a?.features||[])]};next.features[index]={...next.features[index],provider:option.provider,modelName:option.modelName,apiPath:option.apiPath};return next});
}
function ModelSelect({value,onChange}){
  return <select value={value} onChange={e=>onChange(e.target.value)}>{AI_MODEL_OPTIONS.map(o=><option key={modelOptionValue(o)} value={modelOptionValue(o)}>{o.label}</option>)}</select>;
}

function Dashboard({setMsg}){const[ov,setOv]=useState(null),[stats,setStats]=useState(null),[range,setRange]=useState('month');useEffect(()=>{req('/api/admin/overview').then(setOv).catch(e=>setMsg(e.message))},[]);useEffect(()=>{req('/api/admin/stats?range='+range).then(setStats).catch(e=>setMsg(e.message))},[range]);const cards=[['商家总数',ov?.merchants?.total||0],['启用商家',ov?.merchants?.active||0],['待审申请',ov?.applications?.pending||0],['本月收入','￥'+Number(ov?.finance?.income||0).toFixed(2)],['本月成本','￥'+Number(ov?.finance?.cost||0).toFixed(2)],['图片资产',ov?.images?.totalImages||0]];return <div className="stack"><div className="metrics">{cards.map(c=><div className="metric" key={c[0]}><span>{c[0]}</span><b>{c[1]}</b></div>)}</div><section className="panel"><div className="panelTitle"><h2>运营趋势</h2><div className="seg"><button className={range==='month'?'on':''} onClick={()=>setRange('month')}>月</button><button className={range==='quarter'?'on':''} onClick={()=>setRange('quarter')}>季度</button><button className={range==='year'?'on':''} onClick={()=>setRange('year')}>年</button></div></div><LineChart data={stats?.trend||[]}/></section><section className="panel"><h2>AI消耗分布</h2><div className="bars">{(stats?.ops||[]).map(o=><div key={o.operation}><span>{o.operation}</span><i style={{width:Math.min(100,Number(o.count)*12)+'%'}}/><b>{o.count} 次 / {o.quota} 额度</b></div>)}</div></section></div>}
function LineChart({data}){const w=900,h=240,p=34,max=Math.max(10,...data.flatMap(d=>[Number(d.income||0),Number(d.cost||0)]));const pts=k=>data.map((d,i)=>`${p+i*(w-2*p)/Math.max(1,data.length-1)},${h-p-Number(d[k]||0)/max*(h-2*p)}`).join(' ');return <svg className="chart" viewBox={`0 0 ${w} ${h}`}><line x1={p} y1={h-p} x2={w-p} y2={h-p}/><polyline points={pts('income')} fill="none" className="income"/><polyline points={pts('cost')} fill="none" className="cost"/><text x="38" y="28">收入 / 成本</text></svg>}
function Applications({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/applications',{status:'PENDING',keyword:''});const[quota,setQuota]=useState(500),[reason,setReason]=useState('资料不完整，暂不通过');async function approve(id){try{const d=await req('/api/admin/applications/'+id+'/approve',{method:'POST',body:JSON.stringify({quota})});setMsg(`已通过：门店管理员 ${d.account.phone} / 初始密码 ${d.account.password} / 邀请码 ${d.account.merchantCode}`);load()}catch(e){setMsg(e.message)}}async function reject(id){try{await req('/api/admin/applications/'+id+'/reject',{method:'POST',body:JSON.stringify({reason})});setMsg('已驳回申请');load()}catch(e){setMsg(e.message)}}return <section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}><input placeholder="商家/联系人/手机号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部</option><option value="PENDING">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已驳回</option></select><input type="number" value={quota} onChange={e=>setQuota(e.target.value)} title="通过后发放额度"/></Toolbar><p className="hint">带邀请码的申请会自动置顶；通过时会按系统配置计算新门店和邀请门店奖励。门店账号上限已不再作为本期业务规则。</p><Table cols={['商家','联系人','手机号','邀请码','状态','申请时间','操作']}>{data.items.map(a=><tr key={a.id}><td>{a.companyName}</td><td>{a.contactName}</td><td>{a.phone}</td><td>{a.inviteCode||'-'}</td><td><Badge v={a.status}/></td><td>{fmt(a.createdAt)}</td><td>{a.status==='PENDING'?<><button className="primary" onClick={()=>approve(a.id)}>通过</button><input className="miniInput" value={reason} onChange={e=>setReason(e.target.value)}/><button className="danger" onClick={()=>reject(a.id)}>驳回</button></>:'已处理'}</td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section>}
function Merchants({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/merchants',{status:'',keyword:''});const[detail,setDetail]=useState(null),[delta,setDelta]=useState(0);async function open(id){const d=await req('/api/admin/merchants/'+id);setDetail(d)}async function status(m){try{await req('/api/admin/merchants/'+m.id+'/status',{method:'PATCH',body:JSON.stringify({status:m.status==='ACTIVE'?'DISABLED':'ACTIVE',announce:true})});setMsg('商家状态已更新');load();if(detail?.merchant?.id===m.id)open(m.id)}catch(e){setMsg(e.message)}}async function saveConfig(){try{await req('/api/admin/merchants/'+detail.merchant.id+'/config',{method:'PATCH',body:JSON.stringify({quotaDelta:Number(delta),announce:true})});setMsg('商家额度已调整');setDelta(0);load();open(detail.merchant.id)}catch(e){setMsg(e.message)}}return <div className="stack"><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={()=>window.open(API+'/api/export/merchants?token='+token())}><input placeholder="名称/联系人/手机号" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="ACTIVE">启用</option><option value="DISABLED">禁用</option></select></Toolbar><Table cols={['商家名称','编号/邀请码','联系人','手机号','额度','状态','操作']}>{data.items.map(m=><tr key={m.id}><td>{m.companyName}</td><td>{m.merchantCode}</td><td>{m.contactName}</td><td>{m.phone}</td><td>{m.quota}</td><td><Badge v={m.status}/></td><td><button onClick={()=>open(m.id)}><Eye size={14}/>详情</button><button onClick={()=>status(m)}><Power size={14}/>{m.status==='ACTIVE'?'禁用':'启用'}</button></td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section>{detail&&<section className="panel"><h2>{detail.merchant.companyName} · 详情</h2><div className="metrics"><div className="metric"><span>商家编号</span><b>{detail.merchant.merchantCode}</b></div><div className="metric"><span>剩余额度</span><b>{detail.merchant.quota}</b></div><div className="metric"><span>状态</span><b>{getStatusName(detail.merchant.status)}</b></div></div><div className="toolbar"><input type="number" value={delta} onChange={e=>setDelta(e.target.value)} placeholder="发放/扣减额度，可负数"/><button className="primary" onClick={saveConfig}>保存调整并公告</button></div><h3>商家下账号</h3><Table cols={['账号','姓名','角色','额度','状态']}>{detail.users.map(u=><tr key={u.id}><td>{u.phone||u.username}</td><td>{u.displayName}</td><td>{roleName[u.role]}</td><td>{u.quota}</td><td><Badge v={u.status}/></td></tr>)}</Table><h3>最近额度记录</h3><Table cols={['类型','额度','时间']}>{detail.quotaLogs.map(l=><tr key={l.id}><td>{getStatusName(l.type)}</td><td>{l.amount}</td><td>{fmt(l.created_at)}</td></tr>)}</Table></section>}</div>}
function AiConfig({setMsg}){
  const[ai,setAi]=useState(null);
  useEffect(()=>{req('/api/admin/ai/config').then(setAi).catch(e=>setMsg(e.message))},[]);
  function updateProvider(k,v){setAi(a=>{
    const prev=a?.providerConfig||{};
    const next={...(a||{}),providerConfig:{...prev,[k]:v}};
    if(k==='provider'||k==='defaultModel'||k==='defaultApiPath'){
      const featureKey={provider:'provider',defaultModel:'modelName',defaultApiPath:'apiPath'}[k];
      const prevValue=k==='defaultModel'?prev.defaultModel:k==='defaultApiPath'?prev.defaultApiPath:prev.provider;
      next.features=(a?.features||[]).map(f=>{
        const current=f?.[featureKey]||'';
        if(current&&current!==prevValue)return f;
        return {...f,[featureKey]:v};
      });
    }
    return next;
  })}
  function updateFeature(i,k,v){setAi(a=>{const next={...(a||{}),features:[...(a?.features||[])]};next.features[i]={...next.features[i],[k]:v};return next})}
  async function save(){
    try{
      await req('/api/admin/ai/config',{method:'POST',body:JSON.stringify(ai)});
      setMsg('AI模型配置已保存');
      req('/api/admin/ai/config').then(setAi).catch(()=>{});
    }catch(e){setMsg(e.message)}
  }
  return <section className="panel settings aiConfigPageV2">
    <h2>AI 模型配置</h2>
    <p className="hint">这里是正式的 AI 配置入口。API Key 只保存在后端，页面读取时只显示脱敏值。提示词模板由后端文件统一维护，管理员不可在页面修改。</p>
    {!ai?<div className="empty">AI 配置加载中...</div>:<>
      <div className="aiConfigBoxV2">
        <h3>全局模型服务</h3>
        <div className="grid2">
          <label>模型服务<ModelSelect value={modelOptionValue(findModelOption(ai.providerConfig?.provider,ai.providerConfig?.defaultModel))} onChange={v=>updateAiModelSelection(setAi,v)}/></label>
          <label>API Base URL<input placeholder="例如：https://dashscope.aliyuncs.com" value={ai.providerConfig?.baseUrl||''} onChange={e=>updateProvider('baseUrl',e.target.value)}/></label>
          <label>API Key<input placeholder={ai.providerConfig?.apiKeyMasked||'保存后自动脱敏显示'} value={ai.providerConfig?.apiKey||''} onChange={e=>updateProvider('apiKey',e.target.value)}/></label>
          <label>当前模型<input readOnly value={ai.providerConfig?.defaultModel||''}/></label>
          <label>API Path<input placeholder="如 /v1/images/edits" value={ai.providerConfig?.defaultApiPath||''} onChange={e=>updateProvider('defaultApiPath',e.target.value)}/></label>
          <label>任务超时(ms)<input value={ai.providerConfig?.timeoutMs||120000} onChange={e=>updateProvider('timeoutMs',e.target.value)}/></label>
          <label>轮询间隔(ms)<input value={ai.providerConfig?.pollIntervalMs||2000} onChange={e=>updateProvider('pollIntervalMs',e.target.value)}/></label>
        </div>
        <label className="check"><input type="checkbox" checked={!!ai.providerConfig?.enabled} onChange={e=>updateProvider('enabled',e.target.checked)}/> 启用 AI 生成功能</label>
      </div>
      <div className="aiConfigBoxV2">
        <h3>6 大功能模型映射</h3>
        <p className="hint">这里只配置模型映射和开关，不提供提示词编辑入口。</p>
        <div className="aiFeatureTableV2">
          <div className="aiFeatureHeadV2"><b>功能</b><b>启用</b><b>Provider</b><b>Model</b><b>API Path</b></div>
          {(ai.features||[]).map((f,i)=><div className="aiFeatureRowV2" key={f.featureKey}>
            <span>{f.featureName}<small>{f.featureKey}</small></span>
            <input type="checkbox" checked={!!f.enabled} onChange={e=>updateFeature(i,'enabled',e.target.checked)}/>
            <input readOnly value={f.provider||''}/>
            <ModelSelect value={modelOptionValue(findModelOption(f.provider,f.modelName))} onChange={v=>updateFeatureModelSelection(setAi,i,v)}/>
            <input placeholder="如 /v1/images/edits" value={f.apiPath||''} onChange={e=>updateFeature(i,'apiPath',e.target.value)}/>
          </div>)}
        </div>
      </div>
      <button className="submit" onClick={save}>保存 AI 配置</button>
    </>}
  </section>
}
function Resources({setMsg}){
  const{query,setQuery,data,load}=usePaged('/api/admin/resources',{keyword:'',resourceType:'',status:''});
  const[f,setF]=useState({name:'',resourceType:'material',objectName:'',colorName:'',description:'',imageUrl:''});
  const[file,setFile]=useState(null);
  const[preview,setPreview]=useState('');
  function chooseFile(e){const img=e.target.files?.[0];setFile(img||null);setPreview(img?URL.createObjectURL(img):'')}
  async function create(){try{
    const fd=new FormData();
    Object.entries(f).forEach(([k,v])=>fd.append(k,v??''));
    if(file)fd.append('image',file);
    await reqForm('/api/admin/resources',fd);
    setMsg('资源已创建');
      setF({name:'',resourceType:'material',objectName:'',colorName:'',description:'',imageUrl:''});setFile(null);setPreview('');
    const input=document.getElementById('resource-image-input'); if(input) input.value='';
    load();
  }catch(e){setMsg(e.message)}}
  async function patch(id,status){try{await req('/api/admin/resources/'+id,{method:'PATCH',body:JSON.stringify({status})});load()}catch(e){setMsg(e.message)}}
  async function del(id){if(!confirm('删除系统资源？'))return;try{await req('/api/admin/resources/'+id,{method:'DELETE'});load()}catch(e){setMsg(e.message)}}
  return <div className="stack"><section className="panel"><h2><Plus/>新增系统资源</h2><div className="resourceCreate"><label className="uploadBox resourceUpload"><input id="resource-image-input" type="file" accept="image/*" onChange={chooseFile}/>{preview?<img src={preview}/>:<><ImageIcon size={36}/><b>上传资源图片</b><span>支持 JPG / PNG / WebP，图片会保存到本地 uploads</span></>}</label><div className="resourceForm"><div className="grid2"><input placeholder="资源名称，如北美白蜡木" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><select value={f.resourceType} onChange={e=>setF({...f,resourceType:e.target.value})}>{Object.entries(resTypeName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input placeholder="物体/适用对象，如沙发/椅子/桌面" value={f.objectName} onChange={e=>setF({...f,objectName:e.target.value})}/><input placeholder="颜色/色系，如浅木色/烟熏色" value={f.colorName} onChange={e=>setF({...f,colorName:e.target.value})}/><input placeholder="图片URL（可选：不上传文件时使用）" value={f.imageUrl} onChange={e=>setF({...f,imageUrl:e.target.value})}/></div><textarea placeholder="资源说明，如适用于实木家具表面材质替换、电商主图场景等" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><button className="primary" onClick={create}>创建资源</button></div></div></section><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}><input placeholder="名称/物体/颜色" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.resourceType} onChange={e=>setQuery({...query,resourceType:e.target.value})}><option value="">全部类型</option>{Object.entries(resTypeName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="ACTIVE">上架</option><option value="DISABLED">下架</option></select></Toolbar><div className="resourceGrid">{data.items.map(r=><div className="resourceCard" key={r.id}>{r.imageUrl?<img src={r.imageUrl.startsWith('http')?r.imageUrl:API+r.imageUrl}/>:<div className="resourcePh">{resTypeName[r.resourceType]}</div>}<b>{r.name}</b><span>{resTypeName[r.resourceType]} · {r.objectName||'-'} · {r.colorName||'-'}</span><p>{r.description}</p><div><button onClick={()=>patch(r.id,r.status==='ACTIVE'?'DISABLED':'ACTIVE')}>{r.status==='ACTIVE'?'下架':'上架'}</button><button className="danger" onClick={()=>del(r.id)}><Trash2 size={14}/>删除</button></div></div>)}</div><Pagination data={data} setQuery={setQuery}/></section></div>}
function SettingsPage({setMsg}){
  const[s,setS]=useState({}),[ann,setAnn]=useState({audience:'MERCHANT',announcementTitle:'系统配置调整通知',announcementContent:'平台使用规则已更新，请及时查看。'});
  const[ai,setAi]=useState(null);
  useEffect(()=>{req('/api/admin/settings').then(setS);req('/api/admin/ai/config').then(setAi).catch(()=>{})},[]);
  async function save(){
    try{
      await req('/api/admin/settings',{method:'PATCH',body:JSON.stringify({...s,announce:confirm('保存后是否发布公告？'),...ann})});
      if(ai) await req('/api/admin/ai/config',{method:'POST',body:JSON.stringify(ai)});
      setMsg('系统配置已保存');
      req('/api/admin/ai/config').then(setAi).catch(()=>{});
    }catch(e){setMsg(e.message)}
  }
  const fields=[['recharge_ratio','额度换算比例（保留配置，不显示充值入口）'],['cost_remove_bg','背景净化消耗'],['cost_replace_bg','场景融合消耗'],['cost_enhance','摄影增强消耗'],['cost_material','材质替换消耗'],['cost_multiview','多角度视图消耗'],['cost_lineart','线稿图消耗'],['resolution_multiplier_1k','1K 分辨率倍率'],['resolution_multiplier_2k','2K 分辨率倍率'],['resolution_multiplier_4k','4K 分辨率倍率'],['invite_new_store_reward_ratio','新注册门店奖励比例'],['invite_source_store_reward_ratio','邀请门店奖励比例'],['trial_account_hours','体验账号有效小时']];
  function updateProvider(k,v){setAi(a=>{
    const prev=a?.providerConfig||{};
    const next={...(a||{}),providerConfig:{...prev,[k]:v}};
    if(k==='provider'||k==='defaultModel'||k==='defaultApiPath'){
      const featureKey={provider:'provider',defaultModel:'modelName',defaultApiPath:'apiPath'}[k];
      const prevValue=k==='defaultModel'?prev.defaultModel:k==='defaultApiPath'?prev.defaultApiPath:prev.provider;
      next.features=(a?.features||[]).map(f=>{
        const current=f?.[featureKey]||'';
        if(current&&current!==prevValue)return f;
        return {...f,[featureKey]:v};
      });
    }
    return next;
  })}
  function updateFeature(i,k,v){setAi(a=>{const next={...(a||{}),features:[...(a?.features||[])]};next.features[i]={...next.features[i],[k]:v};return next})}
  return <section className="panel settings">
    <h2>系统参数</h2>
    <div className="grid2">{fields.map(([k,t])=><label key={k}>{t}<input value={s[k]||''} onChange={e=>setS({...s,[k]:e.target.value})}/></label>)}</div>
    <p className="hint">门店账号上限已列入删除范围，本期不再展示或同步该配置。</p>

    <h2>AI 模型设置</h2>
    <p className="hint">API Key 只保存在后端，前端读取时会脱敏。提示词模板由后端文件统一维护，管理员不可在页面修改。</p>
    {ai?<div className="aiConfigBoxV2">
      <div className="grid2">
        <label>模型服务<ModelSelect value={modelOptionValue(findModelOption(ai.providerConfig?.provider,ai.providerConfig?.defaultModel))} onChange={v=>updateAiModelSelection(setAi,v)}/></label>
        <label>API Base URL<input placeholder="https://api.example.com" value={ai.providerConfig?.baseUrl||''} onChange={e=>updateProvider('baseUrl',e.target.value)}/></label>
        <label>API Key<input placeholder={ai.providerConfig?.apiKeyMasked||'保存后自动脱敏显示'} value={ai.providerConfig?.apiKey||''} onChange={e=>updateProvider('apiKey',e.target.value)}/></label>
        <label>当前模型<input readOnly value={ai.providerConfig?.defaultModel||''}/></label>
        <label>API Path<input placeholder="如 /v1/images/edits" value={ai.providerConfig?.defaultApiPath||''} onChange={e=>updateProvider('defaultApiPath',e.target.value)}/></label>
        <label>任务超时(ms)<input value={ai.providerConfig?.timeoutMs||120000} onChange={e=>updateProvider('timeoutMs',e.target.value)}/></label>
        <label>轮询间隔(ms)<input value={ai.providerConfig?.pollIntervalMs||2000} onChange={e=>updateProvider('pollIntervalMs',e.target.value)}/></label>
      </div>
      <label className="check"><input type="checkbox" checked={!!ai.providerConfig?.enabled} onChange={e=>updateProvider('enabled',e.target.checked)}/> 启用 AI 生成功能</label>
      <div className="aiFeatureTableV2">
        <div className="aiFeatureHeadV2"><b>功能</b><b>启用</b><b>Provider</b><b>Model</b><b>API Path</b></div>
        {(ai.features||[]).map((f,i)=><div className="aiFeatureRowV2" key={f.featureKey}>
          <span>{f.featureName}</span>
          <input type="checkbox" checked={!!f.enabled} onChange={e=>updateFeature(i,'enabled',e.target.checked)}/>
          <input readOnly value={f.provider||''}/>
          <ModelSelect value={modelOptionValue(findModelOption(f.provider,f.modelName))} onChange={v=>updateFeatureModelSelection(setAi,i,v)}/>
          <input placeholder="如 /v1/images/edits" value={f.apiPath||''} onChange={e=>updateFeature(i,'apiPath',e.target.value)}/>
        </div>)}
      </div>
    </div>:<div className="empty">AI 配置加载中...</div>}

    <h2>变更公告</h2>
    <div className="grid2"><input value={ann.announcementTitle} onChange={e=>setAnn({...ann,announcementTitle:e.target.value})}/><select value={ann.audience} onChange={e=>setAnn({...ann,audience:e.target.value})}>{Object.entries(audName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
    <textarea value={ann.announcementContent} onChange={e=>setAnn({...ann,announcementContent:e.target.value})}/>
    <button className="submit" onClick={save}>保存配置</button>
  </section>
}


function AdminLogs({setMsg}){
  const ops=featureName;
  const {query,setQuery,data}=usePaged('/api/admin/task-images',{keyword:'',operation:'',startDate:'',endDate:'',pageSize:12});
  const [selected,setSelected]=useState([]);
  const [detail,setDetail]=useState(null);
  const [loadingDetail,setLoadingDetail]=useState(false);
  function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
  function batchDownload(){
    const ids=(selected.length?selected:(data.items||[]).map(x=>x.id)).filter(Boolean);
    if(!ids.length)return setMsg('暂无可下载的图片');
    window.open(`${API}/api/admin/task-images/batch-download?ids=${encodeURIComponent(ids.join(','))}&token=${token()}`,'_blank');
  }
  async function openDetail(id){
    try{setLoadingDetail(true);const d=await req('/api/images/'+id+'/detail-rich');setDetail(d)}catch(e){setMsg(e.message)}finally{setLoadingDetail(false)}
  }
  const items=data.items||[];
  return <div className="adminLogPage adminLogV5">
    <section className="adminLogIntro">
      <p>查看所有图片生成任务，可按商家、用户、任务编号、功能筛选，并进入详情查看原图、生成图和任务信息。</p>
      <button className="primary" onClick={batchDownload}><Download size={17}/>批量下载ZIP</button>
    </section>
    <section className="panel aiTaskPanel">
      <div className="toolbar">
        <div className="filterGroup">
          <input placeholder="搜索商家 / 用户 / 任务ID" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/>
          <select value={query.operation} onChange={e=>setQuery({...query,operation:e.target.value,page:1})}><option value="">全部功能</option>{Object.entries(ops).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          <input type="date" value={query.startDate} onChange={e=>setQuery({...query,startDate:e.target.value,page:1})}/>
          <input type="date" value={query.endDate} onChange={e=>setQuery({...query,endDate:e.target.value,page:1})}/>
          <button className="primary" onClick={()=>setQuery(q=>({...q,page:1}))}><Search size={16}/>查询</button>
        </div>
      </div>
      <div className="aiTaskGrid">
        {items.length?items.map(it=><article key={it.id} className={'taskCard '+(selected.includes(it.id)?'checked':'')}>
          <label className="selectDot"><input type="checkbox" checked={selected.includes(it.id)} onChange={()=>toggle(it.id)}/><span></span></label>
          <div className="taskImg" onClick={()=>openDetail(it.id)}><img src={API+it.url}/><b>{ops[it.kind]||it.kind}</b></div>
          <div className="taskMeta">
            <strong>{it.companyName||'未绑定商家'}</strong>
            <span>{it.userName||it.phone||it.username||'-'} · {fmt(it.createdAt)}</span>
            <small>ID：{it.id}</small>
          </div>
          <div className="taskActions"><button onClick={()=>openDetail(it.id)}><Eye size={16}/>查看详情</button><button onClick={()=>window.open(`${API}/api/images/${it.id}/download?token=${token()}`,'_blank')}><Download size={16}/>下载</button></div>
        </article>):<div className="empty big">暂无AI生成任务</div>}
      </div>
      <Pagination data={data} setQuery={setQuery}/>
    </section>
    {loadingDetail&&<div className="modalMask"><div className="empty big">加载中...</div></div>}
    {detail&&<TaskDetailModal detail={detail} onClose={()=>setDetail(null)} isAdmin={true} ops={ops} setMsg={setMsg} taskList={items} onSwitchTask={(item)=>openDetail(item.id)}/>}
  </div>
}

function Feedbacks({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/feedbacks',{status:'',keyword:''});async function handle(id,status){const reply=prompt('处理说明/回复内容')||'';try{await req('/api/admin/feedbacks/'+id,{method:'PATCH',body:JSON.stringify({status,reply})});setMsg('反馈已处理');load()}catch(e){setMsg(e.message)}}return <section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={()=>window.open(API+'/api/export/admin/feedbacks?token='+token())}><input placeholder="标题/内容/用户/商家" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="PENDING">待处理</option><option value="PROCESSING">处理中</option><option value="RESOLVED">已解决</option><option value="REJECTED">已驳回</option></select></Toolbar><Table cols={['商家','用户','联系方式','标题','内容','状态','回复','提交时间','操作']}>{data.items.map(f=><tr key={f.id}><td>{f.companyName||'-'}</td><td>{f.userName||f.userPhone||'-'}</td><td>{f.contact||'-'}</td><td>{f.title}</td><td>{f.content}</td><td><Badge v={f.status}/></td><td>{f.reply||'-'}</td><td>{fmt(f.created_at)}</td><td><button onClick={()=>handle(f.id,'PROCESSING')}>处理中</button><button className="primary" onClick={()=>handle(f.id,'RESOLVED')}>解决</button><button className="danger" onClick={()=>handle(f.id,'REJECTED')}>驳回</button></td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section>}
function Announcements({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/announcements',{audience:'',keyword:''});const[f,setF]=useState({title:'',content:'',audience:'ALL',validDays:30});async function create(){try{await req('/api/admin/announcements',{method:'POST',body:JSON.stringify(f)});setMsg('公告已发布');setF({title:'',content:'',audience:'ALL',validDays:30});load()}catch(e){setMsg(e.message)}}return <div className="stack"><section className="panel"><h2><Bell/>发布公告</h2><div className="grid2"><input placeholder="公告标题" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><select value={f.audience} onChange={e=>setF({...f,audience:e.target.value})}>{Object.entries(audName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input type="number" value={f.validDays} onChange={e=>setF({...f,validDays:e.target.value})} placeholder="有效天数"/></div><textarea placeholder="公告内容" value={f.content} onChange={e=>setF({...f,content:e.target.value})}/><button className="primary" onClick={create}>发布公告</button></section><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))}><input placeholder="标题/内容" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.audience} onChange={e=>setQuery({...query,audience:e.target.value})}><option value="">全部对象</option>{Object.entries(audName).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Toolbar><Table cols={['标题','对象','内容','发布时间']}>{data.items.map(a=><tr key={a.id}><td>{a.title}</td><td>{audName[a.audience]||a.audience}</td><td>{a.content}</td><td>{fmt(a.created_at)}</td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section></div>}
function RedeemCodes({setMsg}){const{query,setQuery,data,load}=usePaged('/api/admin/redeem-codes',{status:'',keyword:''});const[f,setF]=useState({count:10,quota:50,maxUses:1,targetScope:'ALL',validDays:30});const[codes,setCodes]=useState([]);async function create(){try{const d=await req('/api/admin/redeem-codes/batch',{method:'POST',body:JSON.stringify(f)});setMsg(d.message);setCodes(d.codes||[]);load()}catch(e){setMsg(e.message)}}return <div className="stack"><section className="panel"><h2><Ticket/>批量创建兑换码</h2><div className="grid2"><label>数量<input type="number" value={f.count} onChange={e=>setF({...f,count:e.target.value})}/></label><label>每个额度<input type="number" value={f.quota} onChange={e=>setF({...f,quota:e.target.value})}/></label><label>可兑换次数<input type="number" value={f.maxUses} onChange={e=>setF({...f,maxUses:e.target.value})}/></label><label>有效天数<input type="number" value={f.validDays} onChange={e=>setF({...f,validDays:e.target.value})}/></label><label>使用对象<select value={f.targetScope} onChange={e=>setF({...f,targetScope:e.target.value})}><option value="ALL">全部</option><option value="MERCHANT_OWNER">门店管理员</option><option value="MERCHANT_USER">门店人员</option><option value="TRIAL">体验账户</option></select></label></div><button className="primary" onClick={create}>创建兑换码</button>{codes.length>0&&<textarea readOnly value={codes.join('\n')}/>}</section><section className="panel"><Toolbar onSearch={()=>setQuery(q=>({...q,page:1}))} onExport={()=>window.open(API+'/api/export/admin/redeem-codes?token='+token())}><input placeholder="兑换码" value={query.keyword} onChange={e=>setQuery({...query,keyword:e.target.value})}/><select value={query.status} onChange={e=>setQuery({...query,status:e.target.value})}><option value="">全部状态</option><option value="ACTIVE">启用</option><option value="DISABLED">禁用</option><option value="EXPIRED">过期</option></select></Toolbar><Table cols={['兑换码','额度','次数','对象','状态','有效期','创建时间']}>{data.items.map(c=><tr key={c.id}><td>{c.code}</td><td>{c.quota}</td><td>{c.used_count}/{c.max_uses}</td><td>{c.target_scope}</td><td><Badge v={c.status}/></td><td>{fmt(c.valid_until)}</td><td>{fmt(c.created_at)}</td></tr>)}</Table><Pagination data={data} setQuery={setQuery}/></section></div>}



export{Dashboard,Applications,Merchants,AiConfig,Resources,SettingsPage,AdminLogs,Feedbacks,Announcements,RedeemCodes};
