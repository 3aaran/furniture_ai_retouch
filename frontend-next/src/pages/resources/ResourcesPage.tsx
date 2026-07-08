import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { fetchCategoryTree, fetchWorkbenchResources, type CategoryPurpose, type CategoryTree, type ResourceApiItem } from '../../services/studio.api';
import { resolveApiUrl } from '../../services/http';
import './ResourcesPage.css';

type ScopeKey = 'ALL' | 'SYSTEM' | 'MERCHANT' | 'USER';
type TypeKey = 'ALL' | 'user_reference' | 'material' | 'scene';

type CategoryOption = {
  main: string;
  subs: string[];
};

const scopeOptions: Array<{ key: ScopeKey; label: string; desc: string }> = [
  { key: 'ALL', label: '全部资产', desc: '系统、门店与个人资产' },
  { key: 'SYSTEM', label: '系统资产', desc: '平台预置素材' },
  { key: 'MERCHANT', label: '门店资产', desc: '门店共享素材' },
  { key: 'USER', label: '个人资产', desc: '当前账号上传' },
];

const typeOptions: Array<{ key: TypeKey; label: string }> = [
  { key: 'ALL', label: '全部类型' },
  { key: 'user_reference', label: '产品图' },
  { key: 'material', label: '材质' },
  { key: 'scene', label: '场景' },
];

function resourceName(item: ResourceApiItem) {
  return item.name || item.resourceName || item.originalName || `资产-${String(item.id).slice(0, 8)}`;
}

function resourceImage(item: ResourceApiItem) {
  return resolveApiUrl(item.thumbUrl || item.imageUrl || item.url || item.downloadUrl) || '';
}

function resourceType(item: ResourceApiItem): TypeKey | string {
  return item.resourceType || item.resource_type || 'user_reference';
}

function resourceTypeName(item: ResourceApiItem) {
  const type = resourceType(item);
  if (type === 'material') return '材质';
  if (type === 'scene') return '场景';
  return '产品图';
}

function scopeName(scope?: string) {
  if (scope === 'SYSTEM') return '系统资产';
  if (scope === 'MERCHANT') return '门店资产';
  if (scope === 'USER') return '个人资产';
  return '资产';
}

function mainName(item: ResourceApiItem) {
  return item.mainCategoryName || item.objectName || '未分类';
}

function subName(item: ResourceApiItem) {
  return item.subCategoryName || item.colorName || '';
}

function formatDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mergeCategories(resources: ResourceApiItem[], purposes: CategoryPurpose[]) {
  const map = new Map<string, Set<string>>();
  purposes.forEach((purpose) => {
    purpose.mains.forEach((main) => {
      const set = map.get(main.name) || new Set<string>();
      main.subs?.forEach((sub) => set.add(sub.name));
      map.set(main.name, set);
    });
  });
  resources.forEach((item) => {
    const main = mainName(item);
    const sub = subName(item);
    const set = map.get(main) || new Set<string>();
    if (sub) set.add(sub);
    map.set(main, set);
  });
  return Array.from(map.entries())
    .map(([main, subs]) => ({ main, subs: Array.from(subs).filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')) }))
    .sort((a, b) => a.main.localeCompare(b.main, 'zh-Hans-CN'));
}

export function ResourcesPage() {
  const [resources, setResources] = useState<ResourceApiItem[]>([]);
  const [categoryPurposes, setCategoryPurposes] = useState<CategoryPurpose[]>([]);
  const [scope, setScope] = useState<ScopeKey>('ALL');
  const [type, setType] = useState<TypeKey>('ALL');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ResourceApiItem | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.allSettled([
      fetchWorkbenchResources({ pageSize: 999 }),
      fetchCategoryTree('SYSTEM'),
      fetchCategoryTree('MERCHANT'),
      fetchCategoryTree('USER'),
    ])
      .then((results) => {
        if (cancelled) return;
        const resourcesResult = results[0];
        if (resourcesResult.status === 'fulfilled') setResources(resourcesResult.value.items || []);
        else throw resourcesResult.reason;
        const purposes = results.slice(1).flatMap((result) => result.status === 'fulfilled' ? (result.value as CategoryTree).purposes : []);
        setCategoryPurposes(purposes);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '资产加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const categoryOptions = useMemo(() => mergeCategories(resources, categoryPurposes), [categoryPurposes, resources]);
  const subOptions = useMemo(() => categoryOptions.find((item) => item.main === mainCategory)?.subs || [], [categoryOptions, mainCategory]);

  const filteredResources = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return resources.filter((item) => {
      if (scope !== 'ALL' && item.scope !== scope) return false;
      if (type !== 'ALL' && resourceType(item) !== type) return false;
      if (mainCategory && mainName(item) !== mainCategory) return false;
      if (subCategory && subName(item) !== subCategory) return false;
      if (kw) {
        const text = `${resourceName(item)}${mainName(item)}${subName(item)}${resourceTypeName(item)}${scopeName(item.scope)}`.toLowerCase();
        if (!text.includes(kw)) return false;
      }
      return true;
    });
  }, [keyword, mainCategory, resources, scope, subCategory, type]);

  function resetCategory() {
    setMainCategory('');
    setSubCategory('');
  }

  function reload() {
    setLoading(true);
    setError('');
    fetchWorkbenchResources({ pageSize: 999 })
      .then((data) => setResources(data.items || []))
      .catch((reason: Error) => setError(reason.message || '资产加载失败'))
      .finally(() => setLoading(false));
  }

  const filterPanel = (
    <aside className="assetSidePanel">
      <div className="assetSideHead"><span>ASSETS</span><b>资产筛选</b></div>
      <label className="assetSearchBox"><span>搜索</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入名称、分类、类型" /></label>

      <section className="assetFilterBlock">
        <h3>资产空间</h3>
        <div className="assetScopeList">
          {scopeOptions.map((item) => <button key={item.key} className={scope === item.key ? 'isActive' : ''} type="button" onClick={() => { setScope(item.key); resetCategory(); }}><span>{item.label}</span><em>{item.desc}</em></button>)}
        </div>
      </section>

      <section className="assetFilterBlock">
        <h3>资产类型</h3>
        <div className="assetTypePills">
          {typeOptions.map((item) => <button key={item.key} className={type === item.key ? 'isActive' : ''} type="button" onClick={() => setType(item.key)}>{item.label}</button>)}
        </div>
      </section>

      <section className="assetFilterBlock">
        <h3>分类</h3>
        <div className="assetCategoryList">
          <button className={!mainCategory ? 'isActive' : ''} type="button" onClick={resetCategory}>全部分类</button>
          {categoryOptions.map((item: CategoryOption) => <button key={item.main} className={mainCategory === item.main ? 'isActive' : ''} type="button" onClick={() => { setMainCategory(item.main); setSubCategory(''); }}>{item.main}</button>)}
        </div>
        {mainCategory && subOptions.length > 0 && <div className="assetSubCategoryList"><button className={!subCategory ? 'isActive' : ''} type="button" onClick={() => setSubCategory('')}>全部子分类</button>{subOptions.map((item) => <button key={item} className={subCategory === item ? 'isActive' : ''} type="button" onClick={() => setSubCategory(item)}>{item}</button>)}</div>}
      </section>
    </aside>
  );

  return <div className="assetPage">
    {mobileFiltersOpen && <button className="assetMobileBackdrop" type="button" aria-label="关闭筛选" onClick={() => setMobileFiltersOpen(false)} />}
    <div className={`assetMobileDrawer ${mobileFiltersOpen ? 'isOpen' : ''}`.trim()}>{filterPanel}</div>
    <div className="assetDesktopSide">{filterPanel}</div>

    <main className="assetMainPanel">
      <section className="assetHeroCard">
        <div><span>资产库</span><h1>家具资产管理</h1><p>集中展示系统资产、门店资产和个人资产，可根据空间、类型、主分类、子分类快速筛选。</p></div>
        <div className="assetHeroStats"><b>{filteredResources.length}</b><span>当前筛选</span></div>
      </section>

      <section className="assetToolbarCard">
        <button className="assetMobileFilterButton" type="button" onClick={() => setMobileFiltersOpen(true)}>筛选资产</button>
        <div className="assetStatusLine"><b>{loading ? '正在加载资产...' : `共 ${filteredResources.length} 项资产`}</b><span>{scopeOptions.find((item) => item.key === scope)?.label} / {typeOptions.find((item) => item.key === type)?.label}</span></div>
        <Button variant="secondary" onClick={reload}>刷新</Button>
      </section>

      {error && <div className="assetStateCard isError">{error}</div>}
      {!error && loading && <div className="assetStateCard">正在读取后端资产库...</div>}
      {!error && !loading && filteredResources.length === 0 && <div className="assetStateCard">暂无匹配资产，可调整左侧分类或搜索条件。</div>}

      <section className="assetGrid" aria-label="资产列表">
        {filteredResources.map((item) => {
          const img = resourceImage(item);
          return <article className="assetCard" key={String(item.id)} onClick={() => setSelected(item)}>
            <div className="assetImageBox">{img ? <img src={img} alt={resourceName(item)} loading="lazy" decoding="async" /> : <span>{resourceTypeName(item)}</span>}</div>
            <div className="assetCardInfo"><div><b title={resourceName(item)}>{resourceName(item)}</b><em>#{String(item.id).slice(0, 8)}</em></div><p>{mainName(item)}{subName(item) ? ` / ${subName(item)}` : ''}</p><footer><span>{scopeName(item.scope)}</span><i>{resourceTypeName(item)}</i></footer></div>
          </article>;
        })}
      </section>
    </main>

    {selected && <button className="assetDetailBackdrop" type="button" aria-label="关闭资产详情" onClick={() => setSelected(null)} />}
    {selected && <aside className="assetDetailDrawer">
      <div className="assetDetailHead"><div><span>资产详情</span><b>{resourceName(selected)}</b></div><button type="button" onClick={() => setSelected(null)}>×</button></div>
      <div className="assetDetailImage">{resourceImage(selected) ? <img src={resourceImage(selected)} alt={resourceName(selected)} /> : <span>{resourceTypeName(selected)}</span>}</div>
      <dl className="assetDetailMeta"><dt>空间</dt><dd>{scopeName(selected.scope)}</dd><dt>类型</dt><dd>{resourceTypeName(selected)}</dd><dt>主分类</dt><dd>{mainName(selected)}</dd><dt>子分类</dt><dd>{subName(selected) || '无'}</dd><dt>创建时间</dt><dd>{formatDate(selected.createdAt)}</dd></dl>
      {selected.downloadUrl && <a className="assetDetailDownload" href={resourceImage(selected)} target="_blank" rel="noreferrer">打开原图</a>}
    </aside>}
  </div>;
}
