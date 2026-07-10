import { useEffect } from 'react';
import { AppIcon } from '../icons/AppIcon';
import { fullTaskImageUrl, fullTaskSourceImageUrl, type TaskImageRecord } from './taskImageUrls';
import './TaskCompareModal.css';

export type TaskCompareItem = TaskImageRecord & {
  id?: string | number | null;
  imageId?: string | number | null;
  featureName?: string | null;
  featureKey?: string | null;
  kind?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  quotaUsed?: number | string | null;
  costUsed?: number | string | null;
  cost?: number | string | null;
  resolution?: string | null;
  ratio?: string | null;
  outputFormat?: { resolution?: string; ratio?: string } | null;
  userName?: string | null;
  userPhone?: string | null;
  phone?: string | null;
  username?: string | null;
  createdByName?: string | null;
  userPrompt?: string | null;
  detailUserPrompt?: string | null;
  prompt?: string | null;
  settings?: { userPrompt?: string; cost?: number | string } | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  created_at?: string | null;
};

function firstText(...values: unknown[]) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

function featureText(item: TaskCompareItem) {
  return firstText(item.featureName, item.featureKey, item.kind, 'AI 任务');
}

function statusText(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (status === 'succeeded' || status === 'success') return '已完成';
  if (status === 'queued') return '排队中';
  if (status === 'running' || status === 'processing') return '生成中';
  if (status.includes('fail')) return '失败';
  return String(value || '未知');
}

function formatTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function taskUser(item: TaskCompareItem) {
  return firstText(item.userName, item.userPhone, item.phone, item.username, item.createdByName, '-');
}

function taskSpec(item: TaskCompareItem) {
  return [item.resolution, item.ratio, item.outputFormat?.resolution, item.outputFormat?.ratio].filter(Boolean).join(' / ') || '-';
}

function quotaUsed(item: TaskCompareItem) {
  return Number(item.quotaUsed || item.costUsed || item.cost || item.settings?.cost || 0);
}

function taskKey(item: TaskCompareItem) {
  return String(item.id || item.imageId || item.resultImage?.id || '');
}

export function TaskCompareModal<T extends TaskCompareItem>({
  detail,
  taskList,
  onClose,
  onSwitchTask,
  onContinueImage,
  onDelete,
}: {
  detail: T | null;
  taskList: T[];
  onClose: () => void;
  onSwitchTask: (item: T) => void;
  onContinueImage?: (item: T, prefer: 'result' | 'source') => void;
  onDelete?: (item: T) => void;
}) {
  useEffect(() => {
    if (!detail) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [detail]);

  if (!detail) return null;

  const resultSrc = fullTaskImageUrl(detail);
  const sourceSrc = fullTaskSourceImageUrl(detail);
  const currentIndex = taskList.findIndex((item) => taskKey(item) === taskKey(detail));
  const total = taskList.length || 1;
  const feature = featureText(detail);
  const status = statusText(detail.status);
  const failed = String(detail.status || '').toUpperCase().includes('FAIL');
  const prompt = firstText(detail.userPrompt, detail.detailUserPrompt, detail.settings?.userPrompt);
  const details = [
    ['任务编号', taskKey(detail) || '-'],
    ['生成账号', taskUser(detail)],
    ['生成规格', taskSpec(detail)],
    ['算力消耗', `${quotaUsed(detail) || '-'} 算力`],
    ['创建时间', formatTime(detail.createdAt || detail.submittedAt || detail.created_at)],
  ];

  function switchTask(offset: number) {
    const next = taskList[currentIndex + offset];
    if (next) onSwitchTask(next);
  }

  return (
    <div className="compareDetailOverlay" role="dialog" aria-modal="true" aria-label="任务对比详情">
      <section className="compareDetailShell">
        <header className="compareDetailHeader">
          <div className="compareDetailTitle"><b>任务对比详情</b><span>{feature} · {currentIndex >= 0 ? currentIndex + 1 : 1} / {total}</span></div>
          <div className="compareDetailNav">
            <button type="button" disabled={currentIndex <= 0} onClick={() => switchTask(-1)} aria-label="上一张"><AppIcon name="chevronLeft" size={20} /></button>
            <button type="button" disabled={currentIndex < 0 || currentIndex >= taskList.length - 1} onClick={() => switchTask(1)} aria-label="下一张"><AppIcon name="chevronRight" size={20} /></button>
            <button type="button" onClick={onClose} aria-label="关闭"><AppIcon name="close" size={20} /></button>
          </div>
        </header>

        <main className="compareDetailBody">
          <section className="compareDetailImages" aria-label="图片对比">
            <article className="compareDetailImageCard">
              <header><h3>产品原图</h3><span>{sourceSrc ? '原始输入' : '未提供'}</span></header>
              <div className="compareDetailImageStage">{sourceSrc ? <img src={sourceSrc} alt="产品原图" decoding="async" /> : <span>无原图</span>}</div>
            </article>
            <article className="compareDetailImageCard">
              <header><h3>生成结果</h3><span>{resultSrc ? 'AI 输出' : '未生成'}</span></header>
              <div className="compareDetailImageStage">{resultSrc ? <img src={resultSrc} alt="生成结果" decoding="async" /> : <span>无生成图</span>}</div>
            </article>
          </section>

          <aside className="compareDetailPanel" aria-label="任务详情">
            <div className="compareDetailStatus"><div><span>任务详情</span><h2>{feature}</h2></div><em className={failed ? 'isFailed' : ''}>{detail.statusLabel || status}</em></div>
            <div className="compareDetailScroll"><dl className="compareDetailList">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section className="compareDetailPrompt"><h3>生成要求</h3><p>{prompt || '无'}</p></section></div>
            <div className="compareDetailActions">
              <button type="button" disabled={!resultSrc} onClick={() => resultSrc && window.open(resultSrc, '_blank', 'noopener,noreferrer')}><AppIcon name="download" />打开结果图</button>
              {onContinueImage && <button className="isPrimary" type="button" disabled={!resultSrc} onClick={() => onContinueImage(detail, 'result')}><AppIcon name="studio" />放入工作室</button>}
              {onDelete && <button className="isDanger" type="button" onClick={() => onDelete(detail)}><AppIcon name="trash" />删除记录</button>}
            </div>
          </aside>
        </main>
      </section>
    </div>
  );
}
