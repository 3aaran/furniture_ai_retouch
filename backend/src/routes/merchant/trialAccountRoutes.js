import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { pool, publicUser } from '../../db.js';

export async function createTrialAccount(req,res,{
  generateInternalAccount,
  getSettingsMap,
  publicMe
}){
  const {displayName}=req.body;
  const role='TRIAL';
  const defaultAmount=50;
  const account=await generateInternalAccount(req.user.merchant_id,role);
  const finalPassword=account;
  const conn=await pool.getConnection();

  try{
    await conn.beginTransaction();
    const [[m]]=await conn.query('SELECT * FROM merchants WHERE id=? FOR UPDATE',[req.user.merchant_id]);
    if(!m || m.status!=='ACTIVE') throw new Error('所属门店已被平台禁用');
    const amount=Math.max(0,Number(req.body.quota||defaultAmount));
    if(amount>Number(m.quota_balance||0)) throw new Error('门店额度不足，无法分配给体验账号');
    if(amount>0) await conn.query('UPDATE merchants SET quota_balance=quota_balance-? WHERE id=?',[amount,req.user.merchant_id]);

    const id=uuid();
    const settings=await getSettingsMap();
    const hours=Number(settings.trial_account_hours||72);
    await conn.query(
      'INSERT INTO users(id,merchant_id,phone,username,display_name,company_name,password_hash,role,quota_balance,status,trial_expire_at) VALUES(?,?,?,?,?,?,?,?,?,?,DATE_ADD(NOW(), INTERVAL ? HOUR))',
      [id,req.user.merchant_id,null,account,String(displayName||`体验用户_${account.slice(-4)}`).trim(),req.user.company_name,await bcrypt.hash(finalPassword,10),role,amount,'ACTIVE',hours]
    );
    if(amount>0){
      const [[targetBalance]]=await conn.query('SELECT quota_balance FROM users WHERE id=?',[id]);
      await conn.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,balance_after,remark) VALUES(?,?,?,?,?,?,?,?)',[uuid(),req.user.merchant_id,id,req.user.id,amount,'MANUAL_ADJUST',Number(targetBalance?.quota_balance||0),'分配算力给体验账号']);
    }
    const [[ex]]=await conn.query('SELECT trial_expire_at FROM users WHERE id=?',[id]);
    await conn.commit();

    const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[id]);
    const [[meUser]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
    res.json({
      user:publicUser(u),
      me:await publicMe(meUser),
      account:{username:account,phone:null,password:finalPassword,quota:amount,expireAt:ex?.trial_expire_at||null,reactivated:false}
    });
  }catch(e){
    await conn.rollback();
    res.status(400).json({message:e.message||'创建失败'});
  }finally{
    conn.release();
  }
}
