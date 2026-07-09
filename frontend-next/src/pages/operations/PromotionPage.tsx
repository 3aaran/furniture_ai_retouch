import { useState } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import type { QueryState } from './operations.types';
import { Pager, StateBlock } from './OperationLayout';
import { fmt, patchQuery, quotaText, usePaged } from './operations.utils';

export function PromotionPage({ setNotice }: { setNotice: (value: string) => void }) {
  const [query, setQuery] = useState<QueryState>({ keyword: '', status: '', startDate: '', endDate: '', page: 1, pageSize: 10 });
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const { data, loading, error } = usePaged('/api/merchant/promotion', query);
  const items = data.items || [];
  const inviteCode = String(data.inviteCode || '');
  const invitePath = String(data.inviteLink || (inviteCode ? `/#/apply?invite=${encodeURIComponent(inviteCode)}` : ''));
  const inviteLink = invitePath ? new URL(invitePath, window.location.origin).toString() : '';
  async function copy(text: string, label: string) {
    if (!text) return setNotice(`${label}为空`);
    await navigator.clipboard?.writeText(text);
    setNotice(`${label}已复制`);
  }
  function resetFilters() {
    setQuery({ keyword: '', status: '', startDate: '', endDate: '', page: 1, pageSize: Number(query.pageSize || 10) });
  }
  return (
    <div className="opPage stitchInvitePage">
      <section className="opPanel promotionInviteCompactV2">
        <div className="promotionInviteInfoV2">
          <div><span>邀请码</span><b>{inviteCode || '-'}</b></div>
          <div><span>邀请链接</span><b>{inviteLink || '-'}</b></div>
        </div>
        <div className="promotionCopyBoxV2">
          <button type="button" aria-expanded={copyMenuOpen} onClick={() => setCopyMenuOpen((open) => !open)}><AppIcon name="copy" />复制</button>
          {copyMenuOpen && (
            <div className="promotionCopyMenuV2" role="menu">
              <button type="button" role="menuitem" onClick={() => { setCopyMenuOpen(false); copy(inviteLink, '邀请链接'); }}>复制邀请链接</button>
              <button type="button" role="menuitem" onClick={() => { setCopyMenuOpen(false); copy(inviteCode, '邀请码'); }}>复制邀请码</button>
            </div>
          )}
        </div>
      </section>
      <section className="opPanel promotionTablePanelV2">
        <div className="opToolbar promotionToolbarV2">
          <label><AppIcon name="search" /><input placeholder="搜索门店、联系人、手机号、编号" value={query.keyword} onChange={(event) => patchQuery(setQuery, query, { keyword: event.target.value })} /></label>
          <select value={query.status} onChange={(event) => patchQuery(setQuery, query, { status: event.target.value })}><option value="">全部状态</option><option value="PENDING">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已驳回</option></select>
          <div className="promotionDateRowV2">
            <input type="date" value={query.startDate} onChange={(event) => patchQuery(setQuery, query, { startDate: event.target.value })} />
            <input type="date" value={query.endDate} onChange={(event) => patchQuery(setQuery, query, { endDate: event.target.value })} />
          </div>
          <button type="button" onClick={resetFilters}>重置</button>
        </div>
        <StateBlock loading={loading} error={error} empty={!items.length} />
        <div className="opTableWrap"><table><thead><tr><th>邀请门店</th><th>被邀请门店</th><th>充值额度</th><th>分成比例</th><th>收益</th><th>是否结算</th><th>产生时间</th></tr></thead><tbody>{items.map((item) => (
          <tr key={String(item.id)}>
            <td><b>{item.inviterMerchantName || '-'}</b><small>编号：{item.inviterMerchantCode || '-'}</small></td>
            <td><b>{item.invitedMerchantName || item.companyName || '-'}</b><small>编号：{item.invitedMerchantCode || '-'}</small></td>
            <td>{quotaText(item.rechargeQuota)}</td>
            <td>{Math.round(Number(item.shareRatio || 0) * 100)}%</td>
            <td><b>{quotaText(item.benefitQuota)}</b></td>
            <td><span className="opStatus">{item.settlementStatus || item.status || '未结算'}</span></td>
            <td>{fmt(item.generatedAt || item.createdAt)}</td>
          </tr>
        ))}</tbody></table></div>
        <Pager data={data} query={query} setQuery={setQuery} />
      </section>
    </div>
  );
}
