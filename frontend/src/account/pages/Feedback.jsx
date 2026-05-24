// 该文件用于封装普通用户的问题反馈入口和反馈弹窗。
import React,{useState}from'react';
import{createPortal}from'react-dom';
import{MessageSquare}from'lucide-react';
import{req}from'../../appShared.jsx';

export function UserFeedback({setMsg}){
  return <section className="panel"><h2><MessageSquare/>问题反馈</h2><button className="primary" onClick={()=>setMsg('请点击顶部导航栏右侧的问题反馈图标')}>打开反馈入口</button></section>;
}

export function FeedbackModal({onClose,setMsg}){
  const[f,setF]=useState({title:'',content:'',contact:''});
  async function submit(){
    try{
      await req('/api/feedbacks',{method:'POST',body:JSON.stringify(f)});
      setMsg('问题反馈已提交');
      onClose();
    }catch(e){setMsg(e.message)}
  }
  return createPortal(<div className="feedbackModalMaskV2">
    <div className="feedbackModalCardV2">
      <div className="feedbackModalHeadV2"><div><h2><MessageSquare size={24}/>问题反馈</h2></div><button onClick={onClose}>×</button></div>
      <div className="feedbackModalBodyV2">
        <label><span>反馈标题</span><input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label>
        <label><span>联系方式（可选）</span><input value={f.contact} onChange={e=>setF({...f,contact:e.target.value})}/></label>
        <label className="full"><span>反馈内容</span><textarea value={f.content} onChange={e=>setF({...f,content:e.target.value})}/></label>
      </div>
      <div className="feedbackModalFootV2"><button onClick={onClose}>取消</button><button className="primary" onClick={submit}>提交反馈</button></div>
    </div>
  </div>,document.body);
}
