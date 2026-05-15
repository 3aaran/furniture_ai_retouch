import { uiIcons } from './uiIcons.jsx';

export const featureConfig = {
  material: {
    key: 'material',
    name: '材质替换',
    tag: '材质',
    icon: uiIcons.material,
    desc: '替换产品表面材质，快速预览 SKU 效果。',
    defaultCost: 10
  },
  replace_bg: {
    key: 'replace_bg',
    name: '场景融合',
    tag: '场景',
    icon: uiIcons.replace_bg,
    desc: '将产品放入真实营销场景。',
    defaultCost: 12
  },
  remove_bg: {
    key: 'remove_bg',
    name: '背景净化',
    tag: '净化',
    icon: uiIcons.user_reference,
    desc: '清理背景并保留产品主体。',
    defaultCost: 10
  },
  enhance: {
    key: 'enhance',
    name: '摄影增强',
    tag: '增强',
    icon: uiIcons.user_reference,
    desc: '提升产品照片质感，同时保持真实效果。',
    defaultCost: 8
  },
  lineart: {
    key: 'lineart',
    name: '线稿图',
    tag: '线稿',
    icon: uiIcons.user_reference,
    desc: '根据图片生成干净的产品线稿。',
    defaultCost: 8
  },
  multiview: {
    key: 'multiview',
    name: '多角度视图',
    tag: '多角度',
    icon: uiIcons.user_reference,
    desc: '生成适合产品展示的多角度视图。',
    defaultCost: 20
  }
};

export const featureList = Object.values(featureConfig);
