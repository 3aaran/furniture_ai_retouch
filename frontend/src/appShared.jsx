import React,{useEffect,useState}from'react';
import{ChevronLeft,ChevronRight,Search,Download}from'lucide-react';
import{roleName,audienceName,resourceTypeName,statusName,messageText,getDisplayStatusName}from'./config/uiText.js';

const apiBase=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
export const API=apiBase==='/api'?'':apiBase;
export const ASSET_BASE=API.replace(/\/api$/i,'');
export {roleName};
export const audName=audienceName;
export const resTypeName=resourceTypeName;
export const getStatusName=v=>statusName[String(v)]||getDisplayStatusName(v);
export function token(){return localStorage.getItem('token')}
export function recordClientFailure(source,detail){
  try{
    const key='clientFailureLogs';
    const list=JSON.parse(localStorage.getItem(key)||'[]');
    list.unshift({
      time:new Date().toISOString(),
      source:String(source||'client'),
      detail:String(detail||'').slice(0,3000)
    });
    localStorage.setItem(key,JSON.stringify(list.slice(0,50)));
  }catch{}
}
export function userFriendlyMessage(message,fallback='操作失败请稍后重试'){
  const text=String(message?.message||message||'').trim();
  if(!text)return fallback;
  const isPlainChinese=/^[\u4e00-\u9fa5，。！？、：；（）《》“”0-9A-Za-z\s_-]{1,80}$/.test(text);
  if(isPlainChinese&&!/[{}[\]\\]|https?:\/\/|base64|data:|JSON|Payload|Error|failed|unsupported/i.test(text)){
    return text;
  }
  if(/timeout|timed\s*out|超时|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|network|fetch failed|socket|网络/i.test(text)){
    return '生成图片失败：网络较差';
  }
  if(/base64|data:|公网|public.*url|public_base_url|download|图片地址|URL|无法访问|access|reachable|fetch.*image|读取图片|image.*url/i.test(text)){
    return '生成图片失败：图片地址无法访问';
  }
  if(/format|mime|类型|格式|unsupported|不支持|JPG|JPEG|PNG|WEBP|webp/i.test(text)){
    return '生成图片失败：图片格式不支持';
  }
  if(/api[_ -]?key|apikey|secret|密钥|未配置|配置|unauthorized|401|403|鉴权|权限|quota.*provider/i.test(text)){
    return '生成图片失败：模型服务配置异常';
  }
  if(/quota|insufficient|not enough/i.test(text)||(/余额|算力|额度/i.test(text)&&/生成|AI|模型|任务|调用/i.test(text))){
    return '生成图片失败：算力余额不足';
  }
  if(/content|policy|safety|违规|敏感|审核|blocked|reject/i.test(text)){
    return '生成图片失败：图片内容未通过审核';
  }
  if(/storage|空间|磁盘|保存|write|存储/i.test(text)){
    return '生成图片失败：存储空间不足';
  }
  if(/rate.?limit|too many|频率|限流|429/i.test(text)){
    return '生成图片失败：请求过于频繁';
  }
  if(/任务不存在|图片不存在|原图不存在|无权/.test(text)){
    return text;
  }
  const rawLike=/[{}[\]\\]|base64|data:|https?:\/\/|task[_ ]?id|GPT\s*Image|JSON|Payload|Error|failed|unsupported|接口请求失败|命中字段|不支持.*格式/i.test(text);
  if(rawLike){
    if(/生成|AI|GPT|模型|接口|base64|image/i.test(text))return '生成图片失败：模型服务异常';
    if(/upload|file|图片|image/i.test(text))return '图片处理失败：请重新上传';
    return fallback;
  }
  return text.length>48?`${text.slice(0,48)}…`:text;
}
export function imageViewUrl(image){
  if(typeof image==='string'){
    if(!image)return '';
    if(image.startsWith('http')||image.startsWith('data:'))return image;
    if(image.startsWith('/'))return assetUrl(image);
    return `${API}/api/images/${image}/view?token=${encodeURIComponent(token()||'')}`;
  }
  const id=image?.resultImage?.id||image?.imageId||image?.sourceId||(image?.itemType==='task'?image?.originImage?.id:image?.id);
  if(id)return `${API}/api/images/${id}/view?token=${encodeURIComponent(token()||'')}`;
  const url=image?.url||image?.imageUrl||'';
  if(!url)return '';
  return assetUrl(url);
}
export function assetUrl(url){
  if(!url)return '';
  const text=String(url);
  if(text.startsWith('http')||text.startsWith('data:')||text.startsWith('blob:'))return text;
  if(/^\/(files|uploads|outputs)\//.test(text))return `${API}/api${text}`;
  if(text.startsWith('/'))return ASSET_BASE+text;
  return `${ASSET_BASE}/${text.replace(/^\/+/,'')}`;
}
export function avatarViewUrl(user){
  const raw=user?.avatarUrl||'';
  if(!raw)return '';
  const version=String(raw).match(/[?&]v=([^&]+)/)?.[1]||'';
  if(user?.id){
    const qs=new URLSearchParams();
    const tk=token();
    if(tk)qs.set('token',tk);
    if(version)qs.set('v',version);
    const suffix=qs.toString()?`?${qs.toString()}`:'';
    return `${API}/api/users/${encodeURIComponent(user.id)}/avatar${suffix}`;
  }
  return assetUrl(raw);
}
export async function req(url,opt={}){
  const r=await fetch(API+url,{...opt,headers:{'Content-Type':'application/json',Authorization:token()?`Bearer ${token()}`:'',...(opt.headers||{})}});
  const t=await r.text();
  let d={};
  try{d=t?JSON.parse(t):{}}catch{d={message:t}}
  if(!r.ok){
    const raw=d.message||messageText.requestFailed;
    const err=new Error(userFriendlyMessage(raw,messageText.requestFailed));
    err.rawMessage=raw;
    recordClientFailure(url,raw);
    throw err;
  }
  return d;
}
export async function reqForm(url,form){
  const r=await fetch(API+url,{method:'POST',headers:{Authorization:token()?`Bearer ${token()}`:''},body:form});
  const t=await r.text();
  let d={};
  try{d=t?JSON.parse(t):{}}catch{d={message:t}}
  if(!r.ok){
    const raw=d.message||messageText.requestFailed;
    const err=new Error(userFriendlyMessage(raw,messageText.requestFailed));
    err.rawMessage=raw;
    recordClientFailure(url,raw);
    throw err;
  }
  return d;
}
export function qs(o){
  const s=Object.entries(o).filter(([,v])=>v!==''&&v!==undefined&&v!==null).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  return s?'?'+s:'';
}
export function fmt(t){return t?new Date(t).toLocaleString():'-'}
export function Badge({v}){return <span className={'badge '+String(v).toLowerCase()}>{getStatusName(v)}</span>}
export function usePaged(url,init={}){
  const[query,setQuery]=useState({page:1,pageSize:10,...init});
  const[data,setData]=useState({items:[],page:1,pageSize:10,total:0});
  const[loading,setLoading]=useState(false);
  const load=()=>{setLoading(true);req(url+qs(query)).then(setData).finally(()=>setLoading(false))};
  useEffect(load,[url,JSON.stringify(query)]);
  return{query,setQuery,data,loading,load};
}
export function Pagination({data,setQuery}){
  const pages=Math.max(1,Math.ceil((data.total||0)/(data.pageSize||10)));
  return <div className="pager">
    <span>共 {data.total||0} 条，第 {data.page}/{pages} 页</span>
    <button disabled={data.page<=1} onClick={()=>setQuery(q=>({...q,page:q.page-1}))}><ChevronLeft size={16}/>上一页</button>
    <button disabled={data.page>=pages} onClick={()=>setQuery(q=>({...q,page:q.page+1}))}>下一页<ChevronRight size={16}/></button>
    <select value={data.pageSize} onChange={e=>setQuery(q=>({...q,page:1,pageSize:Number(e.target.value)}))}><option>10</option><option>20</option><option>50</option></select>
  </div>;
}
export function Table({cols,children}){
  return <div className="tableWrap"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{React.Children.count(children)?children:<tr><td colSpan={cols.length}><div className="empty">暂无数据</div></td></tr>}</tbody></table></div>;
}
export function Toolbar({children,onSearch,onExport}){
  return <div className="toolbar"><div className="filterGroup">{children}<button className="primary" onClick={onSearch}><Search size={16}/>查询</button></div>{onExport&&<button onClick={onExport}><Download size={16}/>导出</button>}</div>;
}
