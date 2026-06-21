import React from 'react';
import { Bot, FileInput, FileOutput, Sparkles } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import { NODE_DEFINITIONS } from './workflowDefinitions.js';
import {getWorkflowNodeDisplayLines,getWorkflowNodeTitleLines} from './workflowPresentation.js';

export const NODE_ICONS = {
  INPUT_NODE: FileInput,
  MODEL_NODE: Bot,
  OUTPUT_NODE: FileOutput
};

export default function WorkflowNode({ data, selected }) {
  const Icon = NODE_ICONS[data.nodeType] || Sparkles;
  const definition = NODE_DEFINITIONS[data.nodeType] || { color: '#ff7474', label: '未知节点' };
  const errors = data.validationErrors || [];
  const titleLines = getWorkflowNodeTitleLines(data);
  const displayLines = getWorkflowNodeDisplayLines(data);
  return <div className={`workflowNodeCard threeNodeCard ${selected ? 'selected' : ''} ${errors.length ? 'hasError' : ''} ${data.nodeType?.toLowerCase() || ''}`}>
    {data.nodeType !== 'INPUT_NODE' && <Handle type="target" position={Position.Left}/>} 
    <header>
      <i style={{ background: `${definition.color}22`, color: definition.color }}><Icon size={20}/></i>
      <span>{titleLines.map((line, index) => index === 0 ? <b key={line}>{line}</b> : <strong key={line}>{line}</strong>)}</span>
      {errors.length > 0 && <em>{errors.length}</em>}
    </header>
    <div className="workflowNodeLines">
      {displayLines.map(line => <p key={line}>{line}</p>)}
    </div>
    {data.nodeType !== 'OUTPUT_NODE' && <Handle type="source" position={Position.Right}/>} 
  </div>;
}
