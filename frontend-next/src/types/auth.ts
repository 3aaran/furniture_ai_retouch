export type UserRole =
  | 'SYSTEM_ADMIN'
  | 'MERCHANT_OWNER'
  | 'MERCHANT_ADMIN'
  | 'STAFF'
  | 'TRIAL'
  | 'platform_admin'
  | 'store_owner'
  | 'store_admin'
  | 'staff'
  | 'trial_user'
  | 'user'
  | string;

export type CurrentUser = {
  id: number | string;
  name: string;
  displayName?: string;
  username?: string;
  phone?: string;
  role: UserRole;
  quota?: number;
  merchantQuota?: number;
  storeId?: number | string | null;
  merchantId?: number | string | null;
  avatarUrl?: string;
  companyName?: string | null;
  status?: string;
};

export type LoginPayload = {
  account: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: CurrentUser;
};
