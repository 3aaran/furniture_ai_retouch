import{useEffect,useState}from'react';
import{req}from'../../appShared.jsx';

let cachedWatermarkSettings=null;

export function useTaskDetailWatermark(isAdmin){
  const [useWatermark,setUseWatermark]=useState(false);
  const [watermark,setWatermark]=useState({loading:true,enabled:false,configured:false,canConfigure:false});
  const [watermarkConfigOpen,setWatermarkConfigOpen]=useState(false);

  function loadWatermark(force=false){
    if(isAdmin){
      setWatermark({loading:false,enabled:false,configured:false,canConfigure:false});
      return;
    }
    if(cachedWatermarkSettings&&!force){
      setWatermark({...cachedWatermarkSettings,loading:false});
      return;
    }
    setWatermark(prev=>({...prev,loading:true}));
    req('/api/watermark/settings')
      .then(data=>{
        cachedWatermarkSettings=data;
        setWatermark({...data,loading:false});
      })
      .catch(()=>setWatermark({loading:false,enabled:false,configured:false,canConfigure:false}));
  }

  useEffect(()=>{
    loadWatermark();
  },[isAdmin]);

  return {useWatermark,setUseWatermark,watermark,watermarkConfigOpen,setWatermarkConfigOpen,loadWatermark};
}
