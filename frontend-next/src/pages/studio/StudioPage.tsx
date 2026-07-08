import { type ChangeEvent, type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StudioCanvasPanel } from './StudioCanvasPanel';
import { StudioSettingsPanel } from './StudioSettingsPanel';
import type { StudioLocalImage, StudioRecentTask } from './studioViewTypes';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import {
  demoResources,
  featureBranches,
  promoOptionChoices,
  ratioOptions,
  resourceCategories,
  resourceScopes,
  resolutionOptions,
  studioFeatures,
  type FeatureGroup,
  type StudioFeatureKey,
} from './studioData';
import {
  createAiTask,
  fetchAiTaskStatus,
  fetchRecentAiTasks,
  fetchWorkbenchResources,
  uploadImage,
  type AiTask,
  type ImageUploadResult,
  type ResourceApiItem,
} from '../../services/studio.api';
import { resolveApiUrl } from '../../services/http';
import { getCurrentUserSnapshot } from '../../stores/auth.store';
import './StudioPage.css';
import './StudioControls.css';

type LocalImage = StudioLocalImage;
type RecentTask = StudioRecentTask;

const MAX_REFERENCE_IMAGES = 9;
const DEFAULT_QUOTA = 0;

function localPreview(file: File): LocalImage {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    status: 'uploading',
  };
}

function imageUrlFromUpload(result: ImageUploadResult, fallback: string) {
  return resolveApiUrl(result.previewUrl || result.thumbUrl || result.imageUrl || result.url) || fallback;
}

function isAuthRequiredMessage(message: string) {
  return /401|未登录|登录已过期/.test(message);
}

function taskToRecent(task: AiTask): RecentTask {
  return {
    id: task.id,
    feature: task.featureName || task.featureKey || task.kind || 'AI 任务',
    status: task.statusLabel || task.status || '未知',
    resolution: task.resolution || '2K',
    ratio: task.ratio || '自适应',
    time: task.finishedAt ? '已完成' : task.submittedAt || task.createdAt ? new Date(task.submittedAt || task.createdAt || '').toLocaleTimeString() : '刚刚',
    previewUrl: resolveApiUrl(task.previewUrl || task.thumbUrl || task.resultUrl || task.url) || '',
    raw: task,
  };
}

function resourceName(item: ResourceApiItem) {
  return item.name || item.resourceName || item.originalName || item.id;
}

function resourceImageUrl(item: ResourceApiItem) {
  return resolveApiUrl(item.thumbUrl || item.imageUrl || item.url) || '';
}

function resourceSnapshot(item: ResourceApiItem | null) {
  if (!item) return null;
  return {
    id: String(item.id),
    resourceId: String(item.id),
    imageId: item.imageId || String(item.id),
    name: String(resourceName(item)),
    url: item.url || item.imageUrl || '',
    imageUrl: item.imageUrl || item.url || '',
    resourceType: item.resourceType || '',
    mainCategoryName: item.mainCategoryName || '',
    subCategoryName: item.subCategoryName || '',
    source: 'resource',
  };
}

export function StudioPage() {
  const { isMobile } = useBreakpoint();
  const featureButtonRef = useRef<HTMLButtonElement>(null);
  const [featureGroup, setFeatureGroup] = useState<FeatureGroup>('base');
  const [featureKey, setFeatureKey] = useState<StudioFeatureKey>('material');
  const [featureDrawerOpen, setFeatureDrawerOpen] = useState(false);
  const [featurePickerGroup, setFeaturePickerGroup] = useState<FeatureGroup | null>(null);
  const [sourceImage, setSourceImage] = useState<LocalImage | null>(null);
  const [referenceImages, setReferenceImages] = useState<LocalImage[]>([]);
  const [draggingSource, setDraggingSource] = useState(false);
  const [draggingRef, setDraggingRef] = useState(false);
  const [message, setMessage] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [resolution, setResolution] = useState('2K');
  const [ratio, setRatio] = useState('自适应');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [resourceScope, setResourceScope] = useState('SYSTEM');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [resourceItems, setResourceItems] = useState<ResourceApiItem[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState('');
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const [removeMirror, setRemoveMirror] = useState(false);
  const [enhanceFocus, setEnhanceFocus] = useState(true);
  const [enhanceAngle, setEnhanceAngle] = useState('不变');
  const [multiView, setMultiView] = useState('三角度视图');
  const [quota, setQuota] = useState(() => Number(getCurrentUserSnapshot()?.quota ?? DEFAULT_QUOTA));
  const [isGenerating, setIsGenerating] = useState(false);
  const [promoOptions, setPromoOptions] = useState({
    mainBackground: promoOptionChoices.mainBackground[0],
    mainComposition: promoOptionChoices.mainComposition[0],
    mainWhitespace: promoOptionChoices.mainWhitespace[0],
    posterTextMode: promoOptionChoices.posterTextMode[0],
    posterText: '',
    posterCopyPlacement: promoOptionChoices.posterCopyPlacement[0],
    posterTone: promoOptionChoices.posterTone[0],
    detailLayout: promoOptionChoices.detailLayout[0],
    detailFocus: promoOptionChoices.detailFocus[0],
    detailTextMode: promoOptionChoices.detailTextMode[0],
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  const currentFeature = studioFeatures.find((item) => item.key === featureKey) || studioFeatures[0];
  const visibleFeatures = studioFeatures.filter((item) => item.group === (featurePickerGroup || featureGroup));
  const currentCategory = resourceCategories.find((item) => item.name === mainCategory);
  const currentSubOptions = currentCategory?.subs || [];
  const isPromotionSelected = currentFeature.group === 'promotion';
  const needsResourceLibrary = featureKey === 'material' || featureKey === 'replace_bg';
  const selectedResourceItem = resourceItems.find((item) => String(item.id) === selectedResource) || null;

  const filteredDemoResources = useMemo(() => {
    const targetType = featureKey === 'replace_bg' ? '场景' : '材质';
    return demoResources.filter((item) => {
      if (needsResourceLibrary && item.type !== targetType) return false;
      if (resourceScope !== 'ALL' && item.scope !== resourceScope) return false;
      if (mainCategory && item.mainCategory !== mainCategory) return false;
      if (subCategory && item.subCategory !== subCategory) return false;
      if (resourceKeyword.trim()) {
        const keyword = resourceKeyword.trim().toLowerCase();
        return `${item.name}${item.mainCategory}${item.subCategory}${item.tone}`.toLowerCase().includes(keyword);
      }
      return true;
    });
  }, [featureKey, mainCategory, needsResourceLibrary, resourceKeyword, resourceScope, subCategory]);

  const closeFeatureDrawer = useCallback(() => {
    setFeatureDrawerOpen(false);
    if (isMobile) window.requestAnimationFrame(() => featureButtonRef.current?.focus());
  }, [isMobile]);

  useEffect(() => {
    let cancelled = false;
    fetchRecentAiTasks({ pageSize: 20 })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.items;
        if (!cancelled) setRecentTasks((items || []).map(taskToRecent));
      })
      .catch((error: Error) => {
        if (!cancelled && !isAuthRequiredMessage(error.message)) setMessage(`最近任务加载失败：${error.message}`);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!needsResourceLibrary) return;
    let cancelled = false;
    setResourceLoading(true);
    setResourceError('');
    fetchWorkbenchResources({
      keyword: resourceKeyword,
      resourceType: featureKey === 'replace_bg' ? 'scene' : 'material',
    })
      .then((data) => {
        if (cancelled) return;
        setResourceItems(data.items || []);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setResourceItems([]);
        setResourceError(error.message || '资源加载失败');
      })
      .finally(() => {
        if (!cancelled) setResourceLoading(false);
      });
    return () => { cancelled = true; };
  }, [featureKey, needsResourceLibrary, resourceKeyword]);

  useEffect(() => {
    if (!featureDrawerOpen && !featurePickerGroup) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFeaturePickerGroup(null);
        closeFeatureDrawer();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closeFeatureDrawer, featureDrawerOpen, featurePickerGroup]);

  function selectGroup(group: FeatureGroup) {
    if (group === 'video') {
      setMessage('宣传短视频正在开发中');
      return;
    }
    setFeatureGroup(group);
    const nextFeature = studioFeatures.find((item) => item.group === group);
    if (nextFeature) setFeatureKey(nextFeature.key);
    setSelectedResource('');
    setMessage('');
    setFeaturePickerGroup(null);
    closeFeatureDrawer();
  }

  function openFeatureGroup(group: FeatureGroup) {
    if (group === 'video') {
      setMessage('宣传短视频正在开发中');
      return;
    }
    if (isMobile) {
      selectGroup(group);
      return;
    }
    setFeaturePickerGroup((current) => current === group ? null : group);
  }

  function chooseFeature(key: StudioFeatureKey) {
    const nextFeature = studioFeatures.find((item) => item.key === key);
    if (nextFeature) setFeatureGroup(nextFeature.group);
    setFeatureKey(key);
    setSelectedResource('');
    setMessage('');
    setFeaturePickerGroup(null);
    closeFeatureDrawer();
  }

  async function uploadOne(file: File, target: 'source' | 'reference') {
    const local = localPreview(file);
    if (target === 'source') setSourceImage(local);
    else setReferenceImages((current) => [...current, local].slice(0, MAX_REFERENCE_IMAGES));

    try {
      const uploaded = await uploadImage(file);
      const imageId = uploaded.imageId || uploaded.id;
      const ready: LocalImage = {
        ...local,
        id: imageId || local.id,
        imageId,
        name: uploaded.originalName || local.name,
        url: imageUrlFromUpload(uploaded, local.url),
        status: 'ready',
      };
      if (target === 'source') setSourceImage(ready);
      else setReferenceImages((current) => current.map((item) => item.id === local.id ? ready : item));
      setMessage(target === 'source' ? '产品原图已上传' : '参考图已上传');
    } catch (error) {
      const failed: LocalImage = { ...local, status: 'failed' };
      if (target === 'source') setSourceImage(failed);
      else setReferenceImages((current) => current.map((item) => item.id === local.id ? failed : item));
      setMessage(`图片上传失败：${error instanceof Error ? error.message : '请重新上传'}`);
    }
  }

  function applyFiles(files: FileList | File[], target: 'source' | 'reference') {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      setMessage('请选择图片文件');
      return;
    }
    if (target === 'source') {
      void uploadOne(images[0], 'source');
      return;
    }
    const slots = MAX_REFERENCE_IMAGES - referenceImages.length;
    images.slice(0, Math.max(0, slots)).forEach((file) => void uploadOne(file, 'reference'));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>, target: 'source' | 'reference') {
    if (event.target.files) applyFiles(event.target.files, target);
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLElement>, target: 'source' | 'reference') {
    event.preventDefault();
    if (target === 'source') setDraggingSource(true);
    else setDraggingRef(true);
  }

  function handleDragLeave(target: 'source' | 'reference') {
    if (target === 'source') setDraggingSource(false);
    else setDraggingRef(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>, target: 'source' | 'reference') {
    event.preventDefault();
    setDraggingSource(false);
    setDraggingRef(false);
    if (event.dataTransfer.files) applyFiles(event.dataTransfer.files, target);
  }

  function removeReference(id: string) {
    setReferenceImages((current) => current.filter((item) => item.id !== id));
  }

  function buildOptions() {
    if (featureKey === 'remove_bg') return { whiteBg: removeWhiteBg, mirror: removeMirror };
    if (featureKey === 'enhance') return { focus: enhanceFocus, angle: enhanceAngle };
    if (featureKey === 'multiview') return { view: multiView };
    if (featureKey === 'promo_main_image') return {
      mainBackground: promoOptions.mainBackground,
      mainComposition: promoOptions.mainComposition,
      mainWhitespace: promoOptions.mainWhitespace,
    };
    if (featureKey === 'promo_poster_image') return {
      posterTextMode: promoOptions.posterTextMode,
      posterText: promoOptions.posterText,
      posterCopyPlacement: promoOptions.posterCopyPlacement,
      posterTone: promoOptions.posterTone,
    };
    if (featureKey === 'promo_detail_image') return {
      detailLayout: promoOptions.detailLayout,
      detailFocus: promoOptions.detailFocus,
      detailTextMode: promoOptions.detailTextMode,
    };
    return {};
  }

  async function pollTask(taskId: string) {
    for (let index = 0; index < 20; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, index < 2 ? 1200 : 2500));
      try {
        const status = await fetchAiTaskStatus(taskId);
        if (status.user?.quota !== undefined) setQuota(Number(status.user.quota));
        setRecentTasks((current) => current.map((item) => item.id === taskId ? taskToRecent(status) : item));
        if (['succeeded', 'failed'].includes(String(status.status))) return;
      } catch (error) {
        setMessage(`任务状态查询失败：${error instanceof Error ? error.message : '请稍后刷新'}`);
        return;
      }
    }
  }

  async function generateTask() {
    if (!sourceImage?.imageId) {
      setMessage(sourceImage?.status === 'uploading' ? '产品原图正在上传，请稍后' : '请先上传产品原图');
      return;
    }
    if (needsResourceLibrary && !selectedResourceItem) {
      setMessage(featureKey === 'replace_bg' ? '请先选择场景资源' : '请先选择材质资源');
      return;
    }
    const uploadingRef = referenceImages.find((item) => item.status === 'uploading');
    if (uploadingRef) {
      setMessage('参考图正在上传，请稍后');
      return;
    }
    setIsGenerating(true);
    setMessage('正在提交生成任务...');
    try {
      const task = await createAiTask({
        featureKey,
        imageA: { imageId: sourceImage.imageId, url: sourceImage.url, name: sourceImage.name },
        selectedResource: resourceSnapshot(selectedResourceItem),
        selectedResourceId: selectedResourceItem ? String(selectedResourceItem.id) : undefined,
        userReferenceImageIds: referenceImages.map((item) => item.imageId).filter(Boolean) as string[],
        referenceImageIds: referenceImages.map((item) => item.imageId).filter(Boolean) as string[],
        resolution,
        ratio,
        userPrompt: customPrompt,
        customText: customPrompt,
        options: buildOptions(),
      });
      if (task.user?.quota !== undefined) setQuota(Number(task.user.quota));
      setRecentTasks((current) => [taskToRecent(task), ...current.filter((item) => item.id !== task.id)].slice(0, 8));
      setMessage('任务已提交，正在生成');
      void pollTask(task.id);
    } catch (error) {
      setMessage(`任务提交失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setIsGenerating(false);
    }
  }

  function optionSelect(label: string, key: keyof typeof promoOptions, choices: string[]) {
    return (
      <label className="studioField">
        <span>{label}</span>
        <select value={promoOptions[key]} onChange={(event) => setPromoOptions((current) => ({ ...current, [key]: event.target.value }))}>
          {choices.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    );
  }

  function renderResourceCard(item: ResourceApiItem) {
    const title = String(resourceName(item));
    const img = resourceImageUrl(item);
    return (
      <button key={String(item.id)} type="button" className={selectedResource === String(item.id) ? 'studioResourceCard isActive' : 'studioResourceCard'} onClick={() => setSelectedResource(String(item.id))}>
        {img ? <img src={img} alt={title} loading="lazy" decoding="async" /> : <i>{item.resourceType || (featureKey === 'replace_bg' ? '场景' : '材质')}</i>}
        <b>{title}</b>
        <span>{item.scope === 'SYSTEM' ? '系统资源' : item.scope === 'USER' ? '个人资源' : '用户资源'} / {item.mainCategoryName || item.objectName || '未分类'}{item.subCategoryName || item.colorName ? ` / ${item.subCategoryName || item.colorName}` : ''}</span>
      </button>
    );
  }

  function renderLeftConfig() {
    if (featureKey === 'material' || featureKey === 'replace_bg') {
      return (
        <>
          <div className="studioDescRow"><span>✓</span><p>{currentFeature.desc}</p></div>
          <div className="studioSearchBox"><input value={resourceKeyword} onChange={(event) => setResourceKeyword(event.target.value)} placeholder="搜索资源..." /></div>
          <div className="studioFilterStack">
            <select value={resourceScope} onChange={(event) => setResourceScope(event.target.value)}>
              {resourceScopes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={mainCategory} onChange={(event) => { setMainCategory(event.target.value); setSubCategory(''); }}>
              <option value="">全部主分类</option>
              {resourceCategories.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
            <select value={subCategory} disabled={!mainCategory || !currentSubOptions.length} onChange={(event) => setSubCategory(event.target.value)}>
              <option value="">全部子分类</option>
              {currentSubOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="studioSectionLabel">{featureKey === 'replace_bg' ? '场景融合资源' : '材质替换'}</div>
          <div className="studioResourceGrid">
            <button className="studioUploadResource" type="button" onClick={() => setMessage('资源上传入口将在资源库页面接入')}>
              <span>+</span><b>上传</b>
            </button>
            {resourceItems.map(renderResourceCard)}
            {!resourceLoading && !resourceItems.length && resourceError && filteredDemoResources.map((item) => <button key={item.id} type="button" className="studioResourceCard" onClick={() => setMessage('当前展示的是本地示例资源，请登录后加载真实资源')}><i>{item.type}</i><b>{item.name}</b><span>{item.scope === 'SYSTEM' ? '系统资源' : item.scope === 'USER' ? '个人资源' : '用户资源'} / {item.mainCategory} / {item.subCategory}</span></button>)}
            {resourceLoading && <div className="studioLibraryEmpty">资源加载中...</div>}
            {!resourceLoading && !resourceItems.length && !resourceError && <div className="studioLibraryEmpty">暂无匹配资源，可切换分类或点击加号上传</div>}
            {!resourceLoading && resourceError && filteredDemoResources.length === 0 && <div className="studioLibraryEmpty">资源加载失败：{resourceError}</div>}
          </div>
        </>
      );
    }

    if (featureKey === 'remove_bg') {
      return <><div className="studioDescRow"><span>3D</span><p>{currentFeature.desc}</p></div><div className="studioConfigTitle">生成配置</div><div className="studioOptionCard"><label className="studioOptionRow"><span><b>白底图</b><em>纯白干净背景</em></span><input type="checkbox" checked={removeWhiteBg} onChange={(event) => setRemoveWhiteBg(event.target.checked)} /></label><label className="studioOptionRow"><span><b>镜像产品</b><em>生成镜像感的产品图</em></span><input type="checkbox" checked={removeMirror} onChange={(event) => setRemoveMirror(event.target.checked)} /></label></div></>;
    }

    if (featureKey === 'enhance') {
      return <><div className="studioDescRow"><span>●</span><p>{currentFeature.desc}</p></div><div className="studioConfigTitle">摄影增强选项</div><div className="studioOptionCard"><label className="studioOptionRow"><span><b>产品聚焦</b><em>开启后突出产品并增强背景虚化</em></span><input type="checkbox" checked={enhanceFocus} onChange={(event) => setEnhanceFocus(event.target.checked)} /></label><div className="studioPillGroup"><b>角度</b><div>{['不变', '正面', '45度', '侧面'].map((item) => <button key={item} type="button" className={enhanceAngle === item ? 'isActive' : ''} onClick={() => setEnhanceAngle(item)}>{item}</button>)}</div></div></div></>;
    }

    if (featureKey === 'lineart') return <div className="studioDescRow studioOnlyDesc"><span>≈</span><p>{currentFeature.desc}</p></div>;

    if (featureKey === 'multiview') {
      return <><div className="studioDescRow"><span>●</span><p>{currentFeature.desc}</p></div><div className="studioConfigTitle">视图选项</div><div className="studioOptionCard studioRadioList">{['三角度视图', '四角度视图'].map((item) => <label key={item}><span><b>{item}</b><em>{item === '三角度视图' ? '正面、45度角、侧面' : '正面、45度角、侧面、背面'}</em></span><input type="radio" checked={multiView === item} onChange={() => setMultiView(item)} /></label>)}</div></>;
    }

    if (featureKey === 'promo_main_image') return <div className="studioPromoForm">{optionSelect('背景风格', 'mainBackground', promoOptionChoices.mainBackground)}{optionSelect('主图构图', 'mainComposition', promoOptionChoices.mainComposition)}{optionSelect('留白要求', 'mainWhitespace', promoOptionChoices.mainWhitespace)}</div>;
    if (featureKey === 'promo_poster_image') return <div className="studioPromoForm">{optionSelect('海报文字', 'posterTextMode', promoOptionChoices.posterTextMode)}{promoOptions.posterTextMode === '使用自定义文案' && <label className="studioField"><span>文案内容</span><textarea value={promoOptions.posterText} onChange={(event) => setPromoOptions((current) => ({ ...current, posterText: event.target.value }))} placeholder={'例如：舒适入座\n自然木质'} /></label>}{optionSelect('文案区域', 'posterCopyPlacement', promoOptionChoices.posterCopyPlacement)}{optionSelect('海报氛围', 'posterTone', promoOptionChoices.posterTone)}</div>;
    return <div className="studioPromoForm">{optionSelect('细节排版', 'detailLayout', promoOptionChoices.detailLayout)}{optionSelect('细节重点', 'detailFocus', promoOptionChoices.detailFocus)}{optionSelect('文字策略', 'detailTextMode', promoOptionChoices.detailTextMode)}</div>;
  }

  return (
    <div className="studioPage">
      {featureDrawerOpen && <button className="studioDrawerBackdrop" type="button" aria-label="关闭功能与资源" onClick={closeFeatureDrawer} />}
      <section className="studioLayoutPc">
        <aside id="studio-feature-panel" className={`studioSidePanel studioLeftPanel ${featureDrawerOpen ? 'isFeatureOpen' : ''}`.trim()} aria-hidden={isMobile && !featureDrawerOpen} inert={isMobile && !featureDrawerOpen}>
          <div className="studioMobileDrawerHead"><div><span>{featureGroup === 'base' ? '生图功能' : '宣传图'}</span><b>{currentFeature.label}</b></div><button type="button" aria-label="关闭功能与资源" onClick={closeFeatureDrawer}>×</button></div>
          <div className="studioBranchTabs" aria-label="功能主分支">
            {featureBranches.map((item) => {
              const disabled = 'disabled' in item ? item.disabled : false;
              return <button key={item.key} type="button" disabled={disabled} className={featureGroup === item.key ? 'isActive' : ''} onClick={() => openFeatureGroup(item.key)}>{item.label}</button>;
            })}
          </div>
          <div className="studioDivider" />
          <div className={featurePickerGroup ? 'studioFeatureList isPickerOpen' : 'studioFeatureList'}>{visibleFeatures.map((item) => <button key={item.key} type="button" className={featureKey === item.key ? 'isActive' : ''} onClick={() => chooseFeature(item.key)}><span>{item.tag}</span><b>{item.label}</b></button>)}</div>
          <div className="studioFeatureConfig">{renderLeftConfig()}</div>
        </aside>

        <StudioCanvasPanel
          title={featureGroup === 'promotion' ? '宣传图智能工作台' : '家具图片智能工作台'}
          featureModeLabel={featureGroup === 'base' ? '生图功能' : '宣传图'}
          currentFeatureLabel={currentFeature.label}
          recentCount={recentTasks.length}
          resolution={resolution}
          ratio={ratio}
          sourceImage={sourceImage}
          referenceCount={referenceImages.length}
          maxReferenceImages={MAX_REFERENCE_IMAGES}
          draggingSource={draggingSource}
          message={message}
          recentTasks={recentTasks}
          featureDrawerOpen={featureDrawerOpen}
          featureButtonRef={featureButtonRef}
          onOpenFeatures={() => setFeatureDrawerOpen(true)}
          onClearSource={() => setSourceImage(null)}
          onSourceInput={(event) => handleFileInput(event, 'source')}
          onSourceDragOver={(event) => handleDragOver(event, 'source')}
          onSourceDragLeave={() => handleDragLeave('source')}
          onSourceDrop={(event) => handleDrop(event, 'source')}
          onSelectSourceResource={() => setMessage('资源库选择将在下一步接入真实接口')}
        />

        <StudioSettingsPanel
          currentFeatureLabel={currentFeature.label}
          isPromotionSelected={isPromotionSelected}
          customPrompt={customPrompt}
          referenceImages={referenceImages}
          maxReferenceImages={MAX_REFERENCE_IMAGES}
          draggingReference={draggingRef}
          resolution={resolution}
          resolutionOptions={resolutionOptions}
          ratio={ratio}
          ratioOptions={ratioOptions}
          isGenerating={isGenerating}
          cost={currentFeature.cost}
          quota={quota}
          onPromptChange={setCustomPrompt}
          onReferenceInput={(event) => handleFileInput(event, 'reference')}
          onReferenceDragOver={(event) => handleDragOver(event, 'reference')}
          onReferenceDragLeave={() => handleDragLeave('reference')}
          onReferenceDrop={(event) => handleDrop(event, 'reference')}
          onRemoveReference={removeReference}
          onSelectReferenceResource={() => setMessage('从资源库选择参考图将在下一步接入真实接口')}
          onResolutionChange={setResolution}
          onRatioChange={setRatio}
          onGenerate={generateTask}
        />
      </section>
    </div>
  );
}
