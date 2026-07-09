export type OperationsPageType = 'history' | 'users' | 'promotion' | 'profile' | 'quota';

export type Row = Record<string, any>;
export type QueryState = Record<string, string | number>;
export type PagedRows = { items?: Row[]; page?: number; pageSize?: number; total?: number; summary?: Row; [key: string]: any };

export type UserModalState =
  | null
  | { type: 'create-user' }
  | { type: 'edit-user'; item: Row }
  | { type: 'recharge-user'; item: Row };

export type PageConfig = { type: OperationsPageType; title: string; eyebrow: string; desc: string };
