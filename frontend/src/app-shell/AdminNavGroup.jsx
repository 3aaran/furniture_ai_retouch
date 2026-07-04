import React from'react';

function AdminNavGroup({group,page,open,onToggle,onGo,active}){
  const GroupIcon=group.icon;
  return <div className="navGroup">
    <button className={active?'active':''} onClick={onToggle} aria-label={group.title} title={group.title}>
      {GroupIcon&&<GroupIcon className="navGroupIcon" size={18}/>}
      <span className="navGroupLabel">{group.title}</span>
      <span className="navArrow">▾</span>
    </button>
    {open&&<div className="navDropdown">
      {group.items.map(([k,t,I])=><button key={k} className={page===k?'active itemActive':''} onClick={()=>onGo(k)}><I size={17}/>{t}</button>)}
    </div>}
  </div>;
}

export default AdminNavGroup;
