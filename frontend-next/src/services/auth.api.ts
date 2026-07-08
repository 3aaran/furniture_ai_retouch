import { request } from './http';
import type { CurrentUser, LoginPayload, LoginResult } from '../types/auth';

export type SmsScene = 'LOGIN' | 'APPLICATION';

export type ApplicationPayload = {
  companyName: string;
  contactName: string;
  phone: string;
  inviteCode?: string;
  note?: string;
  smsToken: string;
};

export type SmsVerifyResult = {
  success?: boolean;
  message?: string;
  smsToken: string;
};

export function login(payload: LoginPayload) {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: payload.account,
      password: payload.password,
    }),
  });
}

export function codeLogin(payload: { phone: string; code: string }) {
  return request<LoginResult>('/api/auth/code-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendSmsCode(payload: { phone: string; scene: SmsScene }) {
  return request<{ success?: boolean; message?: string }>('/api/sms/send-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verifySmsCode(payload: { phone: string; code: string; scene: SmsScene }) {
  return request<SmsVerifyResult>('/api/sms/verify-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitMerchantApplication(payload: ApplicationPayload) {
  return request<{ success?: boolean; message?: string; id?: string | number }>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return request<CurrentUser>('/api/me');
}
