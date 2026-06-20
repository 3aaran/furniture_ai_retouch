export function parseWorkflowPath(pathname='/'){
  const path=String(pathname||'/').replace(/\/+$/,'')||'/';
  if(path==='/admin/workflows')return{name:'list',id:null};
  if(path==='/admin/workflows/create')return{name:'create',id:null};
  const match=path.match(/^\/admin\/workflows\/([^/]+)\/edit$/);
  return match?{name:'edit',id:decodeURIComponent(match[1])}:null;
}
export function buildWorkflowPath(name,id=null){
  if(name==='list')return'/admin/workflows';
  if(name==='create')return'/admin/workflows/create';
  if(name==='edit'&&id)return`/admin/workflows/${encodeURIComponent(id)}/edit`;
  throw new Error('不支持的工作流路由');
}
export function navigateWorkflow(name,id=null,{replace=false}={}){
  let path=buildWorkflowPath(name,id);
  if(new URLSearchParams(window.location.search).get('workflowDemo')==='1')path+='?workflowDemo=1';
  window.history[replace?'replaceState':'pushState']({},'',path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
