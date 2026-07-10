import { useEffect, useMemo, useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import { TaskCompareModal, type TaskCompareItem } from '../../components/tasks/TaskCompareModal';
import {
  adminExportUrl,
  adminGet,
  adminImageUrl,
  formatAdminTime,
  numberText,
  useAdminPaged,
} from '../../services/admin.api';
import {
  AdminButton,
  AdminEmpty,
  AdminNotice,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminStatusBadge,
  featureName,
} from './AdminUi';

type OverviewData = {
  merchants?: { total?: number; active?: number };
  applications?: { pending?: number };
  finance?: { income?: number; cost?: number };
  images?: { totalImages?: number };
};

type TrendPoint = { label?: string; date?: string; income?: number; cost?: number };
type OperationStat = { operation?: string; featureKey?: string; count?: number; quota?: number };
type StatsData = { trend?: TrendPoint[]; ops?: OperationStat[] };

type AdminTaskItem = TaskCompareItem & {
  companyName?: string;
  userName?: string;
  phone?: string;
  username?: string;
  operation?: string;
  createdAt?: string;
  created_at?: string;
  thumbUrl?: string;
  previewUrl?: string;
  imageUrl?: string;
  resultUrl?: string;
  url?: string;
};

function TrendChart({ data }: { data: TrendPoint[] }) {
  const width = 900;
  const height = 270;
  const padding = 44;
  const max = Math.max(10, ...data.flatMap((item) => [Number(item.income || 0), Number(item.cost || 0)]));
  const x = (index: number) => padding + index * (width - padding * 2) / Math.max(1, data.length - 1);
  const y = (value: unknown) => height - padding - Number(value || 0) / max * (height - padding * 2);
  const points = (key: 'income' | 'cost') => data.map((item, index) => `${x(index)},${y(item[key])}`).join(' ');
  const guideValues = [0, .25, .5, .75, 1];

  if (!data.length) return <AdminEmpty text="当前时间范围暂无运营趋势" />;

  return (
    <div className="adminTrendChart">
      <div className="adminTrendLegend"><span className="isIncome">收入</span><span className="isCost">成本</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="平台收入与成本趋势">
        {guideValues.map((ratio) => {
          const lineY = height - padding - ratio * (height - padding * 2);
          return <line className="adminTrendGuide" key={ratio} x1={padding} y1={lineY} x2={width - padding} y2={lineY} />;
        })}
        <polyline className="adminTrendLine isIncome" points={points('income')} fill="none" />
        <polyline className="adminTrendLine isCost" points={points('cost')} fill="none" />
        {data.map((item, index) => <text key={`${item.label || item.date || index}`} x={x(index)} y={height - 14} textAnchor="middle">{item.label || item.date || index + 1}</text>)}
      </svg>
    </div>
  );
}

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [range, setRange] = useState('month');
  const [error, setError] = useState('');

  useEffect(() => {
    adminGet<OverviewData>('/api/admin/overview').then(setOverview).catch((loadError) => setError(loadError instanceof Error ? loadError.message : '运营概况加载失败'));
  }, []);

  useEffect(() => {
    adminGet<StatsData>('/api/admin/stats', { range }).then(setStats).catch((loadError) => setError(loadError instanceof Error ? loadError.message : '运营趋势加载失败'));
  }, [range]);

  const metrics = [
    ['商家总数', numberText(overview?.merchants?.total), '全部已审核商家'],
    ['启用商家', numberText(overview?.merchants?.active), '当前可正常登录'],
    ['待审申请', numberText(overview?.applications?.pending), '等待平台处理'],
    ['本期收入', `￥${numberText(overview?.finance?.income, 2)}`, '按当前统计周期'],
    ['本期成本', `￥${numberText(overview?.finance?.cost, 2)}`, 'AI 模型与平台成本'],
    ['图片资产', numberText(overview?.images?.totalImages), '平台累计图片数量'],
  ];
  const maxOperationCount = Math.max(1, ...(stats?.ops || []).map((item) => Number(item.count || 0)));

  return (
    <div className="adminPage">
      <AdminPageHeader eyebrow="PLATFORM OVERVIEW" title="运营概况" description="查看商家规模、申请处理、平台收支与 AI 功能消耗。" />
      {error && <AdminNotice message={error} tone="danger" onClose={() => setError('')} />}
      <section className="adminMetricGrid">
        {metrics.map(([label, value, description]) => <article key={label}><span>{label}</span><b>{value}</b><p>{description}</p></article>)}
      </section>
      <AdminPanel
        title="运营趋势"
        description="收入与成本按统计周期汇总"
        actions={<div className="adminSegmented">{[['month', '月'], ['quarter', '季度'], ['year', '年']].map(([key, label]) => <button key={key} type="button" className={range === key ? 'isActive' : ''} onClick={() => setRange(key)}>{label}</button>)}</div>}
      >
        <TrendChart data={stats?.trend || []} />
      </AdminPanel>
      <AdminPanel title="AI 消耗分布" description="按功能统计调用次数与额度消耗">
        {(stats?.ops || []).length ? <div className="adminUsageBars">{(stats?.ops || []).map((item) => {
          const count = Number(item.count || 0);
          return <article key={item.operation || item.featureKey}><header><b>{featureName(item.operation || item.featureKey)}</b><span>{count} 次 / {numberText(item.quota)} 额度</span></header><div><i style={{ width: `${Math.max(2, count / maxOperationCount * 100)}%` }} /></div></article>;
        })}</div> : <AdminEmpty text="暂无 AI 消耗统计" />}
      </AdminPanel>
    </div>
  );
}

export function AdminLogsPage() {
  const { query, patchQuery, data, loading, error, reload } = useAdminPaged<AdminTaskItem>('/api/admin/task-images', {
    keyword: '',
    operation: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 12,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AdminTaskItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const selectedCount = selectedIds.size;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [data.page]);

  const featureOptions = useMemo(() => Object.entries({
    remove_bg: '背景净化', replace_bg: '场景融合', enhance: '摄影增强', material: '材质替换', multiview: '多角度视图', lineart: '线稿图', promo_main_image: '产品主图', promo_poster_image: '广告海报图', promo_detail_image: '产品细节图', video_generate: '宣传视频生成',
  }), []);

  function toggleSelect(id: unknown) {
    const key = String(id || '');
    if (!key) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function openDetail(item: AdminTaskItem) {
    const id = String(item.id || item.imageId || '');
    if (!id) return;
    setDetailLoading(true);
    setNotice('');
    try {
      setDetail(await adminGet<AdminTaskItem>(`/api/images/${encodeURIComponent(id)}/detail-rich`));
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : '任务详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }

  function batchDownload() {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      setNotice('请先选择需要下载的任务');
      return;
    }
    window.open(adminExportUrl('/api/admin/task-images/batch-download', { ids: ids.join(',') }), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="adminPage">
      <AdminPageHeader
        eyebrow="AI OPERATION LOG"
        title="AI 日志"
        description="查询所有商家与用户产生的 AI 图片任务，并查看原图与结果图。"
        metric={data.total}
        metricLabel="条任务记录"
        actions={<AdminButton icon="download" onClick={batchDownload}>下载已选</AdminButton>}
      />
      {notice && <AdminNotice message={notice} tone="danger" onClose={() => setNotice('')} />}
      <AdminPanel>
        <div className="adminToolbar">
          <label className="adminSearchField"><AppIcon name="search" /><input value={String(query.keyword || '')} placeholder="搜索商家、用户或任务编号" onChange={(event) => patchQuery({ keyword: event.target.value, page: 1 })} /></label>
          <select value={String(query.operation || '')} onChange={(event) => patchQuery({ operation: event.target.value, page: 1 })}><option value="">全部功能</option>{featureOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <input type="date" value={String(query.startDate || '')} onChange={(event) => patchQuery({ startDate: event.target.value, page: 1 })} />
          <input type="date" value={String(query.endDate || '')} onChange={(event) => patchQuery({ endDate: event.target.value, page: 1 })} />
          <AdminButton icon="search" tone="primary" onClick={() => void reload()}>查询</AdminButton>
        </div>
        {selectedCount > 0 && <div className="adminSelectionBar"><b>已选择 {selectedCount} 项任务</b><button type="button" onClick={() => setSelectedIds(new Set())}>取消选择</button></div>}
        {loading || error ? <AdminEmpty loading={loading} error={error} /> : data.items.length ? (
          <div className="adminTaskGrid">
            {data.items.map((item) => {
              const id = String(item.id || item.imageId || '');
              const image = adminImageUrl(item as Record<string, unknown>);
              return <article key={id} className={selectedIds.has(id) ? 'isSelected' : ''}>
                <label className="adminCardCheck" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleSelect(id)} /><span /></label>
                <button className="adminTaskPreview" type="button" onClick={() => void openDetail(item)}>{image ? <img src={image} alt={featureName(item.featureKey || item.operation || item.kind)} loading="lazy" decoding="async" /> : <span><AppIcon name="resources" />暂无缩略图</span>}<em>{featureName(item.featureKey || item.operation || item.kind)}</em></button>
                <div className="adminTaskMeta"><b>{item.companyName || '未绑定商家'}</b><span>{item.userName || item.phone || item.username || '-'} · {formatAdminTime(item.createdAt || item.created_at)}</span><small>编号：{id}</small></div>
                <footer><AdminStatusBadge value={item.status} /><AdminButton icon="eye" tone="ghost" onClick={() => void openDetail(item)}>详情</AdminButton></footer>
              </article>;
            })}
          </div>
        ) : <AdminEmpty text="暂无匹配的 AI 任务" />}
        <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(page) => patchQuery({ page })} />
      </AdminPanel>
      {detailLoading && <div className="adminModalLoading" role="status">正在加载任务详情...</div>}
      <TaskCompareModal detail={detail} taskList={data.items} onClose={() => setDetail(null)} onSwitchTask={(item) => void openDetail(item)} />
    </div>
  );
}
