import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import { request, requestForm, resolveApiUrl } from '../../services/http';
import { getCurrentUserSnapshot, setCurrentUser } from '../../stores/auth.store';
import type { CurrentUser } from '../../types/auth';
import type { Row } from './operations.types';
import { Hero, StateBlock } from './OperationLayout';
import { pageConfig, roleNames, statusText } from './operations.utils';

function avatarUrl(user: CurrentUser | null) {
  return resolveApiUrl((user as Row | null)?.avatarUrl || (user as Row | null)?.avatar_url || (user as Row | null)?.avatar) || '';
}

export function ProfilePage({ setNotice }: { setNotice: (value: string) => void }) {
  const current = getCurrentUserSnapshot();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(current);
  const [storage, setStorage] = useState<Row | null>(null);
  const [name, setName] = useState(current?.displayName || current?.name || '');
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    request<CurrentUser>('/api/me').then((next) => {
      setCurrentUser(next);
      setUser(next);
      setName(next.displayName || next.name || '');
    }).catch(() => {});
    request<Row>('/api/storage/me').then(setStorage).catch(() => {});
  }, []);

  async function saveProfile() {
    try {
      const result = await request<{ user: CurrentUser }>('/api/me/profile', { method: 'PATCH', body: JSON.stringify({ displayName: name }) });
      setCurrentUser(result.user);
      setUser(result.user);
      setNotice('资料已保存');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '资料保存失败');
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    try {
      setAvatarBusy(true);
      const form = new FormData();
      form.append('avatar', file);
      const result = await requestForm<{ user: CurrentUser }>('/api/me/avatar', form);
      setCurrentUser(result.user);
      setUser(result.user);
      setNotice('头像已更新');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '头像更新失败');
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function savePassword() {
    if (pwd.newPassword !== pwd.confirm) return setNotice('两次密码不一致');
    try {
      await request('/api/me/password', { method: 'PATCH', body: JSON.stringify(pwd) });
      setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      setNotice('密码已修改');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '密码修改失败');
    }
  }

  const avatar = avatarUrl(user);
  const initials = String(user?.displayName || user?.phone || user?.username || '用').slice(0, 1);
  return (
    <div className="opPage stitchProfilePage">
      <Hero config={pageConfig('profile')} stats={[['账号', user?.phone || user?.username || '-'], ['角色', roleNames[String(user?.role || '')] || user?.role || '-'], ['状态', statusText(user?.status)], ['门店', user?.companyName || '-']]} action={<div className="opAvatarPanel">{avatar ? <img src={avatar} alt="头像" /> : <span>{initials}</span>}<button type="button" disabled={avatarBusy} onClick={() => fileRef.current?.click()}><AppIcon name="profile" />更换头像</button><input ref={fileRef} type="file" accept="image/*" onChange={(event) => uploadAvatar(event.target.files?.[0])} /></div>} />
      <section className="opProfileGrid profileGridV3">
        <article className="opPanel opFormPanel profileCardV3"><h2><AppIcon name="profile" />基础资料</h2><label><span>显示名称</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>登录账号</span><input value={user?.phone || user?.username || ''} disabled /></label><label><span>账号角色</span><input value={roleNames[String(user?.role || '')] || user?.role || '-'} disabled /></label><button type="button" onClick={saveProfile}><AppIcon name="save" />保存资料</button></article>
        <article className="opPanel opFormPanel profileCardV3"><h2><AppIcon name="lock" />修改密码</h2><label><span>原密码</span><input type="password" value={pwd.oldPassword} onChange={(event) => setPwd({ ...pwd, oldPassword: event.target.value })} /></label><label><span>新密码</span><input type="password" value={pwd.newPassword} onChange={(event) => setPwd({ ...pwd, newPassword: event.target.value })} /></label><label><span>确认新密码</span><input type="password" value={pwd.confirm} onChange={(event) => setPwd({ ...pwd, confirm: event.target.value })} /></label><button type="button" onClick={savePassword}><AppIcon name="lock" />修改密码</button></article>
        <article className="opPanel opStoragePanel profileStoragePanelV3"><h2>图片存储空间</h2>{storage ? <><div className="opStorageStats"><span>已使用 <b>{storage.usedText || '-'}</b></span><span>总上限 <b>{storage.limitText || '-'}</b></span><span>剩余 <b>{storage.remainingText || '-'}</b></span></div><div className="opStorageBar"><i style={{ width: `${Number(storage.percent || 0)}%` }} /></div></> : <StateBlock loading error="" empty={false} />}</article>
      </section>
    </div>
  );
}
