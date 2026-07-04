import {featureConfig} from '../../../config/featureConfig.jsx';
import {promotionFeatures} from '../../../store/workbench/promotionFeatures.js';

export const BASE_RATIO_OPTIONS=['自适应','1:1','4:3','3:4','16:9'];
export const BASE_RESOLUTION_OPTIONS=['1K','2K','4K'];

export function buildWorkbenchOps(){
  const baseOps=Object.fromEntries(Object.entries(featureConfig).map(([key,item])=>[key,{label:item.name,desc:item.desc,cost:item.defaultCost}]));
  const promotionCostFallback={
    promo_main_image:baseOps.replace_bg?.cost,
    promo_poster_image:baseOps.replace_bg?.cost,
    promo_detail_image:baseOps.enhance?.cost
  };
  const promotionOps=Object.fromEntries(promotionFeatures.map(item=>[item.key,{label:item.name,desc:item.desc,cost:promotionCostFallback[item.key]??12}]));
  return {...baseOps,...promotionOps};
}
