import { useEffect, useMemo, useState } from 'react';
import { AppIcon, type AppIconName } from '../../components/icons/AppIcon';
import {
  adminDelete,
  adminGet,
  adminImageUrl,
  adminPatch,
  adminPost,
  adminUpload,
  formatAdminTime,
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
  adminResourceTypeNames,
  featureName,
} from './AdminUi';

type AdminResource = {
  id: string | number;
  name?: string;
  resourceType?: string;
  objectName?: string;
  colorName?: string;
  description?: string;
  status?: string;
  imageUrl?: string;
  thumbUrl?: string;
  previewUrl?: string;
  url?: string;
  createdAt?: string;
};

type AiProviderConfig = {
  provider?: string;
  defaultModel?: string;
  defaultApiPath?: string;
  apiKey?: string;
  apiKeyMasked?: string;
  enabled?: boolean;
};

type AiFeatureConfig = {
  featureKey: string;
  featureName?: string;
  enabled?: boolean;
  provider?: string;
  modelName?: string;
  apiPath?: string;
};

type AiConfig = {
  providerConfig?: AiProviderConfig;
  features?: AiFeatureConfig[];
};

type SettingGroup = {
  key: string;
  title: string;
  icon: AppIconName;
  description: string;
  items: Array<{ key: string; label: string; hint?: string; type?: 'number' | 'text' }>;
};

const modelOptions = [
  { label: '本地模拟', provider: 'mock', modelName: 'local-mock-model', apiPath: '' },
  { label: '智谱 CogView-3-Flash', provider: 'zhipu', modelName: 'cogview-3-flash', apiPath: 'https://open.bigmodel.cn/api/paas/v4/images/generations' },
  { label: 'GPT Image 2', provider: 'gpt-image-2', modelName: 'gpt-image-2', apiPath: 'https://api.lk888.ai/v1/media/generate' },
  { label: '自定义 HTTP', provider: 'custom', modelName: 'custom-image-model', apiPath: '' },
];

const settingGroups: SettingGroup[] = [
  { key: 'storage', title: '图片存储', icon: 'resources', description: '控制非平台管理员账号的默认存储容量。', items: [{ key: 'user_storage_limit_bytes', label: '用户图片存储上限', hint: '支持 5GB、500MB 这类写法。' }] },
  { key: 'quota', title: '额度基础', icon: 'wallet', description: '配置额度换算和体验账号有效时间。', items: [{ key: 'recharge_ratio', label: '额度换算比例', type: 'number' }, { key: 'trial_account_hours', label: '体验账号有效小时', type: 'number' }] },
  { key: 'cost', title: 'AI 功能消耗', icon: 'model', description: '配置每种 AI 功能的基础额度消耗。', items: [{ key: 'cost_remove_bg', label: '背景净化', type: 'number' }, { key: 'cost_replace_bg', label: '场景融合', type: 'number' }, { key: 'cost_enhance', label: '摄影增强', type: 'number' }, { key: 'cost_material', label: '材质替换', type: 'number' }, { key: 'cost_multiview', label: '多角度视图', type: 'number' }, { key: 'cost_lineart', label: '线稿图', type: 'number' }, { key: 'cost_video_generate', label: '宣传视频生成', type: 'number' }] },
  { key: 'video', title: '视频生成', icon: 'workflow', description: '约束视频任务的默认和最大时长。', items: [{ key: 'video_default_duration_seconds', label: '默认视频时长（秒）', type: 'number' }, { key: 'video_max_duration_seconds', label: '最大视频时长（秒）', type: 'number' }] },
  { key: 'announcement', title: '公告邮箱', icon: 'bell', description: '控制公告保留时间与用户可见数量。', items: [{ key: 'announcement_retention_days', label: '公告默认保留天数', type: 'number' }, { key: 'announcement_user_max_count', label: '每个用户最多显示公告数', type: 'number' }] },
  { key: 'resolution', title: '分辨率倍率', icon: 'settings', description: '定义不同输出分辨率对应的额度倍率。', items: [{ key: 'resolution_multiplier_1k', label: '1K 倍率', type: 'number' }, { key: 'resolution_multiplier_2k', label: '2K 倍率', type: 'number' }, { key: 'resolution_multiplier_4k', label: '4K 倍率', type: 'number' }] },
  { key: 'invite', title: '推广奖励', icon: 'promotion', description: '设置新门店和邀请门店的奖励比例。', items: [{ key: 'invite_new_store_reward_ratio', label: '新注册门店奖励比例', type: 'number' }, { key: 'invite_source_store_reward_ratio', label: '邀请门店奖励比例', type: 'number' }] },
];

function modelValue(provider?: string, modelName?: string) {
  return `${provider || ''}::${modelName || ''}`;
}

export function AdminResourcesPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<AdminResource>('/api/admin/resources', {
    keyword: '', resourceType: '', status: '', page: 1, pageSize: 12,
  });
  const [form, setForm] = useState({ name: '', resourceType: 'material', objectName: '', colorName: '', description: '', imageUrl: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminResource | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { previews.forEach((preview) => URL.revokeObjectURL(preview)); }, [previews]);

  function chooseFiles(nextFiles: File[]) {
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  }

  async function createResource() {
    if (!files.length && !form.imageUrl.trim()) {
      setNotice('请上传资源图片或填写图片 URL');
      setNoticeTone('danger');
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      for (const file of files) formData.append('image', file);
      await adminUpload('/api/admin/resources', formData);
      setForm({ name: '', resourceType: 'material', objectName: '', colorName: '', description: '', imageUrl: '' });
      chooseFiles([]);
      setNotice(files.length > 1 ? `已创建 ${files.length} 项系统资源` : '系统资源已创建');
      setNoticeTone('success');
      await reload();
    } catch (createError) {
      setNotice(createError instanceof Error ? createError.message : '资源创建失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(item: AdminResource) {
    try {
      await adminPatch(`/api/admin/resources/${encodeURIComponent(String(item.id))}`, { status: String(item.status).toUpperCase() === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      setNotice('资源状态已更新');
      setNoticeTone('success');
      await reload();
    } catch (statusError) {
      setNotice(statusError instanceof Error ? statusError.message : '资源状态更新失败');
      setNoticeTone('danger');
    }
  }

  async function deleteResource() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await adminDelete(`/api/admin/resources/${encodeURIComponent(String(deleteTarget.id))}`);
      setDeleteTarget(null);
      setNotice('系统资源已删除');
      setNoticeTone('success');
      await reload();
    } catch (deleteError) {
      setNotice(deleteError instanceof Error ? deleteError.message : '资源删除失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="SYSTEM ASSETS" title="系统资源" description="维护全平台可用的材质、场景、背景和参考图片。" metric={data.total} metricLabel="项系统资源" />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      <AdminPanel title="新增系统资源" description="上传图片并填写用于检索和筛选的资源信息">
        <div className="adminResourceCreate">
          <label className="adminResourceUploader"><input type="file" accept="image/*" multiple onChange={(event) => chooseFiles(Array.from(event.target.files || []))} />{previews.length ? <div className="adminResourcePreviewGrid">{previews.slice(0, 4).map((preview, index) => <img key={preview} src={preview} alt={`待上传资源 ${index + 1}`} />)}{previews.length > 4 && <span>+{previews.length - 4}</span>}</div> : <span><AppIcon name="plus" /><b>上传资源图片</b><small>支持常见图片格式，最多 50 张</small></span>}<em>{files.length ? `已选择 ${files.length} 张图片` : '点击选择或重新选择图片'}</em></label>
          <div className="adminFormGrid">
            <label><span>统一名称（可选）</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="不填则使用每个文件名" /></label>
            <label><span>资源类型</span><select value={form.resourceType} onChange={(event) => setForm({ ...form, resourceType: event.target.value })}>{Object.entries(adminResourceTypeNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label><span>适用对象</span><input value={form.objectName} onChange={(event) => setForm({ ...form, objectName: event.target.value })} /></label>
            <label><span>颜色 / 色系</span><input value={form.colorName} onChange={(event) => setForm({ ...form, colorName: event.target.value })} /></label>
            <label className="isFull"><span>图片 URL（上传图片后可不填）</span><input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
            <label className="isFull"><span>资源说明</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="adminFormActions isFull"><AdminButton icon="plus" tone="primary" disabled={busy} onClick={() => void createResource()}>{busy ? '上传中...' : files.length > 1 ? `上传 ${files.length} 张` : '创建资源'}</AdminButton></div>
          </div>
        </div>
      </AdminPanel>
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="名称、适用对象或颜色" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.resourceType || '')} onChange={(event) => patchQuery({ resourceType: event.target.value, page: 1 })}><option value="">全部类型</option>{Object.entries(adminResourceTypeNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select value={String(query.status || '')} onChange={(event) => patchQuery({ status: event.target.value, page: 1 })}><option value="">全部状态</option><option value="ACTIVE">上架</option><option value="DISABLED">下架</option></select>
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? <div className="adminResourceGrid">{data.items.map((item) => {
          const image = adminImageUrl(item as Record<string, unknown>);
          return <article key={item.id}><div className="adminResourceImage">{image ? <img src={image} alt={item.name || '系统资源'} loading="lazy" decoding="async" /> : <span><AppIcon name="resources" />暂无图片</span>}<AdminStatusBadge value={item.status} /></div><div className="adminResourceInfo"><h2>{item.name || '未命名资源'}</h2><span>{adminResourceTypeNames[item.resourceType || ''] || item.resourceType || '-'} · {item.objectName || '-'} · {item.colorName || '-'}</span><p>{item.description || '暂无说明'}</p><small>{formatAdminTime(item.createdAt)}</small></div><footer><AdminButton icon="power" onClick={() => void toggleStatus(item)}>{String(item.status).toUpperCase() === 'ACTIVE' ? '下架' : '上架'}</AdminButton><AdminButton icon="trash" tone="danger" onClick={() => setDeleteTarget(item)}>删除</AdminButton></footer></article>;
        })}</div> : <AdminEmpty text="暂无系统资源" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {deleteTarget && <AdminModal title="删除系统资源" description={deleteTarget.name || '未命名资源'} size="small" onClose={() => setDeleteTarget(null)} footer={<><AdminButton onClick={() => setDeleteTarget(null)}>取消</AdminButton><AdminButton tone="danger" disabled={busy} onClick={() => void deleteResource()}>{busy ? '删除中...' : '确认删除'}</AdminButton></>}><p className="adminConfirmText">删除后该资源将无法继续被平台用户选择，此操作不可撤销。</p></AdminModal>}
    </div>
  );
}

export function AdminAiConfigPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminGet<AiConfig>('/api/admin/ai/config').then(setConfig).catch((loadError) => { setNotice(loadError instanceof Error ? loadError.message : 'AI 配置加载失败'); setNoticeTone('danger'); });
  }, []);

  function updateProvider(key: keyof AiProviderConfig, value: string | boolean) {
    setConfig((current) => current ? { ...current, providerConfig: { ...current.providerConfig, [key]: value } } : current);
  }

  function selectGlobalModel(value: string) {
    const option = modelOptions.find((item) => modelValue(item.provider, item.modelName) === value) || modelOptions[0];
    setConfig((current) => current ? {
      ...current,
      providerConfig: { ...current.providerConfig, provider: option.provider, defaultModel: option.modelName, defaultApiPath: option.apiPath },
      features: (current.features || []).map((feature) => ({ ...feature, provider: option.provider, modelName: option.modelName, apiPath: option.apiPath })),
    } : current);
  }

  function updateFeature(index: number, patch: Partial<AiFeatureConfig>) {
    setConfig((current) => {
      if (!current) return current;
      const features = [...(current.features || [])];
      features[index] = { ...features[index], ...patch };
      return { ...current, features };
    });
  }

  function selectFeatureModel(index: number, value: string) {
    const option = modelOptions.find((item) => modelValue(item.provider, item.modelName) === value) || modelOptions[0];
    updateFeature(index, { provider: option.provider, modelName: option.modelName, apiPath: option.apiPath });
  }

  async function save() {
    if (!config) return;
    setBusy(true);
    try {
      await adminPost('/api/admin/ai/config', config);
      setConfig(await adminGet<AiConfig>('/api/admin/ai/config'));
      setNotice('AI 模型配置已保存');
      setNoticeTone('success');
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : 'AI 配置保存失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="AI MODEL CONFIG" title="模型配置" description="维护全局 AI 服务和每项功能使用的模型、接口与启用状态。" actions={<AdminButton icon="save" tone="primary" disabled={!config || busy} onClick={() => void save()}>{busy ? '保存中...' : '保存配置'}</AdminButton>} />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      {!config ? <AdminEmpty loading text="AI 配置加载中" /> : <>
        <AdminPanel title="全局模型服务" description="更改全局模型时，会同步更新所有功能的默认模型映射。">
          <div className="adminFormGrid">
            <label><span>模型服务</span><select value={modelValue(config.providerConfig?.provider, config.providerConfig?.defaultModel)} onChange={(event) => selectGlobalModel(event.target.value)}>{modelOptions.map((option) => <option key={modelValue(option.provider, option.modelName)} value={modelValue(option.provider, option.modelName)}>{option.label}</option>)}</select></label>
            <label><span>接口密钥</span><input type="password" placeholder={config.providerConfig?.apiKeyMasked || '保存后自动脱敏显示'} value={config.providerConfig?.apiKey || ''} onChange={(event) => updateProvider('apiKey', event.target.value)} /></label>
            <label className="isFull"><span>接口路径地址</span><input value={config.providerConfig?.defaultApiPath || ''} onChange={(event) => updateProvider('defaultApiPath', event.target.value)} placeholder="https://example.com/v1/images/generations" /></label>
            <label className="adminSwitch isFull"><input type="checkbox" checked={Boolean(config.providerConfig?.enabled)} onChange={(event) => updateProvider('enabled', event.target.checked)} /><span><b>启用 AI 生成功能</b><small>关闭后平台不再提交新的 AI 生成任务。</small></span></label>
          </div>
        </AdminPanel>
        <AdminPanel title="功能模型映射" description="每项功能可以单独指定模型和接口地址。">
          <div className="adminAiFeatureList">{(config.features || []).map((item, index) => <article key={item.featureKey}>
            <header><div><span>{featureName(item.featureKey)}</span><small>{item.featureKey}</small></div><label className="adminCompactSwitch"><input type="checkbox" checked={Boolean(item.enabled)} onChange={(event) => updateFeature(index, { enabled: event.target.checked })} /><span /></label></header>
            <div className="adminFormGrid">
              <label><span>模型来源</span><input readOnly value={item.provider || ''} /></label>
              <label><span>模型名称</span><select value={modelValue(item.provider, item.modelName)} onChange={(event) => selectFeatureModel(index, event.target.value)}>{modelOptions.map((option) => <option key={modelValue(option.provider, option.modelName)} value={modelValue(option.provider, option.modelName)}>{option.label}</option>)}</select></label>
              <label className="isFull"><span>接口路径地址</span><input value={item.apiPath || ''} onChange={(event) => updateFeature(index, { apiPath: event.target.value })} placeholder="可单独覆盖全局接口地址" /></label>
            </div>
          </article>)}</div>
        </AdminPanel>
      </>}
    </div>
  );
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'danger'>('success');
  const [busy, setBusy] = useState(false);
  const totalSettings = useMemo(() => settingGroups.reduce((count, group) => count + group.items.length, 0), []);

  useEffect(() => {
    adminGet<Record<string, string | number>>('/api/admin/settings').then((data) => setSettings({ video_default_duration_seconds: '10', video_max_duration_seconds: '30', announcement_retention_days: '30', announcement_user_max_count: '50', ...data })).catch((loadError) => { setNotice(loadError instanceof Error ? loadError.message : '系统配置加载失败'); setNoticeTone('danger'); }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setBusy(true);
    try {
      await adminPatch('/api/admin/settings', settings);
      setNotice('系统配置已保存');
      setNoticeTone('success');
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : '系统配置保存失败');
      setNoticeTone('danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminPage adminSettingsPage">
      <AdminPageHeader eyebrow="PLATFORM RULES" title="系统配置" description="统一管理存储、额度、AI 消耗、视频、公告、分辨率和推广规则。" metric={totalSettings} metricLabel="项业务参数" actions={<AdminButton icon="save" tone="primary" disabled={loading || busy} onClick={() => void save()}>{busy ? '保存中...' : '保存全部'}</AdminButton>} />
      {notice && <AdminNotice message={notice} tone={noticeTone} onClose={() => setNotice('')} />}
      {loading ? <AdminEmpty loading /> : <div className="adminSettingsGrid">{settingGroups.map((group) => <AdminPanel key={group.key} className="adminSettingsGroup">
        <header className="adminSettingsGroupHead"><span><AppIcon name={group.icon} /></span><div><h2>{group.title}</h2><p>{group.description}</p></div></header>
        <div className="adminSettingsFields">{group.items.map((item) => <label key={item.key}><span>{item.label}</span><input type={item.type || 'text'} value={settings[item.key] ?? ''} onChange={(event) => setSettings((current) => ({ ...current, [item.key]: event.target.value }))} />{item.hint && <small>{item.hint}</small>}</label>)}</div>
      </AdminPanel>)}</div>}
    </div>
  );
}
