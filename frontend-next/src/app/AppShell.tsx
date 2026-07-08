import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { getCurrentUser as fetchCurrentUser } from '../services/auth.api';
import { clearAuthSession, getCurrentUserSnapshot, setCurrentUser } from '../stores/auth.store';
import { getAuthToken } from '../services/http';
import type { CurrentUser } from '../types/auth';
import './AppShell.css';

const navItems = [
  { to: '/studio', label: '智能工作台', icon: '⌁' },
  { to: '/resources', label: '资源库', icon: '▣' },
  { to: '/history', label: '历史任务', icon: '◷' },
  { to: '/users', label: '用户管理', icon: '◇' },
  { to: '/promotion', label: '推广收益', icon: '↗' },
  { to: '/profile', label: '我的', icon: '◉' },
];

function shortName(user: CurrentUser | null) {
  const value = user?.name || user?.displayName || user?.username || user?.phone || '用';
  return String(value).trim().slice(0, 1) || '用';
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isStudioRoute = location.pathname === '/studio';
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUserSnapshot());
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

  function handleLogout() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`appRoot shellRoot ${isStudioRoute ? 'studioShell' : ''}`.trim()}>
      <header className="shellTopbar">
        <NavLink to="/" className="shellBrand" aria-label="返回首页">
          <BrandLogo />
        </NavLink>
        <nav className="shellNav desktopOnly" aria-label="主导航">
          {navItems.slice(0, 5).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `shellNavItem ${isActive ? 'isActive' : ''}`.trim()}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shellActions">
          <span className="quotaBadge">算力额度 {quotaText}</span>
          <span className="avatarBadge" aria-label={`当前账号：${user?.name || '用户'}`}>{shortName(user)}</span>
          <button className="shellLogout" type="button" onClick={handleLogout}>退出</button>
        </div>
      </header>

      <main className="shellMain">
        <Outlet />
      </main>

      <nav className="shellBottomNav mobileOnly" aria-label="移动端导航">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottomNavItem ${isActive ? 'isActive' : ''}`.trim()}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
