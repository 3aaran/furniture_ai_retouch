import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import { request } from '../../services/http';
import type { QueryState, Row, UserModalState } from './operations.types';
import { Pager, StateBlock } from './OperationLayout';
import { fmt, patchQuery, roleNames, usePaged } from './operations.utils';

export function UsersPage({ setNotice, openModal, reloadKey }: { setNotice: (value: string) => void; openModal: (modal: Exclude<UserModalState, null>) => void; reloadKey: number }) {
  const [query, setQuery] = useState<QueryState>({ keyword: '', role: '', status: '', page: 1, pageSize: 10 });
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const { data, loading, error } = usePaged('/api/merchant/users', { ...query, reloadKey });
  const users = data.items || [];
  async function toggleStatus(user: Row) {
    try {
      await request(`/api/merchant/users/${encodeURIComponent(String(user.id))}/status`, { method: 'PATCH', body: JSON.stringify({ status: user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }) });
      setNotice('用户状态已更新');
      patchQuery(setQuery, query, { page: query.page || 1 });
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '状态更新失败');
    }
  }

  async function deleteUser(user: Row) {
    if (!window.confirm(`确认删除用户 ${user.displayName || user.username || user.phone || ''}？`)) return;
    try {
      await request(`/api/merchant/users/${encodeURIComponent(String(user.id))}`, { method: 'DELETE' });
      setNotice('用户已删除');
      patchQuery(setQuery, query, { page: query.page || 1 });
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '删除失败');
    }
  }

  function openCreate(role?: string) {
    setCreateMenuOpen(false);
    openModal({ type: 'create-user', role });
  }

  return (
    <div className="opPage stitchUsersPage">
      <section className="opPanel storeUsersTablePanelV2">
        <div className="opToolbar storeUserToolbarV2">
          <label><AppIcon name="search" /><input placeholder="搜索用户名、手机号" value={query.keyword} onChange={(event) => patchQuery(setQuery, query, { keyword: event.target.value })} /></label>
          <div className="storeUserFilterRow">
            <select value={query.role} onChange={(event) => patchQuery(setQuery, query, { role: event.target.value })}><option value="">角色</option><option value="MERCHANT_ADMIN">门店管理员</option><option value="STAFF">普通用户</option><option value="TRIAL">体验账号</option></select>
            <select value={query.status} onChange={(event) => patchQuery(setQuery, query, { status: event.target.value })}><option value="">账号状态</option><option value="ACTIVE">启用账号</option><option value="DISABLED">禁用账号</option></select>
          </div>
          <div className="storeUserCreateBox">
            <button className="storeUserCreateButton" type="button" aria-label="新增用户" aria-expanded={createMenuOpen} onClick={() => setCreateMenuOpen((open) => !open)}><AppIcon name="plus" /></button>
            {createMenuOpen && (
              <div className="storeUserCreateMenu" role="menu">
                <button type="button" role="menuitem" onClick={() => openCreate('TRIAL')}><AppIcon name="ticket" /><span><b>生成体验账号</b><small>外部体验与到期管理</small></span></button>
                <button type="button" role="menuitem" onClick={() => openCreate()}><AppIcon name="userPlus" /><span><b>创建用户</b><small>门店成员与管理员</small></span></button>
              </div>
            )}
          </div>
        </div>
        <StateBlock loading={loading} error={error} empty={!users.length} />
        <div className="opTableWrap storeUsersTableWrapV2"><table className="storeUsersTableV2"><thead><tr><th>用户名</th><th>手机号</th><th>邮箱</th><th>角色</th><th>用户类型</th><th>算力点</th><th>注册时间</th><th>过期时间</th><th>操作</th></tr></thead><tbody>{users.map((user) => (
          <tr key={String(user.id)}>
            <td><b>{user.displayName || user.username || user.phone || '-'}</b></td>
            <td>{user.phone || user.username || '-'}</td>
            <td>{user.email || '-'}</td>
            <td><span className="opBadge">{roleNames[user.role] || user.role || '-'}</span></td>
            <td>{user.role === 'TRIAL' ? '外部客户' : user.role === 'MERCHANT_OWNER' ? '门店主账号' : '内部员工'}</td>
            <td><strong>{user.role === 'MERCHANT_OWNER' || user.role === 'MERCHANT_ADMIN' ? '门店池' : Number(user.quota || user.quota_balance || 0)}</strong></td>
            <td>{fmt(user.createdAt || user.created_at)}</td>
            <td>{user.role === 'TRIAL' ? fmt(user.trialExpireAt) : '-'}</td>
            <td><div className="opRowActions">{user.role === 'MERCHANT_OWNER' ? <span>主账号</span> : <><button type="button" title="启用/禁用" onClick={() => toggleStatus(user)}><AppIcon name="power" /></button><button type="button" title="充值" onClick={() => openModal({ type: 'recharge-user', item: user })}><AppIcon name="wallet" /></button><button type="button" title="编辑" onClick={() => openModal({ type: 'edit-user', item: user })}><AppIcon name="edit" /></button><button className="danger" type="button" title="删除" onClick={() => deleteUser(user)}><AppIcon name="trash" /></button></>}</div></td>
          </tr>
        ))}</tbody></table></div>
        <Pager data={data} query={query} setQuery={setQuery} />
      </section>
    </div>
  );
}
