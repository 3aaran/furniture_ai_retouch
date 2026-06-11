import React,{useEffect,useMemo,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{AlertCircle,CheckCircle2,LogOut,Mail,Menu,MessageSquare,ShieldCheck,Ticket,WalletCards,X}from'lucide-react';
import{adminNav,adminNavGroups,Dashboard,Applications,Merchants,AiConfig,SettingsPage,AdminLogs,Feedbacks,Announcements,RedeemCodes}from'./admin/AdminPages.jsx';
import{storeAdminNav,staffNav,Workbench,StoreResources,StoreUsers,StoreTasks,Promotion,QuotaLogs}from'./store/StorePages.jsx';
import{UserFeedback,FeedbackModal,RedeemModal,Profile}from'./account/AccountPages.jsx';
import{TaskDetailModal}from'./components/TaskDetailModal.jsx';
import BrandMark from'./components/BrandMark.jsx';
import{avatarViewUrl,roleName,userFriendlyMessage,recordClientFailure,req,fmt}from'./appShared.jsx';
import{APP_NAME,APP_SUBTITLE}from'./config/appConfig.js';

const DEFAULT_AVATAR='/default-avatar.svg';
function NoticeCenterModal({onClose,onUnreadChange}){
  const[items,setItems]=useState([]);
  const[selected,setSelected]=useState(null);
  const[loading,setLoading]=useState(true);
  async function markNoticeRead(item,currentUnread){
    if(!item||item.isRead)return;
    const readAt=new Date().toISOString();
    setItems(list=>list.map(x=>x.id===item.id?{...x,isRead:true,readAt}:x));
    setSelected({...item,isRead:true,readAt});
    onUnreadChange?.(Math.max(0,Number(currentUnread||0)-1));
    try{await req(`/api/announcements/${item.id}/read`,{method:'POST',body:JSON.stringify({})})}catch{}
  }
  async function load(autoOpen=false){
    setLoading(true);
    try{
      const data=await req('/api/announcements');
      const list=data.items||[];
      setItems(list);
      const unread=Number(data.unreadCount||0);
      onUnreadChange?.(unread);
      if(autoOpen){
        const firstUnread=list.find(x=>!x.isRead);
        const target=firstUnread||list[0]||null;
        setSelected(target);
        if(firstUnread)markNoticeRead(firstUnread,unread);
      }else{
        setSelected(prev=>list.find(x=>x.id===prev?.id)||list[0]||null);
      }
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{load(true).catch(()=>setLoading(false))},[]);
  const unreadCount=items.filter(item=>!item.isRead).length;
  async function openNotice(item){
    setSelected(item);
    if(item&&!item.isRead){
      await markNoticeRead(item,unreadCount);
      load().catch(()=>{});
    }
  }
  return createPortal(<div className="feedbackModalMaskV2" onClick={onClose}>
    <div className="feedbackModalCardV2 noticeCenterModalV2" onClick={e=>e.stopPropagation()}>
      <div className="feedbackModalHeadV2">
        <div>
          <h2><Mail size={24}/>公告邮箱</h2>
          {/* <p>平台公告、配置调整和运营通知会集中显示在这里。</p> */}
        </div>
        <button type="button" onClick={onClose}>×</button>
      </div>
      <div className="noticeCenterBodyV2">
        <aside className="noticeListPaneV2">
          <div className="noticeListV2">
            {loading?<div className="noticeEmptyV2">公告加载中...</div>:items.length?items.map(item=>
              <button key={item.id} className={`noticeListItemV2 ${selected?.id===item.id?'active':''} ${item.isRead?'isRead':'isUnread'}`} onClick={()=>openNotice(item)}>
                <span className="noticeStateIconV2">{item.isRead?<CheckCircle2 size={17}/>:<Mail size={17}/>}</span>
                <span className="noticeListTextV2"><b>{item.title}</b><small>{fmt(item.createdAt)}</small></span>
              </button>
            ):<div className="noticeEmptyV2">暂无公告</div>}
          </div>
        </aside>
        <article className="noticeDetailPaneV2">
          {selected?<>
            <div className="noticeDetailMetaV2">
              <span className={selected.isRead?'read':'unread'}>{selected.isRead?'已读':'未读'}</span>
              <small>{fmt(selected.createdAt)}</small>
            </div>
            <h3>{selected.title}</h3>
            <p>{selected.content}</p>
          </>:<div className="noticeEmptyV2 large">请选择一条公告</div>}
        </article>
      </div>
    </div>
  </div>,document.body);
}

function roleNav(role){
  if(role==='SYSTEM_ADMIN')return adminNav;
  if(role==='MERCHANT_OWNER'||role==='MERCHANT_ADMIN')return storeAdminNav;
  return staffNav;
}



function MobileAdminNav({page,go}){
  const [open,setOpen]=useState(false);
  const closeAndGo=(key)=>{setOpen(false);go(key)};
  return <div className="mobileAdminNavV4" onClick={e=>e.stopPropagation()}>
    <button type="button" className="mobileAdminNavToggleV4" onClick={()=>setOpen(v=>!v)}>
      <Menu size={19}/><span>管理导航</span><small>{adminNav.find(([k])=>k===page)?.[1]||'请选择页面'}</small>
    </button>
    {open&&<div className="mobileAdminNavPanelV4">
      <div className="mobileAdminNavPanelHeadV4"><b>平台管理员导航</b><button type="button" onClick={()=>setOpen(false)}>×</button></div>
      <div className="mobileAdminNavGroupsV4">
        {adminNavGroups.map(group=><section key={group.key}>
          <h3>{group.title}</h3>
          <div>
            {group.items.map(([k,t,I])=><button key={k} type="button" className={page===k?'active':''} onClick={()=>closeAndGo(k)}>{I&&<I size={17}/>}<span>{t}</span></button>)}
          </div>
        </section>)}
      </div>
    </div>}
  </div>;
}

function MobileBottomNav({page,go,nav}){
  const byKey=Object.fromEntries(nav.map(item=>[item[0],item]));
  const items=[
    byKey.workbench||['workbench','工作台',null],
    byKey.images||['images','历史',null],
    byKey.resources||['resources','资源库',null],
    ['profile','我的',ShieldCheck]
  ];
  return <nav className="mobileBottomNavV4" aria-label="手机底部导航">
    {items.map(([key,title,Icon])=>{
      const label=key==='images'?'历史':key==='workbench'?'工作台':key==='resources'?'资源库':'我的';
      const ActiveIcon=Icon||ShieldCheck;
      return <button key={key} type="button" className={page===key?'active':''} onClick={()=>go(key)}>
        {ActiveIcon&&<ActiveIcon size={22}/>}<span>{label}</span>
      </button>;
    })}
  </nav>;
}

function Shell({me,setMe}){
  const nav=roleNav(me.role);
  const isAdmin=me.role==='SYSTEM_ADMIN';
  const mobileTopLevelPages=new Set(['workbench','images','resources','profile']);
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
  const[emailOpen,setEmailOpen]=useState(false);
  const[noticeUnread,setNoticeUnread]=useState(0);
  const[navDrop,setNavDrop]=useState(null);
  const[isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(max-width: 860px)').matches);
  const[mobileModalOpen,setMobileModalOpen]=useState(false);

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
      '.resourceActionPanelV7.detailDrawerV7',
      '.resourceActionPanelV7.categoryDrawerV7'
    ].join(',');
    const update=()=>{
      const open=!!document.body.querySelector(selectors);
      setMobileModalOpen(open);
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
  function openHome(){
    window.location.hash='/home';
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
    if(isAdmin)return;
    req('/api/announcements').then(d=>setNoticeUnread(Number(d.unreadCount||0))).catch(()=>{});
  },[isAdmin]);
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
  const shouldShowMobileTabBar=!isAdmin&&isMobile&&mobileTopLevelPages.has(page)&&!mobileModalOpen&&!redeemOpen&&!feedbackOpen&&!emailOpen&&!menu;

  return <div className="topApp" onClick={()=>{setNavDrop(null);setMenu(false)}}>
    <header className="topbar">
      <button className="topBrand topBrandButton" type="button" onClick={openHome} aria-label="返回官网首页">
        <BrandMark/>
        <div><b>{APP_NAME}</b><small>{APP_SUBTITLE}</small></div>
      </button>

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

        {!isAdmin&&<div className="topNavActions">
          <button className="iconNav" title="问题反馈" onClick={()=>setFeedbackOpen(true)}><MessageSquare size={20}/><span>问题反馈</span></button>
          <button className="iconNav noticeIconNavV2" title="公告邮箱" onClick={()=>setEmailOpen(true)}><Mail size={20}/><span>公告邮箱</span>{noticeUnread>0&&<i>{noticeUnread>99?'99+':noticeUnread}</i>}</button>
        </div>}
      </nav>

      <div className="topRight" onClick={e=>e.stopPropagation()} onMouseEnter={openProfileMenu} onMouseLeave={closeProfileMenuSoon}>
        <button className="quotaPill" onClick={()=>go('quota')}><WalletCards size={17}/>{isAdmin?'额度明细':`${me.quota} 算力`}</button>
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
      {!(page==='workbench'&&!isAdmin)&&<div className="pageHead"><h1>{nav.find(n=>n[0]===page)?.[1]||(fallbackTitle[page]||'管理页面')}</h1></div>}
      {msg&&createPortal(<div className={`globalToastV2 ${toastKind==='error'?'error':'success'}`}><span>{toastKind==='error'?<AlertCircle size={20}/>:<CheckCircle2 size={20}/>}</span><b>{toastText}</b><button aria-label="关闭提示" onClick={()=>setMsg('')}><X size={18}/></button></div>,document.body)}
      <Comp me={me} setMe={setMe} setMsg={setMsg} goPage={go} TaskDetailModal={TaskDetailModal}/>
    </main>

    {shouldShowMobileTabBar&&<MobileBottomNav page={page} go={go} nav={nav}/>}

    {redeemOpen&&<RedeemModal onClose={()=>setRedeemOpen(false)} setMsg={setMsg}/>}
    {feedbackOpen&&<FeedbackModal onClose={()=>setFeedbackOpen(false)} setMsg={setMsg}/>}
    {emailOpen&&<NoticeCenterModal onClose={()=>setEmailOpen(false)} onUnreadChange={setNoticeUnread}/>}
  </div>;
}

export default Shell;
