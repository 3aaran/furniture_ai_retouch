import type { ChangeEvent, DragEvent, RefObject } from 'react';
import type { StudioLocalImage, StudioRecentTask } from './studioViewTypes';
import './StudioCanvasPanel.css';

type StudioCanvasPanelProps = {
  title: string;
  description: string;
  featureModeLabel: string;
  resolution: string;
  ratio: string;
  sourceImage: StudioLocalImage | null;
  draggingSource: boolean;
  message: string;
  recentTasks: StudioRecentTask[];
  showInlineRecent: boolean;
  featureDrawerOpen: boolean;
  featureButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenFeatureConfig: () => void;
  onOpenResolutionConfig: () => void;
  onOpenRatioConfig: () => void;
  onOpenRecent: () => void;
  onClearSource: () => void;
  onSourceInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onSourceDragOver: (event: DragEvent<HTMLElement>) => void;
  onSourceDragLeave: () => void;
  onSourceDrop: (event: DragEvent<HTMLElement>) => void;
  onSelectSourceResource: () => void;
};

export function StudioCanvasPanel({
  title,
  description,
  featureModeLabel,
  resolution,
  ratio,
  sourceImage,
  draggingSource,
  message,
  recentTasks,
  showInlineRecent,
  featureDrawerOpen,
  featureButtonRef,
  onOpenFeatureConfig,
  onOpenResolutionConfig,
  onOpenRatioConfig,
  onOpenRecent,
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
        <div className="studioSignalTitle"><small>当前功能</small><h1>{title}</h1><p>{description}</p></div>
        <div className="studioMobileConfigSummary" aria-label="当前配置">
          <button ref={featureButtonRef} type="button" className="studioMobileConfigPrimary" aria-controls="studio-mobile-config-sheet" aria-expanded={featureDrawerOpen} onClick={onOpenFeatureConfig}>
            <span>功能选择</span><b>{title}</b>
          </button>
          <button type="button" className="studioMobileConfigRecent" onClick={onOpenRecent}>
            <span>最近生成</span><b>{recentTasks.length || 0}</b>
          </button>
          <button type="button" aria-controls="studio-mobile-config-sheet" onClick={onOpenResolutionConfig}>
            <span>分辨率</span><b>{resolution}</b>
          </button>
          <button type="button" aria-controls="studio-mobile-config-sheet" onClick={onOpenRatioConfig}>
            <span>比例</span><b>{ratio}</b>
          </button>
        </div>
        <div className="studioSignalActions"><span className="studioDesktopStatus">{featureModeLabel}</span><span>{resolution}</span><span>{ratio}</span></div>
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

      {showInlineRecent && (
        <section id="studio-recent-strip" className="studioRecentStrip">
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
      )}
    </main>
  );
}
