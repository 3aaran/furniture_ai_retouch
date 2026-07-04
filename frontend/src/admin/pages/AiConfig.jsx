import React,{useEffect,useState}from'react';
import{BrainCircuit}from'lucide-react';
import{req}from'../../appShared.jsx';
import{getFeatureDisplayName}from'../../config/uiText.js';
import{findModelOption,modelOptionValue,ModelSelect,updateAiModelSelection,updateFeatureModelSelection}from'../adminAiModelOptions.jsx';

export default function AiConfig({setMsg}){
  const[ai,setAi]=useState(null);
  useEffect(()=>{req('/api/admin/ai/config').then(setAi).catch(e=>setMsg(e.message))},[]);
  function updateProvider(k,v){setAi(a=>({...a,providerConfig:{...(a?.providerConfig||{}),[k]:v}}))}
  function updateFeature(i,k,v){setAi(a=>{const next={...a,features:[...(a?.features||[])]};next.features[i]={...next.features[i],[k]:v};return next})}
  async function save(){try{await req('/api/admin/ai/config',{method:'POST',body:JSON.stringify(ai)});setMsg('AI模型配置已保存');req('/api/admin/ai/config').then(setAi).catch(()=>{})}catch(e){setMsg(e.message)}}
  return <section className="panel settings aiConfigPageV2"><h2><BrainCircuit/> AI 模型配置</h2>{!ai?<div className="empty">AI 配置加载中...</div>:<><div className="aiConfigBoxV2"><h3>全局模型服务</h3><div className="grid2"><label>模型服务<ModelSelect value={modelOptionValue(findModelOption(ai.providerConfig?.provider,ai.providerConfig?.defaultModel))} onChange={v=>updateAiModelSelection(setAi,v)}/></label><label>接口密钥<input placeholder={ai.providerConfig?.apiKeyMasked||'保存后自动脱敏显示'} value={ai.providerConfig?.apiKey||''} onChange={e=>updateProvider('apiKey',e.target.value)}/></label><label className="full">接口路径地址<input placeholder="https://example.com/v1/images/generations" value={ai.providerConfig?.defaultApiPath||''} onChange={e=>updateProvider('defaultApiPath',e.target.value)}/></label></div><label className="check"><input type="checkbox" checked={!!ai.providerConfig?.enabled} onChange={e=>updateProvider('enabled',e.target.checked)}/> 启用 AI 生成功能</label></div><div className="aiConfigBoxV2"><h3>功能模型映射</h3><div className="aiFeatureTableV2"><div className="aiFeatureHeadV2"><b>功能</b><b>启用</b><b>模型来源</b><b>模型名称</b><b>接口路径地址</b></div>{(ai.features||[]).map((f,i)=><div className="aiFeatureRowV2" key={f.featureKey}><span>{getFeatureDisplayName(f.featureKey,f.featureName||'未知功能')}</span><input type="checkbox" checked={!!f.enabled} onChange={e=>updateFeature(i,'enabled',e.target.checked)}/><input readOnly value={f.provider||''}/><ModelSelect value={modelOptionValue(findModelOption(f.provider,f.modelName))} onChange={v=>updateFeatureModelSelection(setAi,i,v)}/><input placeholder="可为该功能单独填写完整接口地址" value={f.apiPath||''} onChange={e=>updateFeature(i,'apiPath',e.target.value)}/></div>)}</div></div><button className="submit" onClick={save}>保存 AI 配置</button></>}</section>;
}
