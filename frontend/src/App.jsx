import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import './styles/index.css';
import AppShell from'./AppShell.jsx';
import{Login}from'./account/AccountPages.jsx';
import{token,req}from'./appShared.jsx';
function App(){const[me,setMe]=useState(null),[loading,setLoading]=useState(true);useEffect(()=>{token()?req('/api/me').then(setMe).catch(()=>localStorage.removeItem('token')).finally(()=>setLoading(false)):setLoading(false)},[]);if(loading)return <div className="loading">加载中...</div>;return me?<AppShell me={me} setMe={setMe}/>:<Login/>}
createRoot(document.getElementById('root')).render(<App/>);
