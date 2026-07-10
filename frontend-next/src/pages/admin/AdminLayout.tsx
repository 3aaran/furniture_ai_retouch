import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppIcon, type AppIconName } from '../../components/icons/AppIcon';
import './AdminPage.css';

export const adminNavigationGroups: Array<{
  key: string;
  label: string;
  items: Array<{ to: string; label: string; icon: AppIconName }>;
}> = [
  {
    key: 'browse',
    label: '浏览',
    items: [
      { to: '/admin/dashboard', label: '运营概况', icon: 'dashboard' },
      { to: '/admin/logs', label: 'AI 日志', icon: 'history' },
    ],
  },
  {
    key: 'todo',
    label: '待处理事项',
    items: [
      { to: '/admin/applications', label: '申请审核', icon: 'document' },
      { to: '/admin/feedbacks', label: '问题反馈', icon: 'message' },
    ],
  },
  {
    key: 'config',
    label: '配置',
    items: [
      { to: '/admin/resources', label: '系统资源', icon: 'resources' },
      { to: '/admin/ai-config', label: '模型配置', icon: 'model' },
      { to: '/admin/settings', label: '系统配置', icon: 'settings' },
    ],
  },
  {
    key: 'manage',
    label: '管理',
    items: [
      { to: '/admin/merchants', label: '商家管理', icon: 'building' },
      { to: '/admin/announcements', label: '发布公告', icon: 'bell' },
      { to: '/admin/workflows', label: '工作流管理', icon: 'workflow' },
      { to: '/admin/redeem-codes', label: '兑换码管理', icon: 'ticket' },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();
  const current = adminNavigationGroups.flatMap((group) => group.items).find((item) => location.pathname === item.to);

  return (
    <div className="adminWorkspace">
      <aside className="adminSidebar">
        <header className="adminSidebarHead">
          <span>平台控制台</span>
          <b>{current?.label || '平台管理'}</b>
        </header>
        <nav className="adminSidebarNav" aria-label="平台管理员导航">
          {adminNavigationGroups.map((group) => (
            <section key={group.key}>
              <h2>{group.label}</h2>
              <div>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'isActive' : ''}>
                    <span><AppIcon name={item.icon} /></span>
                    <b>{item.label}</b>
                    <AppIcon className="adminNavArrow" name="chevronRight" size={15} />
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>
      <main className="adminContent"><Outlet /></main>
    </div>
  );
}
