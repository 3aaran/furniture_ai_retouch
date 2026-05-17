import React from'react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText='确认',
  cancelText='取消',
  danger=false,
  onConfirm,
  onClose
}){
  if(!open)return null;
  return <div className="resourceCategoryModalMaskV8" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.();}}>
    <div className={`resourceCategoryModalV8 ${danger?'danger':''}`} role="dialog" aria-modal="true" aria-label={title||'确认'}>
      {title&&<h2>{title}</h2>}
      {message&&<p className="resourceCategoryModalTextV8">{message}</p>}
      <div className="resourceCategoryModalActionsV8">
        <button type="button" onClick={onClose}>{cancelText}</button>
        <button type="button" className={danger?'danger':'primary'} onClick={onConfirm}>{confirmText}</button>
      </div>
    </div>
  </div>;
}
