import React from 'react';
import { FIXED_NODE_TYPES, NODE_DEFINITIONS } from './workflowDefinitions.js';
import { NODE_ICONS } from './WorkflowNode.jsx';

export default function NodeLibrary() {
  return <aside className="workflowNodeLibrary threeNodeLibrary">
    <div className="workflowPanelHead"><span>节点库</span><small>仅包含三种节点，拖拽到画布使用</small></div>
    <section>
      {FIXED_NODE_TYPES.map(type => {
        const item = NODE_DEFINITIONS[type];
        const Icon = NODE_ICONS[type];
        return <div className={`workflowLibraryItem ${type.toLowerCase()}`} draggable key={type} onDragStart={event => {
          event.dataTransfer.setData('application/workflow-node', type);
          event.dataTransfer.effectAllowed = 'move';
        }}>
          <i style={{ color: item.color }}><Icon size={19}/></i>
          <span><b>{item.label}</b><small>{item.description}</small></span>
        </div>;
      })}
    </section>
  </aside>;
}
