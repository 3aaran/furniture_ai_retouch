// 该文件用于封装个人中心页面，包括头像、基础资料、密码和图片存储空间展示。
import React,{useEffect,useRef,useState}from'react';
import{Camera,HardDrive,LockKeyhole,ShieldCheck,UserRound}from'lucide-react';
import{avatarViewUrl,req,reqForm,roleName}from'../../appShared.jsx';

export default function Profile({me,setMe,setMsg}){
  const[info,setInfo]=useState({displayName:me.displayName||''});
  const[pwd,setPwd]=useState({oldPassword:'',newPassword:'',confirm:''});
  const[storage,setStorage]=useState(null);
  const[avatarBusy,setAvatarBusy]=useState(false);
  const fileRef=useRef(null);
  useEffect(()=>{req('/api/storage/me').then(setStorage).catch(()=>{})},[]);
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
  return <div className="profilePageV3">
    <section className="profileHeroV3">
      <div className="profileAvatarV3">
        {avatarUrl?<img src={avatarUrl} alt="头像"/>:<span>{initials}</span>}
        <button type="button" disabled={avatarBusy} onClick={()=>fileRef.current?.click()} title="更换头像"><Camera size={18}/></button>
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>uploadAvatar(e.target.files?.[0])}/>
      </div>
      <div className="profileHeroTextV3">
        <span><ShieldCheck size={16}/>{roleName[me.role]}</span>
        <h2>{me.displayName||me.username||me.phone}</h2>
        <p>{me.companyName||'个人中心'}</p>
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
        <h3><LockKeyhole size={20}/>修改密码</h3>
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
        <p>图片已使用{storage.percent||0}%的空间</p>
      </>:<div className="empty">正在读取存储空间...</div>}
    </section>
  </div>;
}
