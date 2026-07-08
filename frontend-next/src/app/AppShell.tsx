import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { getCurrentUser as fetchCurrentUser } from '../services/auth.api';
import { clearAuthSession, getCurrentUserSnapshot, setCurrentUser } from '../stores/auth.store';
import { getAuthToken } from '../services/http';
import type { CurrentUser } from '../types/auth';
import './AppShell.css';

const primaryNavItems = [
  { to: '/studio', label: '工作室' },
  { to: '/resources', label: '资产库' },
  { to: '/users', label: '用户管理' },
  { to: '/promotion', label: '邀请共创' },
];

const utilityNavItems = [
  { to: '/notices', label: '邮箱', icon: '✉' },
  { to: '/feedback', label: '反馈', icon: '!' },
  { to: '/history', label: '历史记录', icon: '◷' },
];

const mobileMainNavItems = [
  { to: '/studio', label: '工作室', icon: '◇' },
  { to: '/history', label: '历史记录', icon: '◷' },
  { to: '/resources', label: '资产库', icon: '▣' },
  { to: '/users', label: '用户管理', icon: '◌' },
  { to: '/promotion', label: '邀请共创', icon: '↗' },
];

const mobileToolItems = [
  { to: '/feedback', label: '反馈', icon: '!' },
  { to: '/notices', label: '邮箱', icon: '✉' },
];

function shortName(user: CurrentUser | null) {
  const value = user?.name || user?.displayName || user?.username || user?.phone || '用';
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
              <button key={item.to} className="shellIconAction" type="button" title={item.label} aria-label={item.label} onClick={() => go(item.to)}>
                <span aria-hidden="true">{item.icon}</span>
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
                <button type="button" role="menuitem" onClick={() => go('/profile')}><span>◇</span>个人中心</button>
                <button type="button" role="menuitem" onClick={() => go('/quota')}><span>¥</span>额度明细</button>
                <button type="button" role="menuitem" onClick={() => go('/redeem')}><span>券</span>礼品卡兑换</button>
                <i aria-hidden="true" />
                <button className="logout" type="button" role="menuitem" onClick={handleLogout}><span>↩</span>退出登录</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileNavOpen && <button className="mobileDrawerBackdrop mobileOnly" type="button" aria-label="关闭导航栏" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`mobileSideDrawer mobileOnly ${mobileNavOpen ? 'isOpen' : ''}`.trim()} aria-hidden={!mobileNavOpen}>
        <div className="mobileSideDrawerHead">
          <BrandLogo />
          <button type="button" aria-label="关闭导航栏" onClick={() => setMobileNavOpen(false)}>×</button>
        </div>
        <nav className="mobileSideNav" aria-label="移动端侧边导航">
          {mobileMainNavItems.map((item) => (
            <button key={item.to} type="button" className={location.pathname === item.to ? 'isActive' : ''} onClick={() => go(item.to)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="mobileSideTools" aria-label="移动端工具入口">
          {mobileToolItems.map((item) => (
            <button key={item.to} type="button" onClick={() => go(item.to)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="shellMain">
        <Outlet />
      </main>
    </div>
  );
}
