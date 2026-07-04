import {buildAiTaskPayload,buildWorkbenchGenerationOptions,calculateWorkbenchCost} from '../model/workbenchGeneration.js';
import {createAiTask} from '../api/workbenchApi.js';

export function useWorkbenchGeneration({
  origin,
  op,
  currentTemplate,
  resolution,
  ratio,
  studioLight,
  removeOpts,
  enhanceOpts,
  multiView,
  promotionOptions,
  custom,
  reference,
  costSettings,
  ops,
  setMsg,
  setMe,
  setRecent,
  pollAiTask
}){
  function calcWorkbenchCost(nextOp=op,nextResolution=resolution){
    return calculateWorkbenchCost({costSettings,ops,nextOp,nextResolution});
  }

  function buildGenerationOptions(){
    return buildWorkbenchGenerationOptions({
      op,
      tpl:currentTemplate(),
      resolution,
      ratio,
      studioLight,
      removeOpts,
      enhanceOpts,
      multiView,
      promotionOptions
    });
  }

  async function gen(){
    if(!origin)return setMsg?.('请先上传家具原图');
    try{
      const tpl=currentTemplate();
      const options=buildGenerationOptions();
      const data=await createAiTask(buildAiTaskPayload({origin,op,tpl,custom,reference,resolution,ratio,options}));
      if(data.user)setMe?.(data.user);
      setMsg?.('任务已提交，正在生成');
      if(data.task)setRecent?.(prev=>[data.task,...prev.filter(item=>item.id!==data.task.id)].slice(0,20));
      if(data.task?.id)pollAiTask?.(data.task.id);
    }catch(error){
      setMsg?.(error.message);
    }
  }

  return {
    calcWorkbenchCost,
    buildGenerationOptions,
    gen
  };
}
