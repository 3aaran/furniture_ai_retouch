import {
  LayoutDashboard,
  FileText,
  Building2,
  Settings,
  Layers,
  MessageSquare,
  Bell,
  ClipboardList,
  BrainCircuit,
  Brush,
  Users,
  Image,
  Ticket,
  WalletCards
} from 'lucide-react';

export const adminPages = [
  ['dashboard', '运营情况', LayoutDashboard],
  ['logs', 'AI日志', ClipboardList],
  ['applications', '申请审核', FileText],
  ['feedbacks', '问题反馈', MessageSquare],
  ['resources', '资源库', Layers],
  ['aiConfig', '模型配置', BrainCircuit],
  ['settings', '系统配置', Settings],
  ['merchants', '商家管理', Building2],
  ['announcements', '发布公告', Bell]
];

export const adminNavGroups = [
  { key: 'browse', title: '浏览', items: adminPages.filter(([key]) => ['dashboard', 'logs'].includes(key)) },
  { key: 'todo', title: '待处理事项', items: adminPages.filter(([key]) => ['applications', 'feedbacks'].includes(key)) },
  { key: 'config', title: '配置', items: adminPages.filter(([key]) => ['resources', 'aiConfig', 'settings'].includes(key)) },
  { key: 'manage', title: '管理', items: adminPages.filter(([key]) => ['merchants', 'announcements'].includes(key)) }
];

export const storeAdminPages = [
  ['workbench', 'AI 工作台', Brush],
  ['resources', '资源库', Layers],
  ['users', '用户管理', Users],
  ['images', '历史任务', Image],
  ['promotion', '推广邀请', Ticket],
  // ['quota', '额度明细', WalletCards]
];

export const staffPages = [
  ['workbench', 'AI 工作台', Brush],
  ['images', '历史任务', Image]
];
