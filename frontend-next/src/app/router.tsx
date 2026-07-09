import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/login/LoginPage';
import { StudioPage } from '../pages/studio/StudioPage';
import { ResourcesPage } from '../pages/resources/ResourcesPage';
import { OperationsPage } from '../pages/operations/OperationsPage';

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
      { path: '*', element: <Navigate to="/studio" replace /> },
    ],
  },
]);
