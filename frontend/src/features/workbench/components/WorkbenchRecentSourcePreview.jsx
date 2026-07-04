import React from 'react';

function WorkbenchRecentSourcePreview({recentSourcePreview,recentPreviewSrc,hideRecentOriginal}){
  if(!recentSourcePreview)return null;
  return <div
    onMouseEnter={()=>{}}
    onMouseLeave={hideRecentOriginal}
    style={{
      position:'fixed',
      right:376,
      top:recentSourcePreview.top,
      transform:'translateY(-50%)',
      width:230,
      height:160,
      borderRadius:18,
      overflow:'hidden',
      border:'1px solid rgba(242,213,140,.45)',
      boxShadow:'0 20px 70px rgba(0,0,0,.42)',
      background:'#fff',
      zIndex:2147483000,
      pointerEvents:'auto'
    }}
  >
    <div style={{
      position:'absolute',
      left:0,
      right:0,
      top:0,
      zIndex:2,
      padding:'8px 10px',
      background:'rgba(0,0,0,.58)',
      color:'#f2d58c',
      fontSize:13,
      fontWeight:900,
      whiteSpace:'nowrap',
      overflow:'hidden',
      textOverflow:'ellipsis'
    }}>
      {recentSourcePreview.loading?'正在读取原图...':`${recentSourcePreview.title} 原图`}
    </div>
    <img
      src={recentPreviewSrc(recentSourcePreview)}
      alt="原图预览"
      loading="lazy"
      decoding="async"
      style={{width:'100%',height:'100%',objectFit:'cover',display:'block',background:'#fff'}}
      onError={(e)=>{
        if(e.currentTarget.dataset.fallback!=='1'){
          e.currentTarget.dataset.fallback='1';
          e.currentTarget.src=recentPreviewSrc(recentSourcePreview,true);
        }
      }}
    />
  </div>;
}

export default WorkbenchRecentSourcePreview;
