import React from'react';
import ResourcesPageView from'./ResourcesPageView.jsx';
import useResourcesPageView from'./hooks/useResourcesPageView.jsx';

function ResourcesPage(props){
  return useResourcesPageView({...props,ResourcesPageView});
}

export default ResourcesPage;
