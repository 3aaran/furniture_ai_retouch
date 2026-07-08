import type { ChangeEvent, DragEvent, RefObject } from 'react';
import type { StudioLocalImage, StudioRecentTask } from './studioViewTypes';
import './StudioCanvasPanel.css';

type StudioCanvasPanelProps = {
  title: string;
  featureModeLabel: string;
  currentFeatureLabel: string;
  recentCount: number;
  resolution: string;
  ratio: string;
  sourceImage: StudioLocalImage | null;
  referenceCount: number;
  maxReferenceImages: number;
  draggingSource: boolean;
  message: string;
  recentTasks: StudioRecentTask[];
  featureDrawerOpen: boolean;
  featureButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenFeatures: () => void;
  onClearSource: () => void;
  onSourceInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onSourceDragOver: (event: DragEvent<HTMLElement>) => void;
  onSourceDragLeave: () => void;
  onSourceDrop: (event: DragEvent<HTMLElement>) => void;
  onSelectSourceResource: () => void;
};

export function StudioCanvasPanel({
  title,
  featureModeLabel,
  currentFeatureLabel,
  recentCount,
  resolution,
  ratio,
  sourceImage,
  referenceCount,
  maxReferenceImages,
  draggingSource,
  message,
  recentTasks,
  featureDrawerOpen,
  featureButtonRef,
  onOpenFeatures,
  onClearSource,
  onSourceInput,
  onSourceDragOver,
  onSourceDragLeave,
  onSourceDrop,
  onSelectSourceResource,
}: StudioCanvasPanelProps) {
  return (
    <main className="studioCenterPanel">
      <div className="studioSignalBar">
        <div className="studioSignalTitle"><small>AI STUDIO</small><h1>{title}</h1></div>
        <button
          ref={featureButtonRef}
          type="button"
          className="studioMobileFeatureButton"
          aria-controls="studio-feature-panel"
          aria-expanded={featureDrawerOpen}
          onClick={onOpenFeatures}
        >
          <span>功能与资源</span><b>{currentFeatureLabel}</b>
        </button>
        <div className="studioSignalActions"><span>最近生成 {recentCount}</span><span className="studioDesktopStatus">{featureModeLabel}</span><span className="studioDesktopStatus">{currentFeatureLabel}</span><span>{resolution}</span><span>{ratio}</span></div>
      </div>

      <div className="studioCenterToolbar" aria-label="画布工具栏">
        <button type="button" className="isActive">产品原图</button>
        <button type="button">参考图 {referenceCount}/{maxReferenceImages}</button>
        <button type="button">资源库</button>
      </div>

      <section className="studioMainBlock">
        <div className="studioSourceHead"><b>产品原图</b>{sourceImage && <button type="button" onClick={onClearSource}>清除</button>}</div>
        <label
          className={draggingSource ? 'studioUploadBox isDragging' : 'studioUploadBox'}
          onDragOver={onSourceDragOver}
          onDragLeave={onSourceDragLeave}
          onDrop={onSourceDrop}
        >
          <input type="file" accept="image/*" onChange={onSourceInput} />
          {sourceImage
            ? <div className="studioPreviewWrap"><img src={sourceImage.url} alt="产品原图" /><span>{sourceImage.status === 'uploading' ? '上传中' : sourceImage.status === 'failed' ? '上传失败' : '上传成功'}</span></div>
            : <div className="studioUploadInner"><div>+</div><b>点击上传家具图片</b><em>或</em><button type="button" onClick={(event) => { event.preventDefault(); onSelectSourceResource(); }}>从资源库选择</button></div>}
        </label>
      </section>

      {message && <div className="studioMessage">{message}</div>}

      <section className="studioRecentStrip">
        <div className="studioSectionTitle"><b>最近生成</b><span>来自后端 AI 任务记录</span></div>
        <div className="studioRecentList">
          {recentTasks.slice(0, 5).map((task) => (
            <article key={task.id}>
              {task.previewUrl && <img src={task.previewUrl} alt={task.feature} loading="lazy" decoding="async" />}
              <b>{task.feature}</b><span>{task.status}</span><em>{task.resolution} · {task.ratio} · {task.time}</em>
            </article>
          ))}
          {recentTasks.length === 0 ? Array.from({ length: 5 }).map((_, index) => <span className="studioRecentGhost" key={index} aria-hidden="true" />) : null}
        </div>
      </section>
    </main>
  );
}
