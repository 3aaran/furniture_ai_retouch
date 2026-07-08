import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  createMainCategory,
  createSubCategory,
  deleteWorkbenchResource,
  fetchCategoryTree,
  fetchWorkbenchResources,
  updateMainCategory,
  updateSubCategory,
  updateWorkbenchResource,
  uploadWorkbenchResources,
  type CategoryMainItem,
  type CategoryPurpose,
  type CategoryTree,
  type ResourceApiItem,
} from '../../services/studio.api';
import { resolveApiUrl } from '../../services/http';
import './ResourcesPage.css';

type ScopeKey = 'ALL' | 'SYSTEM' | 'MERCHANT' | 'USER';
type ManageScope = 'USER' | 'MERCHANT';
type AssetModal = null | 'filter' | 'upload' | 'batch-category' | 'batch-delete' | 'category-manage';

type CategoryOption = {
  id?: string | number;
  main: string;
  scope?: string;
  purposeKey?: string;
  canManage?: boolean;
  subs: Array<{ id?: string | number; name: string; canManage?: boolean }>;
};

const scopeOptions: Array<{ key: ScopeKey; label: string; desc: string }> = [
  { key: 'ALL', label: '全部权限', desc: '显示所有可见资产' },
  { key: 'SYSTEM', label: '系统资产', desc: '平台预置资产' },
  { key: 'MERCHANT', label: '门店资产', desc: '门店共享资产' },
  { key: 'USER', label: '个人资产', desc: '当前账号资产' },
];

const manageScopeOptions: Array<{ key: ManageScope; label: string }> = [
  { key: 'USER', label: '个人资产' },
  { key: 'MERCHANT', label: '门店资产' },
];

const purposeOptions = [
  { key: 'user_reference', label: '产品参考' },
  { key: 'material', label: '材质替换' },
  { key: 'scene', label: '场景融合' },
];

function resourceName(item: ResourceApiItem) {
  return item.name || item.resourceName || item.originalName || `资产-${String(item.id).slice(0, 8)}`;
}

function resourceImage(item: ResourceApiItem) {
  return resolveApiUrl(item.imageUrl || item.url || item.downloadUrl || item.thumbUrl) || '';
}

function resourceCategoryPath(item: ResourceApiItem) {
  return `${scopeName(item.scope)} / ${mainName(item)} / ${subName(item) || resourceTypeName(item)}`;
}

const ASSET_PAGE_SIZE = 20;

function categoryKey(item: Pick<CategoryOption, 'scope' | 'main'>) {
  return `${item.scope || ''}:${item.main}`;
}

function purposeLabel(key?: string) {
  return purposeOptions.find((item) => item.key === key)?.label || key || '未分用途';
}

function resourceType(item: ResourceApiItem) {
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

function canManageResource(item: ResourceApiItem) {
  return item.scope === 'USER' || item.scope === 'MERCHANT';
}

function formatDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function flattenCategoryTrees(resources: ResourceApiItem[], purposes: CategoryPurpose[]) {
  const map = new Map<string, CategoryOption>();
  purposes.forEach((purpose) => {
    purpose.mains.forEach((main: CategoryMainItem) => {
      const key = `${main.scope || ''}:${main.name}`;
      const existing = map.get(key) || { id: main.id, main: main.name, scope: main.scope, purposeKey: main.purposeKey || purpose.purposeKey, canManage: main.canManage, subs: [] };
      existing.id = existing.id || main.id;
      existing.scope = existing.scope || main.scope;
      existing.purposeKey = existing.purposeKey || main.purposeKey || purpose.purposeKey;
      existing.canManage = existing.canManage || main.canManage;
      main.subs?.forEach((sub) => {
        if (!existing.subs.some((item) => item.name === sub.name)) existing.subs.push({ id: sub.id, name: sub.name, canManage: sub.canManage });
      });
      map.set(key, existing);
    });
  });
  resources.forEach((item) => {
    const main = mainName(item);
    const sub = subName(item);
    const key = `${item.scope || ''}:${main}`;
    const existing = map.get(key) || { main, scope: item.scope, purposeKey: resourceType(item), canManage: canManageResource(item), subs: [] };
    if (sub && !existing.subs.some((value) => value.name === sub)) existing.subs.push({ name: sub, canManage: canManageResource(item) });
    map.set(key, existing);
  });
  return Array.from(map.values())
    .map((item) => ({ ...item, subs: item.subs.filter((sub) => sub.name).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')) }))
    .sort((a, b) => `${scopeName(a.scope)}${a.main}`.localeCompare(`${scopeName(b.scope)}${b.main}`, 'zh-Hans-CN'));
}

function categoryOptionsForScope(categories: CategoryOption[], scope: string) {
  return categories.filter((item) => item.scope === scope || (!item.scope && scope === 'USER'));
}

export function ResourcesPage() {
  const [resources, setResources] = useState<ResourceApiItem[]>([]);
  const [categoryPurposes, setCategoryPurposes] = useState<CategoryPurpose[]>([]);
  const [scope, setScope] = useState<ScopeKey>('ALL');
  const [mainCategory, setMainCategory] = useState('');
  const [mainCategoryScope, setMainCategoryScope] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ResourceApiItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<AssetModal>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [detailName, setDetailName] = useState('');
  const [targetScope, setTargetScope] = useState<ManageScope>('USER');
  const [targetMain, setTargetMain] = useState('');
  const [targetSub, setTargetSub] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadName, setUploadName] = useState('');
  const [managerScope, setManagerScope] = useState<ManageScope>('USER');
  const [newMainName, setNewMainName] = useState('');
  const [newMainPurpose, setNewMainPurpose] = useState('user_reference');
  const [newSubMainId, setNewSubMainId] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [page, setPage] = useState(1);

  async function loadAssets() {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      fetchWorkbenchResources({ pageSize: 999 }),
      fetchCategoryTree('SYSTEM'),
      fetchCategoryTree('MERCHANT'),
      fetchCategoryTree('USER'),
    ]);
    const resourcesResult = results[0];
    if (resourcesResult.status === 'fulfilled') setResources(resourcesResult.value.items || []);
    else throw resourcesResult.reason;
    const purposes = results.slice(1).flatMap((result) => result.status === 'fulfilled' ? (result.value as CategoryTree).purposes : []);
    setCategoryPurposes(purposes);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    loadAssets().catch((reason: unknown) => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : '资产加载失败');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setDetailName(selected ? resourceName(selected) : '');
  }, [selected]);

  const categoryOptions = useMemo(() => flattenCategoryTrees(resources, categoryPurposes), [categoryPurposes, resources]);
  const filterCategoryOptions = useMemo(() => scope === 'ALL' ? categoryOptions : categoryOptionsForScope(categoryOptions, scope), [categoryOptions, scope]);
  const visibleFilterCategoryOptions = useMemo(() => filterPurpose === 'ALL' ? filterCategoryOptions : filterCategoryOptions.filter((item) => item.purposeKey === filterPurpose), [filterCategoryOptions, filterPurpose]);
  const selectedCategory = useMemo(() => filterCategoryOptions.find((item) => item.main === mainCategory && (!mainCategoryScope || item.scope === mainCategoryScope)) || null, [filterCategoryOptions, mainCategory, mainCategoryScope]);
  const filterSubOptions = selectedCategory?.subs || [];
  const targetCategoryOptions = useMemo(() => categoryOptionsForScope(categoryOptions, targetScope), [categoryOptions, targetScope]);
  const targetSubOptions = useMemo(() => targetCategoryOptions.find((item) => item.main === targetMain)?.subs || [], [targetCategoryOptions, targetMain]);
  const managerCategoryOptions = useMemo(() => categoryOptionsForScope(categoryOptions, managerScope), [categoryOptions, managerScope]);

  const filteredResources = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return resources.filter((item) => {
      if (scope !== 'ALL' && item.scope !== scope) return false;
      if (filterPurpose !== 'ALL' && resourceType(item) !== filterPurpose) return false;
      if (mainCategoryScope && item.scope !== mainCategoryScope) return false;
      if (mainCategory && mainName(item) !== mainCategory) return false;
      if (subCategory && subName(item) !== subCategory) return false;
      if (kw && !resourceName(item).toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [filterPurpose, keyword, mainCategory, mainCategoryScope, resources, scope, subCategory]);

  useEffect(() => {
    setPage(1);
  }, [filterPurpose, keyword, mainCategory, mainCategoryScope, scope, subCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / ASSET_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedResources = useMemo(() => {
    const start = (safePage - 1) * ASSET_PAGE_SIZE;
    return filteredResources.slice(start, start + ASSET_PAGE_SIZE);
  }, [filteredResources, safePage]);

  const selectedItems = useMemo(() => resources.filter((item) => selectedIds.has(String(item.id))), [resources, selectedIds]);
  const scopeCounts = useMemo(() => {
    const counts = new Map<string, number>([['ALL', resources.length]]);
    resources.forEach((item) => counts.set(item.scope || 'USER', (counts.get(item.scope || 'USER') || 0) + 1));
    return counts;
  }, [resources]);
  const purposeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    resources.forEach((item) => {
      if (scope !== 'ALL' && item.scope !== scope) return;
      const key = resourceType(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [resources, scope]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    resources.forEach((item) => {
      if (scope !== 'ALL' && item.scope !== scope) return;
      if (filterPurpose !== 'ALL' && resourceType(item) !== filterPurpose) return;
      const key = `${item.scope || ''}:${mainName(item)}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [filterPurpose, resources, scope]);
  const subCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    resources.forEach((item) => {
      if (scope !== 'ALL' && item.scope !== scope) return;
      if (filterPurpose !== 'ALL' && resourceType(item) !== filterPurpose) return;
      if (mainCategoryScope && item.scope !== mainCategoryScope) return;
      if (mainCategory && mainName(item) !== mainCategory) return;
      const key = `${item.scope || ''}:${mainName(item)}:${subName(item) || ''}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [filterPurpose, mainCategory, mainCategoryScope, resources, scope]);
  const purposeFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    categoryPurposes.forEach((purpose) => map.set(purpose.purposeKey, purpose.purposeName));
    purposeOptions.forEach((item) => {
      if (purposeCounts.has(item.key)) map.set(item.key, item.label);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [categoryPurposes, purposeCounts]);
  const activeFilterCount = Number(scope !== 'ALL') + Number(filterPurpose !== 'ALL') + Number(Boolean(mainCategory)) + Number(Boolean(subCategory));

  function closeModal() {
    setModal(null);
    setNotice('');
  }

  function resetFilters() {
    setScope('ALL');
    setFilterPurpose('ALL');
    setMainCategory('');
    setMainCategoryScope('');
    setSubCategory('');
  }

  function toggleSelect(item: ResourceApiItem, checked: boolean) {
    if (!canManageResource(item)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(String(item.id));
      else next.delete(String(item.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function setTargetScopeAndReset(value: ManageScope) {
    setTargetScope(value);
    setTargetMain('');
    setTargetSub('');
  }

  function setManagerScopeAndReset(value: ManageScope) {
    setManagerScope(value);
    setNewSubMainId('');
  }

  async function reloadAfterAction() {
    await loadAssets();
  }

  async function saveDetailName() {
    if (!selected || !canManageResource(selected)) return;
    const nextName = detailName.trim();
    if (!nextName) {
      setNotice('名称不能为空');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await updateWorkbenchResource(selected.id, { name: nextName });
      await reloadAfterAction();
      setSelected((prev) => prev ? { ...prev, name: nextName } : prev);
      setNotice('名称已更新');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '名称更新失败');
    } finally {
      setBusy(false);
    }
  }

  async function applyBatchCategory() {
    if (!selectedItems.length) return;
    if (!targetMain) {
      setNotice('请选择主分类');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const results = await Promise.allSettled(selectedItems.map((item) => updateWorkbenchResource(item.id, { scope: targetScope, objectName: targetMain, colorName: targetSub })));
      const failed = results.filter((item) => item.status === 'rejected').length;
      await reloadAfterAction();
      clearSelection();
      closeModal();
      if (failed) setNotice(`部分资产分类变更失败：${failed} 项`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '批量分类变更失败');
    } finally {
      setBusy(false);
    }
  }

  async function applyBatchDelete() {
    if (!selectedItems.length) return;
    setBusy(true);
    setNotice('');
    try {
      const results = await Promise.allSettled(selectedItems.map((item) => deleteWorkbenchResource(item.id)));
      const failed = results.filter((item) => item.status === 'rejected').length;
      await reloadAfterAction();
      clearSelection();
      closeModal();
      if (failed) setNotice(`部分资产删除失败：${failed} 项`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '批量删除失败');
    } finally {
      setBusy(false);
    }
  }

  function handleUploadFiles(event: ChangeEvent<HTMLInputElement>) {
    setUploadFiles(Array.from(event.target.files || []));
  }

  async function uploadAssets() {
    if (!uploadFiles.length) {
      setNotice('请选择要上传的图片文件');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await uploadWorkbenchResources({ files: uploadFiles, name: uploadName.trim(), scope: targetScope, objectName: targetMain || '未分类', colorName: targetSub });
      await reloadAfterAction();
      setUploadFiles([]);
      setUploadName('');
      closeModal();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '上传失败');
    } finally {
      setBusy(false);
    }
  }

  async function createMain() {
    const name = newMainName.trim();
    if (!name) {
      setNotice('请输入主分类名称');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await createMainCategory({ scope: managerScope, name, purposeKey: newMainPurpose });
      setNewMainName('');
      await reloadAfterAction();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '创建主分类失败');
    } finally {
      setBusy(false);
    }
  }

  async function createSub() {
    const name = newSubName.trim();
    if (!newSubMainId || !name) {
      setNotice('请选择主分类并填写子分类名称');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await createSubCategory(newSubMainId, { name });
      setNewSubName('');
      await reloadAfterAction();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '创建子分类失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteMain(id?: string | number) {
    if (!id) return;
    setBusy(true);
    setNotice('');
    try {
      await updateMainCategory(id, { status: 'DELETED' });
      await reloadAfterAction();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '删除主分类失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSub(id?: string | number) {
    if (!id) return;
    setBusy(true);
    setNotice('');
    try {
      await updateSubCategory(id, { status: 'DELETED' });
      await reloadAfterAction();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '删除子分类失败');
    } finally {
      setBusy(false);
    }
  }

  const filterSheet = (
    <aside className={`assetFilterSheet ${modal === 'filter' ? 'isOpen' : ''}`.trim()} aria-hidden={modal !== 'filter'}>
      <div className="assetFilterHead assetFilterHero"><div><span>高级筛选</span><b>真实资产分类</b><p>分类来自后端分类树接口，图片地址使用后端返回的 OSS 可访问链接。</p></div><button type="button" aria-label="关闭高级筛选" onClick={closeModal}>×</button></div>
      <div className="assetFilterSummary"><article><span>当前结果</span><b>{filteredResources.length}</b><em>张资产</em></article><article><span>总资产</span><b>{resources.length}</b><em>后端返回</em></article></div>
      <section className="assetFilterBlock assetFilterPanel"><div className="assetFilterTitle"><h3>资产权限</h3><span>按可见空间筛选</span></div><div className="assetScopeList">{scopeOptions.map((item) => <button key={item.key} className={scope === item.key ? 'isActive' : ''} type="button" onClick={() => { setScope(item.key); setFilterPurpose('ALL'); setMainCategory(''); setMainCategoryScope(''); setSubCategory(''); }}><span>{item.label}</span><b>{scopeCounts.get(item.key) || 0}</b><em>{item.desc}</em></button>)}</div></section>
      <section className="assetFilterBlock assetFilterPanel"><div className="assetFilterTitle"><h3>功能用途</h3><span>来自分类用途与资源类型</span></div><div className="assetPurposePills"><button className={filterPurpose === 'ALL' ? 'isActive' : ''} type="button" onClick={() => { setFilterPurpose('ALL'); setMainCategory(''); setMainCategoryScope(''); setSubCategory(''); }}>全部用途 <b>{scope === 'ALL' ? resources.length : (scopeCounts.get(scope) || 0)}</b></button>{purposeFilterOptions.map((item) => <button key={item.key} className={filterPurpose === item.key ? 'isActive' : ''} type="button" onClick={() => { setFilterPurpose(item.key); setMainCategory(''); setMainCategoryScope(''); setSubCategory(''); }}>{item.label} <b>{purposeCounts.get(item.key) || 0}</b></button>)}</div></section>
      <section className="assetFilterBlock assetFilterPanel"><div className="assetFilterTitle"><h3>主分类</h3><span>{visibleFilterCategoryOptions.length ? '选择真实主分类' : '当前范围暂无分类'}</span></div><div className="assetCategoryList"><button className={!mainCategory ? 'isActive' : ''} type="button" onClick={() => { setMainCategory(''); setMainCategoryScope(''); setSubCategory(''); }}><span>全部主分类</span><b>{filteredResources.length}</b></button>{visibleFilterCategoryOptions.map((item) => <button key={categoryKey(item)} className={mainCategory === item.main && mainCategoryScope === (item.scope || '') ? 'isActive' : ''} type="button" onClick={() => { setMainCategory(item.main); setMainCategoryScope(item.scope || ''); setSubCategory(''); }}><span>{item.main}</span><small>{scopeName(item.scope)} · {purposeLabel(item.purposeKey)}</small><b>{categoryCounts.get(categoryKey(item)) || 0}</b></button>)}</div></section>
      <section className="assetFilterBlock assetFilterPanel"><div className="assetFilterTitle"><h3>子分类</h3><span>{selectedCategory ? `${selectedCategory.main} 下的真实子分类` : '先选择主分类'}</span></div><div className="assetSubCategoryList"><button className={!subCategory ? 'isActive' : ''} type="button" onClick={() => setSubCategory('')}><span>全部子分类</span><b>{selectedCategory ? (categoryCounts.get(categoryKey(selectedCategory)) || 0) : filteredResources.length}</b></button>{selectedCategory ? (filterSubOptions.length ? filterSubOptions.map((item) => <button key={item.name} className={subCategory === item.name ? 'isActive' : ''} type="button" onClick={() => setSubCategory(item.name)}><span>{item.name}</span><b>{subCategoryCounts.get(`${selectedCategory.scope || ''}:${selectedCategory.main}:${item.name}`) || 0}</b></button>) : <span>该主分类暂无子分类</span>) : <span>请选择一个主分类后继续筛选</span>}</div></section>
      <div className="assetFilterActions"><button type="button" onClick={resetFilters}>重置筛选</button><button type="button" onClick={closeModal}>应用筛选</button></div>
    </aside>
  );

  const categoryFields = (
    <>
      <label><span>资产权限</span><select value={targetScope} onChange={(event) => setTargetScopeAndReset(event.target.value as ManageScope)}>{manageScopeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      <label><span>主分类</span><select value={targetMain} onChange={(event) => { setTargetMain(event.target.value); setTargetSub(''); }}><option value="">请选择主分类</option>{targetCategoryOptions.map((item) => <option key={`${item.scope}-${item.main}`} value={item.main}>{item.main}</option>)}</select></label>
      <label><span>子分类</span><select value={targetSub} onChange={(event) => setTargetSub(event.target.value)}><option value="">无 / 主分类本身</option>{targetSubOptions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
    </>
  );

  return <div className="assetPage">
    {modal && <button className="assetOverlay" type="button" aria-label="关闭弹窗" onClick={closeModal} />}
    {filterSheet}

    {modal === 'upload' && <aside className="assetActionSheet isOpen"><div className="assetFilterHead"><div><span>上传资产</span><b>上传图片并保存为资产</b></div><button type="button" onClick={closeModal}>×</button></div><div className="assetFormGrid"><label><span>选择图片</span><input type="file" accept="image/*" multiple onChange={handleUploadFiles} /></label><label><span>统一名称（可选）</span><input value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="不填则使用文件名" /></label>{categoryFields}</div>{notice && <p className="assetNotice">{notice}</p>}<div className="assetFilterActions"><button type="button" onClick={closeModal}>取消</button><button type="button" disabled={busy} onClick={uploadAssets}>{busy ? '上传中...' : `上传 ${uploadFiles.length || ''}`}</button></div></aside>}

    {modal === 'batch-category' && <aside className="assetActionSheet isOpen"><div className="assetFilterHead"><div><span>批量分类</span><b>已选择 {selectedItems.length} 项资产</b></div><button type="button" onClick={closeModal}>×</button></div><div className="assetFormGrid">{categoryFields}</div>{notice && <p className="assetNotice">{notice}</p>}<div className="assetFilterActions"><button type="button" onClick={closeModal}>取消</button><button type="button" disabled={busy} onClick={applyBatchCategory}>{busy ? '处理中...' : '变更分类'}</button></div></aside>}

    {modal === 'batch-delete' && <aside className="assetActionSheet isOpen"><div className="assetFilterHead"><div><span>批量删除</span><b>确认删除 {selectedItems.length} 项资产</b></div><button type="button" onClick={closeModal}>×</button></div><p className="assetDangerText">删除后这些资产将从资产库移除，该操作会调用后端删除接口。</p>{notice && <p className="assetNotice">{notice}</p>}<div className="assetFilterActions"><button type="button" onClick={closeModal}>取消</button><button className="danger" type="button" disabled={busy} onClick={applyBatchDelete}>{busy ? '删除中...' : '确认删除'}</button></div></aside>}

    {modal === 'category-manage' && <aside className="assetCategoryManageSheet isOpen"><div className="assetFilterHead"><div><span>分类管理</span><b>创建或删除图片分类</b></div><button type="button" onClick={closeModal}>×</button></div><div className="assetFormGrid"><label><span>管理权限</span><select value={managerScope} onChange={(event) => setManagerScopeAndReset(event.target.value as ManageScope)}>{manageScopeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label><span>功能用途</span><select value={newMainPurpose} onChange={(event) => setNewMainPurpose(event.target.value)}>{purposeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label><span>新主分类</span><input value={newMainName} onChange={(event) => setNewMainName(event.target.value)} placeholder="输入主分类名称" /></label><button type="button" disabled={busy} onClick={createMain}>创建主分类</button><label><span>选择主分类</span><select value={newSubMainId} onChange={(event) => setNewSubMainId(event.target.value)}><option value="">请选择主分类</option>{managerCategoryOptions.map((item) => <option key={String(item.id || item.main)} value={String(item.id || '')}>{item.main}</option>)}</select></label><label><span>新子分类</span><input value={newSubName} onChange={(event) => setNewSubName(event.target.value)} placeholder="输入子分类名称" /></label><button type="button" disabled={busy} onClick={createSub}>创建子分类</button></div><div className="assetCategoryManageList">{managerCategoryOptions.map((item) => <article key={`${item.scope}-${item.main}`}><header><b>{item.main}</b><button type="button" disabled={busy || !item.id} onClick={() => deleteMain(item.id)}>删除主分类</button></header>{item.subs.length ? item.subs.map((sub) => <p key={sub.name}><span>{sub.name}</span><button type="button" disabled={busy || !sub.id} onClick={() => deleteSub(sub.id)}>删除</button></p>) : <em>暂无子分类</em>}</article>)}</div>{notice && <p className="assetNotice">{notice}</p>}</aside>}

    <main className="assetMainPanel">
      {selectedItems.length > 0 ? <section className="assetBatchBar"><b>已选择 {selectedItems.length} 项资产</b><button type="button" onClick={() => setModal('batch-category')}>批量分类变更</button><button type="button" onClick={() => setModal('batch-delete')}>批量删除</button><button type="button" onClick={clearSelection}>取消选择</button></section> : <section className="assetSearchBar" aria-label="资产搜索与筛选"><label><span>搜索资产</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入资产名称" /></label><div className="assetSearchActions"><button type="button" onClick={() => setModal('filter')}>高级筛选{activeFilterCount ? ` ${activeFilterCount}` : ''}</button><button className="assetPcOnlyAction" type="button" onClick={() => setModal('category-manage')}>分类管理</button><button className="assetPcOnlyAction" type="button" onClick={() => setModal('upload')}>上传</button></div></section>}
      {notice && !modal && <div className="assetNotice">{notice}</div>}
      {error && <div className="assetStateCard isError">{error}</div>}
      {!error && loading && <div className="assetStateCard">正在读取后端资产库...</div>}
      {!error && !loading && filteredResources.length === 0 && <div className="assetStateCard">暂无匹配资产，可修改搜索词或高级筛选条件。</div>}
      <section className="assetGrid" aria-label="资产列表">
        {pagedResources.map((item) => {
          const img = resourceImage(item);
          const id = String(item.id);
          const manageable = canManageResource(item);
          return <article className="assetCard" key={id} onClick={() => setSelected(item)}>
            <label className="assetSelectBox" title={manageable ? '选择资产' : '系统资产仅可查看'} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={!manageable} checked={selectedIds.has(id)} onChange={(event) => toggleSelect(item, event.target.checked)} /><span /></label>
            <div className="assetImageBox">{img ? <img src={img} alt={resourceName(item)} loading="lazy" decoding="async" /> : <span>{resourceTypeName(item)}</span>}</div>
            <div className="assetCardInfo"><b title={resourceName(item)}>{resourceName(item)}</b><p title={resourceCategoryPath(item)}>{resourceCategoryPath(item)}</p></div>
          </article>;
        })}
      </section>
      {!error && !loading && filteredResources.length > ASSET_PAGE_SIZE && <nav className="assetPager" aria-label="资产分页"><span>第 {safePage} / {totalPages} 页，共 {filteredResources.length} 张</span><div><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button type="button" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div></nav>}
    </main>

    {selected && <button className="assetOverlay" type="button" aria-label="关闭资产详情" onClick={() => setSelected(null)} />}
    {selected && <aside className="assetDetailDrawer"><div className="assetDetailHead"><div><span>资产详情</span><b>{resourceName(selected)}</b></div><button type="button" onClick={() => setSelected(null)}>×</button></div><div className="assetDetailImage">{resourceImage(selected) ? <img src={resourceImage(selected)} alt={resourceName(selected)} /> : <span>{resourceTypeName(selected)}</span>}</div>{canManageResource(selected) && <div className="assetDetailEdit"><label><span>资产名称</span><input value={detailName} onChange={(event) => setDetailName(event.target.value)} /></label><button type="button" disabled={busy} onClick={saveDetailName}>重命名</button></div>}<dl className="assetDetailMeta"><dt>权限</dt><dd>{scopeName(selected.scope)}</dd><dt>类型</dt><dd>{resourceTypeName(selected)}</dd><dt>主分类</dt><dd>{mainName(selected)}</dd><dt>子分类</dt><dd>{subName(selected) || '无'}</dd><dt>创建时间</dt><dd>{formatDate(selected.createdAt)}</dd></dl>{notice && <p className="assetNotice">{notice}</p>}{selected.downloadUrl && <a className="assetDetailDownload" href={resourceImage(selected)} target="_blank" rel="noreferrer">打开原图</a>}</aside>}
  </div>;
}
