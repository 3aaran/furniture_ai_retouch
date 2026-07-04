import React,{useEffect,useRef,useState} from 'react';
import {fetchAiTaskStatus,deleteAiTask,deleteImage,fetchImageDetail,fetchImageSource,fetchRecentAiTasks,fetchRecentImages,fetchTaskDetail} from '../api/workbenchApi.js';
import {isRecentTaskItem,recentImageId} from '../model/workbenchImages.js';
import {getRecentPreviewSrc,getRecentResultId,getRecentSourceId,getRecentTypeName,mergeRecentItems} from '../model/workbenchRecent.js';

export function useWorkbenchRecent({imgSrc,ops,setMe,setMsg}){
  const [recent,setRecent]=useState([]);
  const [taskDetail,setTaskDetail]=useState(null);
  const [taskDetailLoading,setTaskDetailLoading]=useState(false);
  const [recentSourcePreview,setRecentSourcePreview]=useState(null);
  const [sourcePreviewCache,setSourcePreviewCache]=useState({});
  const [recentHoverId,setRecentHoverId]=useState('');
  const [deleteTarget,setDeleteTarget]=useState(null);
  const recentPreviewHideTimer=useRef(null);

  function clearRecentPreviewTimer(){
    if(recentPreviewHideTimer.current){
      clearTimeout(recentPreviewHideTimer.current);
      recentPreviewHideTimer.current=null;
    }
  }

  function recentTypeName(item){return getRecentTypeName(item,ops);}
  function recentPreviewSrc(preview,useFallback=false){return getRecentPreviewSrc(preview,imgSrc,useFallback);}

  function refreshRecent(){
    Promise.allSettled([
      fetchRecentAiTasks({pageSize:20}),
      fetchRecentImages({pageSize:20})
    ]).then(results=>{
      const taskItems=results[0].status==='fulfilled'?(results[0].value.items||[]):[];
      const imageItems=results[1].status==='fulfilled'?(results[1].value.items||[]):[];
      setRecent(mergeRecentItems(taskItems,imageItems));
    }).catch(()=>{});
  }

  useEffect(()=>{refreshRecent()},[]);
  useEffect(()=>{
    const onProcessed=()=>refreshRecent();
    window.addEventListener('image-processed',onProcessed);
    return ()=>window.removeEventListener('image-processed',onProcessed);
  },[]);
  useEffect(()=>()=>clearRecentPreviewTimer(),[]);

  async function showRecentOriginal(item,e){
    clearRecentPreviewTimer();
    const rect=e.currentTarget.getBoundingClientRect();
    const top=Math.max(130,Math.min(window.innerHeight-150,rect.top+rect.height/2));
    const cached=sourcePreviewCache[item.id];
    const taskItem=item.itemType==='task'||item.status;

    setRecentSourcePreview({
      id:item.id,
      sourceId:getRecentSourceId(item,cached),
      fallbackImageId:getRecentResultId(item),
      title:recentTypeName(item),
      top,
      url:cached?.sourceUrl||item.sourceUrl||item.originImage?.url||item.url,
      fallback:item.resultUrl||item.url,
      loading:!cached&&!taskItem
    });

    if(cached||taskItem)return;
    try{
      const data=await fetchImageSource(item.id);
      const next={
        sourceId:data.sourceId,
        sourceUrl:data.sourceUrl||item.sourceUrl||item.url,
        sourceOriginalName:data.sourceOriginalName||'原图'
      };
      setSourcePreviewCache(prev=>({...prev,[item.id]:next}));
      setRecentSourcePreview(prev=>{
        if(!prev||prev.id!==item.id)return prev;
        return {...prev,sourceId:next.sourceId,url:next.sourceUrl,sourceOriginalName:next.sourceOriginalName,loading:false};
      });
    }catch{
      setRecentSourcePreview(prev=>{
        if(!prev||prev.id!==item.id)return prev;
        return {...prev,url:item.sourceUrl||item.originImage?.url||item.url,fallback:item.resultUrl||item.url,loading:false};
      });
    }
  }

  function moveRecentOriginal(item,e){
    const rect=e.currentTarget.getBoundingClientRect();
    setRecentSourcePreview(prev=>{
      if(!prev||prev.id!==item.id)return prev;
      return {...prev,top:Math.max(130,Math.min(window.innerHeight-150,rect.top+rect.height/2))};
    });
  }

  function hideRecentOriginal(){
    clearRecentPreviewTimer();
    recentPreviewHideTimer.current=setTimeout(()=>{
      setRecentSourcePreview(null);
      recentPreviewHideTimer.current=null;
    },220);
  }

  function pollAiTask(taskId){
    let missedStatusReads=0;
    const timer=setInterval(async()=>{
      try{
        const data=await fetchAiTaskStatus(taskId);
        missedStatusReads=0;
        if(data.user)setMe?.(data.user);
        setRecent(prev=>prev.map(item=>item.id===taskId?{...item,...data}:item));
        if(data.status==='succeeded'){
          clearInterval(timer);
          setMsg?.('图片生成成功');
          refreshRecent();
        }
        if(data.status==='failed'){
          clearInterval(timer);
          setMsg?.(data.statusMessage||data.errorMessage||'生成图片失败：模型服务异常');
          refreshRecent();
        }
      }catch{
        missedStatusReads+=1;
        if(missedStatusReads===1)setMsg?.('任务仍在生成，状态读取短暂失败，继续等待结果');
        if(missedStatusReads>=5){
          clearInterval(timer);
          setMsg?.('任务状态读取失败，请稍后到历史任务查看');
          refreshRecent();
        }
      }
    },2000);
  }

  function deleteRecentTask(item,e){
    e?.stopPropagation?.();
    const deleteId=isRecentTaskItem(item)?String(item?.id||'').trim():recentImageId(item);
    if(!deleteId)return;
    setDeleteTarget(item);
  }

  async function confirmDeleteRecentTask(){
    const item=deleteTarget;
    const task=isRecentTaskItem(item);
    const deleteId=task?String(item?.id||'').trim():recentImageId(item);
    if(!deleteId)return;
    try{
      const data=await (task?deleteAiTask(deleteId):deleteImage(deleteId));
      setRecent(prev=>prev.filter(current=>{
        const currentId=isRecentTaskItem(current)?String(current?.id||'').trim():recentImageId(current);
        return currentId!==deleteId&&recentImageId(current)!==deleteId&&String(current?.id||'').trim()!==deleteId;
      }));
      if(taskDetail?.id===deleteId||taskDetail?.image?.id===deleteId)setTaskDetail(null);
      setDeleteTarget(null);
      setMsg?.(data.message||'图片已删除');
      refreshRecent();
    }catch(err){
      setMsg?.(err.message||'删除失败');
    }finally{
      setDeleteTarget(null);
    }
  }

  async function openRecentTask(item){
    try{
      if(item.status&&item.status!=='succeeded')return setMsg?.(item.statusMessage||item.errorMessage||(item.status==='failed'?'生成图片失败：模型服务异常':'任务正在生成'));
      setTaskDetailLoading(true);
      setTaskDetail(await (isRecentTaskItem(item)?fetchTaskDetail(item.id):fetchImageDetail(recentImageId(item))));
    }catch(e){
      setMsg?.(e.message);
    }finally{
      setTaskDetailLoading(false);
    }
  }

  return {
    recent,
    setRecent,
    taskDetail,
    setTaskDetail,
    taskDetailLoading,
    recentSourcePreview,
    recentHoverId,
    setRecentHoverId,
    deleteTarget,
    setDeleteTarget,
    refreshRecent,
    pollAiTask,
    recentTypeName,
    recentPreviewSrc,
    showRecentOriginal,
    moveRecentOriginal,
    hideRecentOriginal,
    deleteRecentTask,
    confirmDeleteRecentTask,
    openRecentTask
  };
}
