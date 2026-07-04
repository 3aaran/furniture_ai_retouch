import React from'react';
import WorkbenchPageView from'./WorkbenchPageView.jsx';
import useWorkbenchPageView from'./hooks/useWorkbenchPageView.jsx';

function WorkbenchPage(props){
  return useWorkbenchPageView({...props,WorkbenchPageView});
}

export default WorkbenchPage;
