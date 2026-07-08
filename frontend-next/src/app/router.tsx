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
      { path: 'resources', element: <PlaceholderPage title="资产库" desc="后续接入系统资源、门店资源、个人资源和资源选择弹窗。" /> },
      { path: 'history', element: <PlaceholderPage title="历史记录" desc="后续接入生成记录、任务状态、结果下载和失败原因。" /> },
      { path: 'users', element: <PlaceholderPage title="用户管理" desc="后续接入门店用户、体验账号、额度分配和账号状态。" /> },
      { path: 'promotion', element: <PlaceholderPage title="邀请共创" desc="后续接入邀请链接、共创记录、结算数据和收益明细。" /> },
      { path: 'profile', element: <PlaceholderPage title="我的" desc="后续接入门店信息、个人资料、额度、设置和退出登录。" /> },
      { path: 'quota', element: <PlaceholderPage title="额度明细" desc="后续接入额度余额、消耗记录、充值记录和门店算力分配。" /> },
      { path: 'redeem', element: <PlaceholderPage title="礼品卡兑换" desc="后续接入兑换码、礼品卡和活动额度兑换。" /> },
      { path: 'feedback', element: <PlaceholderPage title="反馈" desc="后续接入问题反馈、截图上传和处理进度。" /> },
      { path: 'notices', element: <PlaceholderPage title="邮箱" desc="后续接入系统公告、未读消息和站内通知。" /> },
      { path: '*', element: <Navigate to="/studio" replace /> },
    ],
  },
]);
