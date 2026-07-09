import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { AppIcon, type AppIconName } from '../components/icons/AppIcon';
import { getCurrentUser as fetchCurrentUser } from '../services/auth.api';
import { getAuthToken } from '../services/http';
import { clearAuthSession, getCurrentUserSnapshot, setCurrentUser } from '../stores/auth.store';
import type { CurrentUser } from '../types/auth';
import { ShellQuickModal, type ShellQuickModalType } from './ShellQuickModal';
import './AppShell.css';

const primaryNavItems = [
  { to: '/studio', label: '工作室' },
  { to: '/resources', label: '资产库' },
  { to: '/users', label: '用户管理' },
  { to: '/promotion', label: '邀请共创' },
];

const utilityNavItems: Array<{ key: string; to?: string; modal?: Exclude<ShellQuickModalType, null>; label: string; icon: AppIconName }> = [
  { key: 'notices', modal: 'notices', label: '邮箱', icon: 'mail' },
  { key: 'feedback', modal: 'feedback', label: '反馈', icon: 'alert' },
  { key: 'history', to: '/history', label: '历史记录', icon: 'history' },
];

const mobileMainNavItems: Array<{ to: string; label: string; icon: AppIconName }> = [
  { to: '/studio', label: '工作室', icon: 'studio' },
  { to: '/history', label: '历史记录', icon: 'history' },
  { to: '/resources', label: '资产库', icon: 'resources' },
  { to: '/users', label: '用户管理', icon: 'users' },
  { to: '/promotion', label: '邀请共创', icon: 'promotion' },
];

const mobileToolItems: Array<{ key: string; modal: Exclude<ShellQuickModalType, null>; label: string; icon: AppIconName }> = [
  { key: 'feedback', modal: 'feedback', label: '反馈', icon: 'alert' },
  { key: 'notices', modal: 'notices', label: '邮箱', icon: 'mail' },
];

function shortName(user: CurrentUser | null) {
  const value = user?.name || user?.displayName || user?.username || user?.phone || '用户';
  return String(value).trim().slice(0, 1) || '用';
}

function displayName(user: CurrentUser | null) {
  return user?.displayName || user?.name || user?.username || user?.phone || '用户';
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isStudioRoute = location.pathname === '/studio';
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUserSnapshot());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [quickModal, setQuickModal] = useState<ShellQuickModalType>(null);
  const [shellNotice, setShellNotice] = useState('');
  const quotaText = useMemo(() => Number(user?.quota ?? 0).toLocaleString('zh-CN'), [user?.quota]);

  useEffect(() => {
    let cancelled = false;
    if (!getAuthToken()) {
      clearAuthSession();
      navigate('/login', { replace: true });
      return () => { cancelled = true; };
    }

    fetchCurrentUser()
      .then((nextUser) => {
        if (cancelled) return;
        setCurrentUser(nextUser);
        setUser(getCurrentUserSnapshot());
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthSession();
        navigate('/login', { replace: true });
      });

    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  function go(path: string) {
    setProfileMenuOpen(false);
    setMobileNavOpen(false);
    navigate(path);
  }

  function openQuickModal(type: Exclude<ShellQuickModalType, null>) {
    setProfileMenuOpen(false);
    setMobileNavOpen(false);
    if (type === 'feedback') setQuickModal('feedback');
    if (type === 'notices') setQuickModal('notices');
    if (type === 'redeem') setQuickModal('redeem');
  }

  function activateUtility(item: (typeof utilityNavItems)[number]) {
    if (item.modal) {
      openQuickModal(item.modal);
      return;
    }
    if (item.to) go(item.to);
  }

  return (
    <div className={`appRoot shellRoot ${isStudioRoute ? 'studioShell' : ''}`.trim()}>
      <header className="shellTopbar" onClick={() => setProfileMenuOpen(false)}>
        <NavLink to="/" className="shellBrand shellBrandDesktop" aria-label="返回首页">
          <BrandLogo />
        </NavLink>
        <button className="shellBrand shellBrandMobile" type="button" aria-label="打开导航栏" onClick={(event) => { event.stopPropagation(); setMobileNavOpen(true); }}>
          <BrandLogo />
        </button>

        <nav className="shellNav desktopOnly" aria-label="主导航" onClick={(event) => event.stopPropagation()}>
          {primaryNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `shellNavItem ${isActive ? 'isActive' : ''}`.trim()}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shellActions" onClick={(event) => event.stopPropagation()}>
          <div className="shellIconActions desktopOnly" aria-label="快捷入口">
            {utilityNavItems.map((item) => (
              <button key={item.key} className="shellIconAction" type="button" title={item.label} aria-label={item.label} onClick={() => activateUtility(item)}>
                <span aria-hidden="true"><AppIcon name={item.icon} /></span>
              </button>
            ))}
          </div>
          <button className="quotaBadge" type="button" onClick={() => go('/quota')}>算力额度 {quotaText}</button>
          <div className="shellProfileBox">
            <button className="avatarButton" type="button" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="avatarBadge" aria-hidden="true">{shortName(user)}</span>
              <span className="avatarText desktopOnly"><b>{displayName(user)}</b></span>
            </button>
            {profileMenuOpen && (
              <div className="profileMenuNext" role="menu">
                <button type="button" role="menuitem" onClick={() => go('/profile')}><span><AppIcon name="profile" /></span>个人中心</button>
                <button type="button" role="menuitem" onClick={() => go('/quota')}><span><AppIcon name="quota" /></span>额度明细</button>
                <button type="button" role="menuitem" onClick={() => openQuickModal('redeem')}><span><AppIcon name="redeem" /></span>礼品卡兑换</button>
                <i aria-hidden="true" />
                <button className="logout" type="button" role="menuitem" onClick={handleLogout}><span><AppIcon name="logout" /></span>退出登录</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileNavOpen && <button className="mobileDrawerBackdrop mobileOnly" type="button" aria-label="关闭导航栏" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`mobileSideDrawer mobileOnly ${mobileNavOpen ? 'isOpen' : ''}`.trim()} aria-hidden={!mobileNavOpen}>
        <div className="mobileSideDrawerHead">
          <BrandLogo />
          <button type="button" aria-label="关闭导航栏" onClick={() => setMobileNavOpen(false)}><AppIcon name="close" /></button>
        </div>
        <nav className="mobileSideNav" aria-label="移动端侧边导航">
          {mobileMainNavItems.map((item) => (
            <button key={item.to} type="button" className={location.pathname === item.to ? 'isActive' : ''} onClick={() => go(item.to)}>
              <span aria-hidden="true"><AppIcon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>
        <div className="mobileSideTools" aria-label="移动端工具入口">
          {mobileToolItems.map((item) => (
            <button key={item.key} type="button" onClick={() => openQuickModal(item.modal)}>
              <span aria-hidden="true"><AppIcon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="shellMain">
        <Outlet />
      </main>
      {shellNotice && <button className="shellToast" type="button" onClick={() => setShellNotice('')}>{shellNotice}</button>}
      <ShellQuickModal type={quickModal} onClose={() => setQuickModal(null)} onNotice={setShellNotice} />
    </div>
  );
}
