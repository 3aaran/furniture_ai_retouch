import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{ArrowRight,Building2,LockKeyhole,MessageSquare,Phone,Ticket,UserRound}from'lucide-react';
import{req,roleName}from'../appShared.jsx';
import{APP_NAME,LOGIN_SUBTITLE,LOGO_TEXT}from'../config/appConfig.js';

function Login(){
  const[mode,setMode]=useState('login');
  const[tab,setTab]=useState('pwd');
  const[f,setF]=useState({identifier:'',password:'',code:'',companyName:'',contactName:'',phone:'',inviteCode:'',note:''});
  const[msg,setMsg]=useState('');
  useEffect(()=>{document.title=APP_NAME},[]);

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

function UserFeedback({setMsg}){
  return <section className="panel"><h2><MessageSquare/>问题反馈</h2><button className="primary" onClick={()=>setMsg('请点击顶部导航栏右侧的问题反馈图标')}>打开反馈入口</button></section>;
}

function FeedbackModal({onClose,setMsg}){
  const[f,setF]=useState({title:'',content:'',contact:''});
  async function submit(){
    try{
      await req('/api/feedbacks',{method:'POST',body:JSON.stringify(f)});
      setMsg('问题反馈已提交');
      onClose();
    }catch(e){setMsg(e.message)}
  }
  return createPortal(<div className="feedbackModalMaskV2">
    <div className="feedbackModalCardV2">
      <div className="feedbackModalHeadV2"><div><h2><MessageSquare size={24}/>问题反馈</h2></div><button onClick={onClose}>×</button></div>
      <div className="feedbackModalBodyV2">
        <label><span>反馈标题</span><input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label>
        <label><span>联系方式（可选）</span><input value={f.contact} onChange={e=>setF({...f,contact:e.target.value})}/></label>
        <label className="full"><span>反馈内容</span><textarea value={f.content} onChange={e=>setF({...f,content:e.target.value})}/></label>
      </div>
      <div className="feedbackModalFootV2"><button onClick={onClose}>取消</button><button className="primary" onClick={submit}>提交反馈</button></div>
    </div>
  </div>,document.body);
}

function RedeemModal({onClose,setMsg}){
  const[code,setCode]=useState('');
  async function submit(){
    setMsg('兑换码功能入口已打开：'+(code||'未填写'));
    onClose();
  }
  return <div className="modalMask"><div className="modalCard"><h2><Ticket/>礼品卡 / 兑换码</h2><input placeholder="请输入兑换码" value={code} onChange={e=>setCode(e.target.value)}/><div className="modalActions"><button onClick={onClose}>取消</button><button className="primary" onClick={submit}>确认兑换</button></div></div></div>;
}

function Profile({me,setMe,setMsg}){
  const[info,setInfo]=useState({displayName:me.displayName});
  const[pwd,setPwd]=useState({oldPassword:'',newPassword:'',confirm:''});
  async function saveInfo(){try{const d=await req('/api/me/profile',{method:'PATCH',body:JSON.stringify(info)});setMe(d.user);setMsg('已保存')}catch(e){setMsg(e.message)}}
  async function savePwd(){if(pwd.newPassword!==pwd.confirm)return setMsg('两次密码不一致');try{await req('/api/me/password',{method:'PATCH',body:JSON.stringify(pwd)});setMsg('密码已修改')}catch(e){setMsg(e.message)}}
  return <div className="stack"><section className="panel"><h2>个人资料</h2><div className="grid2"><label>账号<input value={me.phone||me.username} disabled/></label><label>角色<input value={roleName[me.role]} disabled/></label><label>名称<input value={info.displayName} onChange={e=>setInfo({...info,displayName:e.target.value})}/></label></div><button className="primary" onClick={saveInfo}>保存</button></section><section className="panel"><h2>修改密码</h2><div className="grid2"><input type="password" placeholder="原密码" value={pwd.oldPassword} onChange={e=>setPwd({...pwd,oldPassword:e.target.value})}/><input type="password" placeholder="新密码" value={pwd.newPassword} onChange={e=>setPwd({...pwd,newPassword:e.target.value})}/><input type="password" placeholder="确认新密码" value={pwd.confirm} onChange={e=>setPwd({...pwd,confirm:e.target.value})}/></div><button className="submit" onClick={savePwd}>修改密码</button></section></div>;
}

export{Login,UserFeedback,FeedbackModal,RedeemModal,Profile};
