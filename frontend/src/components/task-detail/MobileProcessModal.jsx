import React from 'react';

export default function MobileProcessModal({
  detail,
  previewUrl,
  hasResult,
  result,
  imgSize,
  cropX,
  cropY,
  cropW,
  cropH,
  advancedMode,
  format,
  quality,
  maxWidth,
  processing,
  canSubmit,
  setAdvancedMode,
  setFormat,
  setQuality,
  setMaxWidth,
  onImageLoad,
  onClose,
  onSubmit,
  onCopySourceName
}){
  const sourceName=detail.originalName||String(detail.id||'');
  const advancedOptions=[
    ['none','不处理','不开启高级处理'],
    ['remove_bg','智能抠图','适合白底或浅色背景'],
    ['compress','图片压缩','重新编码并缩小尺寸'],
    ['convert','格式转换','输出 PNG / JPG / WebP']
  ];
  return <div className="mobileProcessMask">
    <section className="mobileProcessPanel" role="dialog" aria-modal="true" aria-label="处理参数">
      <header className="mobileProcessHeader">
        <div>
          <b>处理参数</b>
          <span>{processing?'正在处理':'移动端参数'}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>

      <main className="mobileProcessScroll">
        <section className="mobileProcessSource">
          <span>当前来源</span>
          <div>
            <b title={sourceName}>{sourceName}</b>
            <button type="button" onClick={onCopySourceName}>复制</button>
          </div>
        </section>

        <section className="mobileProcessPreview">
          <div className="mobileProcessPreviewHead">
            <span>图片预览</span>
            <em>{hasResult?`${result.width||'-'} × ${result.height||'-'}`:(imgSize.w&&imgSize.h?`${imgSize.w} × ${imgSize.h}`:'加载中')}</em>
          </div>
          <div className="mobileProcessStage">
            {previewUrl?<img src={previewUrl} onLoad={onImageLoad} alt={sourceName||'处理图片'} loading="lazy" decoding="async"/>:<div>暂无图片</div>}
          </div>
        </section>

        <section className="mobileProcessCard">
          <h3>基础处理</h3>
          <div className="mobileProcessSummary">
            <p><span>处理方式</span><b>移动端仅查看裁剪参数</b></p>
            <p><span>说明</span><b>裁剪拖拽编辑请在电脑端使用</b></p>
          </div>
        </section>

        <section className="mobileProcessCard">
          <h3>裁剪参数</h3>
          <div className="mobileProcessFieldList">
            <label><span>裁剪宽度</span><input type="text" value={cropW?`${cropW}px`:'未加载'} readOnly /></label>
            <label><span>裁剪高度</span><input type="text" value={cropH?`${cropH}px`:'未加载'} readOnly /></label>
            <label><span>X 坐标</span><input type="text" value={`${cropX}px`} readOnly /></label>
            <label><span>Y 坐标</span><input type="text" value={`${cropY}px`} readOnly /></label>
          </div>
        </section>

        <section className="mobileProcessCard">
          <h3>其他参数</h3>
          <div className="mobileProcessOptions">
            {advancedOptions.map(([k,b,s])=><button key={k} type="button" className={advancedMode===k?'active':''} onClick={()=>setAdvancedMode(k)}>
              <div><b>{b}</b><small>{s}</small></div>
              <span>{advancedMode===k?'●':'○'}</span>
            </button>)}
          </div>
          {(advancedMode==='compress'||advancedMode==='convert')&&<div className="mobileProcessFieldList">
            <label><span>输出格式</span><select value={format} onChange={e=>setFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></label>
            <label><span>输出质量：{quality}%</span><input type="range" min="30" max="100" value={quality} onChange={e=>setQuality(e.target.value)}/></label>
            {advancedMode==='compress'&&<label><span>最大宽度：{maxWidth}px</span><input type="range" min="800" max="2400" step="100" value={maxWidth} onChange={e=>setMaxWidth(Number(e.target.value))}/></label>}
          </div>}
        </section>

        {hasResult&&<section className="mobileProcessCard mobileProcessResult">
          <h3>处理结果</h3>
          <p>输出尺寸：{result.width||'-'} × {result.height||'-'}</p>
        </section>}
      </main>

      <footer className="mobileProcessFooter">
        <button type="button" className="ghost" onClick={onClose}>取消</button>
        <button type="button" className="primary" disabled={!canSubmit} onClick={onSubmit}>{processing?'处理中':'确认应用'}</button>
      </footer>
    </section>
  </div>;
}
