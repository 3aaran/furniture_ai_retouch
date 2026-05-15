import React from'react';
import{fmt}from'../../appShared.jsx';

export function TrialAccountTicket({trialTicket,onClose,onCopyAll}){
  if(!trialTicket)return null;
  return (
    <div className="trialTicketMaskV2">
      <div className="trialTicketCardV2">
        <button className="trialTicketCloseV2" onClick={onClose}>×</button>
        <div className="trialToastV2">✓ 体验账号已生成</div>
        <h2>体验账号已准备就绪</h2>
        <p>已成功申请临时算力补给。请将下方凭据发送给用户。<br/>有效期内可访问所有核心功能。</p>
        <div className="trialCredBoxV2">
          <label>账号</label>
          <div><b>{trialTicket.username}</b><button onClick={()=>navigator.clipboard?.writeText(trialTicket.username)}>复制</button></div>
          <label>密码</label>
          <div><b>{trialTicket.password}</b><button onClick={()=>navigator.clipboard?.writeText(trialTicket.password)}>复制</button></div>
          <footer><span>初始算力：<em>{trialTicket.quota||50}</em></span><span>到期：{trialTicket.expireAt?fmt(trialTicket.expireAt):'按系统配置'}</span></footer>
        </div>
        <button className="trialCopyAllV2" onClick={onCopyAll}>复制完整凭据给用户</button>
        <button className="trialLaterV2" onClick={onClose}>稍后处理</button>
      </div>
    </div>
  );
}
