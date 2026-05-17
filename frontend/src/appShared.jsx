import React,{useEffect,useState}from'react';
import{ChevronLeft,ChevronRight,Search,Download}from'lucide-react';
import{roleName,audienceName,resourceTypeName,statusName,messageText}from'./config/uiText.js';

const apiBase=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
export const API=apiBase==='/api'?'':apiBase;
export {roleName};
export const audName=audienceName;
export const resTypeName=resourceTypeName;
export const getStatusName=v=>statusName[String(v)]||v;
export function token(){return localStorage.getItem('token')}
export function imageViewUrl(image){
  if(typeof image==='string'){
    if(!image)return '';
    if(image.startsWith('http')||image.startsWith('data:'))return image;
    if(image.startsWith('/'))return API+image;
    return `${API}/api/images/${image}/view?token=${encodeURIComponent(token()||'')}`;
  }
  const id=image?.id||image?.imageId;
  if(id)return `${API}/api/images/${id}/view?token=${encodeURIComponent(token()||'')}`;
  const url=image?.url||image?.imageUrl||'';
  if(!url)return '';
  return String(url).startsWith('http')?url:API+url;
}
export async function req(url,opt={}){
  const r=await fetch(API+url,{...opt,headers:{'Content-Type':'application/json',Authorization:token()?`Bearer ${token()}`:'',...(opt.headers||{})}});
  const t=await r.text();
  let d={};
  try{d=t?JSON.parse(t):{}}catch{d={message:t}}
  if(!r.ok)throw new Error(d.message||messageText.requestFailed);
  return d;
}
export async function reqForm(url,form){
  const r=await fetch(API+url,{method:'POST',headers:{Authorization:token()?`Bearer ${token()}`:''},body:form});
  const t=await r.text();
  let d={};
  try{d=t?JSON.parse(t):{}}catch{d={message:t}}
  if(!r.ok)throw new Error(d.message||messageText.requestFailed);
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
