import React,{useEffect,useRef,useState}from'react';
import{Camera,HardDrive,LockKeyhole,MessageSquare,ShieldCheck,UserRound,CircleHelp,X}from'lucide-react';
import{avatarViewUrl,req,reqForm,roleName}from'../../appShared.jsx';

export default function Profile({me,setMe,setMsg}){
  const[info,setInfo]=useState({displayName:me.displayName||''});
  const[pwd,setPwd]=useState({oldPassword:'',newPassword:'',confirm:''});
  const[forgotOpen,setForgotOpen]=useState(false);
  const[reset,setReset]=useState({code:'',newPassword:'',confirm:''});
  const[resetCountdown,setResetCountdown]=useState(0);
  const[storage,setStorage]=useState(null);
  const[avatarBusy,setAvatarBusy]=useState(false);
  const fileRef=useRef(null);

  useEffect(()=>{req('/api/storage/me').then(setStorage).catch(()=>{})},[]);
  useEffect(()=>{
    if(resetCountdown<=0) return undefined;
    const timer=setInterval(()=>setResetCountdown(v=>Math.max(0,v-1)),1000);
    return ()=>clearInterval(timer);
  },[resetCountdown]);

  const avatarUrl=avatarViewUrl(me);
  const initials=String(me.displayName||me.phone||me.username||'用').slice(0,1);

  async function saveInfo(){
    try{
      const d=await req('/api/me/profile',{method:'PATCH',body:JSON.stringify(info)});
      setMe(d.user);
      setMsg('已保存');
    }catch(e){setMsg(e.message)}
  }

  async function uploadAvatar(file){
    if(!file)return;
    try{
      setAvatarBusy(true);
      const fd=new FormData();
      fd.append('avatar',file);
      const d=await reqForm('/api/me/avatar',fd);
      setMe(d.user);
      setMsg('头像已更新');
    }catch(e){setMsg(e.message)}
    finally{
      setAvatarBusy(false);
      if(fileRef.current)fileRef.current.value='';
    }
  }

  async function savePwd(){
    if(pwd.newPassword!==pwd.confirm)return setMsg('两次密码不一致');
    try{
      await req('/api/me/password',{method:'PATCH',body:JSON.stringify(pwd)});
      setPwd({oldPassword:'',newPassword:'',confirm:''});
      setMsg('密码已修改');
    }catch(e){setMsg(e.message)}
  }

  async function sendResetCode(){
    if(resetCountdown>0)return;
    try{
      await req('/api/me/password/reset-code',{method:'POST',body:JSON.stringify({})});
      setResetCountdown(60);
      setMsg('验证码已发送');
    }catch(e){setMsg(e.message)}
  }

  async function resetPwdByCode(){
    if(reset.newPassword!==reset.confirm)return setMsg('两次密码不一致');
    try{
      await req('/api/me/password/reset',{method:'PATCH',body:JSON.stringify({code:reset.code,newPassword:reset.newPassword})});
      setReset({code:'',newPassword:'',confirm:''});
      setForgotOpen(false);
      setMsg('密码已修改');
    }catch(e){setMsg(e.message)}
  }

  return <div className="profilePageV3 stitchProfilePage">
    <section className="profileHeroV3 stitchProfileHero">
      <div className="profileAvatarV3">
        {avatarUrl?<img src={avatarUrl} alt="头像" loading="lazy" decoding="async"/>:<span>{initials}</span>}
        <button type="button" disabled={avatarBusy} onClick={()=>fileRef.current?.click()} title="更换头像"><Camera size={18}/></button>
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>uploadAvatar(e.target.files?.[0])}/>
      </div>
      <div className="profileHeroTextV3">
        <span><ShieldCheck size={16}/>{roleName[me.role]}</span>
        <h2>{me.displayName||me.username||me.phone}</h2>
        <p>{me.companyName||'个人中心'}</p>
        <small className="stitchProfileTagline">账户资料、安全设置与存储空间集中管理</small>
      </div>
      <div className="profileHeroMetaV3">
        <div><small>账号</small><b>{me.phone||me.username}</b></div>
        <div><small>状态</small><b>{me.status==='ACTIVE'?'正常':'停用'}</b></div>
      </div>
    </section>

    <section className="profileGridV3">
      <div className="profileCardV3">
        <h3><UserRound size={20}/>基础资料</h3>
        <label><span>显示名称</span><input value={info.displayName} onChange={e=>setInfo({...info,displayName:e.target.value})}/></label>
        <label><span>登录账号</span><input value={me.phone||me.username} disabled/></label>
        <label><span>账号角色</span><input value={roleName[me.role]} disabled/></label>
        <button className="primary" onClick={saveInfo}>保存资料</button>
      </div>

      <div className="profileCardV3">
        <div className="profileCardTitleRowV3">
          <h3><LockKeyhole size={20}/>修改密码</h3>
          <button type="button" className="profileForgotBtnV3" onClick={()=>setForgotOpen(true)}><CircleHelp size={17}/>忘记密码</button>
        </div>
        <label><span>原密码</span><input type="password" value={pwd.oldPassword} onChange={e=>setPwd({...pwd,oldPassword:e.target.value})}/></label>
        <label><span>新密码</span><input type="password" value={pwd.newPassword} onChange={e=>setPwd({...pwd,newPassword:e.target.value})}/></label>
        <label><span>确认新密码</span><input type="password" value={pwd.confirm} onChange={e=>setPwd({...pwd,confirm:e.target.value})}/></label>
        <button className="submit" onClick={savePwd}>修改密码</button>
      </div>
    </section>

    <section className="profileStoragePanelV3">
      <h3><HardDrive size={20}/>图片存储空间</h3>
      {storage?<>
        <div className="storageSummaryV3">
          <div><span>已使用</span><b>{storage.usedText}</b></div>
          <div><span>总上限</span><b>{storage.limitText}</b></div>
          <div><span>剩余</span><b>{storage.remainingText}</b></div>
        </div>
        <div className="storageBarV3"><i style={{width:(storage.percent||0)+'%'}}/></div>
        <p>图片已使用 {storage.percent||0}% 的空间</p>
      </>:<div className="empty">正在读取存储空间...</div>}
    </section>

    {forgotOpen&&<div className="modalMask profileResetMaskV3">
      <div className="modalCard profileResetModalV3">
        <div className="profileResetHeadV3">
          <h3><MessageSquare size={20}/>验证码修改密码</h3>
          <button type="button" onClick={()=>setForgotOpen(false)}><X size={18}/></button>
        </div>
        <p>验证码将发送到当前账号手机号：<b>{me.phone||'未绑定手机号'}</b></p>
        <label><span>短信验证码</span><div className="profileCodeRowV3"><input value={reset.code} onChange={e=>setReset({...reset,code:e.target.value.replace(/\D/g,'').slice(0,6)})} placeholder="请输入 6 位验证码"/><button type="button" onClick={sendResetCode} disabled={resetCountdown>0}>{resetCountdown>0?`${resetCountdown}s`:'发送验证码'}</button></div></label>
        <label><span>新密码</span><input type="password" value={reset.newPassword} onChange={e=>setReset({...reset,newPassword:e.target.value})}/></label>
        <label><span>确认新密码</span><input type="password" value={reset.confirm} onChange={e=>setReset({...reset,confirm:e.target.value})}/></label>
        <div className="profileResetActionsV3">
          <button type="button" onClick={()=>setForgotOpen(false)}>取消</button>
          <button type="button" className="primary" onClick={resetPwdByCode}>确认修改</button>
        </div>
      </div>
    </div>}
  </div>;
}
