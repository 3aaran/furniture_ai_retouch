import React,{useEffect,useMemo,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{AlertCircle,CheckCircle2,LogOut,MessageSquare,Ticket,WalletCards,ShieldCheck,X}from'lucide-react';
import{adminNav,adminNavGroups,Dashboard,Applications,Merchants,AiConfig,SettingsPage,AdminLogs,Feedbacks,Announcements,RedeemCodes}from'./admin/AdminPages.jsx';
import{storeAdminNav,staffNav,Workbench,StoreResources,StoreUsers,StoreTasks,Promotion,QuotaLogs}from'./store/StorePages.jsx';
import{UserFeedback,FeedbackModal,RedeemModal,Profile}from'./account/AccountPages.jsx';
import{TaskDetailModal}from'./components/TaskDetailModal.jsx';
import{avatarViewUrl,roleName,userFriendlyMessage,recordClientFailure}from'./appShared.jsx';
import{APP_NAME,APP_SUBTITLE,LOGO_TEXT}from'./config/appConfig.js';

function roleNav(role){
  if(role==='SYSTEM_ADMIN')return adminNav;
  if(role==='MERCHANT_OWNER'||role==='MERCHANT_ADMIN')return storeAdminNav;
  return staffNav;
}

function Shell({me,setMe}){
  const nav=roleNav(me.role);
  const isAdmin=me.role==='SYSTEM_ADMIN';
  const pageKeys=useMemo(()=>{
    const keys=new Set(nav.map(([k])=>k));
    ['profile','quota','redeem','feedbacks'].forEach(k=>keys.add(k));
    return keys;
  },[nav]);
  function pageFromHash(){
    const raw=String(window.location.hash||'').replace(/^#\/?/,'').trim();
    return pageKeys.has(raw)?raw:'';
  }
  const initial=pageFromHash()||(isAdmin?'dashboard':'workbench');
  const[page,setPage]=useState(initial);
  const[msg,setMsg]=useState('');
  const[menu,setMenu]=useState(false);
  const menuTimer=useRef(null);
  const[redeemOpen,setRedeemOpen]=useState(false);
  const[feedbackOpen,setFeedbackOpen]=useState(false);
  const[navDrop,setNavDrop]=useState(null);

  useEffect(()=>{document.title=APP_NAME},[]);

  const rawToastText=typeof msg==='object'?(msg.text||msg.message||''):String(msg||'');
  const toastText=userFriendlyMessage(rawToastText,rawToastText||'操作失败请稍后重试');
  const toastKind=typeof msg==='object'
    ? (msg.kind||msg.type||'success')
    : (/失败|错误|报错|不能|未配置|Payload|Error|failed|too large/i.test(rawToastText)?'error':'success');

  const map={
    dashboard:Dashboard,
    applications:Applications,
    merchants:Merchants,
    aiConfig:AiConfig,
    resources:StoreResources,
    settings:SettingsPage,
    logs:AdminLogs,
    feedbacks:isAdmin?Feedbacks:UserFeedback,
    announcements:Announcements,
    redeem:RedeemCodes,
    workbench:Workbench,
    images:StoreTasks,
    users:StoreUsers,
    promotion:Promotion,
    quota:QuotaLogs,
    profile:Profile
  };
  const Comp=map[page]||Dashboard;

  function logout(){
    localStorage.removeItem('token');
    location.reload();
  }
  function go(k){
    const next=pageKeys.has(k)?k:(isAdmin?'dashboard':'workbench');
    setPage(next);
    setMenu(false);
    setNavDrop(null);
    if(window.location.hash!==`#/${next}`)window.history.replaceState(null,'',`#/${next}`);
  }
  function openProfileMenu(){
    if(menuTimer.current)clearTimeout(menuTimer.current);
    menuTimer.current=null;
    setMenu(true);
  }
  function closeProfileMenuSoon(){
    if(menuTimer.current)clearTimeout(menuTimer.current);
    menuTimer.current=setTimeout(()=>setMenu(false),260);
  }
  function adminGroupActive(g){return g.items.some(([k])=>k===page)}
  const avatarUrl=avatarViewUrl(me);

  useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(''),2600);return()=>clearTimeout(t)},[msg]);
  useEffect(()=>{if(rawToastText&&rawToastText!==toastText)recordClientFailure('toast',rawToastText)},[rawToastText,toastText]);
  useEffect(()=>()=>menuTimer.current&&clearTimeout(menuTimer.current),[]);
  useEffect(()=>{if(window.location.hash!==`#/${page}`)window.history.replaceState(null,'',`#/${page}`)},[]);
  useEffect(()=>{
    const onHashChange=()=>{
      const next=pageFromHash();
      if(next&&next!==page){
        setPage(next);
        setMenu(false);
        setNavDrop(null);
      }
    };
    window.addEventListener('hashchange',onHashChange);
    return()=>window.removeEventListener('hashchange',onHashChange);
  },[page,pageKeys]);

  const fallbackTitle={profile:'个人中心',quota:'额度明细',redeem:'兑换码创建',feedbacks:'问题反馈'};

  return <div className="topApp" onClick={()=>setNavDrop(null)}>
    <header className="topbar">
      <div className="topBrand">
        <span className="logo">{LOGO_TEXT}</span>
        <div><b>{APP_NAME}</b><small>{APP_SUBTITLE}</small></div>
      </div>

      <nav className="topNav" onClick={e=>e.stopPropagation()}>
        {isAdmin?adminNavGroups.map(g=>
          <div className="navGroup" key={g.key}>
            <button className={adminGroupActive(g)?'active':''} onClick={()=>setNavDrop(navDrop===g.key?null:g.key)}>
              {g.title}<span className="navArrow">▾</span>
            </button>
            {navDrop===g.key&&<div className="navDropdown">
              {g.items.map(([k,t,I])=><button key={k} className={page===k?'active itemActive':''} onClick={()=>go(k)}><I size={17}/>{t}</button>)}
            </div>}
          </div>
        ):nav.map(([k,t,I])=><button key={k} className={page===k?'active':''} onClick={()=>go(k)}><I size={17}/>{t}</button>)}

        {!isAdmin&&<button className="iconNav" title="问题反馈" onClick={()=>setFeedbackOpen(true)}><MessageSquare size={20}/><span>问题反馈</span></button>}
      </nav>

      <div className="topRight" onMouseEnter={openProfileMenu} onMouseLeave={closeProfileMenuSoon}>
        <button className="quotaPill" onClick={()=>go('quota')}><WalletCards size={17}/>{isAdmin?'额度明细':`${me.quota} 算力`}</button>
        <button className="avatarBtn" type="button"><span>{avatarUrl?<img src={avatarUrl} alt="头像"/>:(me.displayName||me.phone||me.username||'用').slice(0,1)}</span><div><b>{me.displayName}</b><small>{roleName[me.role]}</small></div></button>
        {menu&&<div className="profileMenu">
          <button onClick={()=>go('profile')}><ShieldCheck size={18}/>个人中心</button>
          <button onClick={()=>go('quota')}><WalletCards size={18}/>额度明细</button>
          {isAdmin?<button onClick={()=>go('redeem')}><Ticket size={18}/>兑换码创建</button>:<button onClick={()=>{setRedeemOpen(true);setMenu(false)}}><Ticket size={18}/>礼品卡兑换</button>}
          <i/>
          <button className="logout" onClick={logout}><LogOut size={18}/>退出登录</button>
        </div>}
      </div>
    </header>

    <main className="topMain">
      {!(page==='workbench'&&!isAdmin)&&<div className="pageHead"><h1>{nav.find(n=>n[0]===page)?.[1]||(fallbackTitle[page]||'管理页面')}</h1></div>}
      {msg&&createPortal(<div className={`globalToastV2 ${toastKind==='error'?'error':'success'}`}><span>{toastKind==='error'?<AlertCircle size={20}/>:<CheckCircle2 size={20}/>}</span><b>{toastText}</b><button aria-label="关闭提示" onClick={()=>setMsg('')}><X size={18}/></button></div>,document.body)}
      <Comp me={me} setMe={setMe} setMsg={setMsg} goPage={go} TaskDetailModal={TaskDetailModal}/>
    </main>

    {redeemOpen&&<RedeemModal onClose={()=>setRedeemOpen(false)} setMsg={setMsg}/>}
    {feedbackOpen&&<FeedbackModal onClose={()=>setFeedbackOpen(false)} setMsg={setMsg}/>}
  </div>;
}

export default Shell;
