import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { pool, publicUser, publicMerchant, publicApplication } from '../db.js';
import { requireAuth } from '../auth.js';
import { requireSystemAdmin } from '../middleware/roleMiddleware.js';
import { getAiConfig, saveAiConfig } from '../ai/configService.js';
import { getAdminAiTasks } from '../ai/taskService.js';
import { deleteStoredFile, getStoredFileMeta, normalizeUploadedFileName, saveUploadedImage } from '../services/storageService.js';
import { ensureSystemSubCategory, parseStorageLimitBytes, resourceTypeFromMain, stripImageExt } from './admin/resourceHelpers.js';

function isSystemAdmin(u){ return u?.role === 'SYSTEM_ADMIN'; }
const SYSTEM_ADMIN_REQUIRED_MESSAGE = '需要系统管理员权限';
function random6Digit(){ return String(Math.floor(100000+Math.random()*900000)); }
async function generateMerchantCode(){ for(let i=0;i<50;i++){ const c=random6Digit(); const [r]=await pool.query('SELECT id FROM merchants WHERE merchant_code=?',[c]); if(!r.length) return c; } return String(Date.now()).slice(-6); }
function pageParams(req){
  const page=Math.max(1,Number(req.query.page||1));
  const pageSize=Math.min(50,Math.max(5,Number(req.query.pageSize||10)));
  return {page,pageSize,offset:(page-1)*pageSize};
}
function like(v){ return `%${String(v||'').trim()}%`; }
function normalizeQuotaPeriod(v){
  return ['week','month','quarter'].includes(String(v||'')) ? String(v) : 'week';
}
function quotaPeriodSql(dateExpr, period){
  if(period === 'month'){
    return {
      key:`DATE_FORMAT(${dateExpr},"%Y-%m")`,
      start:`DATE_FORMAT(${dateExpr},"%Y-%m-01")`,
      end:`LAST_DAY(${dateExpr})`
    };
  }
  if(period === 'quarter'){
    const start = `STR_TO_DATE(CONCAT(YEAR(${dateExpr}),'-',LPAD(((QUARTER(${dateExpr})-1)*3+1),2,'0'),'-01'),'%Y-%m-%d')`;
    return {
      key:`CONCAT(YEAR(${dateExpr}),'-Q',QUARTER(${dateExpr}))`,
      start,
      end:`LAST_DAY(DATE_ADD(${start}, INTERVAL 2 MONTH))`
    };
  }
  return {
    key:`YEARWEEK(${dateExpr},3)`,
    start:`DATE_SUB(${dateExpr}, INTERVAL WEEKDAY(${dateExpr}) DAY)`,
    end:`DATE_ADD(DATE_SUB(${dateExpr}, INTERVAL WEEKDAY(${dateExpr}) DAY), INTERVAL 6 DAY)`
  };
}
function settingStorageLimitBytes(settings){
  return parseStorageLimitBytes(settings.user_storage_limit_bytes || '5GB') || 0;
}
async function paged(sql,countSql,params,req,map=x=>x){
  const {page,pageSize,offset}=pageParams(req);
  const [[c]]=await pool.query(countSql,params);
  const [rows]=await pool.query(`${sql} LIMIT ? OFFSET ?`,[...params,pageSize,offset]);
  return {items:rows.map(map), page, pageSize, total:Number(c.total||0)};
}
function csvEscape(v){ const t=String(v??''); return /[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t; }
function sendCsv(res, filename, headers, rows){
  const data=[headers.map(h=>csvEscape(h.label)).join(','), ...rows.map(r=>headers.map(h=>csvEscape(r[h.key])).join(','))].join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  res.send('\ufeff'+data);
}
async function getSettingsMap(){ const [rows]=await pool.query('SELECT setting_key,setting_value FROM app_settings'); return Object.fromEntries(rows.map(r=>[r.setting_key,r.setting_value])); }
async function addAnnouncement({title,content,audience,createdBy,validDays}){
  const days=Number(validDays||0);
  await pool.query(
    'INSERT INTO announcements(id,title,content,audience,valid_until,created_by) VALUES(?,?,?,?,IF(? > 0, DATE_ADD(NOW(), INTERVAL ? DAY), NULL),?)',
    [uuid(),title,content,audience,days,days,createdBy]
  );
}
async function saveUploadedFile(file, options = {}){
  const saved = await saveUploadedImage(file, options);
  return saved?.url || '';
}
function makeRedeemCode(){ return 'DH'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase(); }
export function registerAdminRoutes(app,{upload}){
  const adminOnly = [requireAuth, requireSystemAdmin];
  app.get('/api/admin/overview', ...adminOnly, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const [[m]]=await pool.query('SELECT COUNT(*) total, SUM(status="ACTIVE") active, SUM(status="DISABLED") disabled FROM merchants');
    const [[a]]=await pool.query('SELECT COUNT(*) total, SUM(status="PENDING") pending FROM merchant_applications');
    const [[i]]=await pool.query('SELECT COUNT(*) totalImages FROM images');
    const [[u]]=await pool.query('SELECT COUNT(*) totalUsers FROM users');
    const [[fin]]=await pool.query('SELECT IFNULL(SUM(CASE WHEN type="INCOME" THEN amount ELSE 0 END),0) income, IFNULL(SUM(CASE WHEN type="COST" THEN amount ELSE 0 END),0) cost FROM finance_logs WHERE created_at>=DATE_FORMAT(CURDATE(),"%Y-%m-01")');
    res.json({merchants:m,applications:a,images:i,users:u,finance:fin});
  });
  
  app.get('/api/admin/stats', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const range = ['year','quarter','month'].includes(req.query.range) ? req.query.range : 'month';
    const days = range==='year'?365:range==='quarter'?90:30;
    const [trend]=await pool.query(`SELECT DATE(created_at) day, SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END) income, SUM(CASE WHEN type='COST' THEN amount ELSE 0 END) cost FROM finance_logs WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY day`,[days]);
    const [[pie]]=await pool.query(`SELECT IFNULL(SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END),0) income, IFNULL(SUM(CASE WHEN type='COST' THEN amount ELSE 0 END),0) cost FROM finance_logs WHERE created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY)`,[days]);
    const [ops]=await pool.query(`
      SELECT t.feature_key operation, COUNT(*) count, SUM(IFNULL(t.cost,0)) quota
      FROM ai_model_call_logs l
      LEFT JOIN ai_tasks t ON t.id=l.task_id
      WHERE l.created_at>=DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY t.feature_key
    `,[days]);
    res.json({range,trend,pie,ops});
  });
  
  app.get('/api/admin/settings', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    res.json(await getSettingsMap());
  });
  
  app.patch('/api/admin/settings', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const allowed=['recharge_ratio','income_per_quota','cost_per_ai_quota','cost_remove_bg','cost_replace_bg','cost_enhance','cost_material','cost_multiview','cost_lineart','cost_video_generate','video_default_duration_seconds','video_max_duration_seconds','announcement_retention_days','announcement_user_max_count','resolution_multiplier_1k','resolution_multiplier_2k','resolution_multiplier_4k','cost_resolution_1k','cost_resolution_2k','cost_resolution_4k','invite_new_store_reward_ratio','invite_source_store_reward_ratio','trial_account_hours','user_storage_limit_bytes'];
    for(const k of allowed){
      if(req.body[k]!==undefined){
        const parsedLimit=k==='user_storage_limit_bytes'?parseStorageLimitBytes(req.body[k]):null;
        if(k==='user_storage_limit_bytes' && parsedLimit===null) throw new Error('请填写图片存储上限，例如 5GB');
        const value=k==='user_storage_limit_bytes'?String(parsedLimit):String(req.body[k]);
        await pool.query('UPDATE app_settings SET setting_value=?,updated_by=? WHERE setting_key=?',[value,req.user.id,k]);
        if(k==='user_storage_limit_bytes') await pool.query('UPDATE users SET storage_limit_bytes=? WHERE role<>"SYSTEM_ADMIN"',[Number(value)]);
      }
    }
    if(req.body.announce){ await addAnnouncement({title:req.body.announcementTitle||'系统配置调整通知',content:req.body.announcementContent||'平台配置已更新，请关注后续使用规则。',audience:req.body.audience||'MERCHANT',createdBy:req.user.id}); }
    res.json({message:'配置已更新'});
  });
  
  app.get('/api/admin/ai/config', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    res.json(await getAiConfig({includeSecret:false}));
  });
  
  app.post('/api/admin/ai/config', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    await saveAiConfig(req.body,req.user);
    res.json({message:'AI模型配置已保存',config:await getAiConfig({includeSecret:false})});
  });
  
  app.get('/api/admin/applications', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.status){ wh.push('status=?'); ps.push(req.query.status); }
    if(req.query.keyword){ wh.push('(company_name LIKE ? OR contact_name LIKE ? OR phone LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    const data=await paged(`SELECT * FROM merchant_applications ${where} ORDER BY (invite_code IS NOT NULL AND invite_code<>'') DESC, created_at DESC`,`SELECT COUNT(*) total FROM merchant_applications ${where}`,ps,req,publicApplication);
    res.json(data);
  });
  
  app.post('/api/admin/applications/:id/approve', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const quota=Math.max(0,Number(req.body.quota||500));
    const settings=await getSettingsMap();
    const conn=await pool.getConnection();
    try{
      await conn.beginTransaction();
      const [[appRow]]=await conn.query('SELECT * FROM merchant_applications WHERE id=? FOR UPDATE',[req.params.id]);
      if(!appRow||appRow.status!=='PENDING') throw new Error('申请不存在或已处理');
      const mid=uuid();
      const merchantCode = await generateMerchantCode();
      let finalQuota = quota;
      let inviter = null;
      if(appRow.invite_code){
        const [inv]=await conn.query('SELECT * FROM merchants WHERE merchant_code=? OR invite_code=? LIMIT 1',[appRow.invite_code,appRow.invite_code]);
        inviter = inv[0] || null;
        if(inviter){
          const rewardToNew = Math.floor(quota * Number(settings.invite_new_store_reward_ratio||0));
          const rewardToInviter = Math.floor(quota * Number(settings.invite_source_store_reward_ratio||0));
          finalQuota += rewardToNew;
          if(rewardToInviter>0){
            await conn.query('UPDATE merchants SET quota_balance=quota_balance+? WHERE id=?',[rewardToInviter,inviter.id]);
            await conn.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,related_order_id,balance_after,remark) VALUES(?,?,?,?,?,?,?,(SELECT quota_balance FROM merchants WHERE id=?),?)',[uuid(),inviter.id,null,req.user.id,rewardToInviter,'MANUAL_ADJUST',req.params.id,inviter.id,'邀请奖励']);
          }
        }
      }
      await conn.query('INSERT INTO merchants(id,company_name,contact_name,phone,merchant_code,invite_code,note,quota_balance,status,approved_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())',[mid,appRow.company_name,appRow.contact_name,appRow.phone,merchantCode,merchantCode,appRow.note,finalQuota,'ACTIVE']);
      const password = '000000';
      const uid=uuid();
      await conn.query('INSERT INTO users(id,merchant_id,phone,username,display_name,company_name,password_hash,role,status,storage_limit_bytes) VALUES(?,?,?,?,?,?,?,?,?,?)',[uid,mid,appRow.phone,appRow.phone,appRow.contact_name,appRow.company_name,await bcrypt.hash(password,10),'MERCHANT_OWNER','ACTIVE',settingStorageLimitBytes(settings)]);
      if(finalQuota>0){
        await conn.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,related_order_id,balance_after,remark) VALUES(?,?,?,?,?,?,?,?,?)',[uuid(),mid,null,req.user.id,finalQuota,'MANUAL_ADJUST',req.params.id,finalQuota,'新门店初始额度']);
      }
      await conn.query('UPDATE merchant_applications SET status="APPROVED",reviewer_id=?,reviewed_at=NOW(),merchant_id=? WHERE id=?',[req.user.id,mid,req.params.id]);
      await conn.query('INSERT INTO finance_logs(id,merchant_id,type,amount,title) VALUES(?,?,?,?,?)',[uuid(),mid,'INCOME',Number(settings.income_per_quota||0.1)*finalQuota,'新门店初始额度']);
      await conn.commit();
      res.json({message:'已通过申请',account:{phone:appRow.phone,password,merchantCode,quota:finalQuota}});
    }catch(e){ await conn.rollback(); res.status(400).json({message:e.message}); }
    finally{ conn.release(); }
  });
  
  app.post('/api/admin/applications/:id/reject', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    await pool.query('UPDATE merchant_applications SET status="REJECTED",reject_reason=?,reviewer_id=?,reviewed_at=NOW() WHERE id=? AND status="PENDING"',[req.body.reason||'未通过审核',req.user.id,req.params.id]);
    res.json({message:'已驳回申请'});
  });
  
  app.get('/api/admin/merchants', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.status){ wh.push('m.status=?'); ps.push(req.query.status); }
    if(req.query.keyword){ wh.push('(m.company_name LIKE ? OR m.contact_name LIKE ? OR m.phone LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    const sql=`SELECT m.*, COUNT(DISTINCT u.id) user_count, COUNT(DISTINCT i.id) image_count FROM merchants m LEFT JOIN users u ON u.merchant_id=m.id LEFT JOIN images i ON i.merchant_id=m.id ${where} GROUP BY m.id ORDER BY m.quota_balance DESC, m.created_at DESC`;
    const countSql=`SELECT COUNT(*) total FROM merchants m ${where}`;
    const data=await paged(sql,countSql,ps,req,r=>({...publicMerchant(r), userCount:r.user_count, imageCount:r.image_count}));
    res.json(data);
  });
  
  app.get('/api/admin/merchants/:id', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const [[m]]=await pool.query('SELECT * FROM merchants WHERE id=?',[req.params.id]);
    if(!m) return res.status(404).json({message:'商家不存在'});
    const [users]=await pool.query('SELECT * FROM users WHERE merchant_id=? ORDER BY FIELD(role,"MERCHANT_OWNER","MERCHANT_ADMIN","STAFF","TRIAL"), created_at DESC',[req.params.id]);
    const [logs]=await pool.query('SELECT * FROM quota_logs WHERE merchant_id=? ORDER BY created_at DESC LIMIT 50',[req.params.id]);
    res.json({merchant:publicMerchant(m), users:users.map(publicUser), quotaLogs:logs});
  });
  
  app.patch('/api/admin/merchants/:id/status', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const status=req.body.status==='DISABLED'?'DISABLED':'ACTIVE';
    await pool.query('UPDATE merchants SET status=? WHERE id=?',[status,req.params.id]);
    if(req.body.announce) await addAnnouncement({title:'账户状态变更通知',content:`商家账户已被${status==='DISABLED'?'禁用':'启用'}。`,audience:'MERCHANT',createdBy:req.user.id});
    res.json({message:'商家状态已更新'});
  });
  
  app.patch('/api/admin/merchants/:id/config', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    let message='商家配置已更新';
    if(req.body.quotaDelta!==undefined && Number(req.body.quotaDelta)!==0){
      const delta=Number(req.body.quotaDelta);
      const [[merchant]]=await pool.query('SELECT quota_balance FROM merchants WHERE id=?',[req.params.id]);
      if(!merchant) return res.status(404).json({message:'商家不存在'});
      if(delta<0&&Number(merchant.quota_balance||0)<Math.abs(delta)) return res.status(400).json({message:'门店余额不足，无法扣减'});
      await pool.query('UPDATE merchants SET quota_balance=quota_balance+? WHERE id=?',[delta,req.params.id]);
      await pool.query('INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,balance_after,remark) VALUES(?,?,?,?,?,?,(SELECT quota_balance FROM merchants WHERE id=?),?)',[uuid(),req.params.id,null,req.user.id,delta,'MANUAL_ADJUST',req.params.id,delta>0?'平台管理员给门店充值':'平台管理员扣减门店算力']);
      message=delta>0?'门店充值成功':'门店额度已扣减';
    }
    if(req.body.announce) await addAnnouncement({title:req.body.announcementTitle||'商家配置调整通知',content:req.body.announcementContent||'您的商家账户配置已调整。',audience:'MERCHANT',createdBy:req.user.id});
    res.json({message});
  });

  app.patch('/api/admin/users/:id/storage-limit', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const limitBytes = req.body.limitBytes !== undefined
      ? Number(req.body.limitBytes)
      : parseStorageLimitBytes(req.body.limit || req.body.storageLimit);
    if(!Number.isFinite(limitBytes) || limitBytes < 0) return res.status(400).json({message:'存储上限不能小于 0'});
    const [[user]]=await pool.query('SELECT * FROM users WHERE id=? AND status<>"DELETED" LIMIT 1',[req.params.id]);
    if(!user) return res.status(404).json({message:'用户不存在'});
    await pool.query('UPDATE users SET storage_limit_bytes=? WHERE id=?',[Math.floor(limitBytes),req.params.id]);
    const [[fresh]]=await pool.query('SELECT * FROM users WHERE id=?',[req.params.id]);
    res.json({message:'用户图片存储上限已更新',user:publicUser(fresh)});
  });
  
  app.get('/api/admin/ai/tasks', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    res.json(await getAdminAiTasks(req));
  });
  
  app.get('/api/admin/task-images', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=['i.source_type="AI_GENERATED"','i.status="ACTIVE"']; const ps=[];
    if(req.query.operation){ wh.push('t.feature_key=?'); ps.push(req.query.operation); }
    if(req.query.keyword){ wh.push('(i.id LIKE ? OR t.id LIKE ? OR m.company_name LIKE ? OR u.display_name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR t.feature_key LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    if(req.query.startDate){ wh.push('DATE(i.created_at)>=?'); ps.push(req.query.startDate); }
    if(req.query.endDate){ wh.push('DATE(i.created_at)<=?'); ps.push(req.query.endDate); }
    const where='WHERE '+wh.join(' AND ');
    const base=`FROM images i LEFT JOIN ai_task_outputs ato ON ato.image_id=i.id LEFT JOIN ai_tasks t ON t.id=ato.task_id LEFT JOIN ai_task_prompts tp ON tp.task_id=t.id LEFT JOIN ai_task_options opt ON opt.task_id=t.id LEFT JOIN image_relations rel ON rel.target_image_id=i.id AND rel.relation_type='GENERATED_FROM' LEFT JOIN images src ON src.id=rel.source_image_id LEFT JOIN users u ON u.id=i.user_id LEFT JOIN merchants m ON m.id=i.merchant_id ${where}`;
    const sql=`SELECT i.id,i.merchant_id merchantId,i.user_id userId,rel.source_image_id sourceImageId,i.url,i.source_type kind,tp.final_prompt prompt,tp.user_prompt userPrompt,t.cost quotaUsed,opt.options_json settingsJson,i.created_at createdAt,src.url sourceUrl,src.original_name sourceOriginalName,u.display_name userName,u.username,u.phone,m.company_name companyName ${base} ORDER BY i.created_at DESC`;
    const countSql=`SELECT COUNT(*) total ${base}`;
    res.json(await paged(sql,countSql,ps,req,x=>x));
  });
  
  app.get('/api/admin/task-images/:id', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const [[img]]=await pool.query(`SELECT i.id,i.merchant_id merchantId,i.user_id userId,rel.source_image_id sourceImageId,i.original_name originalName,i.url,i.source_type kind,tp.final_prompt prompt,tp.user_prompt userPrompt,t.cost quotaUsed,opt.options_json settingsJson,0 freeRegenUsed,i.created_at createdAt,src.url sourceUrl,src.original_name sourceOriginalName,u.display_name userName,u.username,u.phone,m.company_name companyName FROM images i LEFT JOIN ai_task_outputs ato ON ato.image_id=i.id LEFT JOIN ai_tasks t ON t.id=ato.task_id LEFT JOIN ai_task_prompts tp ON tp.task_id=t.id LEFT JOIN ai_task_options opt ON opt.task_id=t.id LEFT JOIN image_relations rel ON rel.target_image_id=i.id AND rel.relation_type='GENERATED_FROM' LEFT JOIN images src ON src.id=rel.source_image_id LEFT JOIN users u ON u.id=i.user_id LEFT JOIN merchants m ON m.id=i.merchant_id WHERE i.id=?`,[req.params.id]);
    if(!img) return res.status(404).json({message:'图片不存在'});
    res.json(img);
  });

  app.get('/api/admin/ai-logs', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.operation){ wh.push('t.feature_key=?'); ps.push(req.query.operation); }
    if(req.query.status){ wh.push('l.status=?'); ps.push(req.query.status); }
    if(req.query.keyword){ wh.push('(m.company_name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR u.display_name LIKE ? OR t.id LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    if(req.query.startDate){ wh.push('DATE(l.created_at)>=?'); ps.push(req.query.startDate); }
    if(req.query.endDate){ wh.push('DATE(l.created_at)<=?'); ps.push(req.query.endDate); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    const base=`FROM ai_model_call_logs l LEFT JOIN ai_tasks t ON t.id=l.task_id LEFT JOIN users u ON u.id=l.user_id LEFT JOIN merchants m ON m.id=l.merchant_id ${where}`;
    res.json(await paged(`
      SELECT l.*,t.feature_key operation,t.cost quota_used,t.final_prompt prompt,u.display_name userName,u.username,u.phone,m.company_name companyName
      ${base}
      ORDER BY l.created_at DESC
    `,`SELECT COUNT(*) total ${base}`,ps,req,x=>x));
  });
  
  app.get('/api/admin/finance', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.type){ wh.push('f.type=?'); ps.push(req.query.type); }
    if(req.query.keyword){ wh.push('(f.title LIKE ? OR m.company_name LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword)); }
    if(req.query.startDate){ wh.push('DATE(f.created_at)>=?'); ps.push(req.query.startDate); }
    if(req.query.endDate){ wh.push('DATE(f.created_at)<=?'); ps.push(req.query.endDate); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    const base=`FROM finance_logs f LEFT JOIN merchants m ON m.id=f.merchant_id ${where}`;
    res.json(await paged(`SELECT f.*,m.company_name companyName ${base} ORDER BY f.created_at DESC`,`SELECT COUNT(*) total ${base}`,ps,req,x=>x));
  });
  
  app.get('/api/admin/ai-config', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const cfg=await getAiConfig({includeSecret:false});
    res.json({
      provider:cfg.providerConfig.provider,
      modelName:cfg.providerConfig.defaultModel,
      endpoint:cfg.providerConfig.baseUrl,
      enabled:cfg.providerConfig.enabled,
      note:cfg.providerConfig.safetyNote||'',
      updatedAt:null
    });
  });
  
  app.patch('/api/admin/ai-config', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const {provider='mock',modelName='local-mock-model',apiKey='',endpoint='',enabled=0,note=''}=req.body;
    const current=await getAiConfig({includeSecret:false});
    await saveAiConfig({
      ...current,
      providerConfig:{
        ...current.providerConfig,
        provider,
        baseUrl:endpoint||current.providerConfig.baseUrl||'',
        apiKey,
        defaultModel:modelName,
        enabled:!!enabled,
        safetyNote:note
      },
      features:(current.features||[]).map(f=>({
        ...f,
        provider:f.provider||provider,
        modelName:f.modelName||modelName,
        enabled:f.enabled!==false
      }))
    },req.user);
    await pool.query('UPDATE app_settings SET setting_value=?,updated_by=? WHERE setting_key="ai_generation_enabled"',[enabled?'1':'0',req.user.id]);
    if(req.body.announce) await addAnnouncement({title:req.body.announcementTitle||'AI功能调整通知',content:req.body.announcementContent||`平台AI生成功能已${enabled?'启用':'禁用'}。`,audience:req.body.audience||'MERCHANT',createdBy:req.user.id});
    res.json({message:'AI配置已更新'});
  });
  
  app.get('/api/admin/resources', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=['i.status<>"DELETED"','(imc.scope="SYSTEM" OR (icb.image_id IS NULL AND i.merchant_id IS NULL))']; const ps=[];
    if(req.query.status){ wh.push('i.status=?'); ps.push(req.query.status); }
    if(req.query.mainCategory){
      if(req.query.mainCategory==='未分类') wh.push('icb.image_id IS NULL');
      else { wh.push('imc.name=?'); ps.push(req.query.mainCategory); }
    }
    if(req.query.subCategory){ wh.push('isc.name=?'); ps.push(req.query.subCategory); }
    if(req.query.resourceType){
      if(req.query.resourceType==='material') wh.push('imc.name IN ("材质","软体")');
      else if(req.query.resourceType==='scene') wh.push('imc.name="场景模板"');
      else wh.push('imc.name IN ("产品","未分类")');
    }
    if(req.query.keyword){ wh.push('(i.display_name LIKE ? OR i.original_name LIKE ? OR imc.name LIKE ? OR isc.name LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    const where='WHERE '+wh.join(' AND ');
    const base=`FROM images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      ${where}`;
    const map=r=>({
      id:r.id,
      name:stripImageExt(r.display_name||r.original_name||`资源-${String(r.id).slice(0,8)}`),
      resourceType:r.resourceType,
      objectName:r.mainCategoryName||'未分类',
      colorName:Number(r.isMainOnly||0)?'':(r.subCategoryName||''),
      mainCategoryName:r.mainCategoryName||'未分类',
      subCategoryName:Number(r.isMainOnly||0)?'':(r.subCategoryName||''),
      imageUrl:r.url,
      fileSize:Number(r.size_bytes||0),
      width:r.width||null,
      height:r.height||null,
      mimeType:r.mime_type||'',
      status:r.status,
      createdAt:r.created_at,
      scope:'SYSTEM'
    });
    res.json(await paged(`SELECT i.*,imc.name mainCategoryName,isc.name subCategoryName,isc.is_main_only isMainOnly,
      CASE WHEN imc.name IN ('材质','软体') THEN 'material' WHEN imc.name='场景模板' THEN 'scene' ELSE 'user_reference' END resourceType ${base} ORDER BY i.created_at DESC`,
      `SELECT COUNT(*) total ${base}`,ps,req,map));
  });
  
  app.post('/api/admin/resources', requireAuth, upload.array('image',50), async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const {name,objectName='',colorName='',imageUrl=''}=req.body;
    const files=Array.isArray(req.files)?req.files:[];
    if(!files.length && !imageUrl) return res.status(400).json({message:'请上传资源图片或填写图片URL'});
    const subId=await ensureSystemSubCategory({mainName:objectName,subName:colorName,createdBy:req.user.id});
    const targets=files.length?files:[null];
    const ids=[];
    for(const file of targets){
      const uploadedUrl = file ? await saveUploadedFile(file,{kind:'resource',userId:req.user.id}) : '';
      const finalUrl=uploadedUrl || imageUrl || '';
      const originalName=normalizeUploadedFileName(file?.originalname)||String(finalUrl).split('/').pop()||'资源图片';
      const displayName=String(name||'').trim()||stripImageExt(originalName);
      const id=uuid();
      const meta=await getStoredFileMeta(finalUrl);
      await pool.query('INSERT INTO images(id,user_id,display_name,original_name,url,source_type,resource_scope,status,storage_provider,storage_key,file_name,mime_type,size_bytes,width,height) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,req.user.id,displayName,originalName,finalUrl,'RESOURCE','SYSTEM','ACTIVE',meta.storageProvider||'local',meta.storageKey||finalUrl,meta.fileName||file?.filename||'',meta.mimeType||file?.mimetype||'',Number(meta.sizeBytes||file?.size||0),meta.width||null,meta.height||null]);
      if(subId){
        await pool.query('INSERT INTO image_category_bindings(image_id,sub_category_id) VALUES(?,?) ON DUPLICATE KEY UPDATE sub_category_id=VALUES(sub_category_id)',[id,subId]);
      }
      ids.push(id);
    }
    res.json({message:'资源已创建',ids,id:ids[0],count:ids.length});
  });
  
  app.patch('/api/admin/resources/:id', requireAuth, upload.single('image'), async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const {name,objectName,colorName,status}=req.body;
    const fields=[]; const vals=[];
    if(name!==undefined){fields.push('display_name=?'); vals.push(name||null);}
    if(status!==undefined){fields.push('status=?'); vals.push(status);}
    if(fields.length){ vals.push(req.params.id); await pool.query(`UPDATE images SET ${fields.join(',')} WHERE id=?`,vals); }
    if(objectName!==undefined || colorName!==undefined){
      const subId=await ensureSystemSubCategory({mainName:objectName||'',subName:colorName||'',createdBy:req.user.id});
      if(subId) await pool.query('INSERT INTO image_category_bindings(image_id,sub_category_id) VALUES(?,?) ON DUPLICATE KEY UPDATE sub_category_id=VALUES(sub_category_id)',[req.params.id,subId]);
      else await pool.query('DELETE FROM image_category_bindings WHERE image_id=?',[req.params.id]);
    }
    res.json({message:'鎿嶄綔鎴愬姛'});
  });
  
  app.delete('/api/admin/resources/:id', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const [[img]]=await pool.query('SELECT * FROM images WHERE id=? LIMIT 1',[req.params.id]);
    if(!img) return res.status(404).json({message:'图片不存在'});
    await pool.query('UPDATE images SET status="DELETED",deleted_at=NOW() WHERE id=?',[req.params.id]);
    await deleteStoredFile(img);
    res.json({message:'鎿嶄綔鎴愬姛'});
  });
  
  app.get('/api/admin/feedbacks', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.status){ wh.push('f.status=?'); ps.push(req.query.status); }
    if(req.query.keyword){ wh.push('(f.title LIKE ? OR f.content LIKE ? OR u.display_name LIKE ? OR m.company_name LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    const base=`FROM feedbacks f LEFT JOIN users u ON u.id=f.user_id LEFT JOIN merchants m ON m.id=f.merchant_id ${where}`;
    res.json(await paged(`SELECT f.*,f.contact,u.display_name userName,u.phone userPhone,u.username,m.company_name companyName ${base} ORDER BY FIELD(f.status,'PENDING','PROCESSING','RESOLVED','REJECTED'), f.created_at DESC`,`SELECT COUNT(*) total ${base}`,ps,req,r=>r));
  });
  
  app.patch('/api/admin/feedbacks/:id', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    await pool.query('UPDATE feedbacks SET status=?,reply=?,handled_by=?,handled_at=NOW() WHERE id=?',[req.body.status||'PROCESSING',req.body.reply||'',req.user.id,req.params.id]);
    res.json({message:'反馈已处理'});
  });
  
  app.get('/api/admin/announcements', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.audience){ wh.push('audience=?'); ps.push(req.query.audience); }
    if(req.query.keyword){ wh.push('(title LIKE ? OR content LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword)); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    res.json(await paged(`SELECT * FROM announcements ${where} ORDER BY created_at DESC`,`SELECT COUNT(*) total FROM announcements ${where}`,ps,req,r=>r));
  });
  
  app.post('/api/admin/announcements', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const settings=await getSettingsMap();
    const {title,content,audience='ALL'}=req.body;
    const validDays=Math.max(1,Number(req.body.validDays||settings.announcement_retention_days||30));
    const safeAudience=['ALL','MERCHANT','ADMIN'].includes(audience)?audience:'ALL';
    if(!title||!content) return res.status(400).json({message:'公告标题和内容不能为空'});
    await addAnnouncement({title,content,audience:safeAudience,validDays,createdBy:req.user.id});
    res.json({message:'公告已发布'});
  });
  
  app.get('/api/admin/redeem-codes', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const wh=[]; const ps=[];
    if(req.query.status){ wh.push('status=?'); ps.push(req.query.status); }
    if(req.query.keyword){ wh.push('code LIKE ?'); ps.push(like(req.query.keyword)); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    res.json(await paged(`SELECT * FROM redeem_codes ${where} ORDER BY created_at DESC`,`SELECT COUNT(*) total FROM redeem_codes ${where}`,ps,req,r=>r));
  });
  
  app.post('/api/admin/redeem-codes/batch', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const count=Math.min(500,Math.max(1,Number(req.body.count||1)));
    const quota=Math.max(1,Number(req.body.quota||10));
    const maxUses=Math.max(1,Number(req.body.maxUses||1));
    const targetScope=req.body.targetScope||'ALL';
    const validDays=Math.max(1,Number(req.body.validDays||30));
    const codes=[];
    for(let i=0;i<count;i++){
      const code=makeRedeemCode(); codes.push(code);
      await pool.query('INSERT INTO redeem_codes(id,code,quota,max_uses,target_scope,valid_until,created_by) VALUES(?,?,?,?,?,DATE_ADD(NOW(), INTERVAL ? DAY),?)',[uuid(),code,quota,maxUses,targetScope,validDays,req.user.id]);
    }
    res.json({message:`已创建 ${count} 个兑换码`,codes});
  });
  
  app.get('/api/admin/quota-logs', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const view=String(req.query.view||'usage')==='recharge'?'recharge':'usage';
    const period=normalizeQuotaPeriod(req.query.period);
    const page=Math.max(1,Number(req.query.page||1));
    const pageSize=Math.min(50,Math.max(5,Number(req.query.pageSize||12)));
    const offset=(page-1)*pageSize;
    const startDate=String(req.query.startDate||'').trim();
    const endDate=String(req.query.endDate||'').trim();
    const keyword=String(req.query.keyword||'').trim();

    const usageDate='DATE(COALESCE(t.finished_at,t.submitted_at))';
    const rechargeDate='DATE(q.created_at)';
    const usagePeriod=quotaPeriodSql(usageDate,period);
    const rechargePeriod=quotaPeriodSql(rechargeDate,period);
    const usagePeriodKey=`CAST(${usagePeriod.key} AS CHAR)`;
    const rechargePeriodKey=`CAST(${rechargePeriod.key} AS CHAR)`;
    const successTaskWhere='(t.status="succeeded" OR t.result_image_id IS NOT NULL OR EXISTS (SELECT 1 FROM ai_model_call_logs ml WHERE ml.task_id=t.id AND ml.status="SUCCESS"))';

    const usageWh=['t.merchant_id IS NOT NULL',successTaskWhere];
    const usagePs=[];
    if(startDate){usageWh.push(`${usageDate}>=?`);usagePs.push(startDate);}
    if(endDate){usageWh.push(`${usageDate}<=?`);usagePs.push(endDate);}
    if(keyword){usageWh.push('(m.company_name LIKE ? OR u.display_name LIKE ? OR u.phone LIKE ? OR t.id LIKE ?)');usagePs.push(like(keyword),like(keyword),like(keyword),like(keyword));}
    const usageWhere='WHERE '+usageWh.join(' AND ');
    const usageBase=`FROM ai_tasks t LEFT JOIN merchants m ON m.id=t.merchant_id LEFT JOIN users u ON u.id=t.user_id ${usageWhere}`;

    const rechargeWh=['q.merchant_id IS NOT NULL','q.amount>0','q.related_user_id IS NULL','q.type IN ("RECHARGE","MANUAL_ADJUST")'];
    const rechargePs=[];
    if(startDate){rechargeWh.push('DATE(q.created_at)>=?');rechargePs.push(startDate);}
    if(endDate){rechargeWh.push('DATE(q.created_at)<=?');rechargePs.push(endDate);}
    if(keyword){rechargeWh.push('(m.company_name LIKE ? OR ou.display_name LIKE ? OR ou.phone LIKE ? OR q.remark LIKE ?)');rechargePs.push(like(keyword),like(keyword),like(keyword),like(keyword));}
    const rechargeWhere='WHERE '+rechargeWh.join(' AND ');
    const rechargeBase=`FROM quota_logs q LEFT JOIN merchants m ON m.id=q.merchant_id LEFT JOIN users ou ON ou.id=q.operator_user_id ${rechargeWhere}`;

    const [[usageSummary]]=await pool.query(
      `SELECT COUNT(DISTINCT t.id) successCalls, IFNULL(SUM(t.cost),0) usageQuota ${usageBase}`,
      usagePs
    );
    const [[rechargeSummary]]=await pool.query(
      `SELECT COUNT(*) rechargeCount, IFNULL(SUM(q.amount),0) rechargeQuota ${rechargeBase}`,
      rechargePs
    );

    if(view==='recharge'){
      const [[countRow]]=await pool.query(
        `SELECT COUNT(*) total FROM (SELECT q.merchant_id,${rechargePeriodKey} periodKey ${rechargeBase} GROUP BY q.merchant_id,${rechargePeriodKey}) x`,
        rechargePs
      );
      const [rows]=await pool.query(
        `SELECT q.merchant_id merchantId,
                COALESCE(MAX(m.company_name),'未绑定门店') companyName,
                ${rechargePeriodKey} periodKey,
                DATE_FORMAT(MIN(${rechargePeriod.start}),'%Y-%m-%d') periodStart,
                DATE_FORMAT(MAX(${rechargePeriod.end}),'%Y-%m-%d') periodEnd,
                CONCAT(DATE_FORMAT(MIN(${rechargePeriod.start}),'%Y/%m/%d'),' - ',DATE_FORMAT(MAX(${rechargePeriod.end}),'%Y/%m/%d')) periodLabel,
                COUNT(*) rechargeCount,
                IFNULL(SUM(q.amount),0) rechargeQuota,
                MIN(q.created_at) firstAt,
                MAX(q.created_at) lastAt
         ${rechargeBase}
         GROUP BY q.merchant_id,${rechargePeriodKey}
         ORDER BY periodStart DESC,lastAt DESC
         LIMIT ? OFFSET ?`,
        [...rechargePs,pageSize,offset]
      );
      return res.json({
        items:rows,
        page,
        pageSize,
        total:Number(countRow?.total||0),
        view,
        period,
        summary:{
          successCalls:Number(usageSummary?.successCalls||0),
          usageQuota:Number(usageSummary?.usageQuota||0),
          rechargeCount:Number(rechargeSummary?.rechargeCount||0),
          rechargeQuota:Number(rechargeSummary?.rechargeQuota||0)
        }
      });
    }

    const [[countRow]]=await pool.query(
      `SELECT COUNT(*) total FROM (SELECT t.merchant_id,${usagePeriodKey} periodKey ${usageBase} GROUP BY t.merchant_id,${usagePeriodKey}) x`,
      usagePs
    );
    const [rows]=await pool.query(
      `SELECT t.merchant_id merchantId,
              COALESCE(MAX(m.company_name),'未绑定门店') companyName,
              ${usagePeriodKey} periodKey,
              DATE_FORMAT(MIN(${usagePeriod.start}),'%Y-%m-%d') periodStart,
              DATE_FORMAT(MAX(${usagePeriod.end}),'%Y-%m-%d') periodEnd,
              CONCAT(DATE_FORMAT(MIN(${usagePeriod.start}),'%Y/%m/%d'),' - ',DATE_FORMAT(MAX(${usagePeriod.end}),'%Y/%m/%d')) periodLabel,
              COUNT(DISTINCT t.id) successCalls,
              IFNULL(SUM(t.cost),0) usageQuota,
              MIN(COALESCE(t.finished_at,t.submitted_at)) firstAt,
              MAX(COALESCE(t.finished_at,t.submitted_at)) lastAt
       ${usageBase}
       GROUP BY t.merchant_id,${usagePeriodKey}
       ORDER BY periodStart DESC,lastAt DESC
       LIMIT ? OFFSET ?`,
      [...usagePs,pageSize,offset]
    );
    res.json({
      items:rows,
      page,
      pageSize,
      total:Number(countRow?.total||0),
      view,
      period,
      summary:{
        successCalls:Number(usageSummary?.successCalls||0),
        usageQuota:Number(usageSummary?.usageQuota||0),
        rechargeCount:Number(rechargeSummary?.rechargeCount||0),
        rechargeQuota:Number(rechargeSummary?.rechargeQuota||0)
      }
    });
  });

  app.get('/api/admin/quota-logs/detail', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const view=String(req.query.view||'usage')==='recharge'?'recharge':'usage';
    const period=normalizeQuotaPeriod(req.query.period);
    const merchantId=String(req.query.merchantId||'').trim();
    const periodKey=String(req.query.periodKey||'').trim();
    if(!merchantId||!periodKey)return res.status(400).json({message:'缺少门店或统计周期'});
    if(view==='recharge'){
      const rechargeDate='DATE(q.created_at)';
      const rechargePeriod=quotaPeriodSql(rechargeDate,period);
      const [rows]=await pool.query(
        `SELECT q.*,m.company_name companyName,ou.display_name operatorName,ou.phone operatorPhone
         FROM quota_logs q
         LEFT JOIN merchants m ON m.id=q.merchant_id
         LEFT JOIN users ou ON ou.id=q.operator_user_id
         WHERE q.merchant_id=? AND CAST(${rechargePeriod.key} AS CHAR)=? AND q.amount>0 AND q.related_user_id IS NULL AND q.type IN ("RECHARGE","MANUAL_ADJUST")
         ORDER BY q.created_at DESC`,
        [merchantId,periodKey]
      );
      return res.json({view,period,merchantId,periodKey,items:rows});
    }
    const usageDate='DATE(COALESCE(t.finished_at,t.submitted_at))';
    const usagePeriod=quotaPeriodSql(usageDate,period);
    const successTaskWhere='(t.status="succeeded" OR t.result_image_id IS NOT NULL OR EXISTS (SELECT 1 FROM ai_model_call_logs ml WHERE ml.task_id=t.id AND ml.status="SUCCESS"))';
    const [rows]=await pool.query(
      `SELECT t.id,t.feature_key featureKey,t.cost,t.model_name modelName,t.provider,t.submitted_at submittedAt,t.finished_at finishedAt,u.display_name userName,u.phone userPhone,m.company_name companyName
       FROM ai_tasks t
       LEFT JOIN users u ON u.id=t.user_id
       LEFT JOIN merchants m ON m.id=t.merchant_id
       WHERE t.merchant_id=? AND CAST(${usagePeriod.key} AS CHAR)=? AND ${successTaskWhere}
       ORDER BY COALESCE(t.finished_at,t.submitted_at) DESC`,
      [merchantId,periodKey]
    );
    res.json({view,period,merchantId,periodKey,items:rows});
  });
  
  app.get('/api/export/admin/:type', requireAuth, async (req,res)=>{
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:SYSTEM_ADMIN_REQUIRED_MESSAGE});
    const type=req.params.type;
    if(type==='redeem-codes'){
      const [rows]=await pool.query('SELECT code,quota,max_uses maxUses,used_count usedCount,target_scope targetScope,status,valid_until validUntil,created_at createdAt FROM redeem_codes ORDER BY created_at DESC LIMIT 2000');
      return sendCsv(res,'redeem-codes.csv',[{key:'code',label:'兑换码'},{key:'quota',label:'额度'},{key:'maxUses',label:'可兑换次数'},{key:'usedCount',label:'已使用'},{key:'targetScope',label:'对象'},{key:'status',label:'状态'},{key:'validUntil',label:'有效期'},{key:'createdAt',label:'创建时间'}],rows);
    }
    if(type==='feedbacks'){
      const [rows]=await pool.query('SELECT title,content,contact,status,reply,created_at createdAt FROM feedbacks ORDER BY created_at DESC LIMIT 2000');
      return sendCsv(res,'feedbacks.csv',[{key:'title',label:'标题'},{key:'content',label:'内容'},{key:'contact',label:'联系方式'},{key:'status',label:'状态'},{key:'reply',label:'处理说明'},{key:'createdAt',label:'提交时间'}],rows);
    }
    res.status(404).json({message:'不支持导出'});
  });
}

