import { useMemo, useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import { adminExportUrl, adminPatch, adminPost, formatAdminTime, useAdminPaged } from '../../services/admin.api';
import {
  AdminButton,
  AdminEmpty,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminStatusBadge,
  AdminTable,
} from './AdminUi';

type MerchantApplication = {
  id: string | number;
  companyName?: string;
  contactName?: string;
  phone?: string;
  note?: string;
  inviteCode?: string;
  status?: string;
  createdAt?: string;
  reviewedAt?: string;
  rejectReason?: string;
};

type FeedbackItem = {
  id: string | number;
  companyName?: string;
  userName?: string;
  userPhone?: string;
  contact?: string;
  title?: string;
  content?: string;
  status?: string;
  reply?: string;
  created_at?: string;
  createdAt?: string;
};

type ReviewState = { type: 'approve' | 'reject'; ids: Array<string | number> } | null;
type FeedbackActionState = { item: FeedbackItem; status: 'PROCESSING' | 'RESOLVED' | 'REJECTED' } | null;

export function AdminApplicationsPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<MerchantApplication>('/api/admin/applications', {
    keyword: '',
    status: 'PENDING',
    page: 1,
    pageSize: 10,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<ReviewState>(null);
  const [quota, setQuota] = useState('500');
  const [reason, setReason] = useState('资料不完整，暂不通过');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);
  const pendingItems = useMemo(() => data.items.filter((item) => String(item.status).toUpperCase() === 'PENDING'), [data.items]);
  const allPendingSelected = pendingItems.length > 0 && pendingItems.every((item) => selected.has(String(item.id)));

  function setMessage(message: string, tone: 'success' | 'danger' = 'success') {
    setNotice(message);
    setNoticeTone(tone);
  }

  function toggleItem(id: string | number) {
    const key = String(id);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAllPending() {
    setSelected((current) => {
      const next = new Set(current);
      if (allPendingSelected) pendingItems.forEach((item) => next.delete(String(item.id)));
      else pendingItems.forEach((item) => next.add(String(item.id)));
      return next;
    });
  }

  function openReview(type: 'approve' | 'reject', ids: Array<string | number> | string | number) {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!list.length) return;
    setQuota('500');
    setReason('资料不完整，暂不通过');
    setReview({ type, ids: list });
  }

  async function submitReview() {
    if (!review) return;
    setBusy(true);
    try {
      if (review.type === 'approve') {
        const accounts: Array<{ phone?: string; password?: string; merchantCode?: string }> = [];
        for (const id of review.ids) {
          const result = await adminPost<{ account?: { phone?: string; password?: string; merchantCode?: string } }>(`/api/admin/applications/${encodeURIComponent(String(id))}/approve`, { quota: Number(quota || 0) });
          if (result.account) accounts.push(result.account);
        }
        if (accounts.length === 1) {
          const account = accounts[0];
          setMessage(`申请已通过：账号 ${account.phone || '-'}，初始密码 ${account.password || '-'}，商家编号 ${account.merchantCode || '-'}`);
        } else setMessage(`已批量通过 ${review.ids.length} 个申请`);
      } else {
        for (const id of review.ids) {
          await adminPost(`/api/admin/applications/${encodeURIComponent(String(id))}/reject`, { reason: reason.trim() || '未通过审核' });
        }
        setMessage(review.ids.length === 1 ? '申请已驳回' : `已批量驳回 ${review.ids.length} 个申请`);
      }
      setReview(null);
      setSelected(new Set());
      await reload();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : '审核操作失败', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="MERCHANT REVIEW" title="商家申请审核" description="处理商家入驻申请，审核通过后创建门店主账号并发放初始额度。" metric={data.total} metricLabel="条筛选结果" />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="商家、联系人或手机号" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.status || '')} onChange={(event) => { setSelected(new Set()); patchQuery({ status: event.target.value, page: 1 }); }}><option value="">全部状态</option><option value="PENDING">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已驳回</option></select>
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        <div className="adminBatchBar">
          <label className="adminCheckbox"><input type="checkbox" checked={allPendingSelected} onChange={toggleAllPending} /><span />选择本页待审核</label>
          <em>已选择 {selected.size} 项</em>
          <AdminButton icon="check" disabled={!selected.size} onClick={() => openReview('approve', Array.from(selected))}>批量通过</AdminButton>
          <AdminButton icon="close" tone="danger" disabled={!selected.size} onClick={() => openReview('reject', Array.from(selected))}>批量驳回</AdminButton>
        </div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? (
          <div className="adminReviewList">
            {data.items.map((item) => {
              const pending = String(item.status).toUpperCase() === 'PENDING';
              return <article key={item.id}>
                <label className="adminCardCheck"><input type="checkbox" disabled={!pending} checked={selected.has(String(item.id))} onChange={() => toggleItem(item.id)} /><span /></label>
                <div className="adminReviewIcon"><AppIcon name="building" /></div>
                <div className="adminReviewMain"><h2>{item.companyName || '未命名商家'}</h2><p>{item.note || '未填写申请说明'}</p><div><span>{item.contactName || '-'}</span><span>{item.phone || '-'}</span><span>邀请码：{item.inviteCode || '-'}</span></div></div>
                <aside><AdminStatusBadge value={item.status} /><time>{formatAdminTime(item.createdAt)}</time>{pending ? <div><AdminButton tone="primary" onClick={() => openReview('approve', item.id)}>通过</AdminButton><AdminButton tone="danger" onClick={() => openReview('reject', item.id)}>驳回</AdminButton></div> : <small>{item.rejectReason || '已完成审核'}</small>}</aside>
              </article>;
            })}
          </div>
        ) : <AdminEmpty text="暂无商家申请" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {review && <AdminModal
        title={review.type === 'approve' ? '审核通过' : '驳回申请'}
        description={`本次将处理 ${review.ids.length} 条申请`}
        size="small"
        onClose={() => setReview(null)}
        footer={<><AdminButton onClick={() => setReview(null)}>取消</AdminButton><AdminButton tone={review.type === 'approve' ? 'primary' : 'danger'} disabled={busy} onClick={() => void submitReview()}>{busy ? '处理中...' : review.type === 'approve' ? '确认通过' : '确认驳回'}</AdminButton></>}
      >
        <div className="adminFormGrid isSingle">
          {review.type === 'approve' ? <label><span>发放初始额度</span><input type="number" min="0" value={quota} onChange={(event) => setQuota(event.target.value)} autoFocus /></label> : <label><span>驳回原因</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} autoFocus /></label>}
        </div>
      </AdminModal>}
    </div>
  );
}

export function AdminFeedbacksPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<FeedbackItem>('/api/admin/feedbacks', {
    keyword: '',
    status: '',
    page: 1,
    pageSize: 10,
  });
  const [action, setAction] = useState<FeedbackActionState>(null);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  function openAction(item: FeedbackItem, status: 'PROCESSING' | 'RESOLVED' | 'REJECTED') {
    setAction({ item, status });
    setReply(item.reply || '');
  }

  async function submitAction() {
    if (!action) return;
    setBusy(true);
    try {
      await adminPatch(`/api/admin/feedbacks/${encodeURIComponent(String(action.item.id))}`, { status: action.status, reply });
      setNotice('反馈状态已更新');
      setNoticeTone('success');
      setAction(null);
      await reload();
    } catch (submitError) {
      setNotice(submitError instanceof Error ? submitError.message : '反馈处理失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader
        eyebrow="USER FEEDBACK"
        title="问题反馈"
        description="查看用户提交的问题，记录处理说明并更新反馈状态。"
        metric={data.total}
        metricLabel="条反馈"
        actions={<AdminButton icon="download" onClick={() => window.open(adminExportUrl('/api/export/admin/feedbacks'), '_blank', 'noopener,noreferrer')}>导出反馈</AdminButton>}
      />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="标题、内容、用户或商家" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.status || '')} onChange={(event) => patchQuery({ status: event.target.value, page: 1 })}><option value="">全部状态</option><option value="PENDING">待处理</option><option value="PROCESSING">处理中</option><option value="RESOLVED">已解决</option><option value="REJECTED">已驳回</option></select>
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? <AdminTable columns={['商家 / 用户', '联系方式', '标题与内容', '状态', '回复', '提交时间', '操作']} minWidth={1180}>
          {data.items.map((item) => <tr key={item.id}>
            <td><b>{item.companyName || '未绑定商家'}</b><small>{item.userName || item.userPhone || '-'}</small></td>
            <td>{item.contact || '-'}</td>
            <td><b>{item.title || '-'}</b><small className="adminTableLongText">{item.content || '-'}</small></td>
            <td><AdminStatusBadge value={item.status} /></td>
            <td><span className="adminTableLongText">{item.reply || '-'}</span></td>
            <td>{formatAdminTime(item.createdAt || item.created_at)}</td>
            <td><div className="adminRowActions"><button type="button" onClick={() => openAction(item, 'PROCESSING')}>处理中</button><button type="button" className="isPrimary" onClick={() => openAction(item, 'RESOLVED')}>解决</button><button type="button" className="isDanger" onClick={() => openAction(item, 'REJECTED')}>驳回</button></div></td>
          </tr>)}
        </AdminTable> : <AdminEmpty text="暂无反馈记录" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {action && <AdminModal
        title={action.status === 'PROCESSING' ? '标记处理中' : action.status === 'RESOLVED' ? '解决反馈' : '驳回反馈'}
        description={action.item.title || '用户反馈'}
        size="small"
        onClose={() => setAction(null)}
        footer={<><AdminButton onClick={() => setAction(null)}>取消</AdminButton><AdminButton tone={action.status === 'REJECTED' ? 'danger' : 'primary'} disabled={busy} onClick={() => void submitAction()}>{busy ? '保存中...' : '保存处理结果'}</AdminButton></>}
      >
        <div className="adminFormGrid isSingle"><label><span>处理说明 / 回复内容</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="填写给用户的处理说明" autoFocus /></label></div>
      </AdminModal>}
    </div>
  );
}
