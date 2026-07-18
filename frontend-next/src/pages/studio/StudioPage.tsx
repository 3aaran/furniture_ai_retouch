import { type ChangeEvent, type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StudioAssetPickerModal } from './StudioAssetPickerModal';
import { StudioCanvasPanel } from './StudioCanvasPanel';
import { StudioSettingsPanel } from './StudioSettingsPanel';
import { TaskCompareModal } from '../../components/tasks/TaskCompareModal';
import { fullTaskImageUrl, fullTaskSourceImageUrl, taskPreviewImageUrl } from '../../components/tasks/taskImageUrls';
import type { StudioLocalImage, StudioRecentTask } from './studioViewTypes';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { AppIcon, type AppIconName } from '../../components/icons/AppIcon';
import {
  featureBranches,
  promoOptionChoices,
  ratioOptions,
  resourceScopes,
  resolutionOptions,
  studioFeatures,
  videoDurationOptions,
  videoRatioOptions,
  videoResolutionOptions,
  videoVersionOptions,
  type FeatureGroup,
  type StudioFeatureKey,
} from './studioData';

const branchIcons: Record<FeatureGroup, AppIconName> = {
  base: 'studio',
  promotion: 'promotion',
  video: 'document',
};

const featureIcons: Record<StudioFeatureKey, AppIconName> = {
  material: 'resources',
  replace_bg: 'building',
  remove_bg: 'eye',
  enhance: 'settings',
  lineart: 'edit',
  multiview: 'dashboard',
  promo_main_image: 'document',
  promo_poster_image: 'promotion',
  promo_detail_image: 'eye',
  video_generate: 'document',
};
import {
  createAiTask,
  createVideoTask,
  deleteAiTask,
  deleteVideoTask,
  fetchAiTaskStatus,
  fetchAiTaskDetail,
  fetchCategoryTree,
  fetchPublicSettings,
  fetchRecentAiTasks,
  fetchRecentVideoTasks,
  fetchVideoTaskDetail,
  fetchVideoTaskStatus,
  fetchWorkbenchResources,
  resolveAuthenticatedMediaUrl,
  uploadImage,
  uploadWorkbenchResource,
  type AiTask,
  type ImageUploadResult,
  type ResourceApiItem,
  type StudioTask,
  type VideoTask,
} from '../../services/studio.api';
import { getCurrentUser } from '../../services/auth.api';
import { resolveApiUrl } from '../../services/http';
import { getCurrentUserSnapshot } from '../../stores/auth.store';
import './StudioPage.css';
import './StudioControls.css';
import './StudioResourcePager.css';
import './StudioPolish.css';

type LocalImage = StudioLocalImage;
type RecentTask = StudioRecentTask;
type MobileConfigSheet = 'feature' | 'options' | 'resolution' | 'ratio' | null;
type AssetPickerTarget = 'source' | 'reference' | null;

const MAX_REFERENCE_IMAGES = 9;
const DEFAULT_QUOTA = 0;
const RESOURCE_PAGE_SIZE = 10;

function localPreview(file: File): LocalImage {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    status: 'uploading',
  };
}

function imageUrlFromUpload(result: ImageUploadResult, fallback: string) {
  return resolveApiUrl(result.imageUrl || result.url || result.downloadUrl || result.previewUrl || result.thumbUrl) || fallback;
}

function isAuthRequiredMessage(message: string) {
  return /401|未登录|登录已过期/.test(message);
}

function isVideoTask(task: StudioTask | RecentTask | null | undefined): task is VideoTask | (RecentTask & { mediaType: 'video' }) {
  if (!task) return false;
  if ('mediaType' in task && task.mediaType === 'video') return true;
  return 'featureKey' in task && task.featureKey === 'video_generate';
}

function taskStatusText(task: StudioTask) {
  const status = String(task.status || '').toLowerCase();
  if ('statusLabel' in task && task.statusLabel) return task.statusLabel;
  if (status === 'succeeded' || status === 'success') return '已完成';
  if (status === 'queued' || status === 'pending') return '排队中';
  if (status === 'running' || status === 'processing') return isVideoTask(task) && task.progress ? `生成中 ${task.progress}%` : '生成中';
  if (status.includes('fail')) return '失败';
  return task.status || '未知';
}

function taskToRecent(task: StudioTask): RecentTask {
  const video = isVideoTask(task);
  return {
    id: task.id,
    feature: video ? '参考生视频' : task.featureName || task.featureKey || task.kind || 'AI 任务',
    status: taskStatusText(task),
    resolution: task.resolution || (video ? '720p' : '2K'),
    ratio: video ? task.aspectRatio || task.ratio || 'adaptive' : task.ratio || '自适应',
    time: task.finishedAt ? '已完成' : task.submittedAt || (!video && task.createdAt) ? new Date(task.submittedAt || (!video ? task.createdAt : '') || '').toLocaleTimeString() : '刚刚',
    previewUrl: video ? resolveAuthenticatedMediaUrl(task.posterUrl) : taskPreviewImageUrl(task),
    mediaType: video ? 'video' : 'image',
    progress: video ? Number(task.progress || 0) : undefined,
    raw: task,
  };
}

function taskImageForStudio(task: AiTask, prefer: 'result' | 'source') {
  const isSource = prefer === 'source';
  const id = isSource ? task.sourceImageId || task.originImage?.id : task.imageId || task.resultImage?.id;
  const url = isSource ? fullTaskSourceImageUrl(task) : fullTaskImageUrl(task);
  if (!id && !url) return null;
  return { id: String(id || task.id), imageId: String(id || task.id), name: isSource ? '产品原图' : '生成结果', url, status: 'ready' as const };
}

function resourceName(item: ResourceApiItem) {
  return item.name || item.resourceName || item.originalName || item.id;
}

function resourceImageUrl(item: ResourceApiItem) {
  return resolveApiUrl(item.thumbUrl || item.imageUrl || item.url || item.downloadUrl) || '';
}

function resourceType(item: ResourceApiItem) {
  return item.resourceType || item.resource_type || '';
}

function resourceMainName(item: ResourceApiItem) {
  return item.mainCategoryName || item.objectName || '';
}

function resourceSubName(item: ResourceApiItem) {
  return item.subCategoryName || item.colorName || '';
}

function resourceToLocalImage(item: ResourceApiItem): LocalImage | null {
  const url = resourceImageUrl(item);
  const imageId = String(item.imageId || item.id || '');
  if (!url || !imageId) return null;
  return {
    id: imageId,
    imageId,
    name: String(resourceName(item)),
    url,
    status: 'ready',
  };
}

function resourceSnapshot(item: ResourceApiItem | null) {
  if (!item) return null;
  return {
    id: String(item.id),
    resourceId: String(item.id),
    imageId: item.imageId || String(item.id),
    name: String(resourceName(item)),
    url: resourceImageUrl(item) || item.url || item.imageUrl || '',
    imageUrl: resourceImageUrl(item) || item.imageUrl || item.url || '',
    resourceType: resourceType(item),
    mainCategoryName: resourceMainName(item),
    subCategoryName: resourceSubName(item),
    source: 'resource',
  };
}

export function StudioPage() {
  const { isMobile } = useBreakpoint();
  const featureButtonRef = useRef<HTMLButtonElement>(null);
  const resourceUploadInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [featureGroup, setFeatureGroup] = useState<FeatureGroup>('base');
  const [featureKey, setFeatureKey] = useState<StudioFeatureKey>('material');
  const [featureDrawerOpen, setFeatureDrawerOpen] = useState(false);
  const [mobileConfigSheet, setMobileConfigSheet] = useState<MobileConfigSheet>(null);
  const [mobileRecentOpen, setMobileRecentOpen] = useState(false);
  const [featurePickerGroup, setFeaturePickerGroup] = useState<FeatureGroup | null>(null);
  const [sourceImage, setSourceImage] = useState<LocalImage | null>(null);
  const [referenceImages, setReferenceImages] = useState<LocalImage[]>([]);
  const [draggingSource, setDraggingSource] = useState(false);
  const [draggingRef, setDraggingRef] = useState(false);
  const [toast, setToast] = useState('');
  const [assetPickerTarget, setAssetPickerTarget] = useState<AssetPickerTarget>(null);
  const [assetKeyword, setAssetKeyword] = useState('');
  const [assetItems, setAssetItems] = useState<ResourceApiItem[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [videoExtraRequirements, setVideoExtraRequirements] = useState('');
  const [videoVersion, setVideoVersion] = useState<'Mini' | '快速' | '标准'>('快速');
  const [videoDuration, setVideoDuration] = useState<'auto' | number>('auto');
  const [videoResolution, setVideoResolution] = useState('720p');
  const [videoAspectRatio, setVideoAspectRatio] = useState('adaptive');
  const [activeVideoTaskId, setActiveVideoTaskId] = useState('');
  const [resolution, setResolution] = useState('2K');
  const [ratio, setRatio] = useState('自适应');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [resourceScope, setResourceScope] = useState('SYSTEM');
  const [resourceCategoryOptions, setResourceCategoryOptions] = useState<Array<{ name: string; subs: string[] }>>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [resourceItems, setResourceItems] = useState<ResourceApiItem[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState('');
  const [resourcePage, setResourcePage] = useState(1);
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const [removeMirror, setRemoveMirror] = useState(false);
  const [enhanceFocus, setEnhanceFocus] = useState(true);
  const [enhanceAngle, setEnhanceAngle] = useState('不变');
  const [multiView, setMultiView] = useState('三角度视图');
  const [quota, setQuota] = useState(() => Number(getCurrentUserSnapshot()?.quota ?? DEFAULT_QUOTA));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVideoSubmitting, setIsVideoSubmitting] = useState(false);
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
  const [taskDetail, setTaskDetail] = useState<StudioTask | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);

  const currentFeature = studioFeatures.find((item) => item.key === featureKey) || studioFeatures[0];
  const visibleFeatures = studioFeatures.filter((item) => item.group === (featurePickerGroup || featureGroup));
  const currentCategory = resourceCategoryOptions.find((item) => item.name === mainCategory);
  const currentSubOptions = currentCategory?.subs || [];
  const isPromotionSelected = currentFeature.group === 'promotion';
  const isVideoSelected = featureKey === 'video_generate';
  const needsResourceLibrary = featureKey === 'material' || featureKey === 'replace_bg';
  const selectedResourceItem = resourceItems.find((item) => String(item.id) === selectedResource) || null;
  const taskDetailList = recentTasks.map((item) => item.raw).filter((item): item is StudioTask => Boolean(item));
  const activeResolution = isVideoSelected ? videoResolution : resolution;
  const activeRatio = isVideoSelected ? videoAspectRatio : ratio;
  const activeResolutionOptions = isVideoSelected ? videoResolutionOptions : resolutionOptions;
  const activeRatioOptions = isVideoSelected ? videoRatioOptions : ratioOptions;
  const referenceImageLimit = isVideoSelected ? MAX_REFERENCE_IMAGES - 1 : MAX_REFERENCE_IMAGES;

  const visibleResourceItems = useMemo(() => {
    const targetType = featureKey === 'replace_bg' ? 'scene' : 'material';
    return resourceItems.filter((item) => {
      if (needsResourceLibrary && resourceType(item) !== targetType) return false;
      if (!isMobile && resourceScope !== 'ALL' && item.scope !== resourceScope) return false;
      if (!isMobile && mainCategory && resourceMainName(item) !== mainCategory) return false;
      if (!isMobile && subCategory && resourceSubName(item) !== subCategory) return false;
      if (!isMobile && resourceKeyword.trim()) {
        const keyword = resourceKeyword.trim().toLowerCase();
        return `${resourceName(item)}${resourceMainName(item)}${resourceSubName(item)}`.toLowerCase().includes(keyword);
      }
      return true;
    });
  }, [featureKey, isMobile, mainCategory, needsResourceLibrary, resourceItems, resourceKeyword, resourceScope, subCategory]);
  const resourcePageCount = Math.max(1, Math.ceil(visibleResourceItems.length / RESOURCE_PAGE_SIZE));
  const activeResourcePage = Math.min(resourcePage, resourcePageCount);
  const pagedResourceItems = useMemo(() => {
    const start = (activeResourcePage - 1) * RESOURCE_PAGE_SIZE;
    return visibleResourceItems.slice(start, start + RESOURCE_PAGE_SIZE);
  }, [activeResourcePage, visibleResourceItems]);

  const assetSelectedIds = useMemo(() => {
    const ids = new Set<string>();
    if (sourceImage?.imageId || sourceImage?.id) ids.add(String(sourceImage.imageId || sourceImage.id));
    referenceImages.forEach((item) => ids.add(String(item.imageId || item.id)));
    return ids;
  }, [referenceImages, sourceImage]);

  const notify = useCallback((text: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(text);
    toastTimerRef.current = window.setTimeout(() => {
      setToast('');
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  const closeFeatureDrawer = useCallback(() => {
    setFeatureDrawerOpen(false);
    if (isMobile) window.requestAnimationFrame(() => featureButtonRef.current?.focus());
  }, [isMobile]);

  const closeMobileConfig = useCallback(() => {
    setMobileConfigSheet(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) setQuota(Number(user.quota ?? user.merchantQuota ?? 0));
      })
      .catch((error: Error) => {
        if (!cancelled && !isAuthRequiredMessage(error.message)) notify(`用户信息加载失败：${error.message}`);
      });
    fetchPublicSettings().catch(() => undefined);
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchRecentAiTasks({ pageSize: 20 }),
      fetchRecentVideoTasks({ pageSize: 20 }),
    ]).then(([imageResult, videoResult]) => {
      if (cancelled) return;
      const imageItems = imageResult.status === 'fulfilled'
        ? (Array.isArray(imageResult.value) ? imageResult.value : imageResult.value.items || [])
        : [];
      const videoItems = videoResult.status === 'fulfilled' ? videoResult.value.items || [] : [];
      const merged = [...imageItems, ...videoItems]
        .sort((a, b) => new Date(b.submittedAt || (!isVideoTask(b) ? b.createdAt : '') || 0).getTime() - new Date(a.submittedAt || (!isVideoTask(a) ? a.createdAt : '') || 0).getTime())
        .slice(0, 20);
      setRecentTasks(merged.map(taskToRecent));
      const unfinishedVideo = videoItems.find((item) => ['queued', 'pending', 'running', 'processing'].includes(String(item.status || '').toLowerCase()));
      if (unfinishedVideo) {
        setActiveVideoTaskId(unfinishedVideo.id);
        void pollVideoTask(unfinishedVideo.id);
      }
      const failedMessage = imageResult.status === 'rejected'
        ? imageResult.reason?.message
        : videoResult.status === 'rejected' ? videoResult.reason?.message : '';
      if (failedMessage && !isAuthRequiredMessage(String(failedMessage))) notify(`部分最近任务加载失败：${failedMessage}`);
    });
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!assetPickerTarget) return;
    let cancelled = false;
    setAssetLoading(true);
    setAssetError('');
    fetchWorkbenchResources({
      keyword: assetKeyword,
      resourceType: 'user_reference',
      scope: 'ALL',
      pageSize: 120,
    })
      .then((data) => {
        if (!cancelled) setAssetItems(data.items || []);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setAssetItems([]);
        setAssetError(error.message || '资产库读取失败');
      })
      .finally(() => {
        if (!cancelled) setAssetLoading(false);
      });
    return () => { cancelled = true; };
  }, [assetKeyword, assetPickerTarget]);

  useEffect(() => {
    if (!needsResourceLibrary || isMobile) return;
    let cancelled = false;
    setCategoryLoading(true);
    const scopes = resourceScope === 'ALL' ? ['SYSTEM', 'MERCHANT', 'USER'] : [resourceScope];
    Promise.all(scopes.map((scope) => fetchCategoryTree(scope)))
      .then((trees) => {
        if (cancelled) return;
        const purposeKey = featureKey === 'replace_bg' ? 'scene' : 'material';
        const categories = new Map<string, Set<string>>();
        trees.forEach((tree) => {
          tree.purposes.find((item) => item.purposeKey === purposeKey)?.mains.forEach((main) => {
            const subs = categories.get(main.name) || new Set<string>();
            main.subs?.forEach((sub) => subs.add(sub.name));
            categories.set(main.name, subs);
          });
        });
        const nextCategories = Array.from(categories, ([name, subs]) => ({ name, subs: Array.from(subs) }));
        setResourceCategoryOptions(nextCategories);
        if (mainCategory && !nextCategories.some((item) => item.name === mainCategory)) {
          setMainCategory('');
          setSubCategory('');
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setResourceError(`分类加载失败：${error.message}`);
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [featureKey, isMobile, mainCategory, needsResourceLibrary, resourceScope]);

  useEffect(() => {
    if (!needsResourceLibrary) return;
    let cancelled = false;
    setResourceLoading(true);
    setResourceError('');
    fetchWorkbenchResources({
      keyword: isMobile ? '' : resourceKeyword,
      resourceType: featureKey === 'replace_bg' ? 'scene' : 'material',
      scope: isMobile ? 'ALL' : resourceScope,
      pageSize: 999,
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
  }, [featureKey, isMobile, needsResourceLibrary, resourceKeyword, resourceScope]);

  useEffect(() => {
    setResourcePage(1);
  }, [featureKey, mainCategory, resourceKeyword, resourceScope, subCategory]);

  useEffect(() => {
    if (!featureDrawerOpen && !featurePickerGroup && !mobileConfigSheet && !mobileRecentOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFeaturePickerGroup(null);
        setMobileConfigSheet(null);
        setMobileRecentOpen(false);
        closeFeatureDrawer();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closeFeatureDrawer, featureDrawerOpen, featurePickerGroup, mobileConfigSheet, mobileRecentOpen]);

  function selectGroup(group: FeatureGroup) {
    setFeatureGroup(group);
    const nextFeature = studioFeatures.find((item) => item.group === group);
    if (nextFeature) setFeatureKey(nextFeature.key);
    setSelectedResource('');
    setFeaturePickerGroup(null);
    if (!isMobile) closeFeatureDrawer();
  }

  function openFeatureGroup(group: FeatureGroup) {
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
    if (key === 'video_generate') setReferenceImages((current) => current.slice(0, MAX_REFERENCE_IMAGES - 1));
    setSelectedResource('');
    setFeaturePickerGroup(null);
    if (!isMobile) {
      setMobileConfigSheet(null);
      closeFeatureDrawer();
    }
  }

  function chooseMobileResolution(value: string) {
    if (isVideoSelected) setVideoResolution(value);
    else setResolution(value);
    setMobileConfigSheet(null);
  }

  function chooseMobileRatio(value: string) {
    if (isVideoSelected) setVideoAspectRatio(value);
    else setRatio(value);
    setMobileConfigSheet(null);
  }

  function openFeatureOptionsFromMobile() {
    setMobileConfigSheet('options');
  }

  async function uploadOne(file: File, target: 'source' | 'reference') {
    const local = localPreview(file);
    if (target === 'source') setSourceImage(local);
    else setReferenceImages((current) => [...current, local].slice(0, referenceImageLimit));

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
      notify(target === 'source' ? '产品原图已上传' : '参考图已上传');
    } catch (error) {
      const failed: LocalImage = { ...local, status: 'failed' };
      if (target === 'source') setSourceImage(failed);
      else setReferenceImages((current) => current.map((item) => item.id === local.id ? failed : item));
      notify(`图片上传失败：${error instanceof Error ? error.message : '请重新上传'}`);
    }
  }

  function applyFiles(files: FileList | File[], target: 'source' | 'reference') {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      notify('请选择图片文件');
      return;
    }
    if (target === 'source') {
      void uploadOne(images[0], 'source');
      return;
    }
    const slots = referenceImageLimit - referenceImages.length;
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

  async function uploadResourceFile(file: File) {
    setResourceLoading(true);
    setResourceError('');
    notify('正在上传资产...');
    try {
      const result = await uploadWorkbenchResource({
        file,
        scope: isMobile || resourceScope === 'ALL' || resourceScope === 'SYSTEM' ? 'USER' : resourceScope,
        objectName: isMobile ? (featureKey === 'replace_bg' ? '场景模板' : '材质') : (mainCategory || (featureKey === 'replace_bg' ? '场景模板' : '材质')),
        colorName: isMobile ? '' : subCategory,
      });
      const items = result.items || [];
      if (items.length) {
        setResourceItems((current) => [...items, ...current.filter((item) => !items.some((next) => String(next.id) === String(item.id)))]);
        setSelectedResource(String(items[0].id));
      }
      notify('资产已上传');
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : '资源上传失败');
      notify(`资产上传失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setResourceLoading(false);
    }
  }

  function handleResourceUploadInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadResourceFile(file);
  }

  function openAssetPicker(target: Exclude<AssetPickerTarget, null>) {
    setAssetPickerTarget(target);
    setAssetKeyword('');
  }

  function chooseAsset(item: ResourceApiItem) {
    const image = resourceToLocalImage(item);
    if (!image) {
      notify('该资产缺少可用图片');
      return;
    }
    if (assetPickerTarget === 'source') {
      setSourceImage(image);
      setAssetPickerTarget(null);
      notify('已从资产库选择产品原图');
      return;
    }
    if (assetPickerTarget === 'reference') {
      if (referenceImages.length >= referenceImageLimit) {
        notify('参考图数量已达上限');
        return;
      }
      const imageKey = image.imageId || image.id;
      if (referenceImages.some((current) => String(current.imageId || current.id) === String(imageKey))) {
        notify('参考图已添加');
        return;
      }
      setReferenceImages((current) => [...current, image].slice(0, referenceImageLimit));
      notify('已从资产库添加参考图');
    }
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
        notify(`任务状态查询失败：${error instanceof Error ? error.message : '请稍后刷新'}`);
        return;
      }
    }
  }

  async function pollVideoTask(taskId: string) {
    let queryFailures = 0;
    for (let index = 0; index < 180; index += 1) {
      const delay = document.hidden ? 15000 : index < 2 ? 1500 : 5000;
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      try {
        const status = await fetchVideoTaskStatus(taskId);
        queryFailures = 0;
        setRecentTasks((current) => current.map((item) => item.id === taskId ? taskToRecent(status) : item));
        setTaskDetail((current) => current?.id === taskId ? { ...current, ...status } : current);
        const normalizedStatus = String(status.status || '').toLowerCase();
        if (normalizedStatus === 'succeeded' || normalizedStatus === 'failed') {
          setActiveVideoTaskId((current) => current === taskId ? '' : current);
          notify(normalizedStatus === 'succeeded' ? '视频生成完成，可点击最近生成查看' : `视频生成失败：${status.errorMessage || '请查看任务详情'}`);
          return;
        }
      } catch (error) {
        queryFailures += 1;
        if (queryFailures >= 3) notify(`视频状态暂时无法查询：${error instanceof Error ? error.message : '系统将继续重试'}`);
      }
    }
    notify('视频仍在生成，请稍后刷新页面查看进度');
  }

  async function generateTask() {
    if (!sourceImage?.imageId) {
      notify(sourceImage?.status === 'uploading' ? '首张图片正在上传，请稍后' : isVideoSelected ? '请先上传至少 1 张参考图' : '请先上传产品原图');
      return;
    }
    const uploadingRef = referenceImages.find((item) => item.status === 'uploading');
    if (uploadingRef) {
      notify('参考图正在上传，请稍后');
      return;
    }

    if (isVideoSelected) {
      if (activeVideoTaskId) {
        notify('已有视频任务正在生成，请等待完成后再提交');
        return;
      }
      if (!customPrompt.trim()) {
        notify('请填写视频画面和运动要求');
        return;
      }
      if (videoVersion !== '标准' && ['1080p', '4K'].includes(videoResolution)) {
        notify('Mini/快速版只支持 480p 或 720p');
        return;
      }
      const imageIds = [sourceImage.imageId, ...referenceImages.map((item) => item.imageId)]
        .filter((value): value is string => Boolean(value));
      const uniqueImageIds = [...new Set(imageIds)].slice(0, MAX_REFERENCE_IMAGES);
      if (!uniqueImageIds.length || uniqueImageIds.length > MAX_REFERENCE_IMAGES) {
        notify('视频生成需要 1 到 9 张参考图');
        return;
      }
      const clientRequestId = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `video-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const extraRequirements = videoExtraRequirements
        .split(/\r?\n|；/)
        .map((item) => item.trim())
        .filter(Boolean);
      setIsVideoSubmitting(true);
      notify('正在提交视频生成任务...');
      try {
        const task = await createVideoTask({
          featureKey: 'video_generate',
          clientRequestId,
          imageIds: uniqueImageIds,
          prompt: customPrompt.trim(),
          extraRequirements,
          version: videoVersion,
          duration: videoDuration,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
        });
        if (task.balance !== undefined) setQuota(Number(task.balance));
        setActiveVideoTaskId(task.id);
        setIsVideoSubmitting(false);
        setRecentTasks((current) => [taskToRecent(task), ...current.filter((item) => item.id !== task.id)].slice(0, 20));
        notify('视频任务已提交，可在最近生成查看进度');
        void pollVideoTask(task.id);
      } catch (error) {
        setIsVideoSubmitting(false);
        setActiveVideoTaskId('');
        notify(`视频任务提交失败：${error instanceof Error ? error.message : '请稍后重试'}`);
      }
      return;
    }

    if (needsResourceLibrary && !selectedResourceItem) {
      notify(featureKey === 'replace_bg' ? '请先选择场景资源' : '请先选择材质资源');
      return;
    }
    setIsGenerating(true);
    notify('正在提交生成任务...');
    try {
      const selectedResourceData = resourceSnapshot(selectedResourceItem);
      const selectedResourceImageId = selectedResourceData?.imageId ? String(selectedResourceData.imageId) : '';
      const task = await createAiTask({
        featureKey,
        imageA: { imageId: sourceImage.imageId, url: sourceImage.url, imageUrl: sourceImage.url, name: sourceImage.name },
        imageB: selectedResourceImageId ? { imageId: selectedResourceImageId, url: String(selectedResourceData?.url || ''), imageUrl: String(selectedResourceData?.imageUrl || ''), name: String(selectedResourceData?.name || '') } : undefined,
        selectedResource: selectedResourceData,
        selectedResourceSnapshot: selectedResourceData,
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
      notify('任务已提交，正在生成');
      void pollTask(task.id);
    } catch (error) {
      notify(`任务提交失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function openRecentTask(task: RecentTask | StudioTask) {
    const taskId = String(task.id || '');
    if (!taskId) return;
    const raw = 'raw' in task ? task.raw : task;
    const video = isVideoTask(raw || task);
    setTaskDetailLoading(true);
    try {
      const detail = video ? await fetchVideoTaskDetail(taskId) : await fetchAiTaskDetail(taskId);
      setTaskDetail(detail);
      setRecentTasks((current) => current.map((item) => item.id === taskId ? taskToRecent({ ...(item.raw || detail), ...detail } as StudioTask) : item));
    } catch (error) {
      if (raw) setTaskDetail(raw);
      notify(`任务详情读取失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setTaskDetailLoading(false);
    }
  }

  async function deleteRecentTask(task: RecentTask | StudioTask) {
    const taskId = String(task.id || '');
    if (!taskId) return;
    const raw = 'raw' in task ? task.raw : task;
    try {
      if (isVideoTask(raw || task)) await deleteVideoTask(taskId);
      else await deleteAiTask(taskId);
      setRecentTasks((current) => current.filter((item) => String(item.id) !== taskId));
      if (taskDetail?.id === taskId) setTaskDetail(null);
      if (activeVideoTaskId === taskId) setActiveVideoTaskId('');
      notify('记录已删除');
    } catch (error) {
      notify(`删除失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    }
  }

  function continueTaskImage(task: RecentTask | StudioTask, prefer: 'result' | 'source' = 'result') {
    const raw = 'raw' in task ? task.raw : task;
    if (!raw) {
      notify('当前记录不可放入工作室');
      return;
    }
    if (isVideoTask(raw)) {
      notify('视频记录可直接播放或下载，不支持放入图片工作室');
      return;
    }
    const image = taskImageForStudio(raw, prefer);
    if (!image?.url) {
      notify('当前记录缺少可用图片');
      return;
    }
    setSourceImage(image);
    setTaskDetail(null);
    setMobileRecentOpen(false);
    notify('已放入工作室，可继续编辑');
  }

  function changeVideoVersion(value: 'Mini' | '快速' | '标准') {
    setVideoVersion(value);
    if (value !== '标准' && ['1080p', '4K'].includes(videoResolution)) setVideoResolution('720p');
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
        {img ? <img src={img} alt={title} loading="lazy" decoding="async" /> : <i>{resourceType(item) || (featureKey === 'replace_bg' ? '场景' : '材质')}</i>}
        <b>{title}</b>
      </button>
    );
  }

  function renderLeftConfig() {
    if (featureKey === 'video_generate') {
      return (
        <div className="studioVideoGuide">
          <div className="studioDescRow"><span><AppIcon name="document" size={18} /></span><p>{currentFeature.desc}</p></div>
          <div className="studioConfigTitle">参考图要求</div>
          <div className="studioOptionCard">
            <div className="studioVideoGuideRow"><b>图片数量</b><span>产品原图计为第 1 张，最多再添加 8 张参考图。</span></div>
            <div className="studioVideoGuideRow"><b>画面描述</b><span>右侧提示词为必填，请写清镜头运动、家具动作和场景氛围。</span></div>
            <div className="studioVideoGuideRow"><b>生成状态</b><span>{activeVideoTaskId ? '当前已有任务生成中，可在最近生成查看进度。' : '当前可提交新的视频任务。'}</span></div>
          </div>
        </div>
      );
    }

    if (featureKey === 'material' || featureKey === 'replace_bg') {
        return (
          <>
            {!isMobile && <div className="studioResourceFilters">
              <div className="studioScopeTabs">
                {resourceScopes.map((item) => <button key={item.value} type="button" className={resourceScope === item.value ? 'isActive' : ''} onClick={() => setResourceScope(item.value)}>{item.label}</button>)}
              </div>
              <div className="studioCategoryTabs" aria-label="资源主分类">
                <button type="button" className={!mainCategory ? 'isActive' : ''} onClick={() => { setMainCategory(''); setSubCategory(''); }}>{categoryLoading ? '加载中' : '全部'}</button>
                {resourceCategoryOptions.map((item) => <button key={item.name} type="button" className={mainCategory === item.name ? 'isActive' : ''} onClick={() => { setMainCategory(item.name); setSubCategory(''); }}>{item.name}</button>)}
              </div>
              <div className="studioSubcategoryChips" aria-label="资源子分类">
                <button type="button" className={!subCategory ? 'isActive' : ''} onClick={() => setSubCategory('')}>全部</button>
                {currentSubOptions.map((item) => <button key={item} type="button" className={subCategory === item ? 'isActive' : ''} onClick={() => setSubCategory(item)}>{item}</button>)}
              </div>
              <div className="studioSearchBox"><input value={resourceKeyword} onChange={(event) => setResourceKeyword(event.target.value)} placeholder="搜索名称" /></div>
            </div>}
            <div className="studioResourceGrid">
            <input ref={resourceUploadInputRef} type="file" accept="image/*" hidden onChange={handleResourceUploadInput} />
            <button className="studioUploadResource" type="button" onClick={() => resourceUploadInputRef.current?.click()}>
              <span><AppIcon name="plus" size={20} /></span><b>上传</b>
            </button>
            {pagedResourceItems.map(renderResourceCard)}
            {resourceLoading && <div className="studioLibraryEmpty isLoading">正在读取资产库...</div>}
            {!resourceLoading && !visibleResourceItems.length && !resourceError && <div className="studioLibraryEmpty">资产库暂无可用资源，可点击加号上传</div>}
            {!resourceLoading && resourceError && <div className="studioLibraryEmpty">资源加载失败：{resourceError}</div>}
          </div>
          {!resourceLoading && visibleResourceItems.length > RESOURCE_PAGE_SIZE && (
            <div className="studioResourcePager" aria-label="资源分页">
              <span>{visibleResourceItems.length} 个资源 · 第 {activeResourcePage}/{resourcePageCount} 页</span>
              <div>
                <button type="button" disabled={activeResourcePage === 1} onClick={() => setResourcePage((page) => Math.max(1, page - 1))}>上一页</button>
                <button type="button" disabled={activeResourcePage === resourcePageCount} onClick={() => setResourcePage((page) => Math.min(resourcePageCount, page + 1))}>下一页</button>
              </div>
            </div>
          )}
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
          {!isMobile && <>
            <div className="studioBranchTabs" aria-label="功能主分支">
              {featureBranches.map((item) => <button key={item.key} type="button" className={featureGroup === item.key ? 'isActive' : ''} onClick={() => openFeatureGroup(item.key)}><AppIcon name={branchIcons[item.key]} size={17} /><b>{item.label}</b></button>)}
            </div>
            <div className="studioDivider" />
            <div className={featurePickerGroup ? 'studioFeatureList isPickerOpen' : 'studioFeatureList'}>{visibleFeatures.map((item) => <button key={item.key} type="button" className={featureKey === item.key ? 'isActive' : ''} onClick={() => chooseFeature(item.key)}><span><AppIcon name={featureIcons[item.key]} size={16} /></span><b>{item.label}</b></button>)}</div>
          </>}
          {!isMobile && <div className="studioFeatureConfig">{renderLeftConfig()}</div>}
        </aside>

        {mobileConfigSheet && <button className="studioMobileConfigBackdrop" type="button" aria-label="关闭配置弹窗" onClick={closeMobileConfig} />}
        <section id="studio-mobile-config-sheet" className={`studioMobileConfigSheet ${mobileConfigSheet ? 'isOpen' : ''}`.trim()} aria-hidden={!mobileConfigSheet}>
          <div className="studioMobileConfigHead">
            <span>{mobileConfigSheet === 'options' ? (needsResourceLibrary ? '资源配置' : '功能配置') : '工作室设置'}</span>
            <button type="button" aria-label="关闭配置弹窗" onClick={closeMobileConfig}><AppIcon name="close" /></button>
          </div>

          {mobileConfigSheet === 'feature' && (
            <>
              <div className="studioMobileConfigBlock">
                <span>生成类型</span>
                <div className="studioMobileConfigChips">
                  {featureBranches.map((item) => <button key={item.key} type="button" className={featureGroup === item.key ? 'isActive' : ''} onClick={() => selectGroup(item.key)}><AppIcon name={branchIcons[item.key]} size={15} /><span>{item.label}</span></button>)}
                </div>
              </div>
              <div className="studioMobileConfigBlock">
                <span>功能</span>
                <div className="studioMobileConfigList">
                  {studioFeatures.filter((item) => item.group === featureGroup).map((item) => <button key={item.key} type="button" className={featureKey === item.key ? 'isActive' : ''} onClick={() => chooseFeature(item.key)}><span><AppIcon name={featureIcons[item.key]} size={17} /></span><b>{item.label}</b></button>)}
                </div>
              </div>
              <button className="studioMobileResourceConfig" type="button" onClick={openFeatureOptionsFromMobile}>{needsResourceLibrary ? '打开资源配置' : '打开功能配置'}</button>
            </>
          )}

          {mobileConfigSheet === 'options' && <div className="studioMobileConfigBlock studioMobileResourceSheet">{renderLeftConfig()}</div>}

          {mobileConfigSheet === 'resolution' && (
            <div className="studioMobileConfigBlock">
              <span>选择分辨率</span>
              <div className="studioMobileConfigChips">
                {activeResolutionOptions.map((item) => <button key={item} type="button" disabled={isVideoSelected && videoVersion !== '标准' && ['1080p', '4K'].includes(item)} className={activeResolution === item ? 'isActive' : ''} onClick={() => chooseMobileResolution(item)}>{item}</button>)}
              </div>
            </div>
          )}

          {mobileConfigSheet === 'ratio' && (
            <div className="studioMobileConfigBlock">
              <span>选择比例</span>
              <div className="studioMobileConfigChips">
                {activeRatioOptions.map((item) => <button key={item} type="button" className={activeRatio === item ? 'isActive' : ''} onClick={() => chooseMobileRatio(item)}>{item === 'adaptive' ? '自适应' : item}</button>)}
              </div>
            </div>
          )}
        </section>

        {mobileRecentOpen && <button className="studioMobileRecentBackdrop" type="button" aria-label="关闭最近生成" onClick={() => setMobileRecentOpen(false)} />}
        <section className={`studioMobileRecentSheet ${mobileRecentOpen ? 'isOpen' : ''}`.trim()} aria-hidden={!mobileRecentOpen}>
          <div className="studioMobileRecentHead">
            <div><span>最近生成</span><b>{recentTasks.length ? `${recentTasks.length} 条记录` : '暂无记录'}</b></div>
            <button type="button" aria-label="关闭最近生成" onClick={() => setMobileRecentOpen(false)}><AppIcon name="close" /></button>
          </div>
          <div className="studioMobileRecentList">
            {recentTasks.length ? recentTasks.slice(0, 8).map((task) => (
              <article key={task.id} onClick={() => void openRecentTask(task)}>
                {task.previewUrl ? <img src={task.previewUrl} alt={task.feature} loading="lazy" decoding="async" /> : <i aria-hidden="true">{task.mediaType === 'video' ? '视频' : '图'}</i>}
                <div><b>{task.feature}</b><span>{task.status}</span><em>{task.resolution} · {task.ratio} · {task.time}</em></div>
                <footer>
                  {task.mediaType !== 'video' && <button type="button" aria-label="放入工作室" onClick={(event) => { event.stopPropagation(); continueTaskImage(task); }}><AppIcon name="edit" size={15} /></button>}
                  <button type="button" aria-label="删除记录" onClick={(event) => { event.stopPropagation(); void deleteRecentTask(task); }}><AppIcon name="trash" size={15} /></button>
                </footer>
              </article>
            )) : <div className="studioMobileRecentEmpty">还没有生成记录</div>}
          </div>
        </section>

        <StudioCanvasPanel
          title={currentFeature.label}
          description={currentFeature.desc}
          featureModeLabel={isVideoSelected ? '视频生成' : featureGroup === 'base' ? '生图功能' : '宣传图'}
          sourceLabel={isVideoSelected ? '首张参考图' : '产品原图'}
          resolution={activeResolution}
          ratio={activeRatio}
          sourceImage={sourceImage}
          draggingSource={draggingSource}
          recentTasks={recentTasks}
          showInlineRecent={!isMobile}
          featureDrawerOpen={mobileConfigSheet === 'feature'}
          featureButtonRef={featureButtonRef}
          onOpenFeatureConfig={() => setMobileConfigSheet('feature')}
          onOpenResolutionConfig={() => setMobileConfigSheet('resolution')}
          onOpenRatioConfig={() => setMobileConfigSheet('ratio')}
          onOpenRecent={() => setMobileRecentOpen(true)}
          onClearSource={() => setSourceImage(null)}
          onSourceInput={(event) => handleFileInput(event, 'source')}
          onSourceDragOver={(event) => handleDragOver(event, 'source')}
          onSourceDragLeave={() => handleDragLeave('source')}
          onSourceDrop={(event) => handleDrop(event, 'source')}
          onSelectSourceResource={() => openAssetPicker('source')}
          onOpenRecentTask={(task) => void openRecentTask(task)}
          onDeleteRecentTask={(task) => void deleteRecentTask(task)}
          onContinueRecentTask={(task) => continueTaskImage(task)}
        />

        <StudioSettingsPanel
          isPromotionSelected={isPromotionSelected}
          isVideoSelected={isVideoSelected}
          customPrompt={customPrompt}
          videoExtraRequirements={videoExtraRequirements}
          videoVersion={videoVersion}
          videoVersionOptions={videoVersionOptions}
          videoDuration={videoDuration}
          videoDurationOptions={videoDurationOptions}
          referenceImages={referenceImages}
          maxReferenceImages={referenceImageLimit}
          draggingReference={draggingRef}
          resolution={activeResolution}
          resolutionOptions={activeResolutionOptions}
          ratio={activeRatio}
          ratioOptions={activeRatioOptions}
          showOutputControls={!isMobile}
          isGenerating={isVideoSelected ? isVideoSubmitting || Boolean(activeVideoTaskId) : isGenerating}
          cost={currentFeature.cost}
          quota={quota}
          onPromptChange={setCustomPrompt}
          onVideoExtraRequirementsChange={setVideoExtraRequirements}
          onVideoVersionChange={changeVideoVersion}
          onVideoDurationChange={setVideoDuration}
          onReferenceInput={(event) => handleFileInput(event, 'reference')}
          onReferenceDragOver={(event) => handleDragOver(event, 'reference')}
          onReferenceDragLeave={() => handleDragLeave('reference')}
          onReferenceDrop={(event) => handleDrop(event, 'reference')}
          onRemoveReference={removeReference}
          onSelectReferenceResource={() => openAssetPicker('reference')}
          onResolutionChange={isVideoSelected ? setVideoResolution : setResolution}
          onRatioChange={isVideoSelected ? setVideoAspectRatio : setRatio}
          onGenerate={generateTask}
        />
        {assetPickerTarget && (
          <StudioAssetPickerModal
            target={assetPickerTarget}
            items={assetItems}
            loading={assetLoading}
            error={assetError}
            keyword={assetKeyword}
            selectedIds={assetSelectedIds}
            onKeywordChange={setAssetKeyword}
            onSelect={chooseAsset}
            onClose={() => setAssetPickerTarget(null)}
            resourceName={(item) => String(resourceName(item))}
            resourceImageUrl={resourceImageUrl}
          />
        )}
        {taskDetailLoading && <button className="studioToast" type="button">正在读取任务详情...</button>}
        <TaskCompareModal
          detail={taskDetail}
          taskList={taskDetailList}
          onClose={() => setTaskDetail(null)}
          onSwitchTask={(task) => void openRecentTask(task)}
          onDelete={(task) => void deleteRecentTask(task)}
          onContinueImage={(task, prefer) => continueTaskImage(task, prefer)}
        />
        {toast && <button className="studioToast" type="button" onClick={() => setToast('')}>{toast}</button>}
      </section>
    </div>
  );
}
