import React,{useEffect,useMemo,useState}from'react';
import{ArrowLeft,Play,Save}from'lucide-react';
import{addEdge,applyEdgeChanges,applyNodeChanges}from'@xyflow/react';
import{ConfirmDialog}from'../../shared/ui/index.jsx';
import{createBlankWorkflow,createNode}from'./workflowDefinitions.js';
import{workflowRepository}from'./workflowRepository.js';
import{navigateWorkflow}from'./workflowRoute.js';
import{validateWorkflow}from'./workflowValidation.js';
import NodeLibrary from'./NodeLibrary.jsx';
import WorkflowCanvas from'./WorkflowCanvas.jsx';
import NodeConfigPanel from'./NodeConfigPanel.jsx';
import WorkflowJsonModal from'./WorkflowJsonModal.jsx';
import WorkflowValidationModal from'./WorkflowValidationModal.jsx';
import WorkflowRunPanel from'./WorkflowRunPanel.jsx';

export default function WorkflowEditorPage({workflowId,mode,me,onBack}){
  const[workflow,setWorkflow]=useState(null),[selectedNodeId,setSelectedNodeId]=useState(null),[dirty,setDirty]=useState(false),[message,setMessage]=useState(''),[validation,setValidation]=useState({valid:true,errors:[]}),[validationOpen,setValidationOpen]=useState(false),[jsonOpen,setJsonOpen]=useState(false),[runOpen,setRunOpen]=useState(false),[confirmState,setConfirmState]=useState(null);
  useEffect(()=>{(async()=>{if(mode==='edit'){const item=await workflowRepository.get(workflowId);if(!item)return onBack();setWorkflow(item)}else setWorkflow(createBlankWorkflow())})().catch(e=>setMessage(e.message))},[workflowId,mode]);
  useEffect(()=>{const handler=event=>{if(!dirty)return;event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty]);
  const selectedNode=useMemo(()=>workflow?.canvasJson.nodes.find(node=>node.id===selectedNodeId)||null,[workflow,selectedNodeId]);
  const changeWorkflow=(field,value)=>{setWorkflow(w=>({...w,[field]:value}));setDirty(true)};
  const changeSelectedNode=patch=>{setWorkflow(w=>({...w,canvasJson:{...w.canvasJson,nodes:w.canvasJson.nodes.map(node=>node.id===selectedNodeId?{...node,data:{...node.data,...patch}}:node)}}));setDirty(true)};
  const updateGraph=fn=>{setWorkflow(w=>({...w,canvasJson:fn(w.canvasJson)}));setDirty(true)};
  const onNodesChange=changes=>updateGraph(graph=>({...graph,nodes:applyNodeChanges(changes,graph.nodes)}));
  const onEdgesChange=changes=>updateGraph(graph=>({...graph,edges:applyEdgeChanges(changes,graph.edges)}));
  const onConnect=connection=>updateGraph(graph=>({...graph,edges:addEdge({...connection,id:`edge-${connection.source}-${connection.target}-${Date.now()}`,type:'smoothstep'},graph.edges)}));
  const onDropNode=(type,position)=>updateGraph(graph=>({...graph,nodes:[...graph.nodes,createNode(type,{position})]}));
  function applyValidation(result){
    setValidation(result);
    setWorkflow(w=>({...w,canvasJson:{...w.canvasJson,nodes:w.canvasJson.nodes.map(node=>({...node,data:{...node.data,validationErrors:result.errors.filter(error=>error.nodeId===node.id)}}))}}));
  }
  function runValidation(){const result=validateWorkflow(workflow);applyValidation(result);setValidationOpen(true);return result}
  function runTest(){const result=runValidation();setMessage(result.valid?'前端校验通过，可以运行测试。':result.errors[0]?.message||'工作流配置有误。')}
  async function saveDraft(){
    const saved=mode==='create'||!workflowId?await workflowRepository.create(workflow):await workflowRepository.update(workflow.id,workflow);
    setWorkflow(saved);setDirty(false);setMessage('工作流已保存');
    if(mode==='create'||!workflowId)navigateWorkflow('edit',saved.id,{replace:true});
    return saved;
  }
  async function publish(){
    try{
      let saved=workflow;
      if(mode==='create'||!workflowId)saved=await workflowRepository.create(workflow);else saved=await workflowRepository.update(workflow.id,workflow);
      const result=validateWorkflow(saved);applyValidation(result);
      if(!result.valid){setValidationOpen(true);setConfirmState(null);return}
      const published=await workflowRepository.publish(saved.id);setWorkflow(published);setDirty(false);setConfirmState(null);setMessage(`已发布，第 ${published.version} 次`);
      if(mode==='create'||!workflowId)navigateWorkflow('edit',published.id,{replace:true});
    }catch(e){setMessage(e.message);setConfirmState(null)}
  }
  function back(){if(dirty)setConfirmState({kind:'back'});else onBack()}
  if(!workflow)return <div className="workflowEditorLoading">正在加载工作流...</div>;
  return <main className="workflowEditorPage">
    <header className="workflowEditorToolbar">
      <button onClick={back}><ArrowLeft size={17}/>返回</button>
      <div className="workflowEditorTitle"><span><b>{workflow.name||'未命名工作流'}</b><small>三节点工作流编辑器</small></span></div>
      <div className="workflowGraphStats">{workflow.canvasJson.nodes.length} 节点 · {workflow.canvasJson.edges.length} 连线</div>
      <div className="workflowToolbarActions"><button className="saveOutline" onClick={()=>saveDraft().catch(e=>setMessage(e.message))}><Save size={17}/>保存</button><button className="primary" onClick={runTest}><Play size={17}/>运行测试</button></div>
    </header>
    {message&&<div className="workflowEditorMessage">{message}<button onClick={()=>setMessage('')}>×</button></div>}
    <div className="workflowEditorLayout">
      <NodeLibrary/>
      <WorkflowCanvas nodes={workflow.canvasJson.nodes} edges={workflow.canvasJson.edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_,node)=>setSelectedNodeId(node.id)} onPaneClick={()=>setSelectedNodeId(null)} onDropNode={onDropNode} selectedNodeId={selectedNodeId}/>
      <NodeConfigPanel workflow={workflow} selectedNode={selectedNode} validationErrors={validation.errors} onWorkflowChange={changeWorkflow} onNodeChange={changeSelectedNode}/>
    </div>
    {jsonOpen&&<WorkflowJsonModal workflow={workflow} onClose={()=>setJsonOpen(false)}/>}
    {validationOpen&&<WorkflowValidationModal result={validation} onClose={()=>setValidationOpen(false)} onFocusNode={id=>{setSelectedNodeId(id);setValidationOpen(false)}}/>}
    {runOpen&&<WorkflowRunPanel workflow={workflow} onClose={()=>setRunOpen(false)}/>}
    <ConfirmDialog open={!!confirmState} title={confirmState?.kind==='publish'?'发布工作流':'放弃未保存修改'} message={confirmState?.kind==='publish'?'系统将校验当前内容，并直接更新这条工作流的发布状态。':'返回列表后，本次未保存修改将丢失。'} danger={confirmState?.kind==='back'} confirmText={confirmState?.kind==='publish'?'确认发布':'放弃修改'} onClose={()=>setConfirmState(null)} onConfirm={()=>confirmState?.kind==='publish'?publish():onBack()}/>
  </main>;
}
