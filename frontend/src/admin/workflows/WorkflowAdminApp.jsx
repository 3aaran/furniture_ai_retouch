import React from'react';
import WorkflowListPage from'./WorkflowListPage.jsx';
import WorkflowEditorPage from'./WorkflowEditorPage.jsx';
import{navigateWorkflow}from'./workflowRoute.js';

export default function WorkflowAdminApp({route,me,setMe}){
  if(me?.role!=='SYSTEM_ADMIN')return <section className="workflowAccessDenied"><h1>无权访问工作流管理</h1><button onClick={()=>location.href='/#/workbench'}>返回工作台</button></section>;
  return <div className="workflowAdminSurface">
    {route.name==='list'
      ?<WorkflowListPage me={me} onCreate={()=>navigateWorkflow('create')}/>
      :<WorkflowEditorPage key={route.id||'create'} workflowId={route.id} mode={route.name} me={me} setMe={setMe} onBack={()=>navigateWorkflow('list')}/>}
  </div>;
}
