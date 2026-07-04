export const taskStatusMap={
  SUCCESS:'\u5df2\u5b8c\u6210',
  succeeded:'\u5df2\u5b8c\u6210',
  running:'\u751f\u6210\u4e2d',
  queued:'\u6392\u961f\u4e2d',
  failed:'\u5931\u8d25',
  FAILED:'\u5931\u8d25'
};

export function parseJson(v,fallback={}){
  if(v&&typeof v==='object')return v;
  try{return JSON.parse(v||'')}catch{return fallback}
}

export function asArray(v){
  const data=parseJson(v,[]);
  return Array.isArray(data)?data:[];
}

export function joinParts(parts){
  return parts.map(x=>String(x||'').trim()).filter(Boolean).join(' / ')||'-';
}

export function textWatermarkConfig(config={}){
  return {
    ...config,
    mode:'text',
    text:String(config.text||'').trim(),
    image:'',
    imageId:'',
    imageUrl:''
  };
}

export function getTaskFeature(detail={}){
  return detail.featureKey||detail.kind||detail.operation||'';
}

export function optionTextList(featureKey,options={},userPrompt=''){
  const labels=[];
  if(options.whiteBg)labels.push('白底图');
  if(options.mirror)labels.push('镜像产品图');
  if(options.focus)labels.push('产品聚焦');
  if(options.angle&&options.angle!=='不变')labels.push(`角度：${options.angle}`);
  if(featureKey==='multiview'&&options.view)labels.push(options.view);
  if(userPrompt)labels.push(`用户要求：${userPrompt}`);
  return [...new Set(labels.map(x=>String(x||'').trim()).filter(Boolean))];
}

export function refTitleByRole(role,featureKey){
  if(role==='IMAGE_B'){
    if(featureKey==='material')return '材质参考图';
    if(featureKey==='replace_bg')return '场景参考图';
    return '功能参考图';
  }
  if(role==='IMAGE_C')return '用户参考图';
  return '参考图';
}

export function buildReferenceImages({detail={},taskParams={},selectedResource={},featureKey=''}){
  const list=[];
  const seen=new Set();
  const add=(item={},fallbackTitle='参考图',role='')=>{
    const url=item.url||item.imageUrl||item.previewUrl;
    if(!url)return;
    const key=String(item.id||item.imageId||url);
    if(seen.has(key))return;
    seen.add(key);
    list.push({
      id:item.id||item.imageId||key,
      url,
      title:item.title||item.name||item.originalName||fallbackTitle,
      role,
      roleLabel:item.roleLabel||refTitleByRole(role,featureKey)
    });
  };

  (detail.referenceImages||detail.inputImages||[]).forEach(item=>{
    const role=item.role||item.inputRole||item.input_role||'';
    if(role==='IMAGE_A')return;
    add(item,refTitleByRole(role,featureKey),role);
  });

  const sr=selectedResource||taskParams.selectedResource||{};
  if(sr.url||sr.imageUrl){
    add(sr,featureKey==='material'?'材质参考图':featureKey==='replace_bg'?'场景参考图':'功能参考图','IMAGE_B');
  }

  [taskParams.imageB,taskParams.functionalReferenceImage].filter(Boolean).forEach(item=>add(item,'功能参考图','IMAGE_B'));
  [taskParams.imageC,taskParams.userReferenceImage].filter(Boolean).forEach(item=>add(item,'用户参考图','IMAGE_C'));

  return list;
}
