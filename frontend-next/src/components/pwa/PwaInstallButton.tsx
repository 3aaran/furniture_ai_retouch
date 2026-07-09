import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '../icons/AppIcon';
import './PwaInstallButton.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
}

function isWechat() {
  return /micromessenger/i.test(window.navigator.userAgent || '');
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent || '');
}

const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL || 'https://download.xungang.xin/xungang.apk';
const windowsExeUrl = import.meta.env.VITE_WINDOWS_EXE_URL || 'https://download.xungang.xin/xungang-setup.exe';
const androidDownloadEnabled = String(import.meta.env.VITE_ANDROID_APK_ENABLED || 'true') === 'true';

export function PwaInstallButton({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;
    setVisible(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setVisible(false);
      setHelpOpen(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function installPwa() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    setPromptEvent(null);
    if (choice?.outcome === 'accepted') {
      setVisible(false);
      setHelpOpen(false);
    }
  }

  if (!visible) return null;
  const inWechat = isWechat();
  const ios = isIos();
  const android = isAndroid();
  const label = compact
    ? (inWechat ? '浏览器' : ios ? '添加' : android ? '下载 APK' : '安装')
    : (inWechat ? '在浏览器打开' : ios ? '添加到主屏幕' : android ? '下载安卓 APK' : '安装应用');

  return (
    <>
      <button type="button" className={`pwaInstallBtn ${className}`.trim()} onClick={() => setHelpOpen(true)} aria-label="安装或下载勋港应用">
        <AppIcon name="download" size={16} />
        <span>{label}</span>
      </button>
      {helpOpen && createPortal(
        <div className="pwaInstallHelpMask" onClick={() => setHelpOpen(false)}>
          <div className="pwaInstallHelpCard" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="pwaInstallHelpClose" onClick={() => setHelpOpen(false)} aria-label="关闭安装说明"><AppIcon name="close" /></button>
            <h2>{inWechat ? '请在浏览器中打开' : '安装 / 下载勋港'}</h2>
            {inWechat
              ? <p>微信内置浏览器不支持安装网页应用。请点击右上角菜单，选择“在浏览器打开”。</p>
              : ios
                ? <p>PWA 需要使用 Safari。打开本页面后，点击分享按钮，然后选择“添加到主屏幕”。</p>
                : <p>按设备选择安装方式。PWA 需要浏览器支持，Windows 安装包和安卓 APK 可通过下载文件安装。</p>}
            <div className="pwaInstallOptions">
              <button type="button" className="pwaInstallOption" onClick={installPwa}>
                <span className="pwaInstallOptionIcon"><AppIcon name="resources" /></span>
                <span><b>网页应用 PWA</b><small>{promptEvent ? '当前浏览器可直接弹出安装' : '电脑建议使用 Edge / Chrome；安卓浏览器需支持安装应用或添加到桌面'}</small></span>
              </button>
              <a className="pwaInstallOption" href={windowsExeUrl} download>
                <span className="pwaInstallOptionIcon"><AppIcon name="download" /></span>
                <span><b>Windows 安装包</b><small>下载 .exe 后按提示安装到电脑</small></span>
              </a>
              {androidDownloadEnabled ? (
                <a className="pwaInstallOption" href={androidApkUrl} download>
                  <span className="pwaInstallOptionIcon"><AppIcon name="studio" /></span>
                  <span><b>安卓安装包 APK</b><small>安卓浏览器可直接下载，下载后按系统提示安装</small></span>
                </a>
              ) : (
                <button type="button" className="pwaInstallOption isDisabled" disabled>
                  <span className="pwaInstallOptionIcon"><AppIcon name="studio" /></span>
                  <span><b>安卓安装包 APK</b><small>当前环境暂不开放下载</small></span>
                </button>
              )}
            </div>
            <small>{android && !androidDownloadEnabled ? '当前环境暂不开放安卓 APK 下载。' : 'PWA 安装入口由浏览器提供：电脑推荐 Edge / Chrome，iPhone 使用 Safari。'}</small>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
