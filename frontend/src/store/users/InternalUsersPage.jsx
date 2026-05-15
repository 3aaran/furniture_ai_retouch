import React,{useState}from'react';
import{Search,WalletCards,Plus,Trash2}from'lucide-react';
import{req,fmt,roleName,usePaged}from'../../appShared.jsx';
import{TrialAccountTicket}from'./TrialAccountTicket.jsx';

function StoreUsers({me,setMe,setMsg}){
  const {query,setQuery,data,load}=usePaged('/api/merchant/users',{keyword:'',role:'',status:'',page:1,pageSize:10});
  const [createOpen,setCreateOpen]=useState(false);
  const [editUser,setEditUser]=useState(null);
  const [rechargeUser,setRechargeUser]=useState(null);
  const [trialTicket,setTrialTicket]=useState(null);
  const [f,setF]=useState({phone:'',displayName:'',role:'STAFF',quota:0,password:'123456'});
  const [editForm,setEditForm]=useState({displayName:'',phone:'',password:''});
  const [rechargeAmount,setRechargeAmount]=useState(10);

  const roleOptions=me.role==='MERCHANT_OWNER'
    ? [['MERCHANT_ADMIN','门店管理员'],['STAFF','普通用户']]
    : [['STAFF','普通用户']];

  function storeQuota(){
    return Number(data.merchantQuota ?? me?.merchantQuota ?? me?.quota ?? 0);
  }

  function userType(u){
    if(u.role==='TRIAL')return '外部客户';
    if(u.role==='MERCHANT_OWNER')return '门店主账号';
    return '内部员工';
  }

  function expireText(u){
    if(u.role!=='TRIAL')return '-';
    return u.trialExpireAt?fmt(u.trialExpireAt):'按系统配置';
  }

  function roleBadgeClass(role){
    if(role==='MERCHANT_ADMIN'||role==='MERCHANT_OWNER')return 'gold';
    if(role==='TRIAL')return 'blue';
    return '';
  }

  function resetForm(){
    setF({phone:'',displayName:'',role:'STAFF',quota:0,password:'123456'});
  }

  function quotaText(u){
    if(u.role==='MERCHANT_OWNER'||u.role==='MERCHANT_ADMIN')return '门店池';
    return u.quota||0;
  }

  async function create(payload=f){
    try{
      const d=await req('/api/merchant/users',{method:'POST',body:JSON.stringify(payload)});
      if(d.me)setMe(d.me);
      setCreateOpen(false);
      resetForm();
      load();

      if(payload.role==='TRIAL'){
        setTrialTicket(d.account);
      }else{
        setMsg('用户已创建');
      }
    }catch(e){
      setMsg(e.message);
    }
  }

  async function generateTrial(){
    if(storeQuota()<50){
      setMsg('门店剩余算力不足，生成体验账号需要 50 算力');
      return;
    }
    await create({displayName:'体验账号',role:'TRIAL',quota:50,password:'123456'});
  }

  function openEdit(u){
    setEditUser(u);
    setEditForm({displayName:u.displayName||'',phone:u.phone||'',password:''});
  }

  async function submitEdit(){
    if(!editUser)return;
    try{
      const body={displayName:editForm.displayName};
      if(editUser.role!=='TRIAL')body.phone=editForm.phone;
      if(editForm.password)body.password=editForm.password;
      await req('/api/merchant/users/'+editUser.id,{method:'PATCH',body:JSON.stringify(body)});
      setMsg('用户信息已更新');
      setEditUser(null);
      load();
    }catch(e){setMsg(e.message)}
  }

  function openRecharge(u){
    if(u.role==='MERCHANT_OWNER'||u.role==='MERCHANT_ADMIN'){
      setMsg('门店管理员使用门店额度池，不需要单独充值');
      return;
    }
    setRechargeUser(u);
    setRechargeAmount(10);
  }

  async function submitRecharge(){
    if(!rechargeUser)return;
    try{
      const d=await req('/api/merchant/users/'+rechargeUser.id+'/quota',{method:'PATCH',body:JSON.stringify({amount:Number(rechargeAmount)})});
      if(d.me)setMe(d.me);
      setMsg('充值成功');
      setRechargeUser(null);
      load();
    }catch(e){setMsg(e.message)}
  }

  async function status(u){
    try{
      await req('/api/merchant/users/'+u.id+'/status',{method:'PATCH',body:JSON.stringify({status:u.status==='ACTIVE'?'DISABLED':'ACTIVE'})});
      setMsg('状态已更新');
      load();
    }catch(e){
      setMsg(e.message);
    }
  }

  async function del(u){
    if(u.role==='MERCHANT_OWNER')return setMsg('门店主账号不能删除');
    if(!confirm('确定删除该账号？删除后该账号将无法登录，剩余额度会回收到门店额度池。'))return;
    try{
      const d=await req('/api/merchant/users/'+u.id,{method:'DELETE'});
      if(d.me)setMe(d.me);
      setMsg(d.message||'账号已删除');
      load();
    }catch(e){
      setMsg(e.message);
    }
  }

  function copyTrial(){
    if(!trialTicket)return;
    const text=`账号：${trialTicket.username}\n密码：${trialTicket.password}\n初始算力：${trialTicket.quota||50}\n到期：${trialTicket.expireAt?fmt(trialTicket.expireAt):'按系统配置'}`;
    navigator.clipboard?.writeText(text);
    setMsg('体验账号凭据已复制');
  }

  const users=data.items||[];
  const merchantCode=data.merchantCode||me?.merchantCode||String(me?.merchantId||'000000').replace(/-/g,'').slice(0,6)||'000000';
  const totalPages=Math.max(1,Math.ceil((data.total||0)/(data.pageSize||10)));

  return <div className="storeUsersV2">
    <section className="storeUsersHeroV2">
      <div>
        <h1>用户管理</h1>
      </div>
      <div className="storeUserQuotaCardV2">
        <span>门店编号：{merchantCode}</span>
        <b>剩余算力：<em>{storeQuota()}</em></b>
      </div>
    </section>

    <section className="storeUserToolbarV2">
      <div className="storeUserSearchV2">
        <Search size={22}/>
        <input
          placeholder="搜索用户名、手机号"
          value={query.keyword}
          onChange={e=>setQuery({...query,keyword:e.target.value,page:1})}
          onKeyDown={e=>{if(e.key==='Enter')setQuery(q=>({...q,page:1}))}}
        />
      </div>

      <select value={query.role} onChange={e=>setQuery({...query,role:e.target.value,page:1})}>
        <option value="">角色</option>
        <option value="MERCHANT_ADMIN">门店管理员</option>
        <option value="STAFF">普通用户</option>
        <option value="TRIAL">体验账号</option>
      </select>

      <select value={query.status} onChange={e=>setQuery({...query,status:e.target.value,page:1})}>
        <option value="">用户状态</option>
        <option value="ACTIVE">启用账号</option>
        <option value="DISABLED">禁用账号</option>
      </select>

      <div className="storeUserToolbarSpacerV2"/>

      <button className="storeTrialBtnV2" type="button" onClick={generateTrial}>✦ 生成体验账号</button>
      <button className="storeCreateBtnV2" type="button" onClick={()=>{setCreateOpen(true)}}><Plus size={18}/> 创建用户</button>
    </section>

    <section className="storeUsersTablePanelV2">
      <table className="storeUsersTableV2">
        <thead>
          <tr>
            <th>用户名</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>用户类型</th>
            <th>算力点</th>
            <th>注册时间</th>
            <th>过期时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.length?users.map(u=><tr key={u.id}>
            <td><b>{u.displayName||u.username||u.phone||'-'}</b></td>
            <td>{u.phone||u.username||'-'}</td>
            <td>{u.email||'-'}</td>
            <td><span className={'storeRoleBadgeV2 '+roleBadgeClass(u.role)}>{u.role==='STAFF'?'普通用户':roleName[u.role]}</span></td>
            <td><span className="storeTypeBadgeV2">{userType(u)}</span></td>
            <td><strong className="storeQuotaTextV2">{quotaText(u)}</strong></td>
            <td>{fmt(u.createdAt)}</td>
            <td>{expireText(u)}</td>
            <td>
              <div className="storeUserActionsV2">
                {u.role==='MERCHANT_OWNER'
                  ? <span className="storeNoActionV2">主账号</span>
                  : <>
                    <button title={u.status==='ACTIVE'?'禁用账号':'启用账号'} onClick={()=>status(u)}>{u.status==='ACTIVE'?'停':'启'}</button>
                    <button title="给用户充值" onClick={()=>openRecharge(u)}><WalletCards size={17}/></button>
                    <button title="编辑基础信息" onClick={()=>openEdit(u)}>✎</button>
                    <button className="danger" title="删除账号" onClick={()=>del(u)}><Trash2 size={17}/></button>
                  </>}
              </div>
            </td>
          </tr>):<tr><td colSpan="9"><div className="empty big">暂无用户</div></td></tr>}
        </tbody>
      </table>

      <div className="storeUsersPagerV2">
        <span>每页显示</span>
        <select value={data.pageSize||10} onChange={e=>setQuery(q=>({...q,page:1,pageSize:Number(e.target.value)}))}>
          <option>10</option>
          <option>20</option>
          <option>50</option>
        </select>
        <b>{data.total?((data.page||1)-1)*(data.pageSize||10)+1:0}-{Math.min((data.page||1)*(data.pageSize||10),data.total||0)} / {data.total||0}</b>
        <button disabled={(data.page||1)<=1} onClick={()=>setQuery(q=>({...q,page:(q.page||1)-1}))}>‹</button>
        <button disabled={(data.page||1)>=totalPages} onClick={()=>setQuery(q=>({...q,page:(q.page||1)+1}))}>›</button>
      </div>
    </section>

    <p className="storeUsersHintV2">
      说明：门店管理员使用门店额度池；普通用户和体验账号可由门店额度池充值。额度不支持直接回收，删除账号时剩余额度回收到门店额度池。
    </p>

    {createOpen&&<div className="storeUserModalMaskV2">
      <div className="storeUserModalV2">
        <div className="storeUserModalHeadV2">
          <h2>创建用户</h2>
          <button onClick={()=>setCreateOpen(false)}>×</button>
        </div>

        <div className="storeUserModalBodyV2">
          <label>
            <span>用户角色</span>
            <select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>
              {roleOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </label>

          <label>
            <span>用户名 / 备注</span>
            <input placeholder="例如：设计师小王" value={f.displayName} onChange={e=>setF({...f,displayName:e.target.value})}/>
          </label>

          <label>
            <span>手机号</span>
            <input placeholder="请输入手机号" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
          </label>

          <label>
            <span>初始密码</span>
            <input placeholder="至少 6 位" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
          </label>

          {f.role!=='MERCHANT_ADMIN'&&<label>
            <span>初始算力点</span>
            <input type="number" min="0" placeholder="从门店额度池分配" value={f.quota} onChange={e=>setF({...f,quota:e.target.value})}/>
          </label>}

          <div className="storeUserModalTipV2">
            创建普通用户时可从门店额度池分配算力；门店管理员账号使用门店共享额度池，不单独分配额度。
          </div>
        </div>

        <div className="storeUserModalFootV2">
          <button onClick={()=>setCreateOpen(false)}>取消</button>
          <button className="primary" onClick={()=>create()}>确认创建</button>
        </div>
      </div>
    </div>}

    {editUser&&<div className="storeUserModalMaskV2">
      <div className="storeUserModalV2">
        <div className="storeUserModalHeadV2">
          <h2>编辑用户信息</h2>
          <button onClick={()=>setEditUser(null)}>×</button>
        </div>
        <div className="storeUserModalBodyV2">
          <label><span>用户名 / 备注</span><input value={editForm.displayName} onChange={e=>setEditForm({...editForm,displayName:e.target.value})}/></label>
          {editUser.role!=='TRIAL'&&<label><span>手机号</span><input value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/></label>}
          <label><span>新密码（不改可留空）</span><input value={editForm.password} onChange={e=>setEditForm({...editForm,password:e.target.value})}/></label>
          <div className="storeUserModalTipV2">这里只修改基础资料，不修改或回收额度。</div>
        </div>
        <div className="storeUserModalFootV2">
          <button onClick={()=>setEditUser(null)}>取消</button>
          <button className="primary" onClick={submitEdit}>保存修改</button>
        </div>
      </div>
    </div>}

    {rechargeUser&&<div className="storeUserModalMaskV2">
      <div className="storeUserModalV2 small">
        <div className="storeUserModalHeadV2">
          <h2>用户充值</h2>
          <button onClick={()=>setRechargeUser(null)}>×</button>
        </div>
        <div className="storeUserModalBodyV2 single">
          <div className="storeUserModalTipV2">从门店额度池给「{rechargeUser.displayName||rechargeUser.username}」充值。当前门店剩余：{storeQuota()} 算力。</div>
          <label><span>充值算力点</span><input type="number" min="1" value={rechargeAmount} onChange={e=>setRechargeAmount(e.target.value)}/></label>
        </div>
        <div className="storeUserModalFootV2">
          <button onClick={()=>setRechargeUser(null)}>取消</button>
          <button className="primary" onClick={submitRecharge}>确认充值</button>
        </div>
      </div>
    </div>}

    {trialTicket&&<TrialAccountTicket trialTicket={trialTicket} onClose={()=>setTrialTicket(null)} onCopyAll={copyTrial}/>}
  </div>
}

export default StoreUsers;
