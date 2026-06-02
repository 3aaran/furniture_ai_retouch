import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import './styles/index.css';
import{registerServiceWorker}from'./registerServiceWorker.js';
import AppShell from'./AppShell.jsx';
import LandingPage from'./landing/LandingPage.jsx';
import{Login}from'./account/AccountPages.jsx';
import{token,req}from'./appShared.jsx';

function hashRoute(){
  const raw=String(window.location.hash||'').replace(/^#\/?/,'').split('?')[0].trim();
  return raw||'home';
}

function App(){
  const[me,setMe]=useState(null);
  const[loading,setLoading]=useState(true);
  const[route,setRoute]=useState(hashRoute());

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

  if(route==='home')return <LandingPage me={me}/>;
  if(loading)return <div className="loading">加载中...</div>;
  return me?<AppShell me={me} setMe={setMe}/>:<Login/>;
}

createRoot(document.getElementById('root')).render(<App/>);
registerServiceWorker();
