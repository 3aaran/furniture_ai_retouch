import React,{useCallback,useEffect,useState}from'react';
import{Copy,Edit3,Plus,Power,Search,Send,Trash2,Workflow}from'lucide-react';
import{ConfirmDialog}from'../../shared/ui/index.jsx';
import{fmt}from'../../appShared.jsx';
import{workflowRepository}from'./workflowRepository.js';
import{navigateWorkflow}from'./workflowRoute.js';

const statusName={DRAFT:'草稿',PUBLISHED:'已发布',DISABLED:'已停用'};
const typeName={IMAGE:'图片',VIDEO:'视频',MIXED:'混合'};
export default function WorkflowListPage({me,onCreate}){
  const[query,setQuery]=useState({keyword:'',status:'',type:'',page:1,pageSize:10});
  const[data,setData]=useState({items:[],total:0,page:1,pageSize:10});
  const[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[confirmState,setConfirmState]=useState(null);
  const load=useCallback(async()=>{setLoading(true);try{setData(await workflowRepository.list(query))}catch(e){setMessage(e.message)}finally{setLoading(false)}},[JSON.stringify(query)]);
  useEffect(()=>{load()},[load]);
  async function act(kind,id){
    try{
      if(kind==='copy'){const copy=await workflowRepository.duplicate(id);setMessage(`已复制为 ${copy.name}`)}
      if(kind==='publish'){const item=await workflowRepository.publish(id);setMessage(`已发布，第 ${item.version} 次`)}
      if(kind==='disable'){await workflowRepository.disable(id);setMessage('工作流已停用')}
      if(kind==='delete'){await workflowRepository.remove(id);setMessage('工作流已删除')}
      setConfirmState(null);await load();
    }catch(e){setMessage(e.message);setConfirmState(null)}
  }
  return <main className="workflowListPage">
    <section className="workflowListHero"><div><span>可视化执行模板</span><h1>工作流管理</h1><p>维护图片分析、视频生成、后处理和结果保存流程。</p></div><div><b>{data.total}</b><small>工作流模板</small><button onClick={onCreate}><Plus size={18}/>新建工作流</button></div></section>
    <div className="workflowLocalNotice">数据已连接后台数据库；带“示例”的初始工作流可以直接编辑或删除。</div>
    {message&&<div className="workflowMessage">{message}<button onClick={()=>setMessage('')}>×</button></div>}
    <section className="workflowListPanel">
      <div className="workflowFilters"><label><Search size={17}/><input value={query.keyword} placeholder="搜索名称、code、场景" onChange={e=>setQuery(q=>({...q,keyword:e.target.value,page:1}))}/></label><select value={query.status} onChange={e=>setQuery(q=>({...q,status:e.target.value,page:1}))}><option value="">全部状态</option><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="DISABLED">已停用</option></select><select value={query.type} onChange={e=>setQuery(q=>({...q,type:e.target.value,page:1}))}><option value="">全部类型</option><option value="IMAGE">图片</option><option value="VIDEO">视频</option><option value="MIXED">混合</option></select></div>
      <div className="workflowTableWrap"><table><thead><tr><th>名称</th><th>code</th><th>类型</th><th>场景</th><th>状态</th><th>版本</th><th>创建时间</th><th>更新时间</th><th>操作</th></tr></thead><tbody>
        {loading?<tr><td colSpan="9"><div className="workflowEmpty">正在加载...</div></td></tr>:data.items.length?data.items.map(item=><tr key={item.id}><td><strong>{item.name}</strong><small>{item.description}</small></td><td><code>{item.code}</code></td><td>{typeName[item.type]}</td><td>{item.scene||'-'}</td><td><span className={`workflowStatus ${item.status.toLowerCase()}`}>{statusName[item.status]}</span></td><td>{item.version} 次</td><td>{fmt(item.createdAt)}</td><td>{fmt(item.updatedAt)}</td><td><div className="workflowRowActions"><button title="编辑" onClick={()=>navigateWorkflow('edit',item.id)}><Edit3/></button><button title="复制" onClick={()=>act('copy',item.id)}><Copy/></button><button title="发布" onClick={()=>setConfirmState({kind:'publish',id:item.id,title:'发布工作流',message:'系统将校验当前内容并把状态改为已发布。'})}><Send/></button><button title="停用" onClick={()=>setConfirmState({kind:'disable',id:item.id,title:'停用工作流',message:'工作流将标记为停用，之后仍可继续编辑。'})}><Power/></button><button className="danger" title="删除" onClick={()=>setConfirmState({kind:'delete',id:item.id,title:'删除工作流',message:'此操作将从数据库永久删除当前工作流。'})}><Trash2/></button></div></td></tr>):<tr><td colSpan="9"><div className="workflowEmpty"><Workflow/>暂无匹配工作流</div></td></tr>}
      </tbody></table></div>
      <div className="workflowPager"><span>共 {data.total} 条</span><button disabled={query.page<=1} onClick={()=>setQuery(q=>({...q,page:q.page-1}))}>上一页</button><button disabled={query.page*query.pageSize>=data.total} onClick={()=>setQuery(q=>({...q,page:q.page+1}))}>下一页</button></div>
    </section>
    <ConfirmDialog open={!!confirmState} title={confirmState?.title} message={confirmState?.message} danger={confirmState?.kind==='delete'} confirmText="确认" onClose={()=>setConfirmState(null)} onConfirm={()=>act(confirmState.kind,confirmState.id)}/>
  </main>;
}
