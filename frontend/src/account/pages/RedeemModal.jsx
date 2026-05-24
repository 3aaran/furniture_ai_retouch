// 该文件用于封装礼品卡与兑换码弹窗。
import React,{useState}from'react';
import{Ticket}from'lucide-react';

export default function RedeemModal({onClose,setMsg}){
  const[code,setCode]=useState('');
  async function submit(){
    setMsg('兑换码功能入口已打开：'+(code||'未填写'));
    onClose();
  }
  return <div className="modalMask"><div className="modalCard"><h2><Ticket/>礼品卡 / 兑换码</h2><input placeholder="请输入兑换码" value={code} onChange={e=>setCode(e.target.value)}/><div className="modalActions"><button onClick={onClose}>取消</button><button className="primary" onClick={submit}>确认兑换</button></div></div></div>;
}
