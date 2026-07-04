// 该文件用于渲染项目公开首页，展示勋港品牌、核心能力、视觉流水线和套餐方向，不承载登录后业务页面逻辑。
import React,{useCallback,useEffect,useRef,useState}from'react';
import{ArrowRight,Brush,CheckCircle2,Image as ImageIcon,Layers3,Sparkles,UploadCloud,WandSparkles}from'lucide-react';
import gsap from'gsap';
import{ScrollTrigger}from'gsap/ScrollTrigger';
import{MotionPathPlugin}from'gsap/MotionPathPlugin';
import{SplitText}from'gsap/SplitText';
import{CustomEase}from'gsap/CustomEase';
import{BrandMark,PwaInstallButton}from'../shared/ui/index.jsx';

gsap.registerPlugin(ScrollTrigger,MotionPathPlugin,SplitText,CustomEase);

const featureCards=[
  ['01','材质替换','快速预览面料、皮革、木色等 SKU 效果，减少重复拍摄和人工修图。',Brush],
  ['02','背景净化','清理仓库、展厅和杂物背景，保留家具主体、结构比例与真实质感。',WandSparkles],
  ['03','场景融合','为单品生成更适合电商展示和门店宣传的家居空间画面。',Layers3],
  ['04','摄影增强','改善光影、清晰度、轮廓和质感，让普通照片更接近商业成片。',Sparkles],
  ['05','门店协作','支持管理员、员工、体验账号分层使用，额度、任务和资源可追溯。',CheckCircle2],
  ['06','素材沉淀','生成结果进入任务与资源体系，方便复用、下载、继续创作和管理。',ImageIcon]
];

const workflowSteps=[
  ['上传原图','从本地或资源库选择家具图片，保留源图与任务关系。'],
  ['选择能力','按需求选择材质替换、背景净化、场景融合和生成规格。'],
  ['生成结果','成功调用后记录任务，失败后分析原因，提示用户。'],
  ['资产复用','结果沉淀到历史任务和资源库，用于后续下载、管理和继续创作。']
];

const sceneCards=[
  ['电商主图','提升背景干净度和商品主体质感。'],
  ['详情页素材','补充不同角度、材质和场景表达。'],
  ['门店推广','为活动、套餐和邀请转化准备视觉内容。']
];

const heroImages={
  source:'/landing/hero/original.webp',
  result:'/landing/hero/result.webp'
};

const workflowImages=[
  ['/landing/workflow/01-original.webp','原始照片','门店实拍家具图',UploadCloud],
  ['/landing/workflow/02-clean.webp','背景净化','主体清晰，背景干净',WandSparkles],
  ['/landing/workflow/03-material.webp','材质替换','快速预览 SKU 效果',Brush],
  ['/landing/workflow/04-scene.webp','场景融合','适合展示的家居空间',Layers3]
];
const workflowLoopImages=workflowImages.length>1?[...workflowImages,workflowImages[0]]:workflowImages;

function ChairGraphic(){
  return <div className="landingChair" aria-hidden="true">
    <i className="chairBack"/>
    <i className="chairSeat"/>
    <i className="chairLeg chairLegA"/>
    <i className="chairLeg chairLegB"/>
    <i className="chairLeg chairLegC"/>
    <i className="chairRail"/>
  </div>;
}

function DemoPanel({kind,label,imgSrc}){
  return <div className={`landingDemoPanel ${kind} hasImage`}>
    <i className="landingPanelShine" aria-hidden="true"/>
    <img className="landingDemoImg" src={imgSrc} alt={label} loading="lazy" decoding="async" fetchPriority="high" onError={e=>{e.currentTarget.hidden=true}}/>
    <div className="landingPanelGrid"/>
    <span>{label}</span>
    <div className="landingSceneFloor"/>
    <ChairGraphic/>
  </div>;
}

export default function LandingPage({me}){
  const rootRef=useRef(null);
  const[workflowIndex,setWorkflowIndex]=useState(0);
  const[workflowTransition,setWorkflowTransition]=useState(true);
  const workbenchHash=me?.role==='SYSTEM_ADMIN'?'#/dashboard':'#/workbench';
  const enterHref=me?workbenchHash:'#/login';
  const scrollToSection=useCallback((id)=>{
    const target=document.getElementById(id);
    if(!target)return;
    const top=target.getBoundingClientRect().top+window.scrollY-88;
    window.scrollTo({top,behavior:'smooth'});
  },[]);

  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return undefined;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const userAgent=window.navigator?.userAgent||'';
    const automated=userAgent.toLowerCase().includes('headless');
    const lighterMotion=window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    if(reduced||automated){
      gsap.set(root.querySelectorAll('.landingReveal'),{autoAlpha:1,y:0});
      return undefined;
    }

    let splitTitle=null;
    let cleanupLandingAnimations=()=>{};
    const ctx=gsap.context(()=>{
      const cinemaEase=CustomEase.create('landingCinema','M0,0 C0.12,0 0.08,0.18 0.16,0.32 0.28,0.56 0.44,0.94 1,1');
      try{
        if(lighterMotion)throw new Error('skip split text on small or touch screens');
        splitTitle=SplitText.create('.landingHeroTitle',{type:'lines,words',mask:'lines'});
      }catch{
        splitTitle=null;
      }

      const intro=gsap.timeline({defaults:{ease:cinemaEase}});
      intro
        .from('.landingNav',{y:-72,autoAlpha:0,duration:0.8})
        .from(splitTitle?.words||'.landingHeroTitle',{y:lighterMotion?34:72,rotationX:lighterMotion?0:-24,autoAlpha:0,stagger:lighterMotion?0:0.035,duration:lighterMotion?0.68:0.9,transformOrigin:'50% 100%'},'-=0.25')
        .from('.landingHeroCopy, .landingHeroActions, .landingMetaCard',{y:28,autoAlpha:0,stagger:0.08,duration:0.72},'-=0.5')
        .from('.landingHeroStage',{x:lighterMotion?0:56,y:lighterMotion?24:0,rotationY:lighterMotion?0:-7,autoAlpha:0,duration:lighterMotion?0.76:1.05},'-=0.86')
        .from('.landingStageBadge, .landingFloatCard, .landingStageGallery',{y:26,autoAlpha:0,stagger:0.06,duration:0.7},'-=0.7');

      const idleTweens=[
        gsap.to('.landingButtonShine, .landingPanelShine',{xPercent:420,duration:2.2,repeat:-1,repeatDelay:4.2,ease:'power2.inOut'})
      ];
      if(!lighterMotion){
        idleTweens.push(gsap.to('.landingLogoPulse',{rotation:360,duration:26,repeat:-1,ease:'none',transformOrigin:'50% 50%'}));
        idleTweens.push(gsap.to('.landingOrbitLines',{rotation:360,svgOrigin:'420 260',duration:56,repeat:-1,ease:'none'}));
        idleTweens.push(gsap.to('.landingParticles circle',{x:i=>i%3?10:-10,y:i=>i%2?-14:14,autoAlpha:0.45,duration:3.2,stagger:{each:0.18,from:'random'},repeat:-1,yoyo:true,ease:'sine.inOut'}));
      }
      const pauseIdle=()=>idleTweens.forEach(t=>t.pause());
      const resumeIdle=()=>idleTweens.forEach(t=>t.resume());
      ScrollTrigger.addEventListener('scrollStart',pauseIdle);
      ScrollTrigger.addEventListener('scrollEnd',resumeIdle);
      cleanupLandingAnimations=()=>{
        ScrollTrigger.removeEventListener('scrollStart',pauseIdle);
        ScrollTrigger.removeEventListener('scrollEnd',resumeIdle);
        splitTitle?.revert();
      };

      ScrollTrigger.batch('.landingFeatureCard, .landingScenePanel, .landingMiniScene, .landingPlanCard, .landingReveal:not(.landingHeroArea .landingReveal)',{
        start:'top 84%',
        once:true,
        interval:0.12,
        batchMax:6,
        onEnter:batch=>gsap.fromTo(batch,{y:lighterMotion?24:46,autoAlpha:0},{y:0,autoAlpha:1,stagger:0.06,duration:lighterMotion?0.56:0.76,ease:cinemaEase,overwrite:'auto'})
      });

      gsap.timeline({scrollTrigger:{trigger:'.landingFlowStage',start:'top 76%',once:true}})
        .from('.landingFlowLine',{strokeDasharray:1800,strokeDashoffset:1800,duration:lighterMotion?0.65:1,ease:'power2.out'})
        .fromTo('.landingFlowDot',{autoAlpha:0,scale:0.65},{autoAlpha:1,scale:1,duration:0.42,ease:'back.out(1.6)'},0.12)
        .to('.landingFlowDot',{motionPath:{path:'.landingFlowLine',align:'.landingFlowLine',autoRotate:false},duration:lighterMotion?0.72:1.05,ease:'power2.inOut'},0.05)
        .fromTo('.landingFlowStep',{y:lighterMotion?28:54,autoAlpha:0},{y:0,autoAlpha:1,stagger:0.08,duration:lighterMotion?0.52:0.68,ease:cinemaEase},0.1)
        .fromTo('.landingWorkflowImage',{autoAlpha:0.92},{autoAlpha:1,duration:lighterMotion?0.38:0.5,ease:'power2.out'},0.12);
    },root);

    return()=>{
      cleanupLandingAnimations();
      ctx.revert();
    };
  },[]);

  useEffect(()=>{
    if(workflowLoopImages.length<2)return undefined;
    const timer=setInterval(()=>{
      setWorkflowTransition(true);
      setWorkflowIndex(index=>index+1);
    },3200);
    return()=>clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(workflowIndex!==workflowLoopImages.length-1)return undefined;
    const timer=setTimeout(()=>{
      setWorkflowTransition(false);
      setWorkflowIndex(0);
      const restore=()=>setWorkflowTransition(true);
      window.requestAnimationFrame?window.requestAnimationFrame(restore):setTimeout(restore,0);
    },760);
    return()=>clearTimeout(timer);
  },[workflowIndex]);

  return <div className="landingPage" ref={rootRef}>
    <header className="landingNav">
      <a className="landingBrand" href="#/home" aria-label="返回勋港首页">
        <BrandMark className="landingBrandMark"/>
        <span><b>勋港</b><small>智能家具 AI 修图平台</small></span>
      </a>
      <nav aria-label="首页导航">
        <button type="button" onClick={()=>scrollToSection('landingAbility')}>能力</button>
        <button type="button" onClick={()=>scrollToSection('landingWorkflow')}>流程</button>
        <button type="button" onClick={()=>scrollToSection('landingScene')}>场景</button>
        <button type="button" onClick={()=>scrollToSection('landingPlans')}>套餐</button>
      </nav>
      <div className="landingNavActions">
        <PwaInstallButton className="landingInstallBtn"/>
        <a className="landingGhostBtn" href="#/login">登录</a>
        <a className="landingGoldBtn" href={enterHref}><span className="landingButtonShine"/>进入工作台</a>
      </div>
    </header>

    <main>
      <section className="landingHero landingHeroArea">
        <div className="landingHeroContent">
          <div className="landingEyebrow landingReveal">为家具门店打造的 AI 修图工作台</div>
          <h1 className="landingHeroTitle">家具商品图        交给 AI 精修</h1>
          <p className="landingHeroCopy landingReveal">上传原图，选择功能，快速得到干净、清晰、适合展示的家具商品图。让勋港帮您把门店每天重复的修图工作，变成稳定、可管理、可复用的视觉生产流程。</p>
          <div className="landingHeroActions landingReveal">
            <a className="landingGoldBtn" href={enterHref}><span className="landingButtonShine"/>立即使用<ArrowRight size={18}/></a>
            <button className="landingGhostBtn" type="button" onClick={()=>scrollToSection('landingAbility')}>查看能力</button>
          </div>
          <div className="landingMetaGrid">
            <div className="landingMetaCard landingReveal"><b>AI生图</b><span>核心修图能力</span></div>
            <div className="landingMetaCard landingReveal"><b>4K</b><span>高清成图规格</span></div>
            <div className="landingMetaCard landingReveal"><b>门店</b><span>多人协作管理</span></div>
          </div>
        </div>

        <div className="landingHeroStage">
          <svg className="landingStageSvg" viewBox="0 0 820 520" aria-hidden="true">
            <defs>
              <linearGradient id="landingGoldLine" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f8dea0" stopOpacity="0.9"/>
                <stop offset="1" stopColor="#a9802f" stopOpacity="0.18"/>
              </linearGradient>
              <filter id="landingGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <path id="landingBrandMorph" d="M82 255 C178 108 320 112 410 256 C502 398 650 398 746 254" fill="none" stroke="url(#landingGoldLine)" strokeWidth="3" filter="url(#landingGlow)"/>
            <path id="landingBrandMorphAlt" d="M82 255 C186 253 260 134 402 148 C544 162 612 352 746 254" fill="none" stroke="none"/>
            <g className="landingOrbitLines" fill="none" stroke="#e7c76f" strokeOpacity="0.2">
              <ellipse cx="420" cy="260" rx="300" ry="114"/>
              <ellipse cx="420" cy="260" rx="228" ry="230" transform="rotate(44 420 260)"/>
              <ellipse cx="420" cy="260" rx="228" ry="230" transform="rotate(-44 420 260)"/>
            </g>
            <g className="landingParticles" fill="#f8dea0">
              {[['136','142'],['270','84'],['602','118'],['706','300'],['456','420'],['214','364'],['520','214'],['358','288']].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i%2?1.8:2.2}/>)}
            </g>
          </svg>
          <div className="landingStageTop"><span className="landingStageBadge">AI 工作流</span><span className="landingStageBadge success">实时生成演示</span></div>
          <div className="landingFloatCard a"><small>上传原图</small><b>识别家具主体</b></div>
          <div className="landingFloatCard b"><small>智能处理</small><b>风格与材质重构</b></div>
          <div className="landingFloatCard c"><small>资产沉淀</small><b>门店图库复用</b></div>
          <div className="landingStageGallery">
            <DemoPanel kind="source" label="产品原图" imgSrc={heroImages.source}/>
            <DemoPanel kind="result" label="生成结果" imgSrc={heroImages.result}/>
          </div>
        </div>
      </section>

      <section className="landingSection" id="landingAbility">
        <div className="landingSectionHead">
          <div><span className="landingKicker landingReveal">能力矩阵</span><h2 className="landingReveal">专为家具行业打造的生成式 AI</h2></div>
          {/* <p className="landingReveal">首页展示给客户看的不是技术参数，而是门店能直接感知的结果：图更干净、主体更清晰、SKU 展示更快、团队管理更有序。</p> */}
        </div>
        <div className="landingFeatureGrid">
          {featureCards.map(([num,title,text,Icon])=><article className="landingFeatureCard" key={title}>
            <span>{num}</span><i><Icon size={24}/></i><h3>{title}</h3><p>{text}</p>
          </article>)}
        </div>
      </section>

      <section className="landingSection landingWorkflow" id="landingWorkflow">
        <div className="landingSectionHead">
          <div><span className="landingKicker landingReveal">视觉流水线</span><h2 className="landingReveal">从一张原图到可投放素材。</h2></div>
          {/* <p className="landingReveal">这里后续可以替换成真实家具图片。建议放 4 到 5 张固定宣传图，滚动时依次展示原图、净化、换材质、场景融合和最终图。</p> */}
        </div>
        <div className="landingFlowStage">
          <svg className="landingFlowSvg" viewBox="0 0 1200 620" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="landingFlowGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e7c76f" stopOpacity="0.05"/><stop offset="0.42" stopColor="#f8dea0" stopOpacity="0.9"/><stop offset="1" stopColor="#e7c76f" stopOpacity="0.08"/></linearGradient></defs>
            <path className="landingFlowLine" d="M80 230 C260 80 390 400 560 238 C720 84 860 400 1120 198" fill="none" stroke="url(#landingFlowGold)" strokeWidth="4" strokeLinecap="round"/>
            <circle className="landingFlowDot" cx="80" cy="230" r="9" fill="#f8dea0"/>
          </svg>
          <div className="landingWorkflowPreview">
            <div className="landingWorkflowImage" style={{
              '--workflow-frame-count':workflowLoopImages.length,
              transform:`translate3d(0,${-workflowIndex*(100/workflowLoopImages.length)}%,0)`,
              transition:workflowTransition?'transform 720ms cubic-bezier(.22,.8,.24,1)':'none'
            }}>
              {workflowLoopImages.map(([src,title,text,Icon],index)=><div className={`workflowFrame frame${index+1}`} key={`${src}-${index}`}>
                <img src={src} alt={title} loading="lazy" decoding="async" onError={e=>{e.currentTarget.hidden=true}}/>
                <div className="workflowFrameText"><Icon size={28}/><b>{title}</b><span>{text}</span></div>
              </div>)}
            </div>
          </div>
          <div className="landingFlowTrack">
            {workflowSteps.map(([title,text])=><div className="landingFlowStep" key={title}><b>{title}</b><span>{text}</span></div>)}
          </div>
        </div>
      </section>

      <section className="landingSection" id="landingScene">
        <div className="landingSectionHead">
          <div><span className="landingKicker landingReveal">业务场景</span><h2 className="landingReveal">围绕门店每天真实会用的工作。</h2></div>
          {/* <p className="landingReveal">让客户看到它可以处理主图、详情图、SKU 图和宣传素材，而不是只停留在“AI 很炫”的展示。</p> */}
        </div>
        <div className="landingSceneGrid">
          <article className="landingScenePanel"><h3>家具商品图、门店素材和团队额度统一管理。</h3>
          {/* <p>平台管理员、门店管理员、员工和体验账号的操作路径清晰，适合从单店试用逐步扩展到多门店协作。</p> */}
          <div className="landingSceneOrbit"/></article>
          <div className="landingSceneStack">{sceneCards.map(([title,text])=><article className="landingMiniScene" key={title}><b>{title}</b><span>{text}</span></article>)}</div>
        </div>
      </section>

      <section className="landingSection landingPlans" id="landingPlans">
        <div className="landingSectionHead">
          {/* <h2 className="landingReveal">先按量稳定，再扩展套餐与会员。</h2> */}
          <div><span className="landingKicker landingReveal">商业化方向</span></div>
          {/* <p className="landingReveal">当前页面先展示产品价值，不把价格写死。后续可以把按量充值、优惠包、会员权益组合成转化页。</p> */}
        </div>
        <div className="landingPlanGrid">
          <article className="landingPlanCard"><h3>按量充值</h3><b>灵活</b><p>适合低频门店和测试客户，余额继续保留，不影响后续套餐。</p></article>
          <article className="landingPlanCard featured"><h3>门店套餐</h3><b>优惠包</b><p>按月或季度提供更低单次成本，适合持续生产商品图的门店。</p></article>
          <article className="landingPlanCard"><h3>渠道邀请</h3><b>合作</b><p>通过邀请、代理和门店充值记录沉淀收益，形成长期获客渠道。</p></article>
        </div>
      </section>
    </main>

    <footer className="landingFooter">
      <a className="landingBrand" href="#/home"><BrandMark className="landingBrandMark"/><span><b>勋港</b><small>智能家具 AI 修图平台</small></span></a>
      <div className="landingFooterInfo">
        <span>© 2026 勋港。保留所有权利。</span>
        <a className="landingIcpLink" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">粤ICP备2026071107号</a>
        <span>审核通过日期：2026-06-04</span>
      </div>
    </footer>
  </div>;
}
