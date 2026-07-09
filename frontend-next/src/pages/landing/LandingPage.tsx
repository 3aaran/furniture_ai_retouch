import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { PwaInstallButton } from '../../components/pwa/PwaInstallButton';
import { Button } from '../../components/ui/Button';
import { hasActiveAuthSession } from '../../stores/auth.store';
import './LandingPage.css';

const navItems = [
  { href: '#capabilities', label: '能力' },
  { href: '#workflow', label: '流程' },
  { href: '#scenes', label: '场景' },
  { href: '#plans', label: '套餐' },
];

const heroSignals = ['背景净化', '材质替换', '场景融合', '摄影增强'];

const heroStats = [
  { value: '4K', label: '高清成图规格' },
  { value: '门店', label: '多人协作管理' },
  { value: '资源库', label: '素材沉淀复用' },
];

const stageTasks = [
  { title: '原图检测', desc: '主体、边缘、背景噪点' },
  { title: 'AI 精修', desc: '光影、材质、空间一致性' },
  { title: '结果归档', desc: '任务、资源、额度记录' },
];

const featureCards = [
  { num: '01', title: '材质替换', desc: '快速预览面料、皮革、木色等 SKU 效果，减少重复拍摄和人工修图。' },
  { num: '02', title: '背景净化', desc: '清理仓库、展厅和杂物背景，保留家具主体、结构比例与真实质感。' },
  { num: '03', title: '场景融合', desc: '为单品生成更适合电商展示和门店宣传的家居空间画面。' },
  { num: '04', title: '摄影增强', desc: '改善光影、清晰度、轮廓和质感，让普通照片更接近商业成片。' },
  { num: '05', title: '门店协作', desc: '支持管理员、员工、体验账号分层使用，额度、任务和资源可追溯。' },
  { num: '06', title: '素材沉淀', desc: '生成结果进入任务与资源体系，方便复用、下载、继续创作和管理。' },
];

const workflowSteps = [
  { title: '上传原图', desc: '从本地或资源库选择家具图片，保留源图与任务关系。' },
  { title: '选择能力', desc: '按需求选择材质替换、背景净化、场景融合和生成规格。' },
  { title: '生成结果', desc: '成功调用后记录任务，失败后分析原因，提示用户。' },
  { title: '资产复用', desc: '结果沉淀到历史任务和资源库，用于后续下载、管理和继续创作。' },
];

const heroImages = {
  source: '/landing/hero/original.webp',
  result: '/landing/hero/result.webp',
};

const workflowFrames = [
  { src: '/landing/workflow/01-original.webp', title: '原始照片', desc: '门店实拍家具图' },
  { src: '/landing/workflow/02-clean.webp', title: '背景净化', desc: '主体清晰，背景干净' },
  { src: '/landing/workflow/03-material.webp', title: '材质替换', desc: '快速预览 SKU 效果' },
  { src: '/landing/workflow/04-scene.webp', title: '场景融合', desc: '适合展示的家居空间' },
];

const sceneCards = [
  { title: '电商主图', desc: '提升背景干净度和商品主体质感。' },
  { title: '详情页素材', desc: '补充不同角度、材质和场景表达。' },
  { title: '门店推广', desc: '为活动、套餐和邀请转化准备视觉内容。' },
];

const planCards = [
  { title: '按量充值', value: '灵活', desc: '适合低频门店和测试客户，余额继续保留，不影响后续套餐。' },
  { title: '门店套餐', value: '优惠包', desc: '按月或季度提供更低单次成本，适合持续生产商品图的门店。' },
  { title: '渠道邀请', value: '合作', desc: '通过邀请、代理和门店充值记录沉淀收益，形成长期获客渠道。' },
];

export function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasActiveAuthSession());

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(hasActiveAuthSession());
    window.addEventListener('storage', syncAuth);
    window.addEventListener('focus', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('focus', syncAuth);
    };
  }, []);

  return (
    <div className="appRoot landingPageNext">
      <header className="landingTopbarNext">
        <Link to="/" className="landingBrandLink" aria-label="返回勋港首页">
          <BrandLogo />
        </Link>
        <nav className="landingNavNext" aria-label="首页导航">
          {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="landingTopActions">
          <PwaInstallButton className="landingInstallBtnNext" />
          {!isLoggedIn && <Link to="/login" className="landingTextLink">登录</Link>}
          <Link to="/studio"><Button>进入工作台</Button></Link>
        </div>
      </header>

      <main className="landingHeroNext">
        <section className="landingHeroCopyNext">
          <span className="landingEyebrowNext">为家具门店打造的 AI 修图工作台</span>
          <h1>家具商品图<br />交给 AI 精修</h1>
          <p>上传原图，选择功能，快速得到干净、清晰、适合展示的家具商品图。让勋港把门店每天重复的修图工作，变成稳定、可管理、可复用的视觉生产流程。</p>
          <div className="landingHeroActionsNext">
            <Link to="/studio"><Button>立即使用</Button></Link>
            <a href="#capabilities"><Button variant="ghost">查看能力</Button></a>
          </div>
          <div className="landingTagRowNext" aria-label="首页核心能力标签">
            {heroSignals.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="landingMetaGridNext">
            {heroStats.map((item) => (
              <span key={item.value}>
                <b>{item.value}</b>
                <small>{item.label}</small>
              </span>
            ))}
          </div>
        </section>

        <section className="landingVisualNext" aria-label="AI 修图任务状态">
          <div className="landingVisualBadge">AI 工作流</div>
          <div className="landingMotionLine" aria-hidden="true" />
          <div className="heroVisualGridNext">
            <div className="visualProduct before">
              <img src={heroImages.source} alt="产品原图" loading="eager" />
              <span>产品原图</span>
            </div>
            <div className="visualProduct after">
              <img src={heroImages.result} alt="生成结果" loading="eager" />
              <span>生成结果</span>
            </div>
          </div>
          <article className="visualCard pipelineCard">
            <div className="visualCardHead">
              <small>Visual Pipeline</small>
              <strong>RUNNING</strong>
            </div>
            <div className="pipelineRows">
              {stageTasks.map((step) => (
                <span key={step.title}>
                  <i />
                  <b>{step.title}</b>
                  <em>{step.desc}</em>
                </span>
              ))}
            </div>
          </article>
          <div className="heroSignalGridNext">
            <div className="visualFloatCard"><small>上传原图</small><b>识别家具主体</b></div>
            <div className="visualFloatCard"><small>智能处理</small><b>风格与材质重构</b></div>
            <div className="visualFloatCard"><small>资产沉淀</small><b>门店图库复用</b></div>
          </div>
        </section>
      </main>

      <section id="capabilities" className="landingSectionNext">
        <div className="landingSectionHeadNext">
          <span>能力矩阵</span>
          <h2>专为家具行业打造的生成式 AI</h2>
        </div>
        <div className="landingFeatureGridNext">
          {featureCards.map((item) => (
            <article key={item.title} className="cardSurface landingFeatureCardNext">
              <span>{item.num}</span>
              <b>{item.title}</b>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="landingSectionNext landingWorkflowNext">
        <div className="landingSectionHeadNext">
          <span>视觉流水线</span>
          <h2>从一张原图到可投放素材。</h2>
        </div>
        <div className="landingFlowStageNext">
          <div className="workflowCarouselNext" aria-label="视觉流水线图片演示">
            <div className="workflowCarouselViewportNext">
              {workflowFrames.map((item, index) => (
                <figure key={item.title} className={`workflowSlideNext slide${index + 1}`}>
                  <img src={item.src} alt={item.title} loading="lazy" decoding="async" />
                  <figcaption>
                    <small>0{index + 1}</small>
                    <b>{item.title}</b>
                    <span>{item.desc}</span>
                  </figcaption>
                </figure>
              ))}
              <div className="workflowScanNext" aria-hidden="true" />
            </div>
            <div className="workflowIndicatorNext" aria-hidden="true">
              {workflowFrames.map((item, index) => (
                <span key={item.title} className={`indicator${index + 1}`}>
                  <b>0{index + 1}</b>
                  <em>{item.title}</em>
                </span>
              ))}
            </div>
          </div>
          <div className="workflowGridNext">
            {workflowSteps.map((item) => (
              <article key={item.title} className="workflowCardNext">
                <b>{item.title}</b>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="scenes" className="landingSectionNext landingScenesNext">
        <div className="landingSectionHeadNext">
          <span>业务场景</span>
          <h2>围绕门店每天真实会用的工作。</h2>
        </div>
        <div className="landingSceneGridNext">
          <article className="landingScenePanelNext cardSurface">
            <h3>家具商品图、门店素材和团队额度统一管理。</h3>
            <div className="landingSceneOrbitNext" />
          </article>
          <div className="sceneListNext">
            {sceneCards.map((item) => (
              <article key={item.title} className="cardSurface sceneCardNext">
                <b>{item.title}</b>
                <span>{item.desc}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="landingSectionNext landingPlansNext">
        <div className="landingSectionHeadNext compact">
          <span>商业化方向</span>
        </div>
        <div className="planGridNext">
          {planCards.map((item) => (
            <article key={item.title} className="cardSurface planCardNext">
              <h3>{item.title}</h3>
              <b>{item.value}</b>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landingFooterNext">
        <BrandLogo />
        <div className="landingFooterInfoNext">
          <span>© 2026 勋港。保留所有权利。</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">粤ICP备2026071107号</a>
          <span>审核通过日期：2026-06-04</span>
        </div>
      </footer>
    </div>
  );
}
