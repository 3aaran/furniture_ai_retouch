import{useEffect,useState}from'react';

export function useTaskDetailResponsive(){
  const [isMobile,setIsMobile]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.('(max-width: 860px)').matches);

  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const mq=window.matchMedia('(max-width: 860px)');
    const update=()=>setIsMobile(!!mq.matches);
    update();
    mq.addEventListener?.('change',update);
    return()=>mq.removeEventListener?.('change',update);
  },[]);

  return isMobile;
}
