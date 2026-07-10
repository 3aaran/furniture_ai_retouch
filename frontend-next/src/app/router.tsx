import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/login/LoginPage';
import { StudioPage } from '../pages/studio/StudioPage';
import { ResourcesPage } from '../pages/resources/ResourcesPage';
import { OperationsPage } from '../pages/operations/OperationsPage';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { AdminDashboardPage, AdminLogsPage } from '../pages/admin/AdminOverviewPages';
import { AdminApplicationsPage, AdminFeedbacksPage } from '../pages/admin/AdminReviewPages';
import { AdminAiConfigPage, AdminResourcesPage, AdminSettingsPage } from '../pages/admin/AdminConfigPages';
import { AdminAnnouncementsPage, AdminMerchantsPage, AdminRedeemCodesPage, AdminWorkflowsPage } from '../pages/admin/AdminManagePages';

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
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'history', element: <OperationsPage type="history" /> },
      { path: 'users', element: <OperationsPage type="users" /> },
      { path: 'promotion', element: <OperationsPage type="promotion" /> },
      { path: 'profile', element: <OperationsPage type="profile" /> },
      { path: 'quota', element: <OperationsPage type="quota" /> },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'logs', element: <AdminLogsPage /> },
          { path: 'applications', element: <AdminApplicationsPage /> },
          { path: 'feedbacks', element: <AdminFeedbacksPage /> },
          { path: 'resources', element: <AdminResourcesPage /> },
          { path: 'ai-config', element: <AdminAiConfigPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'merchants', element: <AdminMerchantsPage /> },
          { path: 'announcements', element: <AdminAnnouncementsPage /> },
          { path: 'workflows', element: <AdminWorkflowsPage /> },
          { path: 'redeem-codes', element: <AdminRedeemCodesPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/studio" replace /> },
    ],
  },
]);
