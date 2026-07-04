import React from'react';
import{createPortal}from'react-dom';
import{Mail,MessageSquare,ShieldCheck,Ticket,X}from'lucide-react';
import{BrandMark}from'../shared/ui/index.jsx';
import{APP_NAME,APP_SUBTITLE}from'../config/appConfig.js';

function MobileSideNavDrawer({open,page,go,nav,onClose,onFeedback,onEmail,noticeUnread}){
  if(!open)return null;
  const byKey=Object.fromEntries(nav.map(item=>[item[0],item]));
  const items=[
    byKey.workbench||['workbench','工作台',null],
    byKey.images||['images','历史',null],
    byKey.resources||['resources','资源库',null],
    byKey.users&&['users','用户管理',byKey.users[2]||ShieldCheck],
    byKey.promotion&&['promotion','推荐收益',byKey.promotion[2]||Ticket]
  ].filter(Boolean);
  const closeAndGo=(key)=>{onClose();go(key)};
  return createPortal(<div className="mobileSideNavMaskV5" onClick={onClose}>
    <aside className="mobileSideNavPanelV5" aria-label="手机侧边导航" onClick={e=>e.stopPropagation()}>
      <div className="mobileSideNavHeadV5">
        <div><BrandMark/><span><b>{APP_NAME}</b><small>{APP_SUBTITLE}</small></span></div>
        <button type="button" onClick={onClose} aria-label="关闭导航"><X size={20}/></button>
      </div>
      <nav className="mobileSideNavListV5">
        {items.map(([key,title,Icon])=>{
          const label=key==='images'?'历史':key==='workbench'?'工作台':key==='resources'?'资源库':key==='users'?'用户管理':key==='promotion'?'推荐收益':title;
          const ActiveIcon=Icon||ShieldCheck;
          return <button key={key} type="button" className={page===key?'active':''} onClick={()=>closeAndGo(key)}>
            {ActiveIcon&&<ActiveIcon size={21}/>}<span>{label}</span>
          </button>;
        })}
      </nav>
      <div className="mobileSideNavToolsV5">
        <button type="button" onClick={()=>{onClose();onFeedback();}}><MessageSquare size={19}/><span>问题反馈</span></button>
        <button type="button" onClick={()=>{onClose();onEmail();}}><Mail size={19}/><span>公告邮箱</span>{noticeUnread>0&&<i>{noticeUnread>99?'99+':noticeUnread}</i>}</button>
      </div>
    </aside>
  </div>,document.body);
}

export default MobileSideNavDrawer;
