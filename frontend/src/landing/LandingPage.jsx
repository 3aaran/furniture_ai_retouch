// 该文件用于渲染项目公开首页，展示勋港品牌、核心能力、视觉流水线和套餐方向，不承载登录后业务页面逻辑。
import React,{useCallback,useEffect,useRef,useState}from'react';
import{ArrowRight}from'lucide-react';
import{BrandMark,PwaInstallButton}from'../shared/ui/index.jsx';
import{DemoPanel,featureCards,heroImages,heroSignals,heroStats,sceneCards,stageTasks,workflowLoopImages,workflowSteps}from'./LandingContent.jsx';
import{useLandingAnimations}from'./useLandingAnimations.js';

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

  useLandingAnimations(rootRef);

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
    <div className="rbAuroraLayer landingAurora" aria-hidden="true"><span className="orb one"/><span className="orb two"/><span className="orb three"/></div>
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
          <h1 className="landingHeroTitle"><span>家具商品图</span><span>交给 AI 精修</span></h1>
          <p className="landingHeroCopy landingReveal">上传原图，选择功能，快速得到干净、清晰、适合展示的家具商品图。让勋港把门店每天重复的修图工作，变成稳定、可管理、可复用的视觉生产流程。</p>
          <div className="landingHeroActions landingReveal">
            <a className="landingGoldBtn" href={enterHref}><span className="landingButtonShine"/>立即使用<ArrowRight size={18}/></a>
            <button className="landingGhostBtn" type="button" onClick={()=>scrollToSection('landingAbility')}>查看能力</button>
          </div>
          <div className="landingSignalStrip rbDataPulseStrip landingReveal" aria-label="首页核心能力标签">
            {heroSignals.map((item,index)=><span key={item} style={{'--rb-i':index}}>{item}</span>)}
          </div>
          <div className="landingMetaGrid">
            {heroStats.map(([value,label])=><div className="landingMetaCard rbSpotlightCard landingReveal" key={label}><b>{value}</b><span>{label}</span></div>)}
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
          <div className="landingStageTop"><span className="landingStageBadge">AI 工作流</span><span className="landingStageBadge success">轻量动态演示</span></div>
          <div className="landingStageConsole rbSpotlightCard" aria-label="AI 修图任务状态">
            <div className="landingConsoleHead"><span>Visual Pipeline</span><b>RUNNING</b></div>
            <div className="landingConsoleRows">
              {stageTasks.map(([title,text],index)=><div className="landingConsoleRow" key={title} style={{'--row-index':index}}><i/><div><b>{title}</b><small>{text}</small></div></div>)}
            </div>
          </div>
          <div className="landingFloatCard a rbSpotlightCard"><small>上传原图</small><b>识别家具主体</b></div>
          <div className="landingFloatCard b rbSpotlightCard"><small>智能处理</small><b>风格与材质重构</b></div>
          <div className="landingFloatCard c rbSpotlightCard"><small>资产沉淀</small><b>门店图库复用</b></div>
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
          {featureCards.map(([num,title,text,Icon])=><article className="landingFeatureCard rbSpotlightCard" key={title}>
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
