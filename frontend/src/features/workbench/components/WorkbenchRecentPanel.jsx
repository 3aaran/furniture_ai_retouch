import React from 'react';
import {Download,Search,Trash2,X} from '../../../shared/icons/index.jsx';
import {fmt,fallbackToOriginalImage,openImageDownload} from '../../../appShared.jsx';

function RecentActionButton({icon,onClick,title,danger=false,disabled=false}){
  return <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    style={{
      width:30,
      height:30,
      borderRadius:'50%',
      border:'1px solid '+(danger?'rgba(255,96,96,.35)':'rgba(255,255,255,.18)'),
      background:danger?'rgba(120,16,16,.72)':'rgba(0,0,0,.48)',
      color:'#fff',
      display:'grid',
      placeItems:'center',
      cursor:disabled?'not-allowed':'pointer',
      opacity:disabled?0.55:1,
      boxShadow:'0 8px 20px rgba(0,0,0,.24)'
    }}
  >{icon}</button>;
}

function WorkbenchRecentPanel({
  mediaMode,
  recentItems,
  recentKeyword,
  setRecentKeyword,
  refreshRecent,
  setRightDrawerOpen,
  setRecentHoverId,
  recentHoverId,
  showRecentOriginal,
  moveRecentOriginal,
  hideRecentOriginal,
  openRecentTask,
  deleteRecentTask,
  recentTypeName,
  listImgSrc,
  setMsg,
  goPage
}){
  return <>
    <div className="wbRightHeader">
      <b>{mediaMode==='video'?'最近视频':'最近图片'}</b>
      <div className="wbRightHeaderActions">
        <button onClick={refreshRecent}>↻</button>
        <button type="button" className="wbDrawerClose" onClick={()=>setRightDrawerOpen(false)} aria-label="关闭最近生成侧栏"><X size={18}/></button>
      </div>
    </div>
    <div className="wbRecentSearch"><Search size={16}/><input placeholder={mediaMode==='video'?'搜索视频任务...':'搜索任务编号...'} value={recentKeyword} onChange={e=>setRecentKeyword(e.target.value)}/></div>

    <div className="wbRecentList">{recentItems.length?recentItems.map(item=>{
      const running=item.status==='queued'||item.status==='running';
      const failed=item.status==='failed';
      return <div
        className={running?'wbRecentItem isLoading':failed?'wbRecentItem isFailed':'wbRecentItem'}
        key={item.id}
        onMouseEnter={(e)=>{setRecentHoverId(item.id);showRecentOriginal(item,e);}}
        onMouseMove={(e)=>moveRecentOriginal(item,e)}
        onMouseLeave={()=>{setRecentHoverId(prev=>prev===item.id?'':prev);hideRecentOriginal();}}
        onClick={()=>mediaMode==='video'?setMsg('视频任务详情后续接入'):openRecentTask(item)}
      >
        <div className="wbRecentThumb"><img src={listImgSrc(item)} alt="最近生成" onError={e=>fallbackToOriginalImage(e,item)} loading="lazy" decoding="async"/>{running&&<i className="wbSpin"/>}{failed&&<em>失败</em>}</div>
        <div className="wbRecentInfo"><b>{recentTypeName(item)}</b><span>{running?'生成中...':failed?'失败，已退回算力':fmt(item.createdAt||item.submittedAt)}</span><small>{item.id}</small></div>
        {!running&&!failed&&<div
          style={{
            position:'absolute',
            right:8,
            top:8,
            display:'flex',
            gap:6,
            opacity:recentHoverId===item.id?1:0,
            pointerEvents:recentHoverId===item.id?'auto':'none',
            transition:'opacity .18s ease',
            zIndex:3
          }}
        >
          <RecentActionButton icon={<Download size={14}/>} onClick={(e)=>{e.stopPropagation();openImageDownload(item,setMsg);}} title="下载"/>
          <RecentActionButton icon={<Trash2 size={14}/>} onClick={(e)=>deleteRecentTask(item,e)} title="删除" danger/>
        </div>}
      </div>;
    }):<div className="wbRecentEmpty">{mediaMode==='video'?'暂无视频生成记录':'暂无生成记录'}</div>}</div>
    <button className="wbMoreBtn" onClick={()=>goPage&&goPage('images')}>查看更多记录</button>
  </>;
}

export default WorkbenchRecentPanel;
