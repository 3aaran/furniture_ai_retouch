import React from 'react';

export const AI_MODEL_OPTIONS=[
  {label:'本地模拟',provider:'mock',modelName:'local-mock-model',baseUrl:'',apiPath:''},
  {label:'智谱 CogView-3-Flash',provider:'zhipu',modelName:'cogview-3-flash',baseUrl:'',apiPath:'https://open.bigmodel.cn/api/paas/v4/images/generations'},
  {label:'GPT Image 2',provider:'gpt-image-2',modelName:'gpt-image-2',baseUrl:'',apiPath:'https://api.lk888.ai/v1/media/generate'},
  {label:'自定义 HTTP',provider:'custom',modelName:'custom-image-model',baseUrl:'',apiPath:''}
];

export const modelOptionValue=o=>`${o.provider}::${o.modelName}`;

export function findModelOption(provider,modelName){
  return AI_MODEL_OPTIONS.find(o=>o.provider===(provider||'')&&o.modelName===(modelName||''))||AI_MODEL_OPTIONS.find(o=>o.provider===(provider||''))||AI_MODEL_OPTIONS[0];
}

export function ModelSelect({value,onChange}){
  return <select value={value} onChange={e=>onChange(e.target.value)}>{AI_MODEL_OPTIONS.map(o=><option key={modelOptionValue(o)} value={modelOptionValue(o)}>{o.label}</option>)}</select>;
}

export function updateAiModelSelection(setAi,value){
  const option=AI_MODEL_OPTIONS.find(o=>modelOptionValue(o)===value)||AI_MODEL_OPTIONS[0];
  setAi(ai=>({...ai,providerConfig:{...(ai?.providerConfig||{}),provider:option.provider,defaultModel:option.modelName,defaultApiPath:option.apiPath,baseUrl:''},features:(ai?.features||[]).map(f=>({...f,provider:option.provider,modelName:option.modelName,apiPath:option.apiPath}))}));
}

export function updateFeatureModelSelection(setAi,index,value){
  const option=AI_MODEL_OPTIONS.find(o=>modelOptionValue(o)===value)||AI_MODEL_OPTIONS[0];
  setAi(ai=>{const next={...ai,features:[...(ai?.features||[])]};next.features[index]={...next.features[index],provider:option.provider,modelName:option.modelName,apiPath:option.apiPath};return next});
}
