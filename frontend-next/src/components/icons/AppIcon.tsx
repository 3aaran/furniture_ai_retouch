import type { SVGProps } from 'react';

export type AppIconName =
  | 'mail'
  | 'alert'
  | 'history'
  | 'studio'
  | 'resources'
  | 'users'
  | 'promotion'
  | 'profile'
  | 'quota'
  | 'redeem'
  | 'logout'
  | 'close'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'grip'
  | 'chevronDown'
  | 'chevronLeft'
  | 'search'
  | 'download'
  | 'eye'
  | 'copy'
  | 'ticket'
  | 'wallet'
  | 'bell'
  | 'message'
  | 'lock'
  | 'save'
  | 'userPlus'
  | 'power'
  | 'chevronRight';

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
  size?: number;
};

const paths: Record<AppIconName, string> = {
  mail: 'M4.75 6.75h14.5v10.5H4.75V6.75Zm1.15.9 6.1 4.75 6.1-4.75M5.75 16.25l4.65-4M18.25 16.25l-4.65-4',
  alert: 'M12 4.75v8.25M12 16.75v.5',
  history: 'M5.25 6.75v4.5h4.5M5.8 11.2a6.4 6.4 0 1 0 1.8-4.6',
  studio: 'M5.25 6.25h13.5v11.5H5.25V6.25Zm3 14.5h7.5M9.5 17.75l-.6 3M15.1 17.75l.6 3',
  resources: 'M5.25 5.25h5.5v5.5h-5.5v-5.5Zm8 0h5.5v5.5h-5.5v-5.5Zm-8 8h5.5v5.5h-5.5v-5.5Zm8 0h5.5v5.5h-5.5v-5.5Z',
  users: 'M8.5 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 7.5a5 5 0 0 1 10 0M16.5 10.75a2.5 2.5 0 1 0 0-5M15.75 14.25a4.25 4.25 0 0 1 4.75 4.5',
  promotion: 'M7.25 16.75 16.75 7.25M10.25 6.75h7v7M5.25 8.25h3.5M5.25 12h2.5M5.25 15.75h1.5',
  profile: 'M12 12.25a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 7a6.5 6.5 0 0 1 13 0',
  quota: 'M6.25 7.5h11.5v9h-11.5v-9Zm1.5-2.75h8.5M9 10.25h6M9 13.75h3.5',
  redeem: 'M5.25 9.25h13.5v9.5H5.25v-9.5Zm0 0 2-3h9.5l2 3M12 6.25v12.5M5.25 12h13.5',
  logout: 'M10.25 5.25h-4v13.5h4M13.25 8.25 17 12l-3.75 3.75M17 12H9.5',
  close: 'M7.25 7.25 16.75 16.75M16.75 7.25 7.25 16.75',
  plus: 'M12 5.25v13.5M5.25 12h13.5',
  trash: 'M7.25 8.25h9.5M9.25 8.25V6.5h5.5v1.75M9 10.75l.35 7.5M15 10.75l-.35 7.5M6.75 8.25l.75 11h9l.75-11',
  edit: 'M5.25 16.75v2h2L17.5 8.5l-2-2L5.25 16.75ZM14.25 7.75l2 2',
  grip: 'M9 6.75h.01M15 6.75h.01M9 12h.01M15 12h.01M9 17.25h.01M15 17.25h.01',
  chevronDown: 'm7.25 9.25 4.75 4.75 4.75-4.75',
  chevronLeft: 'm14.75 6.75-5.25 5.25 5.25 5.25',
  search: 'M10.75 18.25a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2 3.7 3.7',
  download: 'M12 4.25v10M8.25 10.5 12 14.25l3.75-3.75M5.25 19.75h13.5',
  eye: 'M3.75 12s3-5.25 8.25-5.25S20.25 12 20.25 12s-3 5.25-8.25 5.25S3.75 12 3.75 12Zm8.25 2.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z',
  copy: 'M8.25 8.25h10.5v10.5H8.25V8.25Zm-3-3h10.5v2M5.25 15.75h2',
  ticket: 'M4.75 7.25h14.5v3a2 2 0 0 0 0 3v3.5H4.75v-3.5a2 2 0 0 0 0-3v-3Zm5 0v9.5',
  wallet: 'M5.25 7.25h12.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5.25a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h11M15.75 12.25h3.5v3h-3.5a1.5 1.5 0 0 1 0-3Z',
  bell: 'M7.25 10.25a4.75 4.75 0 0 1 9.5 0v3.5l1.5 2.5H5.75l1.5-2.5v-3.5ZM10 18.25a2 2 0 0 0 4 0',
  message: 'M4.75 5.75h14.5v10.5H8.5l-3.75 3v-13.5Z',
  lock: 'M7.25 10.25h9.5v8.5h-9.5v-8.5Zm2-1.25a2.75 2.75 0 0 1 5.5 0v1.25',
  save: 'M5.25 4.75h11l2.5 2.5v12H5.25V4.75Zm3 0v5h7v-5M8.25 19.25v-5.5h7.5v5.5',
  userPlus: 'M9.25 11.75a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm-5.5 7a5.5 5.5 0 0 1 11 0M17.25 7.25v5M14.75 9.75h5',
  power: 'M12 4.75v7M7.25 7.5a6.25 6.25 0 1 0 9.5 0',
  chevronRight: 'm9.25 6.75 5.25 5.25-5.25 5.25',
};

export function AppIcon({ name, size = 18, strokeWidth = 1.8, ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
