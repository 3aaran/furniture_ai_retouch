import React,{useState}from'react';
import{Menu}from'lucide-react';
import{adminNav,adminNavGroups}from'../admin/AdminPages.jsx';

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

export default MobileAdminNav;
