import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{Download,X}from'lucide-react';

function isStandalone(){
  return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator?.standalone===true;
}

function isIos(){
  return /iphone|ipad|ipod/i.test(window.navigator?.userAgent||'');
}

export default function PwaInstallButton({className='',compact=false}){
  const[promptEvent,setPromptEvent]=useState(null);
  const[visible,setVisible]=useState(false);
  const[helpOpen,setHelpOpen]=useState(false);

  useEffect(()=>{
    if(typeof window==='undefined')return undefined;
    if(isStandalone())return undefined;
    setVisible(true);
    const onPrompt=e=>{
      e.preventDefault();
      setPromptEvent(e);
      setVisible(true);
    };
    const onInstalled=()=>{
      setPromptEvent(null);
      setVisible(false);
      setHelpOpen(false);
    };
    window.addEventListener('beforeinstallprompt',onPrompt);
    window.addEventListener('appinstalled',onInstalled);
    return()=>{
      window.removeEventListener('beforeinstallprompt',onPrompt);
      window.removeEventListener('appinstalled',onInstalled);
    };
  },[]);

  async function install(){
    if(promptEvent){
      promptEvent.prompt();
      const choice=await promptEvent.userChoice.catch(()=>null);
      setPromptEvent(null);
      if(choice?.outcome==='accepted')setVisible(false);
      return;
    }
    setHelpOpen(true);
  }

  if(!visible)return null;
  const label=compact?'安装':'安装应用';

  return <>
    <button type="button" className={`pwaInstallBtn ${className}`.trim()} onClick={install} aria-label="安装勋港应用">
      <Download size={16}/>
      <span>{label}</span>
    </button>
    {helpOpen&&createPortal(<div className="pwaInstallHelpMask" onClick={()=>setHelpOpen(false)}>
      <div className="pwaInstallHelpCard" onClick={e=>e.stopPropagation()}>
        <button type="button" className="pwaInstallHelpClose" onClick={()=>setHelpOpen(false)} aria-label="关闭安装说明"><X size={18}/></button>
        <h2>安装勋港应用</h2>
        {isIos()?<p>在 Safari 中打开本页面，点击分享按钮，然后选择“添加到主屏幕”。</p>:<p>在 Chrome 或 Edge 中打开本页面，点击地址栏右侧的安装图标，或在浏览器菜单中选择“安装应用”。</p>}
        <p>安装后打开的仍然是同一个勋港平台。未登录会进入登录/注册流程，已登录则直接进入对应工作台。</p>
        <small>正式域名需要 HTTPS 后浏览器才会显示系统安装入口；localhost 和 127.0.0.1 可用于本地测试。</small>
      </div>
    </div>,document.body)}
  </>;
}
