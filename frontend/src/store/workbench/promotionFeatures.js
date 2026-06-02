export const DEFAULT_PROMOTION_KEY = 'promo_main_image';

const baseGenerationRatioOptions = ['自适应', '1:1', '4:3', '3:4', '16:9'];
const baseGenerationResolutionOptions = ['1K', '2K', '4K'];

export const promotionOptionDefaults = {
  promo_main_image: {
    mainBackground: '暖灰渐变商业摄影背景',
    mainComposition: '主体居中',
    mainWhitespace: '少量留白'
  },
  promo_poster_image: {
    posterTextMode: 'auto',
    posterText: '',
    posterCopyPlacement: '右侧留白',
    posterTone: '温暖家居'
  },
  promo_detail_image: {
    detailLayout: '四宫格',
    detailFocus: '材质纹理、边角工艺',
    detailTextMode: '留白不生成文字'
  }
};

export const promotionOptionChoices = {
  mainBackground: ['暖灰渐变商业摄影背景', '浅米色高级背景', '米白色柔和光影', '极简空间背景'],
  mainComposition: ['主体居中', '左侧留白', '右侧留白', '主体偏下'],
  mainWhitespace: ['少量留白', '不留白', '顶部留白', '侧边留白'],
  posterTextMode: ['auto', 'custom', 'none'],
  posterCopyPlacement: ['右侧留白', '左侧留白', '顶部留白', '下方留白'],
  posterTone: ['温暖家居', '现代简约', '高级质感', '自然木质'],
  detailLayout: ['四宫格', '三宫格', '拼合排版', '多区域细节'],
  detailFocus: ['材质纹理、边角工艺', '结构连接、坐垫厚度', '木纹质感、扶手造型', '布料纹理、靠背弧度'],
  detailTextMode: ['留白不生成文字', '完全不留文字区']
};

const mainImagePrompt = `基于 Image A 中的家具生成一张产品主图。
要求：
1. 严格保留 Image A 中家具主体的造型、结构比例、颜色、材质纹理和主要轮廓，不要改变家具款式，不要增加或删除结构部件。
2. 以家具主体为画面核心，突出产品本身，构图简洁大方，产品清晰完整。
3. 背景干净、高级、简洁，可使用浅色或高级感空间背景，但不要杂乱，不要喧宾夺主。
4. 家具主体应占据画面主要视觉区域，整体呈现电商商品主图和品牌宣传主图的效果。
5. 光线自然柔和，画面真实、清晰、有质感，体现家具的材质和档次。
6. 画面可适当保留干净区域，方便后期添加标题、价格、品牌等文案，但不要直接生成文字。
7. 不要出现人物、文字、水印、Logo、多余家具或复杂装饰物，不要改变产品结构。
输出：
生成一张高清、干净、高级、适合家具宣传和电商展示的产品主图。`;

const posterPrompt = `基于 Image A 中的家具生成一张广告海报图。
要求：
1. 严格保留 Image A 中家具主体的造型、结构比例、颜色、材质纹理和主要轮廓，不要改变家具款式。
2. 画面需要具有家具品牌广告感和高级商业宣传效果。
3. 家具主体清晰突出，可放置在简洁高级的空间、展厅或柔和光影背景中。
4. 构图需要预留明显的干净留白区域，方便后期添加标题、品牌、价格和卖点文案。
5. 背景应高级、干净、统一，不要过于复杂，不要让场景抢走产品主体。
6. 整体风格应真实、高级、精致、有质感，适合朋友圈、小红书、店铺海报和宣传页使用。
7. 不要直接生成文字，不要出现人物、水印、Logo、乱码文字、多余家具，不要改变产品结构。
输出：
生成一张高清、干净、有广告感、适合后期加文案的家具广告海报图。`;

const detailPrompt = `基于 Image A 中的家具生成一张产品细节图。
要求：
1. 严格保留 Image A 中家具的材质、颜色、纹理、结构和真实特征，不要改变产品款式。
2. 重点突出家具的局部细节，可展示布料纹理、木纹、边角工艺、结构连接、坐垫厚度、靠背弧度等细节。
3. 构图应以局部特写为主，画面精致，细节清晰，质感真实，突出家具的工艺感和材质感。
4. 背景保持干净简洁，不要加入无关装饰物。
5. 光线柔和自然，适合高端家具详情页、宣传手册内页和卖点展示图使用。
6. 可保留少量干净区域，方便后期添加卖点说明文字，但不要直接生成文字。
7. 不要出现人物、文字、水印、Logo、无关装饰或多余家具，不要让细节结构出错。
输出：
生成一张高清、真实、突出材质与工艺细节的产品细节图。`;

export const promotionFeatures = [
  {
    key: 'promo_main_image',
    taskType: 'PROMO_MAIN_IMAGE',
    name: '产品主图',
    shortLabel: '主图',
    desc: '生成干净高级的商品主图，适合电商首图和产品封面。',
    useCases: '电商首图 / 商品封面 / 详情页顶部图',
    difference: '强调商品封面感、主体突出和商业构图，不只是普通背景净化。',
    output: '家具完整清晰，背景干净高级，主体突出。',
    chips: ['主体突出', '封面构图', '干净背景'],
    promptTemplate: mainImagePrompt,
    defaultWhiteSpace: '不留白'
  },
  {
    key: 'promo_poster_image',
    taskType: 'PROMO_POSTER_IMAGE',
    name: '广告海报图',
    shortLabel: '海报',
    desc: '生成带广告构图和留白的宣传海报，适合后期添加标题、价格和品牌信息。',
    useCases: '朋友圈 / 小红书封面 / 店铺海报 / 品牌宣传图',
    difference: '强调广告感、留白和后期叠加标题、价格、Logo 的空间。',
    output: '空间干净，有广告构图和明显文案留白。',
    chips: ['广告感', '文案留白', '品牌氛围'],
    promptTemplate: posterPrompt,
    defaultWhiteSpace: '右侧'
  },
  {
    key: 'promo_detail_image',
    taskType: 'PROMO_DETAIL_IMAGE',
    name: '产品细节图',
    shortLabel: '细节',
    desc: '生成材质、纹理、工艺等局部细节图，适合详情页和宣传手册使用。',
    useCases: '详情页 / 材质展示 / 工艺展示 / 宣传手册内页',
    difference: '主动生成局部特写和卖点细节画面，不只是普通摄影增强。',
    output: '突出布料、木纹、边角、结构连接、坐垫厚度等细节。',
    chips: ['局部特写', '材质纹理', '工艺卖点'],
    promptTemplate: detailPrompt,
    defaultWhiteSpace: '不留白'
  }
];

export const promotionFeatureKeys = promotionFeatures.map((feature) => feature.key);

export function isPromotionFeatureKey(key) {
  return promotionFeatureKeys.includes(String(key || ''));
}

export function getPromotionFeature(key = DEFAULT_PROMOTION_KEY) {
  return promotionFeatures.find((feature) => feature.key === key) || promotionFeatures[0];
}

function validOption(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

export function buildPromotionOptions({
  featureKey = DEFAULT_PROMOTION_KEY,
  ratio = baseGenerationRatioOptions[0],
  resolution = '2K',
  ...optionInput
} = {}) {
  const feature = getPromotionFeature(featureKey);
  const defaults = promotionOptionDefaults[feature.key] || {};

  return {
    taskType: feature.taskType,
    promotionType: feature.name,
    ratio: validOption(ratio, baseGenerationRatioOptions, baseGenerationRatioOptions[0]),
    resolution: validOption(resolution, baseGenerationResolutionOptions, '2K'),
    ...defaults,
    ...optionInput,
    promptTemplate: feature.promptTemplate,
    keepSubject: true,
    forbidGeneratedText: true,
    forbidLogo: true,
    forbidPeople: true
  };
}
