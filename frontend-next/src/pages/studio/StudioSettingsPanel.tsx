import { type ChangeEvent, type DragEvent, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/icons/AppIcon';
import type { StudioLocalImage } from './studioViewTypes';
import './StudioSettingsPanel.css';

type StudioSettingsPanelProps = {
  isPromotionSelected: boolean;
  customPrompt: string;
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
  customPrompt,
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

  return (
    <aside className="studioSidePanel studioRightPanel" aria-label="生成设置">
      <section className={promptOpen ? 'studioCollapseCard isOpen' : 'studioCollapseCard'}>
        <button className="studioCollapseHead" type="button" aria-expanded={promptOpen} onClick={() => setPromptOpen((open) => !open)}>
          <span><b>提示词</b><em>{customPrompt ? '已填写' : '可选'}</em></span><i><AppIcon name={promptOpen ? 'chevronDown' : 'chevronRight'} size={16} /></i>
        </button>
        {promptOpen && (
          <label className="studioPromptField"><span>特殊要求（选填）</span><textarea className="studioPromptInput" placeholder={isPromotionSelected ? '描述场景细节、卖点文案或画面氛围...' : '可填写画面氛围、重点细节或其他特殊要求...'} value={customPrompt} onChange={(event) => onPromptChange(event.target.value)} /></label>
        )}
      </section>

      <section className={referenceOpen ? 'studioCollapseCard isOpen' : 'studioCollapseCard'}>
        <button className="studioCollapseHead" type="button" aria-expanded={referenceOpen} onClick={() => setReferenceOpen((open) => !open)}>
          <span><b>参考图</b><em>{referenceImages.length}/{maxReferenceImages}</em></span><i><AppIcon name={referenceOpen ? 'chevronDown' : 'chevronRight'} size={16} /></i>
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

      {showOutputControls && (
        <div className="studioOutputControls">
          <div className="studioControlGroup studioInlineControl"><span>分辨率：</span><div>{resolutionOptions.map((item) => <button key={item} type="button" className={resolution === item ? 'isActive' : ''} onClick={() => onResolutionChange(item)}>{item}</button>)}</div></div>
          <div className="studioControlGroup studioInlineControl"><span>比例：</span><div>{ratioOptions.map((item) => <button key={item} type="button" className={ratio === item ? 'isActive' : ''} onClick={() => onRatioChange(item)}>{item}</button>)}</div></div>
        </div>
      )}
      <div className="studioGenerateArea"><Button className={isGenerating ? 'studioGenerateButton isGenerating' : 'studioGenerateButton'} onClick={onGenerate} disabled={isGenerating}>{isGenerating ? '提交中...' : isPromotionSelected ? '生成宣传图' : '生成效果'}</Button><div className="studioGenerateMeta" aria-live="polite">消耗 {cost} 点算力 <b>剩余：{quota}</b></div></div>
    </aside>
  );
}
