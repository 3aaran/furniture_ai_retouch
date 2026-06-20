import React, { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { workflowRepository } from './workflowRepository.js';

const terminal = status => ['succeeded', 'failed'].includes(status);

export default function WorkflowRunPanel({ workflow, onClose }) {
  const [originImageId, setOriginImageId] = useState('');
  const [run, setRun] = useState(null);
  const [message, setMessage] = useState('');
  const runId = run?.id || '';
  const status = run?.status || '';

  useEffect(() => {
    if (!runId || terminal(status)) return undefined;
    const timer = setInterval(() => {
      workflowRepository.getRun(runId).then(setRun).catch(error => setMessage(error.message));
    }, 1000);
    return () => clearInterval(timer);
  }, [runId, status]);

  async function startRun() {
    try {
      setMessage('');
      setRun(await workflowRepository.run(workflow.id, { originImageId: originImageId.trim() }));
    } catch (error) {
      setMessage(error.message);
    }
  }

  const runnable = workflow.status === 'PUBLISHED' && workflow.id && originImageId.trim();
  return <div className="workflowModalMask">
    <section className="workflowRunPanel">
      <header><div><Play/><h2>测试运行</h2></div><button onClick={onClose}><X/></button></header>
      <div className="workflowRunBody">
        <label><span>原图 ID</span><input value={originImageId} onChange={event => setOriginImageId(event.target.value)} placeholder="输入当前账号有权使用的图片 ID"/></label>
        <button className="workflowRunStart" disabled={!runnable || (run && !terminal(status))} onClick={startRun}>开始运行</button>
        {workflow.status !== 'PUBLISHED' && <p className="workflowRunHint">请先保存、校验并发布工作流。</p>}
        {message && <p className="workflowRunError">{message}</p>}
        {run && <div className="workflowRunResult">
          <p><b>运行状态</b><span>{run.status}</span></p>
          <p><b>最终图片</b><span>{run.resultImageId || '-'}</span></p>
          {run.errorMessage && <p className="workflowRunError">{run.errorMessage}</p>}
          <h3>节点状态</h3>
          <ol>{(run.nodes || []).map(node => <li key={node.id || node.nodeId}>
            <strong>{node.nodeType}</strong><em>{node.status}</em>
            <small>输入：{node.inputImageId || '-'} · 输出：{node.outputImageId || '-'} · AI任务：{node.aiTaskId || '-'}</small>
          </li>)}</ol>
        </div>}
      </div>
    </section>
  </div>;
}
