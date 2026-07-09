import { useEffect } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import type { Row } from './operations.types';
import { featureText, fmt, fullImageUrl, fullSourceImageUrl, statusText } from './operations.utils';
import './TaskComparePage.css';

function taskUser(item: Row) {
  return item.userName || item.userPhone || item.phone || item.username || item.createdByName || '-';
}

function taskSpec(item: Row) {
  return [item.resolution, item.ratio, item.outputFormat?.resolution, item.outputFormat?.ratio].filter(Boolean).join(' / ') || '-';
}

function quotaUsed(item: Row) {
  return Number(item.quotaUsed || item.costUsed || item.cost || item.settings?.cost || 0);
}

function firstText(...values: unknown[]) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

export function TaskCompareModal({
  detail,
  taskList,
  onClose,
  onSwitchTask,
  onContinueImage,
}: {
  detail: Row | null;
  taskList: Row[];
  onClose: () => void;
  onSwitchTask: (item: Row) => void;
  onContinueImage?: (img: Row) => void;
}) {
  useEffect(() => {
    if (!detail) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, left: 0 });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detail]);

  if (!detail) return null;

  const resultSrc = fullImageUrl(detail);
  const sourceSrc = fullSourceImageUrl(detail);
  const imageId = detail.imageId || detail.resultImage?.id || detail.id;
  const resultUrl = resultSrc;
  const currentIndex = taskList.findIndex((item) => String(item.id || item.imageId || item.resultImage?.id) === String(detail.id || detail.imageId || detail.resultImage?.id));
  const total = taskList.length || 1;
  const feature = featureText(detail);
  const status = statusText(detail.status);
  const failed = String(detail.status || '').toUpperCase().includes('FAIL');
  const prompt = firstText(detail.userPrompt, detail.detailUserPrompt, detail.settings?.userPrompt);
  const details = [
    ['任务编号', detail.id || imageId || '-'],
    ['生成账号', taskUser(detail)],
    ['生成规格', taskSpec(detail)],
    ['算力消耗', `${quotaUsed(detail) || '-'} 算力`],
    ['创建时间', fmt(detail.createdAt || detail.submittedAt || detail.created_at)],
  ];

  function switchTask(offset: number) {
    const next = taskList[currentIndex + offset];
    if (next) onSwitchTask(next);
  }

  function openResult() {
    if (resultSrc) window.open(resultSrc, '_blank', 'noopener,noreferrer');
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
              <div className="compareDetailImageStage">{sourceSrc ? <img src={sourceSrc} alt="产品原图" loading="lazy" decoding="async" /> : <span>无原图</span>}</div>
            </article>
            <article className="compareDetailImageCard">
              <header><h3>生成结果</h3><span>{resultSrc ? 'AI 输出' : '未生成'}</span></header>
              <div className="compareDetailImageStage">{resultSrc ? <img src={resultSrc} alt="生成结果" loading="lazy" decoding="async" /> : <span>无生成图</span>}</div>
            </article>
          </section>

          <aside className="compareDetailPanel" aria-label="任务详情">
            <div className="compareDetailStatus">
              <div><span>任务详情</span><h2>{feature}</h2></div>
              <em className={failed ? 'isFailed' : ''}>{status}</em>
            </div>

            <div className="compareDetailScroll">
              <dl className="compareDetailList">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <section className="compareDetailPrompt"><h3>生成要求</h3><p>{prompt || '无'}</p></section>
            </div>

            <div className="compareDetailActions">
              <button type="button" disabled={!resultSrc} onClick={openResult}><AppIcon name="download" />打开结果图</button>
              <button className="isPrimary" type="button" disabled={!resultSrc} onClick={() => onContinueImage?.({ id: imageId, url: resultUrl, imageUrl: resultSrc })}><AppIcon name="studio" />放入工作室</button>
            </div>
          </aside>
        </main>
      </section>
    </div>
  );
}
