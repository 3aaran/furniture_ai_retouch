// 登录与商家入驻页：保留账号密码登录，同时支持手机号验证码登录和入驻前手机号校验。
import React,{useEffect,useState}from'react';
import{ArrowRight,Building2,LockKeyhole,Phone,UserRound}from'lucide-react';
import{req}from'../../appShared.jsx';
import BrandMark from'../../components/BrandMark.jsx';
import{APP_NAME,LOGIN_SUBTITLE}from'../../config/appConfig.js';

const PHONE_RE=/^1[3-9]\d{9}$/;

export default function Login(){
  const[mode,setMode]=useState('login');
  const[loginType,setLoginType]=useState('password');
  const[f,setF]=useState({identifier:'',password:'',loginCode:'',companyName:'',contactName:'',phone:'',applyCode:'',inviteCode:'',note:''});
  const[msg,setMsg]=useState('');
  const[countdown,setCountdown]=useState({login:0,apply:0});
  const[loading,setLoading]=useState(false);

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
  useEffect(()=>{
    if(!countdown.login&&!countdown.apply) return undefined;
    const timer=setInterval(()=>{
      setCountdown(prev=>({login:Math.max(0,prev.login-1),apply:Math.max(0,prev.apply-1)}));
    },1000);
    return ()=>clearInterval(timer);
  },[countdown.login,countdown.apply]);

  function setField(key,value){
    setF(prev=>({...prev,[key]:value}));
  }

  async function sendCode(kind){
    const isApply=kind==='apply';
    const phone=String(isApply?f.phone:f.identifier).trim();
    if(!PHONE_RE.test(phone)){
      setMsg('请输入正确手机号');
      return;
    }
    if(countdown[kind]>0) return;
    try{
      setMsg('');
      await req('/api/sms/send-code',{method:'POST',body:JSON.stringify({phone,scene:isApply?'APPLICATION':'LOGIN'})});
      setCountdown(prev=>({...prev,[kind]:60}));
      setMsg('验证码已发送');
    }catch(e){
      setMsg(e.message||'短信发送失败');
    }
  }

  async function login(){
    try{
      setLoading(true);
      setMsg('');
      const isSms=loginType==='sms';
      const d=isSms
        ? await req('/api/auth/code-login',{method:'POST',body:JSON.stringify({phone:f.identifier,code:f.loginCode})})
        : await req('/api/auth/login',{method:'POST',body:JSON.stringify({identifier:f.identifier,password:f.password})});
      localStorage.setItem('token',d.token);
      location.reload();
    }catch(e){
      setMsg(e.message);
    }finally{
      setLoading(false);
    }
  }

  async function apply(){
    try{
      setLoading(true);
      setMsg('');
      if(!PHONE_RE.test(String(f.phone).trim())) throw new Error('请输入正确手机号');
      if(!/^\d{6}$/.test(String(f.applyCode).trim())) throw new Error('请输入 6 位短信验证码');
      const verified=await req('/api/sms/verify-code',{method:'POST',body:JSON.stringify({phone:f.phone,code:f.applyCode,scene:'APPLICATION'})});
      await req('/api/applications',{method:'POST',body:JSON.stringify({...f,smsToken:verified.smsToken})});
      setMsg('申请已提交，请等待管理员审核');
      setMode('login');
      setLoginType('password');
    }catch(e){
      setMsg(e.message);
    }finally{
      setLoading(false);
    }
  }

  return <div className="authPage authPageV2">
    <div className="authAmbient authAmbientOne"/>
    <div className="authAmbient authAmbientTwo"/>
    <section className="authIntroV2">
      <div className="authBrandV2">
        <BrandMark className="authLogoV2"/>
        <div><b>{APP_NAME}</b><small>{LOGIN_SUBTITLE}</small></div>
      </div>
      <div className="authTitleV2">
        <h1>{APP_NAME}</h1>
      </div>
      <div className="authStatsV2"/>
    </section>

    <div className="authCard authCardV2">
      {mode==='login'?<>
        <div className="authCardHeadV2">
          <span><UserRound size={18}/>欢迎回来</span>
          <h2>登录账号</h2>
        </div>
        <div className="tabs authTabsV2">
          <button type="button" className={loginType==='password'?'on':''} onClick={()=>setLoginType('password')}><LockKeyhole size={17}/>账号密码</button>
          <button type="button" className={loginType==='sms'?'on':''} onClick={()=>setLoginType('sms')}><Phone size={17}/>手机验证码</button>
        </div>
        <label className="authFieldV2">{loginType==='sms'?'手机号':'账号 / 手机号'}<input value={f.identifier} onChange={e=>setField('identifier',e.target.value)} placeholder={loginType==='sms'?'请输入手机号':'请输入账号或手机号'}/></label>
        {loginType==='password'
          ? <label className="authFieldV2">密码<input type="password" value={f.password} onChange={e=>setField('password',e.target.value)} placeholder="请输入密码"/></label>
          : <label className="authFieldV2">短信验证码
              <div className="authCodeRowV2">
                <input value={f.loginCode} onChange={e=>setField('loginCode',e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="请输入 6 位验证码"/>
                <button type="button" onClick={()=>sendCode('login')} disabled={countdown.login>0}>{countdown.login>0?`${countdown.login}s`:'发送验证码'}</button>
              </div>
            </label>}
        <button className="submit authSubmitV2" type="button" onClick={login} disabled={loading}>{loading?'处理中...':'登录'}<ArrowRight size={18}/></button>
        <div className="switch authSwitchV2">没有门店？<b onClick={()=>setMode('apply')}>提交商家申请</b></div>
      </>:<>
        <div className="authCardHeadV2">
          <span><Building2 size={18}/>入驻申请</span>
          <h2>提交商家信息</h2>
        </div>
        <div className="grid2 authApplyGridV2">
          <label className="authFieldV2">商家名称<input value={f.companyName} onChange={e=>setField('companyName',e.target.value)}/></label>
          <label className="authFieldV2">联系人<input value={f.contactName} onChange={e=>setField('contactName',e.target.value)}/></label>
          <label className="authFieldV2">联系人手机号<input value={f.phone} onChange={e=>setField('phone',e.target.value.replace(/\D/g,'').slice(0,11))}/></label>
          <label className="authFieldV2">邀请码<input value={f.inviteCode} onChange={e=>setField('inviteCode',e.target.value)}/></label>
        </div>
        <label className="authFieldV2">短信验证码
          <div className="authCodeRowV2">
            <input value={f.applyCode} onChange={e=>setField('applyCode',e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="请输入 6 位验证码"/>
            <button type="button" onClick={()=>sendCode('apply')} disabled={countdown.apply>0}>{countdown.apply>0?`${countdown.apply}s`:'发送验证码'}</button>
          </div>
        </label>
        <label className="authFieldV2">申请说明<textarea value={f.note} onChange={e=>setField('note',e.target.value)}/></label>
        <button className="submit authSubmitV2" type="button" onClick={apply} disabled={loading}>{loading?'处理中...':'提交申请'}<ArrowRight size={18}/></button>
        <div className="switch authSwitchV2"><b onClick={()=>setMode('login')}>返回登录</b></div>
      </>}
      {msg&&<div className="toast inline authMsgV2">{msg}</div>}
    </div>
  </div>;
}
