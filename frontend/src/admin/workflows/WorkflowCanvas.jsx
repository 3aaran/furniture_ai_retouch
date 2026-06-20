import React from 'react';
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import WorkflowNode from './WorkflowNode.jsx';

const nodeTypes = { workflowNode: WorkflowNode };

function Canvas(props) {
  const { screenToFlowPosition } = useReactFlow();
  const onDrop = event => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/workflow-node');
    if (type) props.onDropNode(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };
  return <div className="workflowCanvasPanel threeNodeCanvas">
    <ReactFlow
      nodes={props.nodes}
      edges={props.edges}
      nodeTypes={nodeTypes}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      onNodeClick={props.onNodeClick}
      onPaneClick={props.onPaneClick}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
      onDrop={onDrop}
      deleteKeyCode={['Backspace', 'Delete']}
      fitView
      snapToGrid
      snapGrid={[16, 16]}
    >
      <Controls showInteractive={false}/>
      <Background variant={BackgroundVariant.Lines} gap={24} size={1}/>
    </ReactFlow>
    <div className="workflowRuleBox">
      <b>运行规则</b>
      <span>输入节点默认开启文本，可按需开启图片、视频、音频</span>
      <span>大模型节点可串联或并联，支持文本模型、图片模型、视频模型、音频模型</span>
      <span>输出节点只返回前面节点已经产出的内容，缺少必需输入时无法运行</span>
    </div>
  </div>;
}

export default function WorkflowCanvas(props) {
  return <ReactFlowProvider><Canvas {...props}/></ReactFlowProvider>;
}
