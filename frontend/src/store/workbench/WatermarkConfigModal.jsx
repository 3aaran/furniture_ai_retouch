import React,{useEffect,useMemo,useState}from'react';
import{createPortal}from'react-dom';
import{X}from'lucide-react';
import{API,req,reqForm}from'../../appShared.jsx';
import{WATERMARK_TEXT,WATERMARK_SUB_TEXT}from'../../config/appConfig.js';

const defaultConfig={
  enabled:true,
  mode:'image',
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

function srcOf(url=''){
  if(!url)return '';
  return String(url).startsWith('http')||String(url).startsWith('data:')?url:API+url;
}

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

export function WatermarkConfigModal({open,onClose,setMsg}){
  const[config,setConfig]=useState(defaultConfig);
  const[canConfigure,setCanConfigure]=useState(true);
  const[loading,setLoading]=useState(false);
  const[saving,setSaving]=useState(false);
  const[uploading,setUploading]=useState(false);

  useEffect(()=>{
    if(!open)return;
    setLoading(true);
    req('/api/watermark/settings')
      .then(d=>{
        setCanConfigure(!!d.canConfigure);
        setConfig({...defaultConfig,...(d.config||{}),enabled:d.enabled!==false});
      })
      .catch(e=>setMsg&&setMsg(e.message||'读取水印配置失败'))
      .finally(()=>setLoading(false));
  },[open,setMsg]);

  const watermarkStyle=useMemo(()=>({
    ...placementStyle(config),
    width:`${config.widthPercent}%`,
    opacity:Number(config.opacity||0)/100
  }),[config]);

  if(!open)return null;

  function update(k,v){
    setConfig(prev=>({...prev,[k]:v}));
  }

  async function chooseImage(e){
    const file=e.target.files?.[0];
    e.target.value='';
    if(!file)return;
    if(file.size>5*1024*1024){
      setMsg&&setMsg('水印图片不能超过 5MB');
      return;
    }
    try{
      setUploading(true);
      const form=new FormData();
      form.append('image',file);
      const d=await reqForm('/api/watermark/image',form);
      setConfig(prev=>({...prev,enabled:true,mode:'image',image:d.url,imageId:d.id,fileName:file.name}));
      setMsg&&setMsg('水印图片已上传');
    }catch(err){
      setMsg&&setMsg(err.message||'水印图片上传失败');
    }finally{
      setUploading(false);
    }
  }

  async function save(){
    if(!canConfigure){
      setMsg&&setMsg('只有门店管理员可以配置门店水印');
      return;
    }
    if(config.mode==='image'&&!config.image){
      setMsg&&setMsg('请先上传图片水印，或切换为文字水印');
      return;
    }
    if(config.mode==='text'&&!String(config.text||'').trim()){
      setMsg&&setMsg('请填写文字水印内容，或切换为图片水印');
      return;
    }
    try{
      setSaving(true);
      await req('/api/watermark/settings',{method:'PUT',body:JSON.stringify({enabled:!!config.enabled,name:'门店水印',config})});
      setMsg&&setMsg('水印配置已保存');
      onClose&&onClose();
    }catch(e){
      setMsg&&setMsg(e.message||'水印配置保存失败');
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
            <section className="watermarkControls">
              <p className="watermarkHint">只有门店管理员可以配置门店水印。</p>
            </section>
          </div>
          :
          <div className="watermarkBody">
            <section className="watermarkControls">
              <div className="watermarkFieldTitle">当前应用水印</div>
              <div className="watermarkModeTabs">
                <button type="button" className={config.mode==='image'?'active':''} onClick={()=>update('mode','image')}>图片水印</button>
                <button type="button" className={config.mode==='text'?'active':''} onClick={()=>update('mode','text')}>文字水印</button>
              </div>
              <p className="watermarkHint">图片水印和文字水印会同时保存，但下载时只应用当前选中的一种。</p>

              {config.mode==='text'?
                <div className="watermarkTextFields">
                  <label>主文字<input value={config.text||''} onChange={e=>update('text',e.target.value)} maxLength={40}/></label>
                  <label>副文字<input value={config.subText||''} onChange={e=>update('subText',e.target.value)} maxLength={40} placeholder="可选"/></label>
                  <label>样式<select value={config.style||'signature'} onChange={e=>update('style',e.target.value)}>
                    <option value="signature">签名</option>
                    <option value="badge">徽章</option>
                    <option value="corner">角标</option>
                    <option value="tile">平铺</option>
                  </select></label>
                  <div className="watermarkColorGrid">
                    <label>主色<input type="color" value={config.color||'#f0d68a'} onChange={e=>update('color',e.target.value)}/></label>
                    <label>辅色<input type="color" value={config.accent||'#ffffff'} onChange={e=>update('accent',e.target.value)}/></label>
                  </div>
                </div>
                :
                <>
                  <div className="watermarkFieldTitle">水印图片</div>
                  <label className="watermarkUpload">
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={chooseImage}/>
                    {config.image?
                      <div className="watermarkUploadPreview">
                        <img src={srcOf(config.image)} alt="水印"/>
                        <button type="button" onClick={e=>{e.preventDefault();update('image','');update('imageId','');update('fileName','');}}>清除</button>
                      </div>
                      :
                      <><b>+</b><span>{uploading?'上传中':'上传'}</span></>}
                  </label>
                  <p className="watermarkHint">支持 PNG、JPG、JPEG、WebP，最大 5MB。上传后会同步进入资源库。</p>
                </>}

              <div className="watermarkFieldTitle">位置</div>
              <div className="watermarkPositionGrid">
                {positions.map(([key,label])=>
                  <button type="button" key={key} className={config.position===key?'active':''} onClick={()=>update('position',key)}>{label}</button>
                )}
              </div>

              <div className="watermarkSliderGrid">
                {config.mode==='text'?
                  <label>字号 <b>{config.fontSize}</b><input type="range" min="20" max="96" value={config.fontSize} onChange={e=>update('fontSize',Number(e.target.value))}/></label>
                  :
                  <label>水印宽度 <b>{config.widthPercent}%</b><input type="range" min="5" max="60" step="0.5" value={config.widthPercent} onChange={e=>update('widthPercent',Number(e.target.value))}/></label>}
                <label>透明度 <b>{config.opacity}%</b><input type="range" min="10" max="100" value={config.opacity} onChange={e=>update('opacity',Number(e.target.value))}/></label>
                {config.mode==='text'&&<label>旋转 <b>{config.rotate}°</b><input type="range" min="-45" max="45" value={config.rotate} onChange={e=>update('rotate',Number(e.target.value))}/></label>}
                {config.mode==='text'&&config.style==='tile'&&<label>间距 <b>{config.gap}</b><input type="range" min="100" max="420" value={config.gap} onChange={e=>update('gap',Number(e.target.value))}/></label>}
                <label>X 偏移<input type="number" value={config.offsetX} onChange={e=>update('offsetX',Number(e.target.value)||0)}/></label>
                <label>Y 偏移<input type="number" value={config.offsetY} onChange={e=>update('offsetY',Number(e.target.value)||0)}/></label>
              </div>
            </section>

            <section className="watermarkPreview">
              <div className="watermarkPreviewStage">
                <div className="watermarkPreviewImage"><span>示例图片</span></div>
                {config.mode==='text'?
                  <div className={`watermarkPreviewText ${config.style||'signature'}`} style={{...watermarkStyle,color:config.color,fontSize:`${Math.max(18,Number(config.fontSize||46)*0.55)}px`,transform:`${watermarkStyle.transform||''} rotate(${Number(config.rotate||0)}deg)`}}>
                    <b>{config.text||'文字水印'}</b>
                    {config.subText&&<small style={{color:config.accent}}>{config.subText}</small>}
                  </div>
                  :
                  config.image?
                  <img className="watermarkPreviewMark" src={srcOf(config.image)} alt="水印预览" style={watermarkStyle}/>
                  :
                  <div className="watermarkPreviewEmpty">水印预览</div>}
              </div>
            </section>
          </div>}

        <footer className="watermarkFoot">
          <button type="button" onClick={onClose}>取消</button>
          <button className="primary" type="button" disabled={loading||saving||uploading||!canConfigure} onClick={save}>
            {saving?'保存中':'保存配置'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

export default WatermarkConfigModal;
