import React from'react';
import{Brush,CheckCircle2,Image as ImageIcon,Layers3,Sparkles,UploadCloud,WandSparkles}from'lucide-react';

export const featureCards=[
  ['01','材质替换','快速预览面料、皮革、木色等 SKU 效果，减少重复拍摄和人工修图。',Brush],
  ['02','背景净化','清理仓库、展厅和杂物背景，保留家具主体、结构比例与真实质感。',WandSparkles],
  ['03','场景融合','为单品生成更适合电商展示和门店宣传的家居空间画面。',Layers3],
  ['04','摄影增强','改善光影、清晰度、轮廓和质感，让普通照片更接近商业成片。',Sparkles],
  ['05','门店协作','支持管理员、员工、体验账号分层使用，额度、任务和资源可追溯。',CheckCircle2],
  ['06','素材沉淀','生成结果进入任务与资源体系，方便复用、下载、继续创作和管理。',ImageIcon]
];

export const workflowSteps=[
  ['上传原图','从本地或资源库选择家具图片，保留源图与任务关系。'],
  ['选择能力','按需求选择材质替换、背景净化、场景融合和生成规格。'],
  ['生成结果','成功调用后记录任务，失败后分析原因，提示用户。'],
  ['资产复用','结果沉淀到历史任务和资源库，用于后续下载、管理和继续创作。']
];

export const sceneCards=[
  ['电商主图','提升背景干净度和商品主体质感。'],
  ['详情页素材','补充不同角度、材质和场景表达。'],
  ['门店推广','为活动、套餐和邀请转化准备视觉内容。']
];

export const heroSignals=['背景净化','材质替换','场景融合','摄影增强'];

export const heroStats=[
  ['4K','高清成图规格'],
  ['门店','多人协作管理'],
  ['资源库','素材沉淀复用']
];

export const stageTasks=[
  ['原图检测','主体、边缘、背景噪点'],
  ['AI 精修','光影、材质、空间一致性'],
  ['结果归档','任务、资源、额度记录']
];

export const heroImages={
  source:'/landing/hero/original.webp',
  result:'/landing/hero/result.webp'
};

export const workflowImages=[
  ['/landing/workflow/01-original.webp','原始照片','门店实拍家具图',UploadCloud],
  ['/landing/workflow/02-clean.webp','背景净化','主体清晰，背景干净',WandSparkles],
  ['/landing/workflow/03-material.webp','材质替换','快速预览 SKU 效果',Brush],
  ['/landing/workflow/04-scene.webp','场景融合','适合展示的家居空间',Layers3]
];
export const workflowLoopImages=workflowImages.length>1?[...workflowImages,workflowImages[0]]:workflowImages;

export function ChairGraphic(){
  return <div className="landingChair" aria-hidden="true">
    <i className="chairBack"/>
    <i className="chairSeat"/>
    <i className="chairLeg chairLegA"/>
    <i className="chairLeg chairLegB"/>
    <i className="chairLeg chairLegC"/>
    <i className="chairRail"/>
  </div>;
}

export function DemoPanel({kind,label,imgSrc}){
  return <div className={`landingDemoPanel ${kind} hasImage`}>
    <i className="landingPanelShine" aria-hidden="true"/>
    <img className="landingDemoImg" src={imgSrc} alt={label} loading="lazy" decoding="async" fetchPriority="high" onError={e=>{e.currentTarget.hidden=true}}/>
    <div className="landingPanelGrid"/>
    <span>{label}</span>
    <div className="landingSceneFloor"/>
    <ChairGraphic/>
  </div>;
}
