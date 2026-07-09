import { AppIcon } from '../../components/icons/AppIcon';
import type { ResourceApiItem } from '../../services/studio.api';
import './StudioAssetPickerModal.css';

type StudioAssetPickerModalProps = {
  target: 'source' | 'reference';
  items: ResourceApiItem[];
  loading: boolean;
  error: string;
  keyword: string;
  selectedIds: Set<string>;
  onKeywordChange: (value: string) => void;
  onSelect: (item: ResourceApiItem) => void;
  onClose: () => void;
  resourceName: (item: ResourceApiItem) => string;
  resourceImageUrl: (item: ResourceApiItem) => string;
};

export function StudioAssetPickerModal({
  target,
  items,
  loading,
  error,
  keyword,
  selectedIds,
  onKeywordChange,
  onSelect,
  onClose,
  resourceName,
  resourceImageUrl,
}: StudioAssetPickerModalProps) {
  return (
    <div className="studioModalOverlay" role="dialog" aria-modal="true" aria-label="从资产库选择">
      <section className="studioAssetPicker">
        <header className="studioAssetPickerHead">
          <div><span>资产库</span><b>{target === 'source' ? '选择产品原图' : '选择参考图'}</b></div>
          <button type="button" aria-label="关闭资产库" onClick={onClose}><AppIcon name="close" /></button>
        </header>
        <label className="studioAssetSearch">
          <AppIcon name="search" />
          <input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="搜索资产名称" />
        </label>
        <div className="studioAssetPickerGrid">
          {items.map((item) => {
            const id = String(item.id);
            const title = resourceName(item);
            const img = resourceImageUrl(item);
            const selected = selectedIds.has(String(item.imageId || item.id));
            return (
              <button key={id} type="button" className={selected ? 'studioAssetChoice isSelected' : 'studioAssetChoice'} onClick={() => onSelect(item)}>
                {img ? <img src={img} alt={title} loading="lazy" decoding="async" /> : <i aria-hidden="true">图</i>}
                <span>{title}</span>
                {selected && <em>{target === 'reference' ? '已添加' : '当前'}</em>}
              </button>
            );
          })}
          {!loading && !error && !items.length && <div className="studioAssetEmpty">资产库暂无可选图片</div>}
          {loading && <div className="studioAssetEmpty">正在读取资产库...</div>}
          {error && <div className="studioAssetEmpty">资产库读取失败：{error}</div>}
        </div>
      </section>
    </div>
  );
}
