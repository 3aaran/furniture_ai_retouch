import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import './styles/index.css';
import{registerServiceWorker}from'./registerServiceWorker.js';
import AppShell from'./AppShell.jsx';
import LandingPage from'./landing/LandingPage.jsx';
import AppUpdateNotice from'./components/AppUpdateNotice.jsx';
import{Login}from'./account/AccountPages.jsx';
import{token,req}from'./appShared.jsx';
import{parseWorkflowHash,redirectLegacyWorkflowPath}from'./admin/workflows/workflowRoute.js';

function hashRoute(){
  const raw=String(window.location.hash||'').replace(/^#\/?/,'').split('?')[0].trim();
  return raw||'home';
}

redirectLegacyWorkflowPath();

function App(){
  const[me,setMe]=useState(null);
  const[loading,setLoading]=useState(true);
  const[route,setRoute]=useState(hashRoute());
  const workflowDemoAdmin=import.meta.env.DEV&&parseWorkflowHash(window.location.hash)&&new URLSearchParams(window.location.search).get('workflowDemo')==='1'
    ?{id:'local-demo-admin',username:'admin',displayName:'本地预览管理员',role:'SYSTEM_ADMIN'}
    :null;

  useEffect(()=>{
    token()
      ? req('/api/me').then(setMe).catch(()=>localStorage.removeItem('token')).finally(()=>setLoading(false))
      : setLoading(false);
  },[]);

  useEffect(()=>{
    const onHashChange=()=>setRoute(hashRoute());
    window.addEventListener('hashchange',onHashChange);
    return()=>window.removeEventListener('hashchange',onHashChange);
  },[]);
  if(loading)return <><div className="loading">加载中...</div><AppUpdateNotice/></>;
  if(route==='home')return <><LandingPage me={me}/><AppUpdateNotice/></>;
  return <>{(me||workflowDemoAdmin)?<AppShell me={me||workflowDemoAdmin} setMe={setMe}/>:<Login/>}<AppUpdateNotice/></>;
}

createRoot(document.getElementById('root')).render(<App/>);
registerServiceWorker();
