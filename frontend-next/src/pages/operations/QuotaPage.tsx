import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import type { QueryState, Row } from './operations.types';
import { Hero, Pager, StateBlock } from './OperationLayout';
import { fmt, pageConfig, patchQuery, quotaText, usePaged } from './operations.utils';

export function QuotaPage({ openTask }: { openTask: (item: Row) => void }) {
  const [query, setQuery] = useState<QueryState>({ keyword: '', type: '', page: 1, pageSize: 10 });
  const { data, loading, error } = usePaged('/api/merchant/quota-logs', query);
  const items = data.items || [];
  return (
    <div className="opPage stitchQuotaPage">
      <Hero config={pageConfig('quota')} stats={[['当前余额', quotaText(data.summary?.currentBalance)], ['总收入', `+${Number(data.summary?.totalIncome || 0)}`], ['总支出', Number(data.summary?.totalExpense || 0)]]} action={<strong className="opHeroBalance">{data.summary?.currentBalance ?? 0} 算力</strong>} />
      <section className="opPanel quotaPanelV2">
        <div className="opToolbar quotaToolbarV2">
          <label><AppIcon name="search" /><input placeholder="搜索任务、用户或操作人" value={query.keyword} onChange={(event) => patchQuery(setQuery, query, { keyword: event.target.value })} /></label>
          <select value={query.type} onChange={(event) => patchQuery(setQuery, query, { type: event.target.value })}><option value="">全部类型</option><option value="AI_GENERATE">AI 生成</option><option value="AUTO_RECHARGE">自动充值</option><option value="MANUAL_RECHARGE">人工充值</option></select>
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
