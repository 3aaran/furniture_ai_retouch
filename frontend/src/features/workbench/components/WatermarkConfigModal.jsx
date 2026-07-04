import React,{useEffect,useMemo,useState}from'react';
import{createPortal}from'react-dom';
import{X}from'../../../shared/icons/index.jsx';
import{req}from'../../../appShared.jsx';
import{WATERMARK_TEXT,WATERMARK_SUB_TEXT}from'../../../config/appConfig.js';

const defaultConfig={
  enabled:true,
  mode:'text',
  image:'',
  imageId:'',
  fileName:'',
  text:WATERMARK_TEXT,
  subText:WATERMARK_SUB_TEXT,
  style:'signature',
  color:'#f0d68a',
  accent:'#ffffff',
  fontSize:46,
  rotate:0,
  gap:220,
  position:'center',
  offsetX:10,
  offsetY:10,
  widthPercent:23.5,
  opacity:100
};

const positions=[
  ['top-left','左上'],['top-center','上中'],['top-right','右上'],
  ['center-left','左中'],['center','居中'],['center-right','右中'],
  ['bottom-left','左下'],['bottom-center','下中'],['bottom-right','右下']
];

function placementStyle(config){
  const x=Number(config.offsetX||0);
  const y=Number(config.offsetY||0);
  const map={
    'top-left':{left:x,top:y},
    'top-center':{left:`calc(50% + ${x}px)`,top:y,transform:'translateX(-50%)'},
    'top-right':{right:x,top:y},
    'center-left':{left:x,top:'50%',transform:'translateY(-50%)'},
    center:{left:`calc(50% + ${x}px)`,top:'50%',transform:'translate(-50%,-50%)'},
    'center-right':{right:x,top:'50%',transform:'translateY(-50%)'},
    'bottom-left':{left:x,bottom:y},
    'bottom-center':{left:`calc(50% + ${x}px)`,bottom:y,transform:'translateX(-50%)'},
    'bottom-right':{right:x,bottom:y}
  };
  return map[config.position]||map.center;
}

function TextWatermarkPreview({config,watermarkStyle}){
  if(config.style==='tile'){
    const items=Array.from({length:40});
    return <div
      className="watermarkPreviewTile"
      style={{
        color:config.color,
        opacity:Number(config.opacity||0)/100,
        fontSize:`${Math.max(16,Number(config.fontSize||46)*0.34)}px`,
        transform:`rotate(${Number(config.rotate||0)}deg)`,
        gap:`${Math.max(14,Number(config.gap||220)*0.12)}px`
      }}
    >
      {items.map((_,index)=><span key={index}>{config.text||'文字水印'}{config.subText?<small>{config.subText}</small>:null}</span>)}
    </div>;
  }
  return <div className={`watermarkPreviewText ${config.style||'signature'}`} style={{...watermarkStyle,color:config.color,fontSize:`${Math.max(18,Number(config.fontSize||46)*0.55)}px`,transform:`${watermarkStyle.transform||''} rotate(${Number(config.rotate||0)}deg)`}}>
    <b>{config.text||'文字水印'}</b>
    {config.subText&&<small style={{color:config.accent}}>{config.subText}</small>}
  </div>;
}

export function WatermarkConfigModal({open,onClose,setMsg}){
  const[config,setConfig]=useState(defaultConfig);
  const[canConfigure,setCanConfigure]=useState(true);
  const[loading,setLoading]=useState(false);
  const[saving,setSaving]=useState(false);

  useEffect(()=>{
    if(!open)return;
    setLoading(true);
    req('/api/watermark/settings')
      .then(data=>{
        setCanConfigure(!!data.canConfigure);
        setConfig({...defaultConfig,...(data.config||{}),mode:'text',enabled:data.enabled!==false});
      })
      .catch(error=>setMsg&&setMsg(error.message||'读取水印配置失败'))
      .finally(()=>setLoading(false));
  },[open,setMsg]);

  const watermarkStyle=useMemo(()=>({
    ...placementStyle(config),
    width:`${config.widthPercent}%`,
    opacity:Number(config.opacity||0)/100
  }),[config]);

  if(!open)return null;

  function update(key,value){
    setConfig(prev=>({...prev,[key]:value}));
  }

  async function save(){
    if(!canConfigure){
      setMsg&&setMsg('只有门店管理员可以配置门店水印');
      return;
    }
    if(!String(config.text||'').trim()){
      setMsg&&setMsg('请填写文字水印内容');
      return;
    }
    try{
      setSaving(true);
      await req('/api/watermark/settings',{method:'PUT',body:JSON.stringify({enabled:!!config.enabled,name:'门店水印',config:{...config,mode:'text',image:'',imageId:'',storageKey:'',fileName:''}})});
      setMsg&&setMsg('水印配置已保存');
      onClose&&onClose();
    }catch(error){
      setMsg&&setMsg(error.message||'水印配置保存失败');
    }finally{
      setSaving(false);
    }
  }

  return createPortal(
    <div className="watermarkMask" role="dialog" aria-modal="true">
      <div className="watermarkModal">
        <header className="watermarkHead">
          <h2>门店水印配置</h2>
          <button type="button" onClick={onClose} aria-label="关闭"><X size={22}/></button>
        </header>

        {!canConfigure?
          <div className="watermarkBody">
            <section className="watermarkControls"/>
          </div>
          :
          <div className="watermarkBody">
            <section className="watermarkControls">
              <div className="watermarkFieldTitle">当前应用水印</div>
              <p className="watermarkHint">当前仅支持文字水印，保存/下载时会临时合成到图片文件。</p>
              <div className="watermarkTextFields">
                <label>主文字<input value={config.text||''} onChange={event=>update('text',event.target.value)} maxLength={40}/></label>
                <label>副文字<input value={config.subText||''} onChange={event=>update('subText',event.target.value)} maxLength={40} placeholder="可选"/></label>
                <label>样式<select value={config.style||'signature'} onChange={event=>update('style',event.target.value)}>
                  <option value="signature">签名</option>
                  <option value="badge">徽章</option>
                  <option value="corner">角标</option>
                  <option value="tile">平铺</option>
                </select></label>
                <div className="watermarkColorGrid">
                  <label>主色<input type="color" value={config.color||'#f0d68a'} onChange={event=>update('color',event.target.value)}/></label>
                  <label>辅色<input type="color" value={config.accent||'#ffffff'} onChange={event=>update('accent',event.target.value)}/></label>
                </div>
              </div>

              <div className="watermarkFieldTitle">位置</div>
              <div className="watermarkPositionGrid">
                {positions.map(([key,label])=>
                  <button type="button" key={key} className={config.position===key?'active':''} onClick={()=>update('position',key)}>{label}</button>
                )}
              </div>

              <div className="watermarkSliderGrid">
                <label>字号 <b>{config.fontSize}</b><input type="range" min="20" max="96" value={config.fontSize} onChange={event=>update('fontSize',Number(event.target.value))}/></label>
                <label>透明度 <b>{config.opacity}%</b><input type="range" min="10" max="100" value={config.opacity} onChange={event=>update('opacity',Number(event.target.value))}/></label>
                <label>旋转 <b>{config.rotate}°</b><input type="range" min="-45" max="45" value={config.rotate} onChange={event=>update('rotate',Number(event.target.value))}/></label>
                {config.style==='tile'&&<label>间距 <b>{config.gap}</b><input type="range" min="100" max="420" value={config.gap} onChange={event=>update('gap',Number(event.target.value))}/></label>}
                <label>X 偏移<input type="number" value={config.offsetX} onChange={event=>update('offsetX',Number(event.target.value)||0)}/></label>
                <label>Y 偏移<input type="number" value={config.offsetY} onChange={event=>update('offsetY',Number(event.target.value)||0)}/></label>
              </div>
            </section>

            <section className="watermarkPreview">
              <div className="watermarkPreviewStage">
                <div className="watermarkPreviewImage"><span>示例图片</span></div>
                <TextWatermarkPreview config={{...config,mode:'text'}} watermarkStyle={watermarkStyle}/>
              </div>
            </section>
          </div>}

        <footer className="watermarkFoot">
          <button type="button" onClick={onClose}>取消</button>
          <button className="primary" type="button" disabled={loading||saving||!canConfigure} onClick={save}>
            {saving?'保存中':'保存配置'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

export default WatermarkConfigModal;
