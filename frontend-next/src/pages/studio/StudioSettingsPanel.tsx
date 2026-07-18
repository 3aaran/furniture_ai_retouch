import { type ChangeEvent, type DragEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/icons/AppIcon';
import type { StudioLocalImage } from './studioViewTypes';
import './StudioSettingsPanel.css';

type StudioSettingsPanelProps = {
  isPromotionSelected: boolean;
  isVideoSelected: boolean;
  customPrompt: string;
  videoExtraRequirements: string;
  videoVersion: 'Mini' | '快速' | '标准';
  videoVersionOptions: readonly string[];
  videoDuration: 'auto' | number;
  videoDurationOptions: readonly string[];
  referenceImages: StudioLocalImage[];
  maxReferenceImages: number;
  draggingReference: boolean;
  resolution: string;
  resolutionOptions: string[];
  ratio: string;
  ratioOptions: string[];
  showOutputControls: boolean;
  isGenerating: boolean;
  cost: number;
  quota: number;
  onPromptChange: (value: string) => void;
  onVideoExtraRequirementsChange: (value: string) => void;
  onVideoVersionChange: (value: 'Mini' | '快速' | '标准') => void;
  onVideoDurationChange: (value: 'auto' | number) => void;
  onReferenceInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onReferenceDragOver: (event: DragEvent<HTMLElement>) => void;
  onReferenceDragLeave: () => void;
  onReferenceDrop: (event: DragEvent<HTMLElement>) => void;
  onRemoveReference: (id: string) => void;
  onSelectReferenceResource: () => void;
  onResolutionChange: (value: string) => void;
  onRatioChange: (value: string) => void;
  onGenerate: () => void;
};

export function StudioSettingsPanel({
  isPromotionSelected,
  isVideoSelected,
  customPrompt,
  videoExtraRequirements,
  videoVersion,
  videoVersionOptions,
  videoDuration,
  videoDurationOptions,
  referenceImages,
  maxReferenceImages,
  draggingReference,
  resolution,
  resolutionOptions,
  ratio,
  ratioOptions,
  showOutputControls,
  isGenerating,
  cost,
  quota,
  onPromptChange,
  onVideoExtraRequirementsChange,
  onVideoVersionChange,
  onVideoDurationChange,
  onReferenceInput,
  onReferenceDragOver,
  onReferenceDragLeave,
  onReferenceDrop,
  onRemoveReference,
  onSelectReferenceResource,
  onResolutionChange,
  onRatioChange,
  onGenerate,
}: StudioSettingsPanelProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  useEffect(() => {
    if (isVideoSelected) setPromptOpen(true);
  }, [isVideoSelected]);

  return (
    <aside className="studioSidePanel studioRightPanel" aria-label="生成设置">
      <div className="studioSettingsScroll">
        <section className={promptOpen ? 'studioCollapseCard isOpen' : 'studioCollapseCard'}>
        <button className="studioCollapseHead" type="button" aria-expanded={promptOpen} onClick={() => setPromptOpen((open) => !open)}>
          <span><b>{isVideoSelected ? '视频要求' : '提示词'}</b><em>{customPrompt ? '已填写' : isVideoSelected ? '必填' : '可选'}</em></span><i><AppIcon name={promptOpen ? 'chevronDown' : 'chevronRight'} size={16} /></i>
        </button>
        {promptOpen && (
          <div className="studioPromptStack">
            <label className="studioPromptField"><span>{isVideoSelected ? '画面与运动要求（必填）' : '特殊要求（选填）'}</span><textarea className="studioPromptInput" placeholder={isVideoSelected ? '例如：镜头缓慢环绕沙发，突出面料和扶手细节，保持家具结构稳定，暖色客厅光线。' : isPromotionSelected ? '描述场景细节、卖点文案或画面氛围...' : '可填写画面氛围、重点细节或其他特殊要求...'} value={customPrompt} onChange={(event) => onPromptChange(event.target.value)} /></label>
            {isVideoSelected && <label className="studioPromptField"><span>补充要求（选填，每行一条）</span><textarea className="studioPromptInput studioPromptExtra" placeholder={'例如：\n不要改变家具颜色\n不要出现人物'} value={videoExtraRequirements} onChange={(event) => onVideoExtraRequirementsChange(event.target.value)} /></label>}
          </div>
        )}
      </section>

      <section className={referenceOpen ? 'studioCollapseCard isOpen' : 'studioCollapseCard'}>
        <button className="studioCollapseHead" type="button" aria-expanded={referenceOpen} onClick={() => setReferenceOpen((open) => !open)}>
          <span><b>{isVideoSelected ? '其余参考图' : '参考图'}</b><em>{referenceImages.length}/{maxReferenceImages}</em></span><i><AppIcon name={referenceOpen ? 'chevronDown' : 'chevronRight'} size={16} /></i>
        </button>
        {referenceOpen && (
          <div className="studioReferenceCard">
            <label className={draggingReference ? 'studioReferenceUpload isDragging' : 'studioReferenceUpload'} onDragOver={onReferenceDragOver} onDragLeave={onReferenceDragLeave} onDrop={onReferenceDrop}>
              <input type="file" accept="image/*" multiple onChange={onReferenceInput} />
              <span><AppIcon name="plus" size={20} /></span><b>{referenceImages.length ? '继续添加参考图' : '点击或拖拽上传参考图'}</b>
            </label>
            {referenceImages.length > 0 && <div className="studioReferenceList">{referenceImages.map((item, index) => <div key={item.id}><img src={item.url} alt={`参考图 ${index + 1}`} /><button type="button" onClick={() => onRemoveReference(item.id)}>移除</button></div>)}</div>}
            <button className="studioResourcePick" type="button" onClick={onSelectReferenceResource}>资产库</button>
          </div>
        )}
      </section>

      {isVideoSelected && (
        <section className="studioVideoSettings" aria-label="视频参数">
          <div className="studioControlGroup"><span>生成版本</span><div>{videoVersionOptions.map((item) => <button key={item} type="button" className={videoVersion === item ? 'isActive' : ''} onClick={() => onVideoVersionChange(item as 'Mini' | '快速' | '标准')}>{item}</button>)}</div></div>
          <div className="studioControlGroup"><span>视频时长</span><div>{videoDurationOptions.map((item) => <button key={item} type="button" className={String(videoDuration) === item ? 'isActive' : ''} onClick={() => onVideoDurationChange(item === 'auto' ? 'auto' : Number(item))}>{item === 'auto' ? '自动' : `${item}秒`}</button>)}</div></div>
          {videoVersion !== '标准' && <p className="studioVideoConstraint">Mini/快速版仅支持 480p、720p；1080p 和 4K 需选择标准版。</p>}
        </section>
      )}
        {showOutputControls && (
          <div className="studioOutputControls">
            <div className="studioControlGroup studioInlineControl"><span>分辨率：</span><div>{resolutionOptions.map((item) => <button key={item} type="button" disabled={isVideoSelected && videoVersion !== '标准' && ['1080p', '4K'].includes(item)} className={resolution === item ? 'isActive' : ''} onClick={() => onResolutionChange(item)}>{item}</button>)}</div></div>
            <div className="studioControlGroup studioInlineControl"><span>比例：</span><div>{ratioOptions.map((item) => <button key={item} type="button" className={ratio === item ? 'isActive' : ''} onClick={() => onRatioChange(item)}>{item === 'adaptive' ? '自适应' : item}</button>)}</div></div>
          </div>
        )}
      </div>
      <div className="studioGenerateArea"><Button className={isGenerating ? 'studioGenerateButton isGenerating' : 'studioGenerateButton'} onClick={onGenerate} disabled={isGenerating}>{isGenerating ? (isVideoSelected ? '视频生成中...' : '提交中...') : isVideoSelected ? '生成视频' : isPromotionSelected ? '生成宣传图' : '生成效果'}</Button><div className="studioGenerateMeta" aria-live="polite">消耗 {cost} 点算力 <b>剩余：{quota}</b></div></div>
    </aside>
  );
}
