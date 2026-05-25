// 该文件用于封装登录与商家入驻申请页面，避免账号模块入口文件继续堆放登录表单逻辑。
import React,{useEffect,useState}from'react';
import{ArrowRight,Building2,LockKeyhole,Phone,UserRound}from'lucide-react';
import{req}from'../../appShared.jsx';
import{APP_NAME,LOGIN_SUBTITLE,LOGO_TEXT}from'../../config/appConfig.js';

export default function Login(){
  const[mode,setMode]=useState('login');
  const[tab,setTab]=useState('pwd');
  const[f,setF]=useState({identifier:'',password:'',code:'',companyName:'',contactName:'',phone:'',inviteCode:'',note:''});
  const[msg,setMsg]=useState('');
  useEffect(()=>{document.title=APP_NAME},[]);
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    const hash=String(location.hash||'');
    const hashParams=new URLSearchParams(hash.includes('?')?hash.slice(hash.indexOf('?')+1):'');
    const code=(params.get('invite')||params.get('ref')||params.get('inviteCode')||hashParams.get('invite')||hashParams.get('ref')||hashParams.get('inviteCode')||'').trim();
    const path=`${location.pathname}${hash}`.toLowerCase();
    if(code||path.includes('/apply')||path.includes('/register')){
      setMode('apply');
      if(code) setF(prev=>({...prev,inviteCode:code}));
    }
  },[]);

  async function login(){
    try{
      const d=tab==='code'
        ? await req('/api/auth/code-login',{method:'POST',body:JSON.stringify({phone:f.identifier,code:f.code})})
        : await req('/api/auth/login',{method:'POST',body:JSON.stringify({identifier:f.identifier,password:f.password})});
      localStorage.setItem('token',d.token);
      location.reload();
    }catch(e){setMsg(e.message)}
  }

  async function send(){
    try{
      const d=await req('/api/auth/send-code',{method:'POST',body:JSON.stringify({phone:f.identifier})});
      setF({...f,code:d.code||''});
      setMsg(d.code?'开发验证码：'+d.code:'验证码已发送');
    }catch(e){setMsg(e.message)}
  }

  async function apply(){
    try{
      await req('/api/applications',{method:'POST',body:JSON.stringify(f)});
      setMsg('申请已提交，请等待平台管理员审核');
      setMode('login');
    }catch(e){setMsg(e.message)}
  }

  return <div className="authPage authPageV2">
    <div className="authAmbient authAmbientOne"/>
    <div className="authAmbient authAmbientTwo"/>
    <section className="authIntroV2">
      <div className="authBrandV2">
        <span className="logo authLogoV2">{LOGO_TEXT}</span>
        <div><b>{APP_NAME}</b><small>{LOGIN_SUBTITLE}</small></div>
      </div>
      <div className="authTitleV2">
        {/* <span>{mode==='login'?'账号登录':'商家入驻'}</span> */}
        <h1>{APP_NAME}</h1>
      </div>
      <div className="authStatsV2">
        {/* <div><b>AI</b><span>家具设计</span></div>
        <div><b>OSS</b><span>资源存储</span></div>
        <div><b>SKU</b><span>图片管理</span></div> */}
      </div>
    </section>

    <div className="authCard authCardV2">
      {mode==='login'?<>
        <div className="authCardHeadV2">
          <span><UserRound size={18}/>欢迎回来</span>
          <h2>登录账号</h2>
        </div>
        <div className="tabs authTabsV2">
          <button type="button" className={tab==='pwd'?'on':''} onClick={()=>setTab('pwd')}><LockKeyhole size={17}/>账号密码</button>
          <button type="button" className={tab==='code'?'on':''} onClick={()=>setTab('code')}><Phone size={17}/>手机验证码</button>
        </div>
        <label className="authFieldV2">账号 / 手机号<input value={f.identifier} onChange={e=>setF({...f,identifier:e.target.value})} placeholder="请输入账号或手机号"/></label>
        {tab==='pwd'
          ? <label className="authFieldV2">密码<input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="请输入密码"/></label>
          : <label className="authFieldV2">验证码<div className="inputBtn authCodeRowV2"><input value={f.code} onChange={e=>setF({...f,code:e.target.value})} placeholder="请输入验证码"/><button type="button" onClick={send}>获取</button></div></label>}
        <button className="submit authSubmitV2" type="button" onClick={login}>登录<ArrowRight size={18}/></button>
        <div className="switch authSwitchV2">没有门店？<b onClick={()=>setMode('apply')}>提交商家申请</b></div>
      </>:<>
        <div className="authCardHeadV2">
          <span><Building2 size={18}/>入驻申请</span>
          <h2>提交商家信息</h2>
        </div>
        <div className="grid2 authApplyGridV2">
          <label className="authFieldV2">商家名称<input value={f.companyName} onChange={e=>setF({...f,companyName:e.target.value})}/></label>
          <label className="authFieldV2">联系人<input value={f.contactName} onChange={e=>setF({...f,contactName:e.target.value})}/></label>
          <label className="authFieldV2">联系人手机号<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label>
          <label className="authFieldV2">邀请码<input value={f.inviteCode} onChange={e=>setF({...f,inviteCode:e.target.value})}/></label>
        </div>
        <label className="authFieldV2">申请说明<textarea value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></label>
        <button className="submit authSubmitV2" type="button" onClick={apply}>提交申请<ArrowRight size={18}/></button>
        <div className="switch authSwitchV2"><b onClick={()=>setMode('login')}>返回登录</b></div>
      </>}
      {msg&&<div className="toast inline authMsgV2">{msg}</div>}
    </div>
  </div>;
}
