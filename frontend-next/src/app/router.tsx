import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/login/LoginPage';
import { StudioPage } from '../pages/studio/StudioPage';
import { PlaceholderPage } from '../pages/placeholder/PlaceholderPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <LoginPage initialMode="apply" /> },
  { path: '/apply', element: <LoginPage initialMode="apply" /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'studio', element: <StudioPage /> },
      { path: 'resources', element: <PlaceholderPage title="资源库" desc="后续接入系统资源、门店资源、个人资源和资源选择弹窗。" /> },
      { path: 'history', element: <PlaceholderPage title="历史任务" desc="后续接入生成记录、任务状态、结果下载和失败原因。" /> },
      { path: 'users', element: <PlaceholderPage title="用户管理" desc="后续接入门店用户、体验账号、额度分配和账号状态。" /> },
      { path: 'promotion', element: <PlaceholderPage title="推广收益" desc="后续接入推广链接、邀请记录、结算数据和收益明细。" /> },
      { path: 'profile', element: <PlaceholderPage title="我的" desc="后续接入门店信息、个人资料、额度、设置和退出登录。" /> },
      { path: '*', element: <Navigate to="/studio" replace /> },
    ],
  },
]);
