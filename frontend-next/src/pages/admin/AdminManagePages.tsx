import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import {
  adminDelete,
  adminExportUrl,
  adminGet,
  adminPatch,
  adminPost,
  adminPut,
  formatAdminTime,
  numberText,
  useAdminPaged,
} from '../../services/admin.api';
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
  adminRoleNames,
  statusName,
} from './AdminUi';
import {
  AdminWorkflowEditor,
  createWorkflowDraft,
  validateWorkflowDraft,
  workflowDraftPayload,
  workflowToDraft,
  type WorkflowDraft,
} from './AdminWorkflowEditor';

type MerchantItem = {
  id: string | number;
  companyName?: string;
  contactName?: string;
  phone?: string;
  merchantCode?: string;
  quota?: number;
  quotaBalance?: number;
  status?: string;
  userCount?: number;
  imageCount?: number;
};

type MerchantUser = {
  id: string | number;
  phone?: string;
  username?: string;
  displayName?: string;
  role?: string;
  quota?: number;
  status?: string;
};

type QuotaLog = {
  id: string | number;
  type?: string;
  amount?: number;
  balance_after?: number;
  remark?: string;
  created_at?: string;
};

type MerchantDetail = { merchant: MerchantItem; users?: MerchantUser[]; quotaLogs?: QuotaLog[] };

type Announcement = {
  id: string | number;
  title?: string;
  audience?: string;
  content?: string;
  valid_until?: string;
  validUntil?: string;
  created_at?: string;
  createdAt?: string;
};

type RedeemCode = {
  id: string | number;
  code?: string;
  quota?: number;
  used_count?: number;
  usedCount?: number;
  max_uses?: number;
  maxUses?: number;
  target_scope?: string;
  targetScope?: string;
  status?: string;
  valid_until?: string;
  validUntil?: string;
  created_at?: string;
  createdAt?: string;
};

type WorkflowItem = {
  id: string;
  name: string;
  code: string;
  description?: string;
  type?: string;
  scene?: string;
  status?: string;
  version?: number;
  canvasJson?: {
    nodes?: Array<{
      id?: string;
      data?: {
        nodeType?: string;
        label?: string;
        description?: string;
        config?: Record<string, unknown>;
      };
    }>;
  };
  configJson?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type WorkflowAction = { kind: 'publish' | 'disable' | 'duplicate' | 'delete'; item: WorkflowItem } | null;

function audienceName(value: unknown) {
  const key = String(value || '').toUpperCase();
  return { ALL: '全体用户', MERCHANT: '门店管理员', ADMIN: '平台管理员' }[key] || String(value || '-');
}

function targetScopeName(value: unknown) {
  const key = String(value || '').toUpperCase();
  return { ALL: '全部用户', MERCHANT_OWNER: '门店管理员', MERCHANT_USER: '门店人员', TRIAL: '体验账号' }[key] || String(value || '-');
}

export function AdminMerchantsPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<MerchantItem>('/api/admin/merchants', {
    keyword: '', status: '', page: 1, pageSize: 10,
  });
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'users' | 'quota'>('users');
  const [quotaDelta, setQuotaDelta] = useState('0');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  async function openDetail(id: string | number) {
    setDetailLoading(true);
    try {
      setDetail(await adminGet<MerchantDetail>(`/api/admin/merchants/${encodeURIComponent(String(id))}`));
      setQuotaDelta('0');
      setDetailTab('users');
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : '商家详情加载失败');
      setNoticeTone('danger');
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleStatus(item: MerchantItem) {
    try {
      await adminPatch(`/api/admin/merchants/${encodeURIComponent(String(item.id))}/status`, { status: String(item.status).toUpperCase() === 'ACTIVE' ? 'DISABLED' : 'ACTIVE', announce: true });
      setNotice('商家状态已更新');
      setNoticeTone('success');
      await reload();
      if (detail?.merchant.id === item.id) await openDetail(item.id);
    } catch (statusError) {
      setNotice(statusError instanceof Error ? statusError.message : '商家状态更新失败');
      setNoticeTone('danger');
    }
  }

  async function saveQuota() {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await adminPatch<{ message?: string }>(`/api/admin/merchants/${encodeURIComponent(String(detail.merchant.id))}/config`, { quotaDelta: Number(quotaDelta || 0), announce: true });
      setNotice(result.message || '商家额度已调整');
      setNoticeTone('success');
      await reload();
      await openDetail(detail.merchant.id);
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : '额度调整失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="MERCHANT OPERATION" title="商家管理" description="查看门店规模、账号、图片数量与额度，并控制商家启用状态。" metric={data.total} metricLabel="家商户" actions={<AdminButton icon="download" onClick={() => window.open(adminExportUrl('/api/export/merchants'), '_blank', 'noopener,noreferrer')}>导出商家</AdminButton>} />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="名称、联系人或手机号" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.status || '')} onChange={(event) => patchQuery({ status: event.target.value, page: 1 })}><option value="">全部状态</option><option value="ACTIVE">启用</option><option value="DISABLED">禁用</option></select>
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? <div className="adminMerchantGrid">{data.items.map((item) => <article key={item.id}>
          <header><span className="adminMerchantAvatar">{String(item.companyName || '商').slice(0, 1)}</span><div><h2>{item.companyName || '未命名商家'}</h2><small>编号 {item.merchantCode || '-'}</small></div><AdminStatusBadge value={item.status} /></header>
          <dl><div><dt>联系人</dt><dd>{item.contactName || '-'}</dd></div><div><dt>手机号</dt><dd>{item.phone || '-'}</dd></div><div><dt>剩余额度</dt><dd>{numberText(item.quota ?? item.quotaBalance)}</dd></div><div><dt>账号 / 图片</dt><dd>{numberText(item.userCount)} / {numberText(item.imageCount)}</dd></div></dl>
          <footer><AdminButton icon="eye" onClick={() => void openDetail(item.id)}>查看详情</AdminButton><AdminButton icon="power" tone={String(item.status).toUpperCase() === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => void toggleStatus(item)}>{String(item.status).toUpperCase() === 'ACTIVE' ? '禁用' : '启用'}</AdminButton></footer>
        </article>)}</div> : <AdminEmpty text="暂无商家" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {(detail || detailLoading) && <AdminModal title={detail?.merchant.companyName || '商家详情'} description={detail ? `商家编号 ${detail.merchant.merchantCode || '-'}` : '正在加载商家信息'} size="large" onClose={() => setDetail(null)}>
        {detailLoading || !detail ? <AdminEmpty loading /> : <div className="adminMerchantDetail">
          <section className="adminMerchantMetrics"><article><span>剩余额度</span><b>{numberText(detail.merchant.quota ?? detail.merchant.quotaBalance)}</b></article><article><span>联系人</span><b>{detail.merchant.contactName || '-'}</b></article><article><span>手机号</span><b>{detail.merchant.phone || '-'}</b></article></section>
          <div className="adminQuotaAdjust"><label><span>发放 / 扣减额度</span><input type="number" value={quotaDelta} onChange={(event) => setQuotaDelta(event.target.value)} placeholder="负数表示扣减" /></label><AdminButton icon="save" tone="primary" disabled={busy} onClick={() => void saveQuota()}>{busy ? '保存中...' : '保存调整并公告'}</AdminButton></div>
          <div className="adminSegmented adminDetailTabs"><button type="button" className={detailTab === 'users' ? 'isActive' : ''} onClick={() => setDetailTab('users')}>商家账号</button><button type="button" className={detailTab === 'quota' ? 'isActive' : ''} onClick={() => setDetailTab('quota')}>额度记录</button></div>
          {detailTab === 'users' ? <AdminTable columns={['账号', '姓名', '角色', '额度', '状态']} minWidth={680}>{(detail.users || []).map((user) => <tr key={user.id}><td>{user.phone || user.username || '-'}</td><td>{user.displayName || '-'}</td><td>{adminRoleNames[user.role || ''] || user.role || '-'}</td><td>{numberText(user.quota)}</td><td><AdminStatusBadge value={user.status} /></td></tr>)}</AdminTable> : <AdminTable columns={['类型', '额度', '余额', '说明', '时间']} minWidth={760}>{(detail.quotaLogs || []).map((log) => <tr key={log.id}><td>{statusName(log.type)}</td><td>{numberText(log.amount)}</td><td>{numberText(log.balance_after)}</td><td>{log.remark || '-'}</td><td>{formatAdminTime(log.created_at)}</td></tr>)}</AdminTable>}
        </div>}
      </AdminModal>}
    </div>
  );
}

export function AdminAnnouncementsPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<Announcement>('/api/admin/announcements', {
    keyword: '', audience: '', page: 1, pageSize: 10,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', audience: 'ALL' });
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  async function createAnnouncement() {
    if (!form.title.trim() || !form.content.trim()) {
      setNotice('请填写公告标题和完整内容');
      setNoticeTone('danger');
      return;
    }
    setBusy(true);
    try {
      await adminPost('/api/admin/announcements', form);
      setCreateOpen(false);
      setForm({ title: '', content: '', audience: 'ALL' });
      setNotice('公告已发布');
      setNoticeTone('success');
      await reload();
    } catch (createError) {
      setNotice(createError instanceof Error ? createError.message : '公告发布失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="ANNOUNCEMENT CENTER" title="发布公告" description="向全体用户、门店管理员或平台管理员发送站内公告。" metric={data.total} metricLabel="条公告" actions={<AdminButton icon="plus" tone="primary" onClick={() => setCreateOpen(true)}>发布公告</AdminButton>} />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="公告标题或内容" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.audience || '')} onChange={(event) => patchQuery({ audience: event.target.value, page: 1 })}><option value="">全部对象</option><option value="ALL">全体用户</option><option value="MERCHANT">门店管理员</option><option value="ADMIN">平台管理员</option></select>
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? <AdminTable columns={['标题', '发送对象', '公告内容', '保留至', '发布时间']} minWidth={900}>{data.items.map((item) => <tr key={item.id}><td><b>{item.title || '-'}</b></td><td>{audienceName(item.audience)}</td><td><span className="adminTableLongText">{item.content || '-'}</span></td><td>{formatAdminTime(item.validUntil || item.valid_until)}</td><td>{formatAdminTime(item.createdAt || item.created_at)}</td></tr>)}</AdminTable> : <AdminEmpty text="暂无公告" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {createOpen && <AdminModal title="发布公告" description="公告发布后会进入目标用户的公告邮箱" size="medium" onClose={() => setCreateOpen(false)} footer={<><AdminButton onClick={() => setCreateOpen(false)}>取消</AdminButton><AdminButton icon="bell" tone="primary" disabled={busy} onClick={() => void createAnnouncement()}>{busy ? '发布中...' : '确认发布'}</AdminButton></>}>
        <div className="adminFormGrid isSingle"><label><span>发送对象</span><select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}><option value="ALL">全体用户</option><option value="MERCHANT">门店管理员</option><option value="ADMIN">平台管理员</option></select></label><label><span>公告标题</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} autoFocus /></label><label><span>公告内容</span><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></label></div>
      </AdminModal>}
    </div>
  );
}

export function AdminWorkflowsPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<WorkflowItem>('/api/admin/workflows', {
    keyword: '', status: '', type: '', page: 1, pageSize: 10,
  });
  const [editor, setEditor] = useState<WorkflowDraft | null>(null);
  const [action, setAction] = useState<WorkflowAction>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditor(createWorkflowDraft());
    setValidationMessage('');
  }

  async function openEdit(item: WorkflowItem) {
    setBusy(true);
    try {
      const detail = await adminGet<WorkflowItem>(`/api/admin/workflows/${encodeURIComponent(item.id)}`);
      setEditor(workflowToDraft(detail));
      setValidationMessage('');
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : '工作流详情加载失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  async function saveWorkflow() {
    if (!editor) return;
    setBusy(true);
    try {
      const errors = validateWorkflowDraft(editor);
      if (errors.length) throw new Error(errors.join('；'));
      const payload = workflowDraftPayload(editor);
      if (editor.mode === 'create') await adminPost('/api/admin/workflows', payload);
      else await adminPut(`/api/admin/workflows/${encodeURIComponent(String(editor.id))}`, payload);
      setNotice(editor.mode === 'create' ? '工作流已创建' : '工作流已保存');
      setNoticeTone('success');
      setEditor(null);
      await reload();
    } catch (saveError) {
      setValidationMessage(saveError instanceof Error ? saveError.message : '工作流保存失败');
    } finally {
      setBusy(false);
    }
  }

  async function validateWorkflow() {
    if (!editor?.id) {
      setValidationMessage('请先保存工作流，再执行后台校验。');
      return;
    }
    setBusy(true);
    try {
      const result = await adminPost<{ valid?: boolean; errors?: Array<{ message?: string }> }>(`/api/admin/workflows/${encodeURIComponent(editor.id)}/validate`, {});
      setValidationMessage(result.valid ? '校验通过：节点、连线和必填配置符合发布要求。' : (result.errors || []).map((item) => item.message).filter(Boolean).join('；') || '工作流校验失败');
    } catch (validateError) {
      setValidationMessage(validateError instanceof Error ? validateError.message : '工作流校验失败');
    } finally {
      setBusy(false);
    }
  }

  async function executeAction() {
    if (!action) return;
    setBusy(true);
    try {
      const id = encodeURIComponent(action.item.id);
      if (action.kind === 'publish') await adminPost(`/api/admin/workflows/${id}/publish`, {});
      if (action.kind === 'disable') await adminPost(`/api/admin/workflows/${id}/disable`, {});
      if (action.kind === 'duplicate') await adminPost(`/api/admin/workflows/${id}/duplicate`, {});
      if (action.kind === 'delete') await adminDelete(`/api/admin/workflows/${id}`);
      setNotice(action.kind === 'publish' ? '工作流已发布' : action.kind === 'disable' ? '工作流已停用' : action.kind === 'duplicate' ? '工作流已复制' : '工作流已删除');
      setNoticeTone('success');
      setAction(null);
      await reload();
    } catch (actionError) {
      setNotice(actionError instanceof Error ? actionError.message : '工作流操作失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="WORKFLOW TEMPLATES" title="工作流管理" description="维护图片工作流模板、节点结构、发布状态和版本。" metric={data.total} metricLabel="个工作流模板" actions={<AdminButton icon="plus" tone="primary" onClick={openCreate}>新建工作流</AdminButton>} />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="搜索名称、code 或场景" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.status || '')} onChange={(event) => patchQuery({ status: event.target.value, page: 1 })}><option value="">全部状态</option><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="DISABLED">已停用</option></select>
          <select value={String(query.type || '')} onChange={(event) => patchQuery({ type: event.target.value, page: 1 })}><option value="">全部类型</option><option value="IMAGE">图片</option><option value="VIDEO">视频</option><option value="MIXED">混合</option></select>
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? <AdminTable columns={['名称', 'Code', '类型 / 场景', '状态', '版本', '更新时间', '操作']} minWidth={1100}>{data.items.map((item) => <tr key={item.id}><td><b>{item.name}</b><small className="adminTableLongText">{item.description || '暂无说明'}</small></td><td><code className="adminCode">{item.code}</code></td><td>{item.type || 'IMAGE'}<small>{item.scene || '-'}</small></td><td><AdminStatusBadge value={item.status} /></td><td>{numberText(item.version)} 次</td><td>{formatAdminTime(item.updatedAt)}</td><td><div className="adminIconActions"><button type="button" title="编辑" onClick={() => void openEdit(item)}><AppIcon name="edit" /></button><button type="button" title="复制" onClick={() => setAction({ kind: 'duplicate', item })}><AppIcon name="copy" /></button><button type="button" title="发布" onClick={() => setAction({ kind: 'publish', item })}><AppIcon name="check" /></button><button type="button" title="停用" onClick={() => setAction({ kind: 'disable', item })}><AppIcon name="power" /></button><button type="button" className="isDanger" title="删除" onClick={() => setAction({ kind: 'delete', item })}><AppIcon name="trash" /></button></div></td></tr>)}</AdminTable> : <AdminEmpty text="暂无匹配工作流" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {editor && <AdminModal title={editor.mode === 'create' ? '新建工作流' : '编辑工作流'} description="使用可视化顺序节点配置现有后台工作流协议，不修改后端执行逻辑。" size="large" onClose={() => setEditor(null)} footer={<><AdminButton onClick={() => setEditor(null)}>取消</AdminButton>{editor.mode === 'edit' && <AdminButton icon="check" onClick={() => void validateWorkflow()}>后台校验</AdminButton>}<AdminButton icon="save" tone="primary" disabled={busy} onClick={() => void saveWorkflow()}>{busy ? '保存中...' : '保存工作流'}</AdminButton></>}>
        <AdminWorkflowEditor draft={editor} onChange={setEditor} />
        {validationMessage && <AdminNotice message={validationMessage} tone={validationMessage.includes('通过') ? 'success' : 'danger'} onClose={() => setValidationMessage('')} />}
      </AdminModal>}
      {action && <AdminModal title={action.kind === 'publish' ? '发布工作流' : action.kind === 'disable' ? '停用工作流' : action.kind === 'duplicate' ? '复制工作流' : '删除工作流'} description={action.item.name} size="small" onClose={() => setAction(null)} footer={<><AdminButton onClick={() => setAction(null)}>取消</AdminButton><AdminButton tone={action.kind === 'delete' ? 'danger' : 'primary'} disabled={busy} onClick={() => void executeAction()}>{busy ? '处理中...' : '确认操作'}</AdminButton></>}><p className="adminConfirmText">{action.kind === 'publish' ? '后台将校验当前节点和连线，并发布为可执行版本。' : action.kind === 'disable' ? '停用后用户不能继续选择该工作流，但仍可编辑。' : action.kind === 'duplicate' ? '系统会创建一份草稿副本，便于继续修改。' : '此操作会永久删除当前工作流。'}</p></AdminModal>}
    </div>
  );
}

export function AdminRedeemCodesPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<RedeemCode>('/api/admin/redeem-codes', {
    keyword: '', status: '', page: 1, pageSize: 10,
  });
  const [form, setForm] = useState({ count: '10', quota: '50', maxUses: '1', targetScope: 'ALL', validDays: '30' });
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  async function createCodes() {
    setBusy(true);
    try {
      const result = await adminPost<{ message?: string; codes?: string[] }>('/api/admin/redeem-codes/batch', { count: Number(form.count), quota: Number(form.quota), maxUses: Number(form.maxUses), targetScope: form.targetScope, validDays: Number(form.validDays) });
      setCreatedCodes(result.codes || []);
      setNotice(result.message || '兑换码已创建');
      setNoticeTone('success');
      await reload();
    } catch (createError) {
      setNotice(createError instanceof Error ? createError.message : '兑换码创建失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    if (!createdCodes.length) return;
    await navigator.clipboard.writeText(createdCodes.join('\n'));
    setNotice('兑换码已复制');
    setNoticeTone('success');
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="REDEEM CENTER" title="兑换码管理" description="批量创建额度兑换码，并查询使用次数、状态和有效期。" metric={data.total} metricLabel="条兑换码记录" />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel title="批量创建兑换码" description="兑换码创建后可复制并发送给指定用户群体。">
        <div className="adminFormGrid adminRedeemForm"><label><span>创建数量</span><input type="number" min="1" value={form.count} onChange={(event) => setForm({ ...form, count: event.target.value })} /></label><label><span>每个兑换额度</span><input type="number" min="0" value={form.quota} onChange={(event) => setForm({ ...form, quota: event.target.value })} /></label><label><span>可兑换次数</span><input type="number" min="1" value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} /></label><label><span>有效天数</span><input type="number" min="1" value={form.validDays} onChange={(event) => setForm({ ...form, validDays: event.target.value })} /></label><label><span>使用对象</span><select value={form.targetScope} onChange={(event) => setForm({ ...form, targetScope: event.target.value })}><option value="ALL">全部用户</option><option value="MERCHANT_OWNER">门店管理员</option><option value="MERCHANT_USER">门店人员</option><option value="TRIAL">体验账号</option></select></label><div className="adminFormActions"><AdminButton icon="ticket" tone="primary" disabled={busy} onClick={() => void createCodes()}>{busy ? '创建中...' : '创建兑换码'}</AdminButton></div></div>
        {createdCodes.length > 0 && <div className="adminCreatedCodes"><header><b>本次创建 {createdCodes.length} 个兑换码</b><AdminButton icon="copy" onClick={() => void copyCodes()}>复制全部</AdminButton></header><textarea readOnly value={createdCodes.join('\n')} /></div>}
      </AdminPanel>
      <AdminPanel>
        <div className="adminToolbar"><label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="搜索兑换码" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label><select value={String(query.status || '')} onChange={(event) => patchQuery({ status: event.target.value, page: 1 })}><option value="">全部状态</option><option value="ACTIVE">启用</option><option value="DISABLED">禁用</option><option value="EXPIRED">过期</option></select><AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton></div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? <AdminTable columns={['兑换码', '额度', '使用次数', '使用对象', '状态', '有效期', '创建时间']} minWidth={900}>{data.items.map((item) => <tr key={item.id}><td><code className="adminCode">{item.code || '-'}</code></td><td>{numberText(item.quota)}</td><td>{numberText(item.usedCount ?? item.used_count)} / {numberText(item.maxUses ?? item.max_uses)}</td><td>{targetScopeName(item.targetScope || item.target_scope)}</td><td><AdminStatusBadge value={item.status} /></td><td>{formatAdminTime(item.validUntil || item.valid_until)}</td><td>{formatAdminTime(item.createdAt || item.created_at)}</td></tr>)}</AdminTable> : <AdminEmpty text="暂无兑换码" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
    </div>
  );
}
