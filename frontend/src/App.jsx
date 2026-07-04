import React,{Suspense,lazy,useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{getOrCreateAppRoot}from'./appRoot.js';
import './styles/index.css';
import{registerServiceWorker}from'./registerServiceWorker.js';
import{AppUpdateNotice}from'./shared/ui/index.jsx';
import{token,req}from'./appShared.jsx';
import{AUTH_LOGIN_EVENT,AUTH_UNAUTHORIZED_EVENT}from'./authSession.js';
import{parseWorkflowHash,redirectLegacyWorkflowPath}from'./admin/workflows/workflowRoute.js';

const AppShell=lazy(()=>import('./AppShell.jsx'));
const LandingPage=lazy(()=>import('./landing/LandingPage.jsx'));
const Login=lazy(()=>import('./account/pages/Login.jsx'));

function AppFallback(){
  return <div className="loading">加载中...</div>;
}

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
    const showWorkbench=event=>{
      setMe(event.detail);
      setRoute('workbench');
      if(hashRoute()!=='workbench')window.location.hash='/workbench';
    };
    const showLogin=()=>{
      setMe(null);
      setRoute('login');
      if(hashRoute()!=='login')window.location.hash='/login';
    };
    const syncToken=event=>{
      if(event.key==='token'&&!event.newValue)showLogin();
    };
    window.addEventListener(AUTH_LOGIN_EVENT,showWorkbench);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT,showLogin);
    window.addEventListener('storage',syncToken);
    return()=>{
      window.removeEventListener(AUTH_LOGIN_EVENT,showWorkbench);
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT,showLogin);
      window.removeEventListener('storage',syncToken);
    };
  },[]);

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
  if(loading)return <><AppFallback/><AppUpdateNotice/></>;
  if(route==='home')return <><Suspense fallback={<AppFallback/>}><LandingPage me={me}/></Suspense><AppUpdateNotice/></>;
  return <><Suspense fallback={<AppFallback/>}>{(me||workflowDemoAdmin)?<AppShell me={me||workflowDemoAdmin} setMe={setMe}/>:<Login/>}</Suspense><AppUpdateNotice/></>;
}

getOrCreateAppRoot({container:document.getElementById('root'),createRoot}).render(<App/>);
registerServiceWorker();
