import React,{useState}from'react';
import{Copy,X}from'lucide-react';
import{buildExecutionJson}from'./workflowSerialization.js';
export default function WorkflowJsonModal({workflow,onClose}){const[copied,setCopied]=useState(false),json=JSON.stringify(buildExecutionJson(workflow),null,2);async function copy(){await navigator.clipboard.writeText(json);setCopied(true)}return <div className="workflowModalMask"><section className="workflowJsonModal"><header><h2>工作流 JSON 预览</h2><button onClick={onClose}><X/></button></header><pre>{json}</pre><footer><button onClick={copy}><Copy size={16}/>{copied?'已复制':'复制 JSON'}</button></footer></section></div>}
