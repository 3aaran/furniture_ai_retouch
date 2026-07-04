import React,{Suspense,lazy,useEffect,useMemo,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{AlertCircle,Bell,CheckCircle2,History,LogOut,Menu,MessageSquare,Settings,ShieldCheck,Ticket,WalletCards,X}from'lucide-react';
import{adminNav,adminNavGroups,Dashboard,Applications,Merchants,AiConfig,SettingsPage,AdminLogs,Feedbacks,Announcements,RedeemCodes}from'./admin/AdminPages.jsx';
import{storeAdminNav,staffNav,Workbench,StoreResources,StoreUsers,StoreTasks,Promotion,QuotaLogs}from'./store/StorePages.jsx';
import{UserFeedback,FeedbackModal,RedeemModal,Profile}from'./account/AccountPages.jsx';
import{BrandMark}from'./shared/ui/index.jsx';
import{avatarViewUrl,roleName,userFriendlyMessage,recordClientFailure,req}from'./appShared.jsx';
import{APP_NAME,APP_SUBTITLE}from'./config/appConfig.js';
import NoticeCenterModal from'./app-shell/NoticeCenterModal.jsx';
import MobileAdminNav from'./app-shell/MobileAdminNav.jsx';
import MobileSideNavDrawer from'./app-shell/MobileSideNavDrawer.jsx';
import MobileImageSavePreview from'./app-shell/MobileImageSavePreview.jsx';
import AdminNavGroup from'./app-shell/AdminNavGroup.jsx';
import{navigateWorkflow,parseWorkflowHash}from'./admin/workflows/workflowRoute.js';
import{inferToastKind}from'./toastKind.js';

const TaskDetailModal=lazy(()=>import('./components/TaskDetailModal.jsx').then(module=>({default:module.TaskDetailModal||module.default})));
const WorkflowAdminApp=lazy(()=>import('./admin/workflows/WorkflowAdminApp.jsx'));
const DEFAULT_AVATAR='/default-avatar.svg';
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
    if(isAdmin&&parseWorkflowHash(window.location.hash))return'workflows';
    const raw=String(window.location.hash||'').replace(/^#\/?/,'').trim();
    return pageKeys.has(raw)?raw:'';
  }
  const initial=pageFromHash()||(isAdmin?'dashboard':'workbench');
  const[page,setPage]=useState(initial);
  const[workflowRoute,setWorkflowRoute]=useState(()=>isAdmin?parseWorkflowHash(window.location.hash):null);
  const[msg,setMsg]=useState('');
  const[menu,setMenu]=useState(false);
  const menuTimer=useRef(null);
  const[redeemOpen,setRedeemOpen]=useState(false);
  const[feedbackOpen,setFeedbackOpen]=useState(false);
  const[emailOpen,setEmailOpen]=useState(false);
  const[noticeUnread,setNoticeUnread]=useState(0);
  const[navDrop,setNavDrop]=useState(null);
  const[isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(max-width: 860px)').matches);
  const[mobileSaveImage,setMobileSaveImage]=useState(null);
  const[mobileSideNavOpen,setMobileSideNavOpen]=useState(false);

  useEffect(()=>{document.title=APP_NAME},[]);
  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const mq=window.matchMedia('(max-width: 860px)');
    const update=()=>setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change',update);
    return()=>mq.removeEventListener?.('change',update);
  },[]);
  useEffect(()=>{
    if(typeof document==='undefined')return;
    const selectors=[
      '.modalMask',
      '.taskPreviewOverlay',
      '.mobileImageSaveMask',
      '.mobileProcessMask',
      '.cropShotMask',
      '.watermarkMask',
      '.feedbackModalMaskV2',
      '.resourceUploadMaskV3',
      '.resourceCategoryDialogMaskV3',
      '.resourceCategoryModalMaskV8',
      '.resourceRenameMaskV3',
      '.resourceDetailMaskV3',
      '.adminModalMaskV9',
      '.storeUserModalMaskV2',
      '.trialTicketMaskV2',
      '.mobileAdminNavPanelV4',
      '.mobileSideNavMaskV5',
      '.resourceActionPanelV7.detailDrawerV7',
      '.resourceActionPanelV7.categoryDrawerV7'
    ].join(',');
    const update=()=>{
      const open=!!document.body.querySelector(selectors);
      document.body.classList.toggle('mobile-modal-open-v4',open);
    };
    update();
    const observer=new MutationObserver(update);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
    return()=>{
      observer.disconnect();
      document.body.classList.remove('mobile-modal-open-v4');
    };
  },[]);
  useEffect(()=>{
    const onOpen=(event)=>setMobileSaveImage(event.detail||null);
    window.addEventListener('mobile-image-save-preview',onOpen);
    return()=>window.removeEventListener('mobile-image-save-preview',onOpen);
  },[]);

  const rawToastText=typeof msg==='object'?(msg.text||msg.message||''):String(msg||'');
  const toastText=userFriendlyMessage(rawToastText,rawToastText||'操作失败请稍后重试');
  const toastKind=typeof msg==='object'
    ? (msg.kind||msg.type||'success')
    : inferToastKind(rawToastText);

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
    if(k==='workflows'){navigateWorkflow('list');return}
    const next=pageKeys.has(k)?k:(isAdmin?'dashboard':'workbench');
    setPage(next);
    setMenu(false);
    setNavDrop(null);
    setWorkflowRoute(null);
    if(window.location.hash!==`#/${next}`)window.history.replaceState(null,'',`#/${next}`);
  }
  function openHome(){
    window.location.hash='/home';
  }
  function handleBrandClick(e){
    e.stopPropagation();
    if(isMobile&&!isAdmin){
      setMobileSideNavOpen(true);
      setMenu(false);
      return;
    }
    openHome();
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
  useEffect(()=>{
    if(page==='workflows')return;
    if(window.location.hash!==`#/${page}`)window.history.replaceState(null,'',`#/${page}`);
  },[]);
  useEffect(()=>{
    if(isAdmin)return;
    req('/api/announcements').then(d=>setNoticeUnread(Number(d.unreadCount||0))).catch(()=>{});
  },[isAdmin]);
  useEffect(()=>{
    const onHashChange=()=>{
      const nextWorkflow=isAdmin?parseWorkflowHash(window.location.hash):null;
      setWorkflowRoute(nextWorkflow);
      const next=pageFromHash();
      if(next&&next!==page){
        setPage(next);
        setMenu(false);
        setNavDrop(null);
      }
    };
    window.addEventListener('hashchange',onHashChange);
    return()=>window.removeEventListener('hashchange',onHashChange);
  },[page,pageKeys,isAdmin]);

  const fallbackTitle={profile:'个人中心',quota:'额度明细',redeem:'兑换码创建',feedbacks:'问题反馈'};
  const studioNavLabel={workbench:'工作室',resources:'资产库',users:'用户管理',promotion:'邀请共创',images:'历史任务'};
  return <div className="topApp" onClick={()=>{setNavDrop(null);setMenu(false)}}>
    <header className="topbar">
      <button className="topBrand topBrandButton" type="button" onClick={handleBrandClick} aria-label={isMobile&&!isAdmin?'打开导航栏':'返回官网首页'}>
        <Menu className="topBrandMenuIconV5" size={25}/>
        <BrandMark/>
        <div><b>{APP_NAME}</b><small>{APP_SUBTITLE}</small></div>
      </button>

      <nav className="topNav" onClick={e=>e.stopPropagation()}>
        {isAdmin?adminNavGroups.map(g=>
          <AdminNavGroup key={g.key} group={g} page={page} open={navDrop===g.key} onToggle={()=>setNavDrop(navDrop===g.key?null:g.key)} onGo={go} active={adminGroupActive(g)}/>
        ):nav.filter(([k])=>k!=='images').map(([k,t,I])=><button key={k} className={page===k?'active':''} onClick={()=>go(k)}><I size={17}/>{studioNavLabel[k]||t}</button>)}

        {!isAdmin&&<div className="topNavActions">
          <button className={`iconNav ${page==='images'?'active':''}`} title="历史任务" onClick={()=>go('images')}><History size={20}/><span>历史任务</span></button>
          <button className={`iconNav ${page==='profile'?'active':''}`} title="个人设置" onClick={()=>go('profile')}><Settings size={20}/><span>个人设置</span></button>
          <button className="iconNav" title="问题反馈" onClick={()=>setFeedbackOpen(true)}><MessageSquare size={20}/><span>问题反馈</span></button>
          <button className="iconNav noticeIconNavV2" title="公告邮箱" onClick={()=>setEmailOpen(true)}><Bell size={20}/><span>公告邮箱</span>{noticeUnread>0&&<i>{noticeUnread>99?'99+':noticeUnread}</i>}</button>
        </div>}
      </nav>

      <div className="topRight" onClick={e=>e.stopPropagation()} onMouseEnter={openProfileMenu} onMouseLeave={closeProfileMenuSoon}>
        <button className="quotaPill" onClick={()=>go('quota')}><WalletCards size={17}/>{isAdmin?'额度明细':`算力额度 ${me.quota}`}</button>
        <button className="avatarBtn" type="button" onClick={(e)=>{e.stopPropagation();setMenu(v=>!v)}}><span><img src={avatarUrl||DEFAULT_AVATAR} alt="头像" loading="lazy" decoding="async"/></span><div><b>{me.displayName}</b><small>{roleName[me.role]}</small></div></button>
        {menu&&<div className="profileMenu">
          <button onClick={()=>go('profile')}><ShieldCheck size={18}/>个人中心</button>
          <button onClick={()=>go('quota')}><WalletCards size={18}/>额度明细</button>
          {isAdmin?<button onClick={()=>go('redeem')}><Ticket size={18}/>兑换码创建</button>:<button onClick={()=>{setRedeemOpen(true);setMenu(false)}}><Ticket size={18}/>礼品卡兑换</button>}
          <i/>
          <button className="logout" onClick={logout}><LogOut size={18}/>退出登录</button>
        </div>}
      </div>
    </header>

    {isAdmin&&<MobileAdminNav page={page} go={go}/>}

    <main className="topMain">
      {page!=='workflows'&&!(page==='workbench'&&!isAdmin)&&<div className="pageHead"><h1>{nav.find(n=>n[0]===page)?.[1]||(fallbackTitle[page]||'管理页面')}</h1></div>}
      {msg&&createPortal(<div className={`globalToastV2 ${toastKind==='error'?'error':'success'}`}><span>{toastKind==='error'?<AlertCircle size={20}/>:<CheckCircle2 size={20}/>}</span><b>{toastText}</b><button aria-label="关闭提示" onClick={()=>setMsg('')}><X size={18}/></button></div>,document.body)}
      <Suspense fallback={<div className="loading">页面加载中...</div>}>
        {page==='workflows'
          ?<WorkflowAdminApp route={workflowRoute||{name:'list',id:null}} me={me} setMe={setMe}/>
          :<Comp me={me} setMe={setMe} setMsg={setMsg} goPage={go} TaskDetailModal={TaskDetailModal}/>}
      </Suspense>
    </main>

    {!isAdmin&&<MobileSideNavDrawer
      open={mobileSideNavOpen}
      page={page}
      go={go}
      nav={nav}
      onClose={()=>setMobileSideNavOpen(false)}
      onFeedback={()=>setFeedbackOpen(true)}
      onEmail={()=>setEmailOpen(true)}
      noticeUnread={noticeUnread}
    />}

    {redeemOpen&&<RedeemModal onClose={()=>setRedeemOpen(false)} setMsg={setMsg}/>}
    {feedbackOpen&&<FeedbackModal onClose={()=>setFeedbackOpen(false)} setMsg={setMsg}/>}
    {emailOpen&&<NoticeCenterModal onClose={()=>setEmailOpen(false)} onUnreadChange={setNoticeUnread}/>}
    {mobileSaveImage&&<MobileImageSavePreview image={mobileSaveImage} onClose={()=>setMobileSaveImage(null)} setMsg={setMsg}/>}
  </div>;
}

export default Shell;
