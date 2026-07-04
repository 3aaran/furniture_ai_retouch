import{useEffect}from'react';
import gsap from'gsap';
import{ScrollTrigger}from'gsap/ScrollTrigger';
import{MotionPathPlugin}from'gsap/MotionPathPlugin';
import{SplitText}from'gsap/SplitText';
import{CustomEase}from'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger,MotionPathPlugin,SplitText,CustomEase);

export function useLandingAnimations(rootRef){
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
}
