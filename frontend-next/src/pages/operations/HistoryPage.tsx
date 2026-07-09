import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import type { QueryState, Row } from './operations.types';
import { Hero, Pager, StateBlock } from './OperationLayout';
import { featureText, fmt, imageUrl, pageConfig, patchQuery, usePaged } from './operations.utils';

function updateTimeRange(value: string, query: QueryState, setQuery: (query: QueryState) => void) {
  if (!value) {
    setQuery({ ...query, timeRange: '', startDate: '', endDate: '', page: 1 });
    return;
  }
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - Number(value) + 1);
  setQuery({ ...query, timeRange: value, startDate: start.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10), page: 1 });
}

export function HistoryPage({ openTask }: { openTask: (item: Row, list: Row[]) => void }) {
  const [query, setQuery] = useState<QueryState>({ keyword: '', kind: '', status: '', timeRange: '', user: '', startDate: '', endDate: '', page: 1, pageSize: 12 });
  const { data, loading, error } = usePaged('/api/ai/tasks/recent', query);
  const items = data.items || [];
  const finished = items.filter((item) => ['succeeded', 'success'].includes(String(item.status || '').toLowerCase())).length;
  const running = items.filter((item) => ['queued', 'pending', 'running'].includes(String(item.status || '').toLowerCase())).length;
  return (
    <div className="opPage stitchHistoryPage">
      <Hero config={pageConfig('history')} stats={[['当前页任务', items.length], ['已完成', finished], ['生成中', running], ['失败', items.filter((item) => String(item.status || '').toLowerCase() === 'failed').length]]} />
      <section className="opPanel stitchHistoryPanel">
        <div className="opToolbar historyTaskFilters">
          <label><AppIcon name="search" /><input placeholder="任务编号 / 功能 / 用户" value={query.keyword} onChange={(event) => patchQuery(setQuery, query, { keyword: event.target.value })} /></label>
          <select value={query.kind} onChange={(event) => patchQuery(setQuery, query, { kind: event.target.value })}><option value="">全部功能</option></select>
          <select value={query.status} onChange={(event) => patchQuery(setQuery, query, { status: event.target.value })}><option value="">全部状态</option><option value="succeeded">已完成</option><option value="running">生成中</option><option value="failed">失败</option></select>
          <select value={query.timeRange} onChange={(event) => updateTimeRange(event.target.value, query, setQuery)}><option value="">全部时间</option><option value="1">今天</option><option value="7">近 7 天</option><option value="30">近 30 天</option></select>
          <select value={query.user} onChange={(event) => patchQuery(setQuery, query, { user: event.target.value })}><option value="">全部用户</option></select>
        </div>
        <StateBlock loading={loading} error={error} empty={!items.length} />
        <div className="opTaskGrid aiTaskGrid">{items.map((item) => (
          <article className="opTaskCard taskCard" key={String(item.id)}>
            <button className="opTaskImage taskImg" type="button" onClick={() => openTask(item, items)}>{imageUrl(item) ? <img src={imageUrl(item)} alt={featureText(item)} loading="lazy" decoding="async" /> : <span>{featureText(item)}</span>}<b>{featureText(item)}</b></button>
            <div className="taskMeta"><strong>{item.userName || item.createdByName || item.user?.displayName || '-'}</strong><span>{fmt(item.createdAt || item.submittedAt)}</span><small>编号：{String(item.id || '').slice(0, 18)}</small></div>
            <footer className="taskActions"><button type="button" onClick={() => openTask(item, items)}><AppIcon name="eye" />详情</button>{imageUrl(item) && <a href={imageUrl(item)} target="_blank" rel="noreferrer"><AppIcon name="download" />下载</a>}</footer>
          </article>
        ))}</div>
        <Pager data={data} query={query} setQuery={setQuery} />
      </section>
    </div>
  );
}
