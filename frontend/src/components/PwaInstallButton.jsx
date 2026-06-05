import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{Download,ExternalLink,X}from'lucide-react';

function isStandalone(){
  return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator?.standalone===true;
}

function isIos(){
  return /iphone|ipad|ipod/i.test(window.navigator?.userAgent||'');
}

function isWechat(){
  return /micromessenger/i.test(window.navigator?.userAgent||'');
}

function isAndroid(){
  return /android/i.test(window.navigator?.userAgent||'');
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
  const inWechat=isWechat();
  const ios=isIos();
  const label=compact
    ? (inWechat?'浏览器':ios?'添加':'安装')
    : (inWechat?'在浏览器打开':ios?'添加到主屏幕':'安装应用');
  const Icon=inWechat?ExternalLink:Download;

  return <>
    <button type="button" className={`pwaInstallBtn ${className}`.trim()} onClick={install} aria-label="安装勋港应用">
      <Icon size={16}/>
      <span>{label}</span>
    </button>
    {helpOpen&&createPortal(<div className="pwaInstallHelpMask" onClick={()=>setHelpOpen(false)}>
      <div className="pwaInstallHelpCard" onClick={e=>e.stopPropagation()}>
        <button type="button" className="pwaInstallHelpClose" onClick={()=>setHelpOpen(false)} aria-label="关闭安装说明"><X size={18}/></button>
        <h2>{inWechat?'请在浏览器中打开':'安装勋港应用'}</h2>
        {inWechat
          ? <p>微信内置浏览器不支持安装 PWA。请点击右上角菜单，选择“在浏览器打开”，然后在 Safari、Chrome 或 Edge 中安装。</p>
          : ios
            ? <p>在 Safari 中打开本页面，点击分享按钮，然后选择“添加到主屏幕”。iPhone 不会弹出类似电脑的下载窗口。</p>
            : <p>在 Chrome 或 Edge 中打开本页面，点击地址栏右侧的安装图标，或在浏览器菜单中选择“安装应用”。</p>}
        <p>安装后打开的仍然是同一个勋港平台。未登录会进入登录/注册流程，已登录则直接进入对应工作台。</p>
        <small>{isAndroid()&&!promptEvent&&!inWechat?'如果菜单里没有安装入口，请确认不是微信/QQ内置浏览器，并刷新页面等待新版缓存接管。':'正式域名需要 HTTPS 后浏览器才会显示系统安装入口；localhost 和 127.0.0.1 可用于本地测试。'}</small>
      </div>
    </div>,document.body)}
  </>;
}
