import { useEffect, useState } from 'react';
import { AppIcon } from '../components/icons/AppIcon';
import { request, withQuery } from '../services/http';
import './ShellQuickModal.css';

export type ShellQuickModalType = 'feedback' | 'notices' | 'redeem' | null;

type Row = Record<string, any>;
type PagedRows = { items?: Row[]; unreadCount?: number; [key: string]: any };

function fmt(value?: string | number | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function titleFor(type: Exclude<ShellQuickModalType, null>) {
  if (type === 'feedback') return { eyebrow: 'FEEDBACK', title: '问题反馈', icon: 'message' as const };
  if (type === 'notices') return { eyebrow: 'NOTICE CENTER', title: '邮箱通知', icon: 'mail' as const };
  return { eyebrow: 'REDEEM', title: '礼品卡兑换', icon: 'ticket' as const };
}

export function ShellQuickModal({ type, onClose, onNotice }: { type: ShellQuickModalType; onClose: () => void; onNotice: (value: string) => void }) {
  const [feedback, setFeedback] = useState({ title: '', contact: '', content: '' });
  const [redeemCode, setRedeemCode] = useState('');
  const [notices, setNotices] = useState<PagedRows>({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (type !== 'notices') return;
    let cancelled = false;
    setLoading(true);
    setError('');
    request<PagedRows>(withQuery('/api/announcements', { page: 1, pageSize: 20, reloadKey }))
      .then((result) => {
        if (!cancelled) setNotices(Array.isArray(result) ? { items: result } : result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '通知读取失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [type, reloadKey]);

  if (!type) return null;
  const meta = titleFor(type);

  async function submitFeedback() {
    try {
      await request('/api/feedbacks', { method: 'POST', body: JSON.stringify(feedback) });
      setFeedback({ title: '', contact: '', content: '' });
      onNotice('问题反馈已提交');
      onClose();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : '反馈提交失败');
    }
  }

  function submitRedeem() {
    onNotice(`兑换入口已打开：${redeemCode || '未填写'}`);
    setRedeemCode('');
    onClose();
  }

  async function markRead(id: unknown) {
    try {
      await request(`/api/announcements/${encodeURIComponent(String(id))}/read`, { method: 'POST' });
      onNotice('已标记为已读');
      setReloadKey((value) => value + 1);
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : '标记失败');
    }
  }

  return (
    <div className="shellQuickMask" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`shellQuickModal is-${type}`} role="dialog" aria-modal="true" aria-labelledby="shellQuickTitle">
        <header className="shellQuickHead">
          <span aria-hidden="true"><AppIcon name={meta.icon} /></span>
          <div>
            <small>{meta.eyebrow}</small>
            <h2 id="shellQuickTitle">{meta.title}</h2>
          </div>
          <button type="button" aria-label="关闭弹窗" onClick={onClose}><AppIcon name="close" /></button>
        </header>

        {type === 'feedback' && (
          <div className="shellQuickForm">
            <label><span>反馈标题</span><input value={feedback.title} onChange={(event) => setFeedback({ ...feedback, title: event.target.value })} /></label>
            <label><span>联系方式（可选）</span><input value={feedback.contact} onChange={(event) => setFeedback({ ...feedback, contact: event.target.value })} /></label>
            <label className="isFull"><span>反馈内容</span><textarea value={feedback.content} onChange={(event) => setFeedback({ ...feedback, content: event.target.value })} /></label>
            <footer><button type="button" onClick={onClose}>取消</button><button type="button" onClick={submitFeedback}><AppIcon name="message" />提交反馈</button></footer>
          </div>
        )}

        {type === 'redeem' && (
          <div className="shellQuickForm">
            <label className="isFull"><span>兑换码</span><input value={redeemCode} onChange={(event) => setRedeemCode(event.target.value)} placeholder="请输入礼品卡或活动兑换码" /></label>
            <footer><button type="button" onClick={onClose}>取消</button><button type="button" onClick={submitRedeem}><AppIcon name="ticket" />确认兑换</button></footer>
          </div>
        )}

        {type === 'notices' && (
          <div className="shellNoticeList">
            <div className="shellNoticeSummary"><span>消息总数</span><b>{notices.items?.length || 0}</b><span>未读</span><b>{Number(notices.unreadCount || 0)}</b></div>
            {loading && <div className="shellQuickState">正在读取通知...</div>}
            {error && <div className="shellQuickState isError">{error}</div>}
            {!loading && !error && !(notices.items || []).length && <div className="shellQuickState">暂无通知</div>}
            {(notices.items || []).map((item) => (
              <article key={String(item.id)} className={!item.read_at && !item.readAt ? 'isUnread' : ''}>
                <header><span><AppIcon name="bell" />{item.title || '系统通知'}</span><small>{fmt(item.created_at || item.createdAt)}</small></header>
                <p>{item.content || item.message || '-'}</p>
                {!item.read_at && !item.readAt && <button type="button" onClick={() => markRead(item.id)}>标记已读</button>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
