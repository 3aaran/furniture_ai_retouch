import jwt from 'jsonwebtoken';
import { findUserById, pool } from './db.js';
import { messages } from './config/messages.js';
import { recycleExpiredTrialAccount } from './services/trialAccountService.js';
export function sign(user){ return jwt.sign({id:user.id,role:user.role}, process.env.JWT_SECRET || 'dev_secret_change_me', {expiresIn:'20h'}); }
export async function requireAuth(req,res,next){
  const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):(req.query.token||null);
  if(!token) return res.status(401).json({message:messages.authRequired});
  try{
    const data=jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const user=await findUserById(data.id);
    if(!user||user.status!=='ACTIVE') return res.status(401).json({message:messages.accountUnavailable});
    if(user.role==='TRIAL'){
      const trial=await recycleExpiredTrialAccount(user);
      if(trial.expired) return res.status(401).json({message:messages.trialExpiredDeleted});
    }
    if(user.merchant_id){
      const [[m]]=await pool.query('SELECT status FROM merchants WHERE id=?',[user.merchant_id]);
      if(!m || m.status!=='ACTIVE') return res.status(403).json({message:messages.merchantDisabled});
    }
    req.user=user; next();
  }catch(e){ return res.status(401).json({message:messages.authExpired}); }
}
export const requireRole=(...roles)=>(req,res,next)=> roles.includes(req.user.role)?next():res.status(403).json({message:messages.noPermission});
