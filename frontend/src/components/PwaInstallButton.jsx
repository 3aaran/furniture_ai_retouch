import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{Download,ExternalLink,Globe2,MonitorDown,Smartphone,X}from'lucide-react';

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

const androidApkUrl=import.meta.env.VITE_ANDROID_APK_URL||'/downloads/xungang.apk';
const windowsExeUrl=import.meta.env.VITE_WINDOWS_EXE_URL||'/downloads/xungang-setup.exe';

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

  async function installPwa(){
    if(promptEvent){
      promptEvent.prompt();
      const choice=await promptEvent.userChoice.catch(()=>null);
      setPromptEvent(null);
      if(choice?.outcome==='accepted')setVisible(false);
      return;
    }
  }

  if(!visible)return null;
  const inWechat=isWechat();
  const ios=isIos();
  const android=isAndroid();
  const label=compact
    ? (inWechat?'浏览器':ios?'添加':android?'下载':'安装')
    : (inWechat?'在浏览器打开':ios?'添加到主屏幕':android?'安装 / 下载':'安装应用');
  const Icon=inWechat?ExternalLink:Download;
  const title=inWechat?'请在手机浏览器中打开':'安装 / 下载勋港';

  return <>
    <button type="button" className={`pwaInstallBtn ${className}`.trim()} onClick={()=>setHelpOpen(true)} aria-label="安装或下载勋港应用">
      <Icon size={16}/>
      <span>{label}</span>
    </button>
    {helpOpen&&createPortal(<div className="pwaInstallHelpMask" onClick={()=>setHelpOpen(false)}>
      <div className="pwaInstallHelpCard" onClick={e=>e.stopPropagation()}>
        <button type="button" className="pwaInstallHelpClose" onClick={()=>setHelpOpen(false)} aria-label="关闭安装说明"><X size={18}/></button>
        <h2>{title}</h2>
        {inWechat
          ? <p>微信内置浏览器不支持安装网页应用。请点击右上角菜单，选择“在浏览器打开”，优先用手机自带浏览器访问。</p>
          : ios
            ? <p>PWA 需要使用 Safari。打开本页面后，点击分享按钮，然后选择“添加到主屏幕”。</p>
            : <p>按设备选择安装方式。PWA 需要浏览器支持；Windows 和安卓安装包通过下载文件安装。</p>}
        <div className="pwaInstallOptions">
          <button type="button" className="pwaInstallOption" onClick={installPwa}>
            <span className="pwaInstallOptionIcon"><Globe2 size={20}/></span>
            <span><b>网页应用 PWA</b><small>{promptEvent?'当前浏览器可直接弹出安装':'电脑建议使用 Edge / Chrome；安卓默认浏览器需支持“安装应用”或“添加到桌面”'}</small></span>
          </button>
          <a className="pwaInstallOption" href={windowsExeUrl} download>
            <span className="pwaInstallOptionIcon"><MonitorDown size={20}/></span>
            <span><b>Windows 安装包</b><small>下载 .exe 后按提示安装到电脑</small></span>
          </a>
          <a className="pwaInstallOption" href={androidApkUrl} download>
            <span className="pwaInstallOptionIcon"><Smartphone size={20}/></span>
            <span><b>安卓安装包 APK</b><small>安卓默认浏览器可直接下载</small></span>
          </a>
        </div>
        <p>安装后打开的仍然是同一个勋港平台。未登录会进入登录/注册流程，已登录则直接进入对应工作台。</p>
        <small>{android&&!promptEvent&&!inWechat?'如果手机默认浏览器没有 PWA 安装入口，请使用“安卓安装包 APK”。':'PWA 安装入口由浏览器提供：电脑推荐 Edge / Chrome，iPhone 使用 Safari，安卓优先使用自带浏览器菜单。'}</small>
      </div>
    </div>,document.body)}
  </>;
}
