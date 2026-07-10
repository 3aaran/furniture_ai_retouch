import {
  IconAlertTriangle,
  IconBell,
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCreditCard,
  IconCube,
  IconDeviceDesktop,
  IconDeviceFloppy,
  IconDownload,
  IconEye,
  IconFileText,
  IconGift,
  IconGripVertical,
  IconHistory,
  IconLayoutDashboard,
  IconLayoutGrid,
  IconLock,
  IconLogout,
  IconMail,
  IconMessageCircle,
  IconPencil,
  IconPlus,
  IconPower,
  IconRoute,
  IconSearch,
  IconSettings,
  IconTicket,
  IconTrash,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconWallet,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import type { SVGProps } from 'react';

export type AppIconName =
  | 'mail' | 'alert' | 'history' | 'studio' | 'resources' | 'users' | 'promotion'
  | 'profile' | 'quota' | 'redeem' | 'logout' | 'close' | 'plus' | 'trash' | 'edit'
  | 'grip' | 'chevronDown' | 'chevronLeft' | 'search' | 'download' | 'eye' | 'copy'
  | 'ticket' | 'wallet' | 'bell' | 'message' | 'lock' | 'save' | 'userPlus' | 'power'
  | 'dashboard' | 'document' | 'model' | 'settings' | 'building' | 'workflow' | 'check'
  | 'chevronRight';

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
  size?: number;
};

export const appIconTokens = {
  size: 18,
  strokeWidth: 1.8,
} as const;

const icons: Record<AppIconName, Icon> = {
  mail: IconMail,
  alert: IconAlertTriangle,
  history: IconHistory,
  studio: IconDeviceDesktop,
  resources: IconLayoutGrid,
  users: IconUsers,
  promotion: IconCopy,
  profile: IconUser,
  quota: IconCreditCard,
  redeem: IconGift,
  logout: IconLogout,
  close: IconX,
  plus: IconPlus,
  trash: IconTrash,
  edit: IconPencil,
  grip: IconGripVertical,
  chevronDown: IconChevronDown,
  chevronLeft: IconChevronLeft,
  search: IconSearch,
  download: IconDownload,
  eye: IconEye,
  copy: IconCopy,
  ticket: IconTicket,
  wallet: IconWallet,
  bell: IconBell,
  message: IconMessageCircle,
  lock: IconLock,
  save: IconDeviceFloppy,
  userPlus: IconUserPlus,
  power: IconPower,
  dashboard: IconLayoutDashboard,
  document: IconFileText,
  model: IconCube,
  settings: IconSettings,
  building: IconBuilding,
  workflow: IconRoute,
  check: IconCheck,
  chevronRight: IconChevronRight,
};

export function AppIcon({ name, size = appIconTokens.size, strokeWidth = appIconTokens.strokeWidth, ...props }: AppIconProps) {
  const IconComponent = icons[name];
  return <IconComponent aria-hidden="true" size={size} stroke={strokeWidth} focusable="false" {...props} />;
}
