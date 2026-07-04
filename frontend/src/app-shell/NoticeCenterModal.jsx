import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{CheckCircle2,Mail}from'lucide-react';
import{req,fmt}from'../appShared.jsx';

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
        {items.length>0&&<article className="noticeDetailPaneV2">
          {selected?<>
            <div className="noticeDetailMetaV2">
              <span className={selected.isRead?'read':'unread'}>{selected.isRead?'已读':'未读'}</span>
              <small>{fmt(selected.createdAt)}</small>
            </div>
            <h3>{selected.title}</h3>
            <p>{selected.content}</p>
          </>:<div className="noticeEmptyV2 large">请选择一条公告</div>}
        </article>}
      </div>
    </div>
  </div>,document.body);
}

export default NoticeCenterModal;
