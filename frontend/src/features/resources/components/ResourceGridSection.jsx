import React from 'react';
import {imageListUrl} from '../../../appShared.jsx';
import {WheelNumberPager} from '../../../shared/effects/index.jsx';
import ResourceCard from '../../../store/resources/ResourceCard.jsx';
import {normalizeResourceMain,normalizeResourceSub} from '../../../store/resources/resourceModel.js';

function resourceImageUrl(resource){
  if(resource.localPreviewUrl)return resource.localPreviewUrl;
  if(!resource.imageUrl)return '';
  return imageListUrl(resource);
}

function ResourceGridSection({
  displayItems,
  space,
  canManageCurrentSpace,
  selectedResourceIds,
  toggleResourceSelected,
  onPreview,
  openRename,
  total,
  currentPage,
  totalPages,
  changePage
}){
  return <section className="resourceGridPanelV3">
    <div className="resourceGridV3">
      {displayItems.length?displayItems.map(resource=><ResourceCard
        key={space+'-'+resource.id}
        resource={resource}
        space={space}
        url={resourceImageUrl(resource)}
        canManage={canManageCurrentSpace&&resource.source!=='GENERATED_IMAGE'}
        checked={selectedResourceIds.has(String(resource.id))}
        onSelect={toggleResourceSelected}
        onPreview={onPreview}
        onRename={openRename}
        normalizeResourceMain={normalizeResourceMain}
        normalizeResourceSub={normalizeResourceSub}
      />):<div className="empty big resourceEmptyV3">当前空间暂无资源或生成图片</div>}
    </div>

    <div className="resourcePagerV3">
      <div className="resourceTotalV3">共 {total} 条</div>
      <WheelNumberPager currentPage={currentPage} totalPages={totalPages} onChange={changePage}/>
    </div>
  </section>;
}

export default ResourceGridSection;
