import React,{useEffect,useState}from'react';
import{Bell,Building2,CheckCircle2,Download,Eye,Image as ImageIcon,Phone,Plus,Power,Search,SlidersHorizontal,Ticket,Trash2,UserRound,Video,WalletCards,X,XCircle}from'lucide-react';
import{API,token,req,reqForm,fmt,Badge,usePaged,Pagination,Table,Toolbar,roleName,audName,resTypeName,getStatusName,imageListUrl,fallbackToOriginalImage,openImageDownload}from'../../appShared.jsx';
import{featureName,getFeatureDisplayName,getTargetScopeDisplayName}from'../../config/uiText.js';

function SettingsPage({setMsg}){
  const[s,setS]=useState({});
  function formatStorageSetting(v){
    const n=Number(v||0);
    if(!Number.isFinite(n)||n<=0)return v||'';
    if(n%(1024**3)===0)return `${n/(1024**3)}GB`;
    if(n%(1024**2)===0)return `${n/(1024**2)}MB`;
    return `${(n/(1024**3)).toFixed(2)}GB`;
  }
  useEffect(()=>{req('/api/admin/settings').then(d=>setS({
    video_default_duration_seconds:'10',
    video_max_duration_seconds:'30',
    announcement_retention_days:'30',
    announcement_user_max_count:'50',
    ...d,
    user_storage_limit_bytes:formatStorageSetting(d.user_storage_limit_bytes)
  })).catch(e=>setMsg(e.message))},[]);
  async function save(){try{await req('/api/admin/settings',{method:'PATCH',body:JSON.stringify(s)});setMsg('系统配置已保存')}catch(e){setMsg(e.message)}}
  const groups=[
    {key:'storage',title:'图片存储',icon:<ImageIcon size={22}/>,tone:'blue',items:[['user_storage_limit_bytes','用户图片存储上限']]},
    {key:'quota',title:'额度基础',icon:<WalletCards size={22}/>,tone:'gold',items:[['recharge_ratio','额度换算比例'],['trial_account_hours','体验账号有效小时']]},
    {key:'cost',title:'AI 功能消耗',icon:<SlidersHorizontal size={22}/>,tone:'green',items:[['cost_remove_bg','背景净化'],['cost_replace_bg','场景融合'],['cost_enhance','摄影增强'],['cost_material','材质替换'],['cost_multiview','多角度视图'],['cost_lineart','线稿图'],['cost_video_generate','宣传视频生成']]},
    {key:'video',title:'视频生成',icon:<Video size={22}/>,tone:'blue',items:[['video_default_duration_seconds','默认视频时长（秒）'],['video_max_duration_seconds','最大视频时长（秒）']]},
    {key:'announcement',title:'公告邮箱',icon:<Bell size={22}/>,tone:'gold',items:[['announcement_retention_days','公告默认保留天数'],['announcement_user_max_count','每个用户最多显示公告数']]},
    {key:'resolution',title:'分辨率倍率',icon:<ImageIcon size={22}/>,tone:'blue',items:[['resolution_multiplier_1k','1K 倍率'],['resolution_multiplier_2k','2K 倍率'],['resolution_multiplier_4k','4K 倍率']]},
    {key:'invite',title:'推广奖励',icon:<Ticket size={22}/>,tone:'rose',items:[['invite_new_store_reward_ratio','新注册门店奖励比例'],['invite_source_store_reward_ratio','邀请门店奖励比例']]}
  ];
  const update=(key,value)=>setS({...s,[key]:value});
  return <section className="adminModernPage settingsPageV9"><div className="adminHeroV9 settingsHeroV9"><div><span>平台规则</span><h1>系统配置</h1></div><div className="settingsHeroNoteV9"><b>{groups.reduce((n,g)=>n+g.items.length,0)}</b><small>项业务参数</small></div></div><div className="settingsLayoutV9">{groups.map(group=><section className={`settingsGroupV9 ${group.tone}`} key={group.key}><header><div className="settingsGroupIconV9">{group.icon}</div><div><h2>{group.title}</h2></div></header><div className="settingsFieldsV9">{group.items.map(([k,label])=><label className="settingsFieldV9" key={k}><span>{label}</span><input value={s[k]||''} placeholder={k==='user_storage_limit_bytes'?'例如 5GB':''} onChange={e=>update(k,e.target.value)}/>{k==='user_storage_limit_bytes'&&<small>支持 5GB、500MB 这类写法，保存后同步到所有非平台管理员账号。</small>}</label>)}</div></section>)}</div><div className="settingsSaveBarV9"><button className="submit" onClick={save}>保存配置</button></div></section>;
}

export default SettingsPage;
