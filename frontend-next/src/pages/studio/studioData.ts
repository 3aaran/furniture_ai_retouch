export type FeatureGroup = 'base' | 'promotion' | 'video';

export type StudioFeatureKey =
  | 'material'
  | 'replace_bg'
  | 'remove_bg'
  | 'enhance'
  | 'lineart'
  | 'multiview'
  | 'promo_main_image'
  | 'promo_poster_image'
  | 'promo_detail_image';

export type StudioFeature = {
  key: StudioFeatureKey;
  group: FeatureGroup;
  label: string;
  tag: string;
  desc: string;
  cost: number;
};

export const featureBranches = [
  { key: 'base', label: '基础' },
  { key: 'promotion', label: '宣传图' },
  { key: 'video', label: '宣传短视频（开发中）', disabled: true },
] as const;

export const studioFeatures: StudioFeature[] = [
  { key: 'material', group: 'base', label: '材质替换', tag: '材质', desc: '替换产品表面材质，快速预览 SKU 效果。', cost: 10 },
  { key: 'replace_bg', group: 'base', label: '场景融合', tag: '场景', desc: '将产品放入真实营销场景。', cost: 12 },
  { key: 'remove_bg', group: 'base', label: '背景净化', tag: '净化', desc: '清理背景并保留产品主体。', cost: 10 },
  { key: 'enhance', group: 'base', label: '摄影增强', tag: '增强', desc: '提升产品照片质感，同时保持真实效果。', cost: 8 },
  { key: 'lineart', group: 'base', label: '线稿图', tag: '线稿', desc: '根据图片生成干净的产品线稿。', cost: 8 },
  { key: 'multiview', group: 'base', label: '多角度视图', tag: '多角度', desc: '生成适合产品展示的多角度视图。', cost: 20 },
  { key: 'promo_main_image', group: 'promotion', label: '产品主图', tag: '主图', desc: '生成干净高级的商品主图，适合电商首图和产品封面。', cost: 12 },
  { key: 'promo_poster_image', group: 'promotion', label: '广告海报图', tag: '海报', desc: '生成带广告构图和留白的宣传海报，适合后期添加标题、价格和品牌信息。', cost: 12 },
  { key: 'promo_detail_image', group: 'promotion', label: '产品细节图', tag: '细节', desc: '生成材质、纹理、工艺等局部细节图，适合详情页和宣传手册使用。', cost: 8 },
];

export const resolutionOptions = ['1K', '2K', '4K'];
export const ratioOptions = ['自适应', '1:1', '4:3', '3:4', '16:9'];

export const promoOptionChoices = {
  mainBackground: ['暖灰渐变商业摄影背景', '浅米色高级背景', '米白色柔和光影', '极简空间背景'],
  mainComposition: ['主体居中', '左侧留白', '右侧留白', '主体偏下'],
  mainWhitespace: ['少量留白', '不留白', '顶部留白', '侧边留白'],
  posterTextMode: ['自动生成短文案', '使用自定义文案', '不生成文字'],
  posterCopyPlacement: ['右侧留白', '左侧留白', '顶部留白', '下方留白'],
  posterTone: ['温暖家居', '现代简约', '高级质感', '自然木质'],
  detailLayout: ['四宫格', '三宫格', '拼合排版', '多区域细节'],
  detailFocus: ['材质纹理、边角工艺', '结构连接、坐垫厚度', '木纹质感、扶手造型', '布料纹理、靠背弧度'],
  detailTextMode: ['留白不生成文字', '完全不留文字区'],
};
