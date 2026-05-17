import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { pool, publicUser } from '../../db.js';
import { requireAuth } from '../../auth.js';
import { createTrialAccount } from './trialAccountRoutes.js';
import { recycleExpiredTrialAccountsForMerchant } from '../../services/trialAccountService.js';

export function registerInternalUserRoutes(app,deps){
  const {
    isMerchantPower,
    assertMerchantActive,
    validSubRoles,
    canManageRole,
    validPhone,
    getSettingsMap,
    publicMe,
    paged,
    like
  }=deps;

  app.get('/api/merchant/users', requireAuth, async (req,res)=>{
    if(!isMerchantPower(req.user)) return res.status(403).json({message:'需要商家管理权限'});
    try{ await assertMerchantActive(req.user); }catch(e){ return res.status(403).json({message:e.message}); }
    await recycleExpiredTrialAccountsForMerchant(req.user.merchant_id);
    const wh=['merchant_id=?','status<>\"DELETED\"']; const ps=[req.user.merchant_id];
    if(req.query.role){ wh.push('role=?'); ps.push(req.query.role); }
    if(req.query.status){ wh.push('status=?'); ps.push(req.query.status); }
    if(req.query.keyword){ wh.push('(username LIKE ? OR phone LIKE ? OR display_name LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    const where='WHERE '+wh.join(' AND ');
    const data=await paged(`SELECT * FROM users ${where} ORDER BY FIELD(role,"MERCHANT_OWNER","MERCHANT_ADMIN","STAFF","TRIAL"), created_at DESC`,`SELECT COUNT(*) total FROM users ${where}`,ps,req,publicUser);
    const [[m]]=await pool.query('SELECT merchant_code,quota_balance FROM merchants WHERE id=?',[req.user.merchant_id]);
    const [[c]]=await pool.query('SELECT COUNT(*) count FROM users WHERE merchant_id=? AND role<>"MERCHANT_OWNER" AND status<>"DELETED"',[req.user.merchant_id]);
    res.json({...data, used:c.count, merchantQuota:Number(m?.quota_balance||0), merchantCode:m?.merchant_code||''});
  });
  
  app.post('/api/merchant/users', requireAuth, async (req,res)=>{
    if(!isMerchantPower(req.user)) return res.status(403).json({message:'需要门店管理权限'});
    const merchant=await assertMerchantActive(req.user);
    const { displayName, role='STAFF', phone, password } = req.body;
    if(!validSubRoles.includes(role)) return res.status(400).json({message:'门店用户角色无效'});
    if(role==='TRIAL') return createTrialAccount(req,res,deps);

    const amount = Math.max(0,Number(req.body.quota||0));
    const finalPhone=String(phone||'').trim();
    const finalPassword=String(password||'');
    if(!validPhone(finalPhone)) return res.status(400).json({message:'门店管理员、门店人员必须填写正确手机号'});
    if(!finalPassword || finalPassword.length<6) return res.status(400).json({message:'密码至少6位'});
    const account=finalPhone;
  
    const conn=await pool.getConnection();
    try{
      await conn.beginTransaction();
      const [[m]]=await conn.query('SELECT * FROM merchants WHERE id=? FOR UPDATE',[req.user.merchant_id]);
      if(!m || m.status!=='ACTIVE') throw new Error('所属门店已被平台禁用');
      if(amount>Number(m.quota_balance||0)) throw new Error('门店额度不足，无法分配给用户');
      if(amount>0) await conn.query('UPDATE merchants SET quota_balance=quota_balance-? WHERE id=?',[amount,req.user.merchant_id]);
      const settings=await getSettingsMap();
      const storageLimitBytes=Number(settings.user_storage_limit_bytes || 5 * 1024 * 1024 * 1024);
  
      let id=uuid();
      if(finalPhone){
        const [oldUsers]=await conn.query('SELECT * FROM users WHERE phone=? FOR UPDATE',[finalPhone]);
        const old=oldUsers[0];
        if(old && old.status!=='DELETED') throw new Error('该账户有过注册记录，无法注册');
        if(old && old.status==='DELETED'){
          id=old.id;
          await conn.query('UPDATE users SET merchant_id=?, username=?, display_name=?, company_name=?, password_hash=?, role=?, quota_balance=?, storage_limit_bytes=?, status="ACTIVE", deleted_at=NULL, trial_expire_at=NULL WHERE id=?',[req.user.merchant_id,account,String(displayName||account).trim(),req.user.company_name,await bcrypt.hash(finalPassword,10),role,amount,storageLimitBytes,id]);
        }else{
          await conn.query('INSERT INTO users(id,merchant_id,phone,username,display_name,company_name,password_hash,role,quota_balance,status,storage_limit_bytes) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[id,req.user.merchant_id,finalPhone,account,String(displayName||account).trim(),req.user.company_name,await bcrypt.hash(finalPassword,10),role,amount,'ACTIVE',storageLimitBytes]);
        }
      }
      if(amount>0){
        const [[targetBalance]]=await conn.query('SELECT quota_balance FROM users WHERE id=?',[id]);
        await conn.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,balance_after,remark) VALUES(?,?,?,?,?,?,?,?)',[uuid(),req.user.merchant_id,id,req.user.id,amount,'MANUAL_ADJUST',Number(targetBalance?.quota_balance||0),'分配算力给用户']);
      }
  
      await conn.commit();
  
      const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[id]);
      const [[meUser]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
      res.json({user:publicUser(u), me:await publicMe(meUser), account:{username:account,phone:finalPhone,password:finalPassword,quota:amount,expireAt:null,reactivated:!!finalPhone}});
    }catch(e){ await conn.rollback(); res.status(400).json({message:e.message||'创建失败'}); }
    finally{ conn.release(); }
  });
  
  app.patch('/api/merchant/users/:id/quota', requireAuth, async (req,res)=>{
    if(!isMerchantPower(req.user)) return res.status(403).json({message:'需要门店管理权限'});
    const amount=Number(req.body.amount||0);
    if(!Number.isFinite(amount)||amount===0) return res.status(400).json({message:'请输入非 0 的调整额度'});
    const conn=await pool.getConnection();
    try{
      await conn.beginTransaction();
      const [[actor]]=await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE',[req.user.id]);
      const [[target]]=await conn.query('SELECT * FROM users WHERE id=? AND merchant_id=? AND status<>"DELETED" FOR UPDATE',[req.params.id,req.user.merchant_id]);
      const [[merchant]]=await conn.query('SELECT * FROM merchants WHERE id=? FOR UPDATE',[req.user.merchant_id]);
      if(!target) throw new Error('用户不存在');
      if(target.role==='MERCHANT_OWNER'||target.role==='MERCHANT_ADMIN') throw new Error('门店管理员使用门店共享算力，不需要单独分配');
      if(!canManageRole(actor,target.role)) throw new Error('不能管理同级或更高级账号');
      if(amount>0&&Number(merchant.quota_balance||0)<amount) throw new Error('门店额度不足');
      if(amount<0&&Number(target.quota_balance||0)<Math.abs(amount)) throw new Error('用户额度不足');
      await conn.query('UPDATE users SET quota_balance=GREATEST(0,quota_balance+?) WHERE id=?',[amount,target.id]);
      await conn.query('UPDATE merchants SET quota_balance=quota_balance-? WHERE id=?',[amount,req.user.merchant_id]);
      const [[targetBalance]]=await conn.query('SELECT quota_balance FROM users WHERE id=?',[target.id]);
      await conn.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,balance_after,remark) VALUES(?,?,?,?,?,?,?,?)',[uuid(),req.user.merchant_id,target.id,req.user.id,amount,'MANUAL_ADJUST',Number(targetBalance?.quota_balance||0),amount>0?'分配算力给用户':'回收用户算力']);
      await conn.commit();
      const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[target.id]);
      const [[me]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
      res.json({message:'用户算力已调整', user:publicUser(u), me:await publicMe(me)});
    }catch(e){await conn.rollback();res.status(400).json({message:e.message||'调整失败'});}
    finally{conn.release();}
  });
  
  app.patch('/api/merchant/users/:id', requireAuth, async (req,res)=>{
    if(!isMerchantPower(req.user)) return res.status(403).json({message:'需要商家管理权限'});
    await assertMerchantActive(req.user);
    const {displayName, phone, password}=req.body;
    const conn=await pool.getConnection();
    try{
      await conn.beginTransaction();
      const [[actor]]=await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE',[req.user.id]);
      const [[target]]=await conn.query('SELECT * FROM users WHERE id=? AND merchant_id=? AND status<>"DELETED" FOR UPDATE',[req.params.id,req.user.merchant_id]);
      if(!target) throw new Error('用户不存在');
      if(target.role==='MERCHANT_OWNER') throw new Error('门店主账号请在个人中心修改');
      if(!canManageRole(actor,target.role)) throw new Error('不能修改同级或更高级账号');
  
      const fields=[]; const vals=[];
      if(displayName!==undefined){ fields.push('display_name=?'); vals.push(String(displayName||target.display_name||target.username).trim()); }
      if(phone!==undefined && target.role!=='TRIAL'){
        const nextPhone=String(phone||'').trim();
        if(!validPhone(nextPhone)) throw new Error('请输入正确手机号');
        const [dup]=await conn.query('SELECT id FROM users WHERE phone=? AND id<>? AND status<>"DELETED"',[nextPhone,target.id]);
        if(dup.length) throw new Error('手机号已被其他账号使用');
        fields.push('phone=?','username=?'); vals.push(nextPhone,nextPhone);
      }
      if(password!==undefined && String(password||'').trim()){
        const pwd=String(password).trim();
        if(pwd.length<6) throw new Error('密码至少6位');
        fields.push('password_hash=?'); vals.push(await bcrypt.hash(pwd,10));
      }
      if(!fields.length) throw new Error('没有需要修改的信息');
      vals.push(target.id);
      await conn.query(`UPDATE users SET ${fields.join(',')} WHERE id=?`,vals);
      await conn.commit();
      const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[target.id]);
      res.json({message:'用户信息已更新', user:publicUser(u)});
    }catch(e){ await conn.rollback(); res.status(400).json({message:e.message||'修改失败'}); }
    finally{ conn.release(); }
  });
  
  app.patch('/api/merchant/users/:id/status', requireAuth, async (req,res)=>{
    if(!isMerchantPower(req.user)) return res.status(403).json({message:'需要商家管理权限'});
    const [[target]]=await pool.query('SELECT * FROM users WHERE id=? AND merchant_id=? AND status<>"DELETED"',[req.params.id,req.user.merchant_id]);
    if(!target) return res.status(404).json({message:'用户不存在'});
    if(target.role==='MERCHANT_OWNER') return res.status(400).json({message:'不能禁用商家主账号'});
    if(!canManageRole(req.user,target.role)) return res.status(403).json({message:'不能管理同级或更高级账号'});
    const status=req.body.status==='DISABLED'?'DISABLED':'ACTIVE'; await pool.query('UPDATE users SET status=? WHERE id=?',[status,target.id]); res.json({message:'状态已更新'});
  });
  
  app.delete('/api/merchant/users/:id', requireAuth, async (req,res)=>{
    if(!isMerchantPower(req.user)) return res.status(403).json({message:'需要商家管理权限'});
    await assertMerchantActive(req.user);
    const conn=await pool.getConnection();
    try{
      await conn.beginTransaction();
      const [[actor]]=await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE',[req.user.id]);
      const [[target]]=await conn.query('SELECT * FROM users WHERE id=? AND merchant_id=? AND status<>"DELETED" FOR UPDATE',[req.params.id,req.user.merchant_id]);
      if(!target) throw new Error('用户不存在');
      if(target.role==='MERCHANT_OWNER') throw new Error('不能删除商家主账号');
      if(!canManageRole(actor,target.role)) throw new Error('不能删除同级或更高级账号');
      const recycle=Number(target.quota_balance||0);
      if(recycle>0) await conn.query('UPDATE merchants SET quota_balance=quota_balance+? WHERE id=?',[recycle,req.user.merchant_id]);
      await conn.query('UPDATE users SET status="DELETED", deleted_at=NOW() WHERE id=?',[target.id]);
      if(recycle>0){
        const [[balanceRow]]=await conn.query('SELECT quota_balance FROM merchants WHERE id=?',[req.user.merchant_id]);
        await conn.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,balance_after,remark) VALUES(?,?,?,?,?,?,?,?)',[uuid(),req.user.merchant_id,target.id,req.user.id,recycle,'ACCOUNT_DELETE_RECYCLE',Number(balanceRow?.quota_balance||0),'删除用户回收剩余算力']);
      }
      await conn.commit();
      const [[me]]=await pool.query('SELECT * FROM users WHERE id=?',[actor.id]);
      res.json({message:'用户已删除，历史图片和额度流水已保留，剩余额度已回收到门店额度池', me:await publicMe(me)});
    }catch(e){ await conn.rollback(); res.status(400).json({message:e.message}); }
    finally{ conn.release(); }
  });
  

}
