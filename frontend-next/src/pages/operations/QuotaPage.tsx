import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import type { QueryState, Row } from './operations.types';
import { Pager, StateBlock } from './OperationLayout';
import { fmt, patchQuery, usePaged } from './operations.utils';

export function QuotaPage({ openTask }: { openTask: (item: Row) => void }) {
  const [query, setQuery] = useState<QueryState>({ keyword: '', page: 1, pageSize: 10 });
  const { data, loading, error } = usePaged('/api/merchant/quota-logs', query);
  const items = data.items || [];
  return (
    <div className="opPage stitchQuotaPage">
      <section className="opPanel quotaSummaryStripV2">
        <article><span>当前余额</span><b>{data.summary?.currentBalance ?? 0} 算力</b></article>
        <article><span>总收入</span><b>+{Number(data.summary?.totalIncome || 0)}</b></article>
        <article><span>总支出</span><b>{Number(data.summary?.totalExpense || 0)}</b></article>
      </section>
      <section className="opPanel quotaPanelV2">
        <div className="opToolbar quotaToolbarV2">
          <label><AppIcon name="search" /><input placeholder="搜索任务、用户或操作人" value={query.keyword} onChange={(event) => patchQuery(setQuery, query, { keyword: event.target.value })} /></label>
        </div>
        <StateBlock loading={loading} error={error} empty={!items.length} />
        <div className="opTableWrap quotaTableWrapV2"><table className="quotaTableV2"><thead><tr><th>时间</th><th>类型</th><th>变动算力</th><th>变动后余额</th><th>关联任务</th></tr></thead><tbody>{items.map((item) => {
          const amount = Number(item.signedAmount ?? item.amount ?? 0);
          return <tr key={String(item.id)}><td>{fmt(item.created_at || item.createdAt)}</td><td><span className={`opBadge ${amount >= 0 ? 'isPlus' : 'isMinus'}`}>{item.typeLabel || item.type || '-'}</span></td><td><b className={amount >= 0 ? 'opPlus' : 'opMinus'}>{amount >= 0 ? `+${amount}` : amount}</b></td><td>{item.balanceAfter ?? '-'}</td><td>{item.related_task_id ? <button className="opTextButton" type="button" onClick={() => openTask({ id: item.related_task_id, related_task_id: item.related_task_id })}>{String(item.related_task_id).slice(0, 18)}</button> : '-'}</td></tr>;
        })}</tbody></table></div>
        <Pager data={data} query={query} setQuery={setQuery} />
      </section>
    </div>
  );
}
