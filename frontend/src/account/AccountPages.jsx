import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{MessageSquare,Ticket}from'lucide-react';
import{req,roleName}from'../appShared.jsx';
import{APP_NAME,LOGIN_SUBTITLE,LOGO_TEXT}from'../config/appConfig.js';

function Login(){const[mode,setMode]=useState('login'),[tab,setTab]=useState('pwd'),[f,setF]=useState({identifier:'',password:'',code:'',companyName:'',contactName:'',phone:'',inviteCode:'',note:''}),[msg,setMsg]=useState('');useEffect(()=>{document.title=APP_NAME},[]);async function login(){try{const d=tab==='code'?await req('/api/auth/code-login',{method:'POST',body:JSON.stringify({phone:f.identifier,code:f.code})}):await req('/api/auth/login',{method:'POST',body:JSON.stringify({identifier:f.identifier,password:f.password})});localStorage.setItem('token',d.token);location.reload()}catch(e){setMsg(e.message)}}async function send(){try{const d=await req('/api/auth/send-code',{method:'POST',body:JSON.stringify({phone:f.identifier})});setF({...f,code:d.code||''});setMsg(d.code?'开发验证码：'+d.code:'验证码已发送')}catch(e){setMsg(e.message)}}async function apply(){try{await req('/api/applications',{method:'POST',body:JSON.stringify(f)});setMsg('申请已提交，请等待平台管理员审核');setMode('login')}catch(e){setMsg(e.message)}}return <div className="authPage"><div className="authBrand"><span className="logo">{LOGO_TEXT}</span><div><b>{APP_NAME}</b><small>{LOGIN_SUBTITLE}</small></div></div><div className="authCard">{mode==='login'?<><h1>登录</h1><p>平台管理员账号密码登录；门店管理员可手机号密码/验证码登录；门店人员手机号密码登录；体验账户用系统生成账号密码。</p><div className="tabs"><button className={tab==='pwd'?'on':''} onClick={()=>setTab('pwd')}>账号密码</button><button className={tab==='code'?'on':''} onClick={()=>setTab('code')}>手机号验证码</button></div><label>账号 / 手机号<input value={f.identifier} onChange={e=>setF({...f,identifier:e.target.value})} placeholder="admin / 手机号 / 体验账号"/></label>{tab==='pwd'?<label>密码<input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label>:<label>验证码<div className="inputBtn"><input value={f.code} onChange={e=>setF({...f,code:e.target.value})}/><button onClick={send}>获取</button></div></label>}<button className="submit" onClick={login}>登录</button><p className="switch">没有门店？<b onClick={()=>setMode('apply')}>提交商家申请</b></p></>:<><h1>商家入驻申请</h1><p>商家本身不登录，审核通过后系统会自动创建门店管理员账号。</p><div className="grid2"><label>商家名称<input value={f.companyName} onChange={e=>setF({...f,companyName:e.target.value})}/></label><label>联系人<input value={f.contactName} onChange={e=>setF({...f,contactName:e.target.value})}/></label><label>联系人手机号<input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label><label>邀请码（可选）<input value={f.inviteCode} onChange={e=>setF({...f,inviteCode:e.target.value})}/></label></div><label>申请说明<textarea value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></label><button className="submit" onClick={apply}>提交申请</button><p className="switch"><b onClick={()=>setMode('login')}>返回登录</b></p></>}{msg&&<div className="toast inline">{msg}</div>}</div></div>}

function UserFeedback({setMsg}){return <section className="panel"><h2><MessageSquare/>问题反馈</h2><p className="hint">问题反馈已经改为顶部导航栏弹窗入口，不再作为单独页面展示。</p><button className="primary" onClick={()=>setMsg('请点击顶部导航栏右侧的问题反馈图标')}>打开反馈入口</button></section>}
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
      <div className="feedbackModalHeadV2">
        <div><h2><MessageSquare size={24}/>问题反馈</h2><p>请描述你遇到的问题、建议或异常情况，平台管理员会在后台处理。</p></div>
        <button onClick={onClose}>×</button>
      </div>
      <div className="feedbackModalBodyV2">
        <label><span>反馈标题</span><input placeholder="例如：生成图片失败、页面按钮无反应" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label>
        <label><span>联系方式（可选）</span><input placeholder="手机号 / 微信 / 邮箱，可不填" value={f.contact} onChange={e=>setF({...f,contact:e.target.value})}/></label>
        <label className="full"><span>反馈内容</span><textarea placeholder="请尽量说明操作步骤、出现时间、问题现象..." value={f.content} onChange={e=>setF({...f,content:e.target.value})}/></label>
      </div>
      <div className="feedbackModalFootV2">
        <button onClick={onClose}>取消</button>
        <button className="primary" onClick={submit}>提交反馈</button>
      </div>
    </div>
  </div>,document.body)
}
function RedeemModal({onClose,setMsg}){const[code,setCode]=useState('');async function submit(){setMsg('兑换码功能入口已打开，后续会对接兑换校验接口：'+(code||'未填写'));onClose()}return <div className="modalMask"><div className="modalCard"><h2><Ticket/>礼品卡/兑换码兑换</h2><p className="hint">请输入平台发放的兑换码，系统会校验对象、次数和有效期后发放额度。</p><input placeholder="请输入兑换码" value={code} onChange={e=>setCode(e.target.value)}/><div className="modalActions"><button onClick={onClose}>取消</button><button className="primary" onClick={submit}>确认兑换</button></div></div></div>}

function Profile({me,setMe,setMsg}){const[info,setInfo]=useState({displayName:me.displayName}),[pwd,setPwd]=useState({oldPassword:'',newPassword:'',confirm:''});async function saveInfo(){try{const d=await req('/api/me/profile',{method:'PATCH',body:JSON.stringify(info)});setMe(d.user);setMsg('已保存')}catch(e){setMsg(e.message)}}async function savePwd(){if(pwd.newPassword!==pwd.confirm)return setMsg('两次密码不一致');try{await req('/api/me/password',{method:'PATCH',body:JSON.stringify(pwd)});setMsg('密码已修改')}catch(e){setMsg(e.message)}}return <div className="stack"><section className="panel"><h2>个人资料</h2><div className="grid2"><label>账号<input value={me.phone||me.username} disabled/></label><label>角色<input value={roleName[me.role]} disabled/></label><label>名称<input value={info.displayName} onChange={e=>setInfo({...info,displayName:e.target.value})}/></label></div><button className="primary" onClick={saveInfo}>保存</button></section><section className="panel"><h2>修改密码</h2><div className="grid2"><input type="password" placeholder="原密码" value={pwd.oldPassword} onChange={e=>setPwd({...pwd,oldPassword:e.target.value})}/><input type="password" placeholder="新密码" value={pwd.newPassword} onChange={e=>setPwd({...pwd,newPassword:e.target.value})}/><input type="password" placeholder="确认新密码" value={pwd.confirm} onChange={e=>setPwd({...pwd,confirm:e.target.value})}/></div><button className="submit" onClick={savePwd}>修改密码</button></section></div>}


export{Login,UserFeedback,FeedbackModal,RedeemModal,Profile};
