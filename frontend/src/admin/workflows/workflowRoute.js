export function parseWorkflowPath(pathname='/'){
  const path=String(pathname||'/').replace(/\/+$/,'')||'/';
  if(path==='/admin/workflows')return{name:'list',id:null};
  if(path==='/admin/workflows/create')return{name:'create',id:null};
  const match=path.match(/^\/admin\/workflows\/([^/]+)\/edit$/);
  return match?{name:'edit',id:decodeURIComponent(match[1])}:null;
}

export function parseWorkflowHash(hash=''){
  const path=String(hash||'').replace(/^#\/?/,'').split('?')[0].replace(/\/+$/,'');
  if(path==='workflows')return{name:'list',id:null};
  if(path==='workflows/create')return{name:'create',id:null};
  const match=path.match(/^workflows\/([^/]+)\/edit$/);
  return match?{name:'edit',id:decodeURIComponent(match[1])}:null;
}

export function buildWorkflowPath(name,id=null){
  if(name==='list')return'#/workflows';
  if(name==='create')return'#/workflows/create';
  if(name==='edit'&&id)return`#/workflows/${encodeURIComponent(id)}/edit`;
  throw new Error('不支持的工作流路由');
}

export function redirectLegacyWorkflowPath(){
  if(typeof window==='undefined')return false;
  const route=parseWorkflowPath(window.location.pathname);
  if(!route)return false;
  const query=window.location.search||'';
  window.history.replaceState({},'',`/${query}${buildWorkflowPath(route.name,route.id)}`);
  return true;
}

export function navigateWorkflow(name,id=null,{replace=false}={}){
  const path=buildWorkflowPath(name,id);
  window.history[replace?'replaceState':'pushState']({},'',path);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
