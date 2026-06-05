import React,{useEffect,useMemo,useState}from'react';
import{Download,X}from'lucide-react';

const manifestUrl=import.meta.env.VITE_APP_RELEASE_MANIFEST||'/downloads/latest.json';

function getClient(){
  if(typeof window==='undefined')return null;
  const params=new URLSearchParams(window.location.search||'');
  const platform=params.get('xg_platform');
  const version=params.get('xg_version');
  if(platform&&version)return{platform,version};

  const ua=window.navigator?.userAgent||'';
  const desktop=ua.match(/XungangDesktop\/([0-9A-Za-z._-]+)/);
  if(desktop)return{platform:'windows',version:desktop[1]};
  const android=ua.match(/XungangAndroid\/([0-9A-Za-z._-]+)/);
  if(android)return{platform:'android',version:android[1]};
  return null;
}

function compareVersion(a,b){
  const left=String(a||'0').split(/[.-]/).map(n=>Number.parseInt(n,10)||0);
  const right=String(b||'0').split(/[.-]/).map(n=>Number.parseInt(n,10)||0);
  const len=Math.max(left.length,right.length);
  for(let i=0;i<len;i+=1){
    const diff=(left[i]||0)-(right[i]||0);
    if(diff!==0)return diff;
  }
  return 0;
}

export default function AppUpdateNotice(){
  const client=useMemo(getClient,[]);
  const[release,setRelease]=useState(null);
  const[hidden,setHidden]=useState(false);

  useEffect(()=>{
    if(!client)return undefined;
    const controller=new AbortController();
    fetch(`${manifestUrl}?t=${Date.now()}`,{cache:'no-store',signal:controller.signal})
      .then(res=>res.ok?res.json():null)
      .then(data=>{
        const next=data?.[client.platform];
        if(!next?.version||!next?.url)return;
        if(compareVersion(next.version,client.version)<=0)return;
        const key=`xg-update-dismissed-${client.platform}-${next.version}`;
        if(window.localStorage?.getItem(key)==='1')return;
        setRelease({...next,platform:client.platform,currentVersion:client.version,dismissKey:key});
      })
      .catch(()=>{});
    return()=>controller.abort();
  },[client]);

  if(!release||hidden)return null;
  const platformName=release.platform==='android'?'Android 安装包':'Windows 安装包';
  return <aside className="appUpdateNotice" role="status" aria-live="polite">
    <button type="button" className="appUpdateClose" aria-label="关闭更新提示" onClick={()=>{
      if(release.dismissKey)window.localStorage?.setItem(release.dismissKey,'1');
      setHidden(true);
    }}><X size={16}/></button>
    <strong>发现新版本</strong>
    <span>{platformName} {release.currentVersion} → {release.version}</span>
    {Array.isArray(release.notes)&&release.notes.length>0?<p>{release.notes[0]}</p>:null}
    <a href={release.url} download><Download size={16}/>下载更新</a>
  </aside>;
}
