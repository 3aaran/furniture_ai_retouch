import type { ReactNode } from 'react';
import type { PageConfig, PagedRows, QueryState } from './operations.types';

export function Hero({ config, stats, action }: { config: PageConfig; stats?: Array<[string, string | number]>; action?: ReactNode }) {
  return (
    <section className="opHero">
      <div><span>{config.eyebrow}</span><h1>{config.title}</h1><p>{config.desc}</p></div>
      {stats?.length ? <div className="opStats">{stats.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div> : null}
      {action}
    </section>
  );
}

export function Pager({ data, setQuery, query }: { data: PagedRows; setQuery: (query: QueryState) => void; query: QueryState }) {
  const page = Number(data.page || query.page || 1);
  const pageSize = Number(data.pageSize || query.pageSize || 10);
  const total = Number(data.total || data.items?.length || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <nav className="opPager">
      <span>第 {page} / {totalPages} 页，共 {total} 条</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => setQuery({ ...query, page: page - 1 })}>上一页</button>
        <button type="button" disabled={page >= totalPages} onClick={() => setQuery({ ...query, page: page + 1 })}>下一页</button>
      </div>
    </nav>
  );
}

export function StateBlock({ loading, error, empty }: { loading: boolean; error: string; empty: boolean }) {
  if (loading) return <div className="opState">正在读取数据...</div>;
  if (error) return <div className="opState isError">{error}</div>;
  if (empty) return <div className="opState">暂无数据</div>;
  return null;
}
