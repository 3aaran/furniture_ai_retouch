import appConfig from './appConfig.json';

export const APP_NAME = import.meta.env.VITE_APP_NAME || appConfig.appName || 'App';
export const LOGO_TEXT = import.meta.env.VITE_LOGO_TEXT || appConfig.logoText || '家';
export const APP_SUBTITLE = import.meta.env.VITE_APP_SUBTITLE || appConfig.appSubtitle || '';
export const LOGIN_SUBTITLE = import.meta.env.VITE_LOGIN_SUBTITLE || appConfig.loginSubtitle || '';
export const WATERMARK_TEXT = import.meta.env.VITE_WATERMARK_TEXT || appConfig.watermarkText || `${APP_NAME}`;
export const WATERMARK_SUB_TEXT = import.meta.env.VITE_WATERMARK_SUB_TEXT || appConfig.watermarkSubText || 'DESIGN';

export default {
  appName: APP_NAME,
  logoText: LOGO_TEXT,
  appSubtitle: APP_SUBTITLE,
  loginSubtitle: LOGIN_SUBTITLE,
  watermarkText: WATERMARK_TEXT,
  watermarkSubText: WATERMARK_SUB_TEXT
};
