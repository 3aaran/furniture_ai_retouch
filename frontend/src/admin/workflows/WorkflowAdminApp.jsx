import React from'react';
import{ArrowLeft,LayoutDashboard,LogOut,Workflow}from'lucide-react';
import BrandMark from'../../components/BrandMark.jsx';
import WorkflowListPage from'./WorkflowListPage.jsx';
import WorkflowEditorPage from'./WorkflowEditorPage.jsx';
import{navigateWorkflow}from'./workflowRoute.js';

export default function WorkflowAdminApp({route,me,setMe}){
  if(me?.role!=='SYSTEM_ADMIN')return <section className="workflowAccessDenied"><h1>无权访问工作流管理</h1><button onClick={()=>location.href='/#/workbench'}>返回工作台</button></section>;
  const logout=()=>{localStorage.removeItem('token');location.href='/#/login'};
  return <div className="workflowAdminSurface">
    <header className="workflowAdminTopbar">
      <button className="workflowBrand" onClick={()=>location.href='/#/dashboard'}><BrandMark/><span><b>勋钢 AI</b><small>管理员工作流中心</small></span></button>
      <nav><button onClick={()=>location.href='/#/dashboard'}><LayoutDashboard size={17}/>管理后台</button><button className="active" onClick={()=>navigateWorkflow('list')}><Workflow size={17}/>工作流管理</button></nav>
      <div><span>{me.displayName||me.username||'系统管理员'}</span><button onClick={logout}><LogOut size={17}/>退出</button></div>
    </header>
    {route.name==='list'
      ?<WorkflowListPage me={me} onCreate={()=>navigateWorkflow('create')}/>
      :<WorkflowEditorPage key={route.id||'create'} workflowId={route.id} mode={route.name} me={me} setMe={setMe} onBack={()=>navigateWorkflow('list')}/>}
  </div>;
}
