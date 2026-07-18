import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { AppIcon } from '../../components/icons/AppIcon';
import type { StudioLocalImage, StudioRecentTask } from './studioViewTypes';
import './StudioCanvasPanel.css';

type StudioCanvasPanelProps = {
  title: string;
  description: string;
  featureModeLabel: string;
  sourceLabel: string;
  resolution: string;
  ratio: string;
  sourceImage: StudioLocalImage | null;
  draggingSource: boolean;
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
  onOpenRecentTask: (task: StudioRecentTask) => void;
  onDeleteRecentTask: (task: StudioRecentTask) => void;
  onContinueRecentTask: (task: StudioRecentTask) => void;
};

export function StudioCanvasPanel({
  title,
  description,
  featureModeLabel,
  sourceLabel,
  resolution,
  ratio,
  sourceImage,
  draggingSource,
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
  onOpenRecentTask,
  onDeleteRecentTask,
  onContinueRecentTask,
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
        <div className="studioSourceHead"><b>{sourceLabel}</b>{sourceImage && <button type="button" onClick={onClearSource}>清除</button>}</div>
        <label
          className={`${draggingSource ? 'studioUploadBox isDragging' : 'studioUploadBox'}${sourceImage ? ' hasImage' : ''}`}
          onDragOver={onSourceDragOver}
          onDragLeave={onSourceDragLeave}
          onDrop={onSourceDrop}
        >
          <input type="file" accept="image/*" onChange={onSourceInput} />
          {sourceImage
            ? <div className="studioPreviewWrap"><img src={sourceImage.url} alt={sourceLabel} /></div>
            : <div className="studioUploadInner"><div><AppIcon name="plus" size={30} /></div><b>点击上传家具图片</b><em>或</em><button type="button" onClick={(event) => { event.preventDefault(); onSelectSourceResource(); }}>资产库</button></div>}
        </label>
      </section>

      {showInlineRecent && (
        <section id="studio-recent-strip" className="studioRecentStrip">
          <div className="studioSectionTitle"><b>最近生成</b></div>
          <div className="studioRecentList">
            {recentTasks.slice(0, 12).map((task) => (
              <article key={task.id}>
                <button className="studioRecentPreview" type="button" onClick={() => onOpenRecentTask(task)}>
                  {task.previewUrl ? <img src={task.previewUrl} alt={task.feature} loading="lazy" decoding="async" /> : <i aria-hidden="true">{task.mediaType === 'video' ? '视频' : '图'}</i>}
                  <b>{task.feature}</b>
                </button>
                <div className="studioRecentActions">
                  {task.mediaType !== 'video' && <button type="button" aria-label="放入工作室" title="放入工作室" onClick={() => onContinueRecentTask(task)}><AppIcon name="edit" size={14} /></button>}
                  <button type="button" aria-label="删除记录" title="删除记录" onClick={() => onDeleteRecentTask(task)}><AppIcon name="trash" size={14} /></button>
                </div>
              </article>
            ))}
            {recentTasks.length === 0 ? Array.from({ length: 5 }).map((_, index) => <span className="studioRecentGhost" key={index} aria-hidden="true" />) : null}
          </div>
        </section>
      )}
    </main>
  );
}
