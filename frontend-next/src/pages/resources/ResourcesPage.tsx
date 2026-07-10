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
import { AppIcon } from '../../components/icons/AppIcon';
import { resolveApiUrl } from '../../services/http';
import './ResourcesPage.css';

type ScopeKey = 'SYSTEM' | 'MERCHANT' | 'USER';
type ManageScope = 'USER' | 'MERCHANT';
type AssetModal = null | 'filter' | 'upload' | 'batch-category' | 'batch-delete' | 'category-manage';
type CategoryDialog =
  | null
  | { type: 'create-main' }
  | { type: 'create-sub'; mainId?: string | number; mainName: string; purposeKey?: string }
  | { type: 'rename-main'; id: string | number; currentName: string }
  | { type: 'rename-sub'; id: string | number; currentName: string };

type CategoryOption = {
  id?: string | number;
  main: string;
  scope?: string;
  purposeKey?: string;
  canManage?: boolean;
  subs: Array<{ id?: string | number; name: string; canManage?: boolean }>;
};

const scopeOptions: Array<{ key: ScopeKey; label: string; desc: string }> = [
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

function resourcePreviewImage(item: ResourceApiItem) {
  return resolveApiUrl(item.thumbUrl || item.previewUrl || item.imageUrl || item.url || item.downloadUrl) || '';
}

function resourceFullImage(item: ResourceApiItem) {
  return resolveApiUrl(item.imageUrl || item.url || item.downloadUrl || item.thumbUrl || item.previewUrl) || '';
}

function resourceCategoryPath(item: ResourceApiItem) {
  return `${mainName(item)} / ${subName(item) || resourceTypeName(item)}`;
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
  if (typeof item.canManage === 'boolean') return item.canManage;
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
      const existing = map.get(key) || {
        id: main.id,
        main: main.name,
        scope: main.scope,
        purposeKey: main.purposeKey || purpose.purposeKey,
        canManage: main.canManage,
        subs: [],
      };
      existing.id = existing.id || main.id;
      existing.scope = existing.scope || main.scope;
      existing.purposeKey = existing.purposeKey || main.purposeKey || purpose.purposeKey;
      existing.canManage = Boolean(existing.canManage || main.canManage);
      main.subs?.forEach((sub) => {
        const subCanManage = sub.canManage ?? main.canManage;
        if (!existing.subs.some((item) => item.name === sub.name)) {
          existing.subs.push({ id: sub.id, name: sub.name, canManage: subCanManage });
        }
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
  const [scope, setScope] = useState<ScopeKey>('SYSTEM');
  const [mainCategory, setMainCategory] = useState('');
  const [mainCategoryScope, setMainCategoryScope] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('ALL');
  const [filterMainListOpen, setFilterMainListOpen] = useState(false);
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
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialog>(null);
  const [page, setPage] = useState(1);

  async function loadCategoryTrees() {
    const trees = await Promise.all([
      fetchCategoryTree('SYSTEM'),
      fetchCategoryTree('MERCHANT'),
      fetchCategoryTree('USER'),
    ]);
    setCategoryPurposes(trees.flatMap((tree) => tree.purposes));
  }

  async function loadAssets() {
    setLoading(true);
    setError('');
    const [resourceData] = await Promise.all([
      fetchWorkbenchResources({ pageSize: 999 }),
      loadCategoryTrees(),
    ]);
    setResources(resourceData.items || []);
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
  const filterCategoryOptions = useMemo(() => categoryOptionsForScope(categoryOptions, scope), [categoryOptions, scope]);
  const visibleFilterCategoryOptions = useMemo(() => filterPurpose === 'ALL' ? filterCategoryOptions : filterCategoryOptions.filter((item) => item.purposeKey === filterPurpose), [filterCategoryOptions, filterPurpose]);
  const selectedCategory = useMemo(() => filterCategoryOptions.find((item) => item.main === mainCategory && (!mainCategoryScope || item.scope === mainCategoryScope)) || null, [filterCategoryOptions, mainCategory, mainCategoryScope]);
  const filterSubOptions = selectedCategory?.subs || [];
  const targetCategoryOptions = useMemo(() => categoryOptionsForScope(categoryOptions, targetScope), [categoryOptions, targetScope]);
  const targetSubOptions = useMemo(() => targetCategoryOptions.find((item) => item.main === targetMain)?.subs || [], [targetCategoryOptions, targetMain]);
  const managerCategoryOptions = useMemo(() => categoryOptionsForScope(flattenCategoryTrees([], categoryPurposes), managerScope), [categoryPurposes, managerScope]);
  const managerPurposeGroups = useMemo(() => purposeOptions.map((purpose) => ({
    ...purpose,
    categories: managerCategoryOptions.filter((item) => item.purposeKey === purpose.key),
  })).filter((group) => group.categories.length > 0), [managerCategoryOptions]);

  const filteredResources = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return resources.filter((item) => {
      if (item.scope !== scope) return false;
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
  const purposeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    resources.forEach((item) => {
      if (item.scope !== scope) return;
      const key = resourceType(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [resources, scope]);
  const purposeFilterOptions = useMemo(() => {
    const keys = new Set<string>();
    filterCategoryOptions.forEach((item) => {
      if (item.purposeKey) keys.add(item.purposeKey);
    });
    purposeCounts.forEach((count, key) => {
      if (count > 0) keys.add(key);
    });
    return purposeOptions.filter((item) => keys.has(item.key));
  }, [filterCategoryOptions, purposeCounts]);
  const activeFilterCount = Number(scope !== 'SYSTEM') + Number(filterPurpose !== 'ALL') + Number(Boolean(mainCategory)) + Number(Boolean(subCategory));
  const isFilterCategoryOpen = Boolean(mainCategory && selectedCategory);
  const selectedMainLabel = selectedCategory ? selectedCategory.main : '全部主分类';
  const selectedMainDesc = selectedCategory ? purposeLabel(selectedCategory.purposeKey) : `${visibleFilterCategoryOptions.length} 个主分类`;

  function closeModal() {
    setModal(null);
    setCategoryDialog(null);
    setNotice('');
  }

  function closeCategoryDialog() {
    setCategoryDialog(null);
    setNotice('');
  }

  function resetFilters() {
    setScope('SYSTEM');
    setFilterPurpose('ALL');
    setMainCategory('');
    setMainCategoryScope('');
    setSubCategory('');
    setFilterMainListOpen(false);
  }

  function selectScope(value: ScopeKey) {
    setScope(value);
    setFilterPurpose('ALL');
    setMainCategory('');
    setMainCategoryScope('');
    setSubCategory('');
    setFilterMainListOpen(false);
  }

  function selectFilterPurpose(value: string) {
    setFilterPurpose(value);
    setMainCategory('');
    setMainCategoryScope('');
    setSubCategory('');
    setFilterMainListOpen(true);
  }

  function selectFilterMain(item?: CategoryOption) {
    if (!item) {
      setMainCategory('');
      setMainCategoryScope('');
      setSubCategory('');
      setFilterMainListOpen(false);
      return;
    }
    setMainCategory(item.main);
    setMainCategoryScope(item.scope || '');
    setSubCategory('');
    setFilterMainListOpen(false);
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
    setCategoryDialog(null);
  }

  function openCreateMainDialog() {
    setNewMainName('');
    setNotice('');
    setCategoryDialog({ type: 'create-main' });
  }

  function openCreateSubDialog(main?: CategoryOption) {
    if (!main) {
      setNotice('请选择主分类后再添加子分类');
      return;
    }
    setNewSubMainId(main.id ? String(main.id) : '');
    setNewSubName('');
    setNotice('');
    setCategoryDialog({ type: 'create-sub', mainId: main.id, mainName: main.main, purposeKey: main.purposeKey });
  }

  function openRenameMainDialog(item: CategoryOption) {
    if (!item.id || !item.canManage) return;
    setRenameCategoryName(item.main);
    setNotice('');
    setCategoryDialog({ type: 'rename-main', id: item.id, currentName: item.main });
  }

  function openRenameSubDialog(sub: { id?: string | number; name: string; canManage?: boolean }) {
    if (!sub.id || !sub.canManage) return;
    setRenameCategoryName(sub.name);
    setNotice('');
    setCategoryDialog({ type: 'rename-sub', id: sub.id, currentName: sub.name });
  }

  async function reloadAfterAction() {
    await loadAssets();
  }

  async function refreshCategories() {
    await loadCategoryTrees();
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
      await refreshCategories();
      setNewMainName('');
      setCategoryDialog(null);
      setNotice('主分类已创建');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '创建主分类失败');
    } finally {
      setBusy(false);
    }
  }

  async function createSub() {
    const name = newSubName.trim();
    if (!name) {
      setNotice('请填写子分类名称');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const mainId: string | number = newSubMainId;
      if (!mainId) throw new Error('缺少主分类，无法添加子分类');
      await createSubCategory(mainId, { name });
      await refreshCategories();
      setNewSubName('');
      setNewSubMainId('');
      setCategoryDialog(null);
      setNotice('子分类已创建');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '创建子分类失败');
    } finally {
      setBusy(false);
    }
  }

  async function renameCategory() {
    if (!categoryDialog || (categoryDialog.type !== 'rename-main' && categoryDialog.type !== 'rename-sub')) return;
    const name = renameCategoryName.trim();
    if (!name) {
      setNotice('分类名称不能为空');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      if (categoryDialog.type === 'rename-main') {
        await updateMainCategory(categoryDialog.id, { name });
        if (mainCategory === categoryDialog.currentName) setMainCategory(name);
        if (targetMain === categoryDialog.currentName) setTargetMain(name);
        setNotice('主分类已重命名');
      } else {
        await updateSubCategory(categoryDialog.id, { name });
        if (subCategory === categoryDialog.currentName) setSubCategory(name);
        if (targetSub === categoryDialog.currentName) setTargetSub(name);
        setNotice('子分类已重命名');
      }
      setCategoryDialog(null);
      await reloadAfterAction();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '重命名失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteMain(item: CategoryOption) {
    if (!item.id || !item.canManage) return;
    if (!window.confirm(`确认删除主分类“${item.main}”？`)) return;
    setBusy(true);
    setNotice('');
    try {
      await updateMainCategory(item.id, { status: 'DELETED' });
      if (mainCategory === item.main) {
        setMainCategory('');
        setMainCategoryScope('');
        setSubCategory('');
      }
      if (targetMain === item.main) {
        setTargetMain('');
        setTargetSub('');
      }
      await reloadAfterAction();
      setNotice('主分类已删除');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '删除主分类失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSub(sub: { id?: string | number; name: string; canManage?: boolean }) {
    if (!sub.id || !sub.canManage) return;
    if (!window.confirm(`确认删除子分类“${sub.name}”？`)) return;
    setBusy(true);
    setNotice('');
    try {
      await updateSubCategory(sub.id, { status: 'DELETED' });
      if (subCategory === sub.name) setSubCategory('');
      if (targetSub === sub.name) setTargetSub('');
      await reloadAfterAction();
      setNotice('子分类已删除');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : '删除子分类失败');
    } finally {
      setBusy(false);
    }
  }

  const filterSheet = (
    <aside className={`assetFilterSheet ${modal === 'filter' ? 'isOpen' : ''}`.trim()} aria-hidden={modal !== 'filter'}>
      <div className="assetFilterHead assetFilterHero">
        <div><span>筛选</span><b>高级筛选</b></div>
        <button type="button" aria-label="关闭高级筛选" onClick={closeModal}>×</button>
      </div>
      <section className="assetFilterSpace">
        <h3>空间</h3>
        <div>{scopeOptions.map((item) => <button key={item.key} className={scope === item.key ? 'isActive' : ''} type="button" onClick={() => selectScope(item.key)}><span>{item.label}</span></button>)}</div>
      </section>
      {purposeFilterOptions.length > 0 && <section className="assetFilterBlock">
        <h3>用途</h3>
        <div className="assetPurposePills"><button type="button" className={filterPurpose === 'ALL' ? 'isActive' : ''} onClick={() => selectFilterPurpose('ALL')}><span>全部用途</span></button>{purposeFilterOptions.map((item) => <button key={item.key} type="button" className={filterPurpose === item.key ? 'isActive' : ''} onClick={() => selectFilterPurpose(item.key)}><span>{item.label}</span></button>)}</div>
      </section>}
      <section className="assetFilterTwoCols">
        <div className="assetFilterColumn">
          <h3>主分类</h3>
          <div className="assetFilterList">
            <button className={`assetFilterDropdownTrigger ${filterMainListOpen ? 'isOpen' : ''} ${!mainCategory ? 'isActive' : ''}`.trim()} type="button" onClick={() => setFilterMainListOpen((value) => !value)}>
              <span>{selectedMainLabel}</span>
              <small>{selectedMainDesc}</small>
              <i><AppIcon name="chevronDown" /></i>
            </button>
            {filterMainListOpen && <div className="assetFilterDropdownMenu">
              <button className={!mainCategory ? 'isActive' : ''} type="button" onClick={() => selectFilterMain()}><span>全部主分类</span><small>不限制主分类</small></button>
              {visibleFilterCategoryOptions.length ? visibleFilterCategoryOptions.map((item) => {
                const active = mainCategory === item.main && mainCategoryScope === (item.scope || '');
                return <button key={categoryKey(item)} className={active ? 'isActive' : ''} type="button" onClick={() => selectFilterMain(item)}><span>{item.main}</span><small>{purposeLabel(item.purposeKey)}</small></button>;
              }) : <span>暂无主分类</span>}
            </div>}
          </div>
        </div>
        <div className={`assetFilterColumn ${isFilterCategoryOpen ? 'isOpen' : ''}`.trim()}>
          <h3>子分类</h3>
          <div className="assetFilterList">{isFilterCategoryOpen ? <><button className={!subCategory ? 'isActive' : ''} type="button" onClick={() => setSubCategory('')}><span>全部子分类</span></button>{filterSubOptions.length ? filterSubOptions.map((item) => <button key={item.name} className={subCategory === item.name ? 'isActive' : ''} type="button" onClick={() => setSubCategory(item.name)}><span>{item.name}</span></button>) : <span>暂无子分类</span>}</> : <span>先从“全部主分类”中选择主分类</span>}</div>
        </div>
      </section>
      <div className="assetFilterActions"><button type="button" onClick={resetFilters}>重置</button><button type="button" onClick={closeModal}>应用</button></div>
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

    {modal === 'upload' && <aside className="assetActionSheet isOpen"><div className="assetFilterHead"><div><span>上传资产</span><b>上传图片并保存为资产</b></div><button type="button" onClick={closeModal}>×</button></div><div className="assetFormGrid"><label><span>选择图片</span><input type="file" accept="image/*" multiple onChange={handleUploadFiles} /></label><label><span>统一名称（可选）</span><input value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="不填则使用文件名" /></label>{categoryFields}</div>{notice && <p className="assetNotice">{notice}</p>}<div className="assetFilterActions"><button type="button" onClick={closeModal}>取消</button><button type="button" disabled={busy} onClick={uploadAssets}>{busy ? '上传中...' : `上传 ${uploadFiles.length || ''}`}</button></div></aside>}

    {modal === 'batch-category' && <aside className="assetActionSheet isOpen"><div className="assetFilterHead"><div><span>批量分类</span><b>已选择 {selectedItems.length} 项资产</b></div><button type="button" onClick={closeModal}>×</button></div><div className="assetFormGrid">{categoryFields}</div>{notice && <p className="assetNotice">{notice}</p>}<div className="assetFilterActions"><button type="button" onClick={closeModal}>取消</button><button type="button" disabled={busy} onClick={applyBatchCategory}>{busy ? '处理中...' : '变更分类'}</button></div></aside>}

    {modal === 'batch-delete' && <aside className="assetActionSheet isOpen"><div className="assetFilterHead"><div><span>批量删除</span><b>确认删除 {selectedItems.length} 项资产</b></div><button type="button" onClick={closeModal}>×</button></div><p className="assetDangerText">删除后这些资产将从资产库移除，该操作会调用后端删除接口。</p>{notice && <p className="assetNotice">{notice}</p>}<div className="assetFilterActions"><button type="button" onClick={closeModal}>取消</button><button className="danger" type="button" disabled={busy} onClick={applyBatchDelete}>{busy ? '删除中...' : '确认删除'}</button></div></aside>}

    {modal === 'category-manage' && <aside className="assetCategoryManageSheet isOpen">
      <div className="assetCategoryManageHead">
        <div><span>分类管理</span><b>{managerScope === 'MERCHANT' ? '门店空间' : '个人空间'}</b></div>
        <div className="assetCategoryManageTools"><select value={managerScope} onChange={(event) => setManagerScopeAndReset(event.target.value as ManageScope)}>{manageScopeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><button className="assetCreateMainButton" type="button" onClick={openCreateMainDialog}><AppIcon name="plus" />创建主分类</button><button className="assetSheetClose" type="button" aria-label="关闭分类管理" onClick={closeModal}>×</button></div>
      </div>
      {notice && <p className="assetNotice">{notice}</p>}
      <div className="assetCategoryManageBody">{managerPurposeGroups.length ? managerPurposeGroups.map((group) => <section className="assetCategoryPurposeGroup" key={group.key}><header><h3>{group.label}</h3><span>{group.categories.length} 个主分类</span></header><div className="assetCategoryCardGrid">{group.categories.map((item, index) => <article className="assetCategoryManageCard" key={`${item.scope}-${item.main}`}><header><div><em>#{index + 1}</em><b title={item.main}>{item.main}</b></div><div className="assetCategoryCardActions">{item.canManage && item.id && <><button type="button" aria-label="重命名主分类" disabled={busy} onClick={() => openRenameMainDialog(item)}><AppIcon name="edit" /></button><button type="button" aria-label="删除主分类" disabled={busy} onClick={() => deleteMain(item)}><AppIcon name="trash" /></button></>}</div></header><div className="assetCategorySubList">{item.subs.length ? item.subs.map((sub, subIndex) => <p key={sub.name}><span><AppIcon name="grip" />{sub.name}</span><em>#{subIndex + 1}</em>{sub.canManage && sub.id && <button type="button" aria-label="重命名子分类" disabled={busy} onClick={() => openRenameSubDialog(sub)}><AppIcon name="edit" /></button>}{sub.canManage && sub.id && <button type="button" aria-label="删除子分类" disabled={busy} onClick={() => deleteSub(sub)}><AppIcon name="trash" /></button>}</p>) : <i>暂无子分类</i>}<button className="assetAddSubInline" type="button" disabled={busy} onClick={() => openCreateSubDialog(item)}><AppIcon name="plus" />添加子分类</button></div></article>)}</div></section>) : <div className="assetCategoryEmpty">当前空间暂无分类，可点击上方创建主分类。</div>}</div>
    </aside>}

    {categoryDialog && <div className="assetDialogLayer"><button className="assetDialogBackdrop" type="button" aria-label="关闭分类弹窗" onClick={closeCategoryDialog} /><section className="assetCategoryDialog" role="dialog" aria-modal="true"><div className="assetCategoryDialogHead"><div><span>{categoryDialog.type === 'create-main' ? '创建主分类' : categoryDialog.type === 'create-sub' ? '创建子分类' : '重命名分类'}</span><b>{managerScope === 'MERCHANT' ? '门店空间' : '个人空间'}</b></div><button type="button" aria-label="关闭" onClick={closeCategoryDialog}>×</button></div>{categoryDialog.type === 'create-main' ? <div className="assetCategoryDialogForm"><label><span>功能用途</span><select value={newMainPurpose} onChange={(event) => setNewMainPurpose(event.target.value)}>{purposeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label><span>主分类名称</span><input value={newMainName} onChange={(event) => setNewMainName(event.target.value)} placeholder="输入主分类名称" /></label><div><button type="button" onClick={closeCategoryDialog}>取消</button><button type="button" disabled={busy} onClick={createMain}>{busy ? '创建中...' : '确认创建'}</button></div></div> : categoryDialog.type === 'create-sub' ? <div className="assetCategoryDialogForm"><label><span>所属主分类</span><input value={categoryDialog.mainName} readOnly /></label><label><span>子分类名称</span><input value={newSubName} onChange={(event) => setNewSubName(event.target.value)} placeholder="输入子分类名称" /></label><div><button type="button" onClick={closeCategoryDialog}>取消</button><button type="button" disabled={busy} onClick={createSub}>{busy ? '创建中...' : '确认创建'}</button></div></div> : <div className="assetCategoryDialogForm"><label><span>{categoryDialog.type === 'rename-main' ? '主分类名称' : '子分类名称'}</span><input value={renameCategoryName} onChange={(event) => setRenameCategoryName(event.target.value)} placeholder="输入新的分类名称" /></label><div><button type="button" onClick={closeCategoryDialog}>取消</button><button type="button" disabled={busy} onClick={renameCategory}>{busy ? '保存中...' : '确认重命名'}</button></div></div>}</section></div>}

    <main className="assetMainPanel">
      {selectedItems.length > 0 ? <section className="assetBatchBar"><b>已选择 {selectedItems.length} 项资产</b><button type="button" onClick={() => setModal('batch-category')}>批量分类变更</button><button type="button" onClick={() => setModal('batch-delete')}>批量删除</button><button type="button" onClick={clearSelection}>取消选择</button></section> : <section className="assetSearchBar" aria-label="资产搜索与筛选">
        <div className="assetSearchTop">
          <label className="assetSearchInput"><span>搜索资产</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入资产名称" /></label>
          <div className="assetSearchActions"><button className="assetSearchActionButton" type="button" onClick={() => setModal('category-manage')}>分类管理</button><button className="assetSearchActionButton" type="button" onClick={() => setModal('upload')}>上传</button></div>
        </div>
        <div className="assetFilterRow">
          <div className="assetSpaceTabs" aria-label="资产空间">
            <button className={scope === 'SYSTEM' ? 'isActive' : ''} type="button" onClick={() => selectScope('SYSTEM')}>系统空间</button>
            <button className={scope === 'MERCHANT' ? 'isActive' : ''} type="button" onClick={() => selectScope('MERCHANT')}>门店空间</button>
            <button className={scope === 'USER' ? 'isActive' : ''} type="button" onClick={() => selectScope('USER')}>我的空间</button>
          </div>
          <label className="assetInlineSelect"><select aria-label="主分类" value={selectedCategory ? categoryKey(selectedCategory) : ''} onChange={(event) => { const option = visibleFilterCategoryOptions.find((item) => categoryKey(item) === event.target.value); selectFilterMain(option); }}><option value="">主分类</option>{visibleFilterCategoryOptions.map((item) => <option key={categoryKey(item)} value={categoryKey(item)}>{item.main}</option>)}</select></label>
          <label className="assetInlineSelect"><select aria-label="子分类" value={subCategory} disabled={!selectedCategory} onChange={(event) => setSubCategory(event.target.value)}><option value="">子分类</option>{filterSubOptions.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
        </div>
      </section>}
      {notice && !modal && <div className="assetNotice">{notice}</div>}
      {error && <div className="assetStateCard isError">{error}</div>}
      {!error && loading && <div className="assetStateCard">正在读取后端资产库...</div>}
      {!error && !loading && filteredResources.length === 0 && <div className="assetStateCard">暂无匹配资产，可修改搜索词或高级筛选条件。</div>}
      <section className="assetGrid" aria-label="资产列表">
        {pagedResources.map((item) => {
          const img = resourcePreviewImage(item);
          const id = String(item.id);
          const manageable = canManageResource(item);
          return <article className="assetCard" key={id} onClick={() => setSelected(item)}>
            {manageable && <label className="assetSelectBox" title="选择资产" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.has(id)} onChange={(event) => toggleSelect(item, event.target.checked)} /><span /></label>}
            <div className="assetImageBox">{img ? <img src={img} alt={resourceName(item)} loading="lazy" decoding="async" /> : <span>{resourceTypeName(item)}</span>}</div>
            <div className="assetCardInfo"><b title={resourceName(item)}>{resourceName(item)}</b><p title={resourceCategoryPath(item)}>{resourceCategoryPath(item)}</p></div>
          </article>;
        })}
      </section>
      {!error && !loading && filteredResources.length > ASSET_PAGE_SIZE && <nav className="assetPager" aria-label="资产分页"><span>第 {safePage} / {totalPages} 页，共 {filteredResources.length} 张</span><div><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button type="button" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div></nav>}
    </main>

    {selected && <button className="assetOverlay" type="button" aria-label="关闭资产详情" onClick={() => setSelected(null)} />}
    {selected && <aside className="assetDetailDrawer"><div className="assetDetailHead"><div><span>资产详情</span><b>{resourceName(selected)}</b></div><button type="button" onClick={() => setSelected(null)}>×</button></div><div className="assetDetailImage">{resourceFullImage(selected) ? <img src={resourceFullImage(selected)} alt={resourceName(selected)} /> : <span>{resourceTypeName(selected)}</span>}</div>{canManageResource(selected) && <div className="assetDetailEdit"><label><span>资产名称</span><input value={detailName} onChange={(event) => setDetailName(event.target.value)} /></label><button type="button" disabled={busy} onClick={saveDetailName}>重命名</button></div>}<dl className="assetDetailMeta"><dt>权限</dt><dd>{scopeName(selected.scope)}</dd><dt>类型</dt><dd>{resourceTypeName(selected)}</dd><dt>主分类</dt><dd>{mainName(selected)}</dd><dt>子分类</dt><dd>{subName(selected) || '无'}</dd><dt>创建时间</dt><dd>{formatDate(selected.createdAt)}</dd></dl>{notice && <p className="assetNotice">{notice}</p>}{resourceFullImage(selected) && <a className="assetDetailDownload" href={resourceFullImage(selected)} target="_blank" rel="noreferrer">打开原图</a>}</aside>}
  </div>;
}
