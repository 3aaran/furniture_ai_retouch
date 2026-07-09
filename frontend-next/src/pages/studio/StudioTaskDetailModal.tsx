import { AppIcon } from '../../components/icons/AppIcon';
import { resolveApiUrl } from '../../services/http';
import type { AiTask } from '../../services/studio.api';
import './StudioTaskDetailModal.css';

function resultUrl(task: AiTask) {
  return resolveApiUrl(task.previewUrl || task.resultUrl || task.url || task.imageUrl || task.thumbUrl || task.downloadUrl || task.resultImage?.url || task.resultImage?.imageUrl) || '';
}

function sourceUrl(task: AiTask) {
  return resolveApiUrl(task.sourceUrl || task.originUrl || task.originalUrl || task.inputUrl || task.sourceImageUrl || task.originImage?.url || task.originImage?.imageUrl) || '';
}

function featureText(task: AiTask) {
  return task.featureName || task.featureKey || task.kind || 'AI 任务';
}

function taskTime(task: AiTask) {
  const value = task.finishedAt || task.submittedAt || task.createdAt;
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function taskImageForStudio(task: AiTask, prefer: 'result' | 'source') {
  if (prefer === 'source') {
    const id = task.sourceImageId || task.originImage?.id || '';
    const url = sourceUrl(task);
    if (!id && !url) return null;
    return { id: String(id || task.id), imageId: String(id || task.id), name: '产品原图', url, status: 'ready' as const };
  }
  const id = task.imageId || task.resultImage?.id || '';
  const url = resultUrl(task);
  if (!id && !url) return null;
  return { id: String(id || task.id), imageId: String(id || task.id), name: '生成结果', url, status: 'ready' as const };
}

export function StudioTaskDetailModal({
  detail,
  taskList,
  onClose,
  onSwitchTask,
  onDelete,
  onContinueImage,
}: {
  detail: AiTask | null;
  taskList: AiTask[];
  onClose: () => void;
  onSwitchTask: (task: AiTask) => void;
  onDelete: (task: AiTask) => void;
  onContinueImage: (task: AiTask, prefer: 'result' | 'source') => void;
}) {
  if (!detail) return null;
  const resultSrc = resultUrl(detail);
  const sourceSrc = sourceUrl(detail);
  const index = taskList.findIndex((item) => String(item.id) === String(detail.id));
  const total = taskList.length || 1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < taskList.length - 1;

  function switchBy(offset: number) {
    const next = taskList[index + offset];
    if (next) onSwitchTask(next);
  }

  return (
    <div className="studioModalOverlay" role="dialog" aria-modal="true" aria-label="任务对比详情">
      <section className="studioTaskModal">
        <header className="studioTaskModalTop">
          <div><b>任务对比详情</b><span>{index >= 0 ? index + 1 : 1} / {total}</span></div>
          <nav aria-label="任务切换与操作">
            <button type="button" disabled={!canPrev} aria-label="上一张" onClick={() => switchBy(-1)}><AppIcon name="chevronLeft" /></button>
            <button type="button" disabled={!canNext} aria-label="下一张" onClick={() => switchBy(1)}><AppIcon name="chevronRight" /></button>
            <button type="button" aria-label="关闭" onClick={onClose}><AppIcon name="close" /></button>
          </nav>
        </header>
        <div className="studioTaskModalBody">
          <div className="studioTaskCompare">
            <section>
              <header><b>产品图片</b>{sourceSrc && <button type="button" onClick={() => onContinueImage(detail, 'source')}><AppIcon name="studio" />放入工作室</button>}</header>
              <div>{sourceSrc ? <img src={sourceSrc} alt="产品图片" /> : <span>无原图</span>}</div>
            </section>
            <section>
              <header><b>生成结果</b>{resultSrc && <button type="button" onClick={() => onContinueImage(detail, 'result')}><AppIcon name="studio" />放入工作室</button>}</header>
              <div>{resultSrc ? <img src={resultSrc} alt="生成结果" /> : <span>无生成图</span>}</div>
            </section>
          </div>
          <aside className="studioTaskInfo">
            <h3>任务信息</h3>
            <p><span>任务类型</span><b>{featureText(detail)}</b></p>
            <p><span>状态</span><b>{detail.statusLabel || detail.status || '-'}</b></p>
            <p><span>规格</span><b>{[detail.resolution, detail.ratio].filter(Boolean).join(' / ') || '-'}</b></p>
            <p><span>时间</span><b>{taskTime(detail)}</b></p>
            <p><span>用户要求</span><b>{detail.userPrompt || detail.prompt || detail.statusMessage || '-'}</b></p>
            <footer>
              {resultSrc && <button type="button" onClick={() => onContinueImage(detail, 'result')}><AppIcon name="studio" />编辑</button>}
              <button className="danger" type="button" onClick={() => onDelete(detail)}><AppIcon name="trash" />删除记录</button>
            </footer>
          </aside>
        </div>
      </section>
    </div>
  );
}
