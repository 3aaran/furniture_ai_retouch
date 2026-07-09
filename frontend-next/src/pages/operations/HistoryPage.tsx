import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import { studioFeatures } from '../studio/studioData';
import type { QueryState, Row } from './operations.types';
import { Pager, StateBlock } from './OperationLayout';
import { featureText, fmt, imageUrl, patchQuery, usePaged } from './operations.utils';

const STATUS_FILTERS = [
  { label: '全部状态', value: '' },
  { label: '已完成', value: 'succeeded' },
  { label: '生成中', value: 'running' },
  { label: '失败', value: 'failed' },
];

function quotaUsed(item: Row) {
  return Number(item.quotaUsed || item.costUsed || item.cost || item.settings?.cost || 0);
}

function taskFeatureValue(item: Row) {
  return String(item.featureKey || item.kind || item.operation || '');
}

function taskUserValue(item: Row) {
  return String(item.userName || item.createdByName || item.user?.displayName || item.userPhone || item.phone || item.username || '');
}

export function HistoryPage({ openTask }: { openTask: (item: Row, list: Row[]) => void }) {
  const [query, setQuery] = useState<QueryState>({ keyword: '', kind: '', status: '', user: '', page: 1, pageSize: 12 });
  const { data, loading, error } = usePaged('/api/ai/tasks/recent', query);
  const items = data.items || [];
  const userOptions = Array.from(new Set(items.map(taskUserValue).filter(Boolean)));
  const visibleItems = items.filter((item) => {
    const status = String(item.status || '').toLowerCase();
    const statusMatches = !query.status || (query.status === 'running' ? ['queued', 'pending', 'running'].includes(status) : status === query.status || (query.status === 'succeeded' && status === 'success'));
    return statusMatches && (!query.kind || taskFeatureValue(item) === query.kind) && (!query.user || taskUserValue(item) === query.user);
  });
  return (
    <div className="opPage stitchHistoryPage">
      <section className="opPanel stitchHistoryPanel">
        <div className="opToolbar historyTaskFilters">
          <label><AppIcon name="search" /><input placeholder="任务编号 / 功能 / 用户" value={query.keyword} onChange={(event) => patchQuery(setQuery, query, { keyword: event.target.value })} /></label>
          <div className="historySelectRow">
            <select value={query.kind} onChange={(event) => patchQuery(setQuery, query, { kind: event.target.value })}><option value="">全部功能</option>{studioFeatures.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            <select value={query.user} onChange={(event) => patchQuery(setQuery, query, { user: event.target.value })}><option value="">全部用户</option>{userOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
          <div className="historyStatusTabs" aria-label="任务状态">
            {STATUS_FILTERS.map((item) => <button className={query.status === item.value ? 'isActive' : ''} type="button" key={item.value || 'all'} onClick={() => patchQuery(setQuery, query, { status: item.value })}>{item.label}</button>)}
          </div>
        </div>
        <StateBlock loading={loading} error={error} empty={!visibleItems.length} />
        <div className="opTaskGrid aiTaskGrid">{visibleItems.map((item) => (
          <article className="opTaskCard taskCard" key={String(item.id)}>
            <button className="opTaskImage taskImg" type="button" onClick={() => openTask(item, visibleItems)}>{imageUrl(item) ? <img src={imageUrl(item)} alt={featureText(item)} loading="lazy" decoding="async" /> : <span>{featureText(item)}</span>}<b>{featureText(item)}</b></button>
            <div className="taskMeta"><span>{fmt(item.createdAt || item.submittedAt)}<em>消耗 {quotaUsed(item) || '-'} 算力</em></span><small>编号：{String(item.id || '').slice(0, 18)}</small></div>
            {imageUrl(item) && <footer className="taskActions"><a href={imageUrl(item)} target="_blank" rel="noreferrer"><AppIcon name="download" />下载</a></footer>}
          </article>
        ))}</div>
        <Pager data={data} query={query} setQuery={setQuery} />
      </section>
    </div>
  );
}
