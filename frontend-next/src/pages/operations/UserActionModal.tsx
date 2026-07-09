import { useEffect, useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import { request } from '../../services/http';
import type { Row, UserModalState } from './operations.types';

function initialUserForm(modal: UserModalState): Row {
  if (modal?.type === 'edit-user') return { displayName: modal.item.displayName || '', phone: modal.item.phone || '', password: '' };
  if (modal?.type === 'recharge-user') return { amount: 10 };
  return { displayName: '', phone: '', role: modal?.type === 'create-user' ? modal.role || 'STAFF' : 'STAFF', quota: 0, password: '123456' };
}

export function UserActionModal({ modal, close, setNotice, refresh }: { modal: UserModalState; close: () => void; setNotice: (value: string) => void; refresh: () => void }) {
  const [form, setForm] = useState<Row>(() => initialUserForm(modal));
  useEffect(() => {
    setForm(initialUserForm(modal));
  }, [modal]);
  if (!modal) return null;

  async function submitUser() {
    try {
      if (modal?.type === 'create-user') await request('/api/merchant/users', { method: 'POST', body: JSON.stringify(form) });
      if (modal?.type === 'edit-user') await request(`/api/merchant/users/${encodeURIComponent(String(modal.item.id))}`, { method: 'PATCH', body: JSON.stringify(form) });
      if (modal?.type === 'recharge-user') await request(`/api/merchant/users/${encodeURIComponent(String(modal.item.id))}/quota`, { method: 'PATCH', body: JSON.stringify({ amount: Number(form.amount || 0) }) });
      setNotice('操作已提交');
      refresh();
      close();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '操作失败');
    }
  }

  return (
    <div className="opModalMask" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="opModal" role="dialog" aria-modal="true">
        <header><div><span>{modal.type === 'create-user' ? form.role === 'TRIAL' ? '生成体验账号' : '创建用户' : modal.type === 'edit-user' ? '编辑用户信息' : '用户充值'}</span><b>门店工作台</b></div><button type="button" onClick={close}><AppIcon name="close" /></button></header>
        <div className="opModalForm">
          {modal.type === 'recharge-user' ? <label><span>充值算力</span><input type="number" value={form.amount || 0} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label> : <><label><span>用户名称 / 备注</span><input value={form.displayName || ''} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>{modal.type === 'create-user' && <label><span>角色</span><select value={form.role || 'STAFF'} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="STAFF">普通用户</option><option value="MERCHANT_ADMIN">门店管理员</option><option value="TRIAL">体验账号</option></select></label>}<label><span>手机号</span><input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label><span>{modal.type === 'create-user' ? '初始密码' : '新密码（可选）'}</span><input value={form.password || ''} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{modal.type === 'create-user' && <label><span>初始算力点</span><input type="number" value={form.quota || 0} onChange={(event) => setForm({ ...form, quota: event.target.value })} /></label>}</>}
          <footer><button type="button" onClick={close}>取消</button><button type="button" onClick={submitUser}>保存</button></footer>
        </div>
      </section>
    </div>
  );
}
