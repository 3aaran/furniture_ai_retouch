import { AppIcon } from '../../components/icons/AppIcon';
import type { Row } from './operations.types';
import { featureText, fmt, imageUrl, sourceImageUrl, statusText } from './operations.utils';

function taskUser(item: Row) {
  return item.userName || item.userPhone || item.phone || item.username || item.createdByName || '-';
}

function taskSpec(item: Row) {
  return [item.resolution, item.ratio, item.outputFormat?.resolution, item.outputFormat?.ratio].filter(Boolean).join(' / ') || '-';
}

function quotaUsed(item: Row) {
  return Number(item.quotaUsed || item.costUsed || item.cost || item.settings?.cost || 0);
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
  if (!detail) return null;
  const resultSrc = imageUrl(detail);
  const sourceSrc = sourceImageUrl(detail);
  const currentIndex = taskList.findIndex((item) => String(item.id || item.imageId || item.resultImage?.id) === String(detail.id || detail.imageId || detail.resultImage?.id));
  const total = taskList.length || 1;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < taskList.length - 1;
  const imageId = detail.imageId || detail.resultImage?.id || detail.id;
  const resultUrl = detail.resultUrl || detail.url || detail.imageUrl || detail.resultImage?.url;
  const sourceId = detail.sourceImageId || detail.originImage?.id;
  const sourceUrl = detail.sourceUrl || detail.originImage?.url;

  function switchTo(offset: number) {
    const next = taskList[currentIndex + offset];
    if (next) onSwitchTask(next);
  }

  function openResult() {
    if (resultSrc) window.open(resultSrc, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="taskPreviewOverlay taskPreviewWindowMode" role="dialog" aria-modal="true" aria-label="任务对比预览">
      <div className="taskPreviewTop">
        <div><b><span className="taskDesktopTitle">任务对比预览</span><span className="taskMobileTitle">任务预览</span></b><span>{currentIndex >= 0 ? currentIndex + 1 : 1} / {total}</span></div>
        <div className="taskPreviewTopBtns">
          <button type="button" disabled={!canPrev} onClick={() => switchTo(-1)} aria-label="上一张"><AppIcon name="chevronLeft" size={22} /></button>
          <button type="button" disabled={!canNext} onClick={() => switchTo(1)} aria-label="下一张"><AppIcon name="chevronRight" size={22} /></button>
          <button type="button" onClick={onClose} aria-label="关闭"><AppIcon name="close" size={22} /></button>
        </div>
      </div>
      <div className="taskPreviewBody">
        <div className="taskComparePanel">
          <div className="compareCol">
            <div className="compareHead"><h3>产品图片</h3>{sourceSrc && <button type="button" onClick={() => onContinueImage?.({ id: sourceId, url: sourceUrl, imageUrl: sourceSrc })}>以此图继续创作</button>}</div>
            <div className="taskImageFrame">{sourceSrc ? <img src={sourceSrc} alt="产品图片" loading="lazy" decoding="async" /> : <span>无原图</span>}</div>
          </div>
          <div className="compareCol">
            <div className="compareHead"><h3>生成结果</h3>{resultSrc && <button type="button" onClick={() => onContinueImage?.({ id: imageId, url: resultUrl, imageUrl: resultSrc })}>以此图继续创作</button>}</div>
            <div className="taskImageFrame">{resultSrc ? <img src={resultSrc} alt="生成结果" loading="lazy" decoding="async" /> : <span>无生成图</span>}</div>
          </div>
        </div>
        <div className="taskMobileActionBar" aria-label="任务操作">
          <button type="button" onClick={openResult}><AppIcon name="download" /><span>保存</span></button>
        </div>
        <div className="taskInfoPanel">
          <h3>任务详情</h3>
          <div className="taskInfoScroll">
            <div className="infoRows">
              <div><i><AppIcon name="ticket" /></i><p><span>任务编号</span><b>{detail.id || imageId || '-'}</b></p></div>
              <div><i><AppIcon name="studio" /></i><p><span>任务类型</span><b className="goldTag">{featureText(detail)}</b></p></div>
              <div><i><AppIcon name="profile" /></i><p><span>生成账号</span><b>{taskUser(detail)}</b></p></div>
              <div><i><AppIcon name="message" /></i><p><span>额外要求</span><b>{detail.userPrompt || detail.prompt || detail.statusMessage || '-'}</b></p></div>
              <div><i><AppIcon name="resources" /></i><p><span>生成规格</span><b>{taskSpec(detail)}</b></p></div>
              <div><i><AppIcon name="history" /></i><p><span>创建时间</span><b>{fmt(detail.createdAt || detail.submittedAt || detail.created_at)}</b></p></div>
              <div><i><AppIcon name="quota" /></i><p><span>状态 / 消耗</span><b><em className={String(detail.status || '').toUpperCase().includes('FAIL') ? 'failed' : 'success'}>{statusText(detail.status)}</em> {quotaUsed(detail) || '-'} 算力</b></p></div>
            </div>
            <div className="promptBox"><div><span>用户要求</span></div><p>{detail.userPrompt || detail.prompt || '无'}</p></div>
          </div>
          <div className="taskDetailActions">
            <button className="primary iconOnly" type="button" title="打开结果图" aria-label="打开结果图" onClick={openResult}><AppIcon name="download" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
