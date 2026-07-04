import React,{useEffect}from'react';
import{createPortal}from'react-dom';

function MobileImageSavePreview({image,onClose,setMsg}){
  useEffect(()=>()=>{if(image?.revokeOnClose&&image?.url)URL.revokeObjectURL(image.url)},[image?.url,image?.revokeOnClose]);
  function close(){
    if(image?.revokeOnClose&&image?.url)URL.revokeObjectURL(image.url);
    onClose&&onClose();
  }
  async function copyLink(){
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(image?.url||'');
      setMsg&&setMsg('图片链接已复制');
    }catch{
      setMsg&&setMsg('复制失败，请手动长按图片保存');
    }
  }
  return createPortal(<div className="mobileImageSaveMask" role="dialog" aria-modal="true" aria-label="保存图片预览">
    <button className="mobileImageSaveClose" type="button" onClick={close} aria-label="关闭">×</button>
    <div className="mobileImageSaveStage">
      {image?.url?<img src={image.url} alt={image.title||'原图'} loading="lazy" decoding="async"/>:<div className="mobileImageSaveEmpty">暂无图片</div>}
    </div>
    <div className="mobileImageSaveTip">
      <b>请长按图片保存到手机</b>
      <button type="button" onClick={copyLink}>复制图片链接</button>
    </div>
  </div>,document.body);
}

export default MobileImageSavePreview;
