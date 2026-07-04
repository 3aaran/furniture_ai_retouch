import {useCallback,useEffect,useState} from 'react';
import {fetchWatermarkSettings} from '../api/workbenchApi.js';
import {wbTextWatermarkConfig} from '../model/workbenchWatermark.js';

export function useWorkbenchWatermark({me,setMsg}){
  const canConfigureWatermark=me?.role==='MERCHANT_OWNER'||me?.role==='MERCHANT_ADMIN';
  const [watermarkOpen,setWatermarkOpen]=useState(false);
  const [workbenchWatermark,setWorkbenchWatermark]=useState({loading:true,enabled:false,configured:false,canConfigure:false,config:null});
  const [showWorkbenchWatermark,setShowWorkbenchWatermark]=useState(false);

  const loadWorkbenchWatermark=useCallback(()=>{
    if(!canConfigureWatermark){
      setWorkbenchWatermark({loading:false,enabled:false,configured:false,canConfigure:false,config:null});
      setShowWorkbenchWatermark(false);
      return;
    }
    setWorkbenchWatermark(prev=>({...prev,loading:true}));
    fetchWatermarkSettings()
      .then(data=>{
        const config=wbTextWatermarkConfig(data?.config||{});
        const ready=!!data?.configured&&!!config.text;
        setWorkbenchWatermark({...data,config,configured:ready,loading:false});
        setShowWorkbenchWatermark(value=>ready?value:false);
      })
      .catch(()=>{
        setWorkbenchWatermark({loading:false,enabled:false,configured:false,canConfigure:canConfigureWatermark,config:null});
        setShowWorkbenchWatermark(false);
      });
  },[canConfigureWatermark]);

  useEffect(()=>{loadWorkbenchWatermark()},[loadWorkbenchWatermark]);

  function toggleWorkbenchWatermark(){
    if(workbenchWatermark.loading)return setMsg?.('正在读取水印配置');
    if(!canConfigureWatermark)return setMsg?.('当前账号暂无水印权限');
    const config=wbTextWatermarkConfig(workbenchWatermark.config||{});
    if(!workbenchWatermark.configured||!config.text){
      setMsg?.('请先配置门店水印');
      setWatermarkOpen(true);
      return;
    }
    setShowWorkbenchWatermark(value=>!value);
  }

  return {
    canConfigureWatermark,
    watermarkOpen,
    setWatermarkOpen,
    workbenchWatermark,
    showWorkbenchWatermark,
    loadWorkbenchWatermark,
    toggleWorkbenchWatermark
  };
}
