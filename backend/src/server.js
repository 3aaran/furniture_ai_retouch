import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { initDb, pool, publicUser, publicApplication, findUserByUsername } from './db.js';
import { requireAuth, sign } from './auth.js';
import { runAi, applyWatermark, quotaCost } from './aiService.js';
import { submitAiTask, getAiTaskStatus, getAiTaskDetail, getRecentAiTasks, deleteAiTask } from './ai/taskService.js';
import { getAiConfig, getFeatureConfig } from './ai/configService.js';
import { callImageModel } from './ai/providerService.js';
import { STORAGE_ROOT, storageTempDir, saveUploadedImage, saveBufferToStorage, urlToDiskPath, getLocalFileMeta, MIN_GENERATION_STORAGE_BYTES, getUserStorageSummary, assertUserStorageAvailable, addUserStorageUsage, applyUserStorageDelta, deleteStoredFile, normalizeUploadedFileName, getImageAccessUrl } from './services/storageService.js';
import { registerAdminRoutes } from './routes/adminRoutes.js';
import { registerMerchantRoutes } from './routes/merchantRoutes.js';
import { registerResourceCategoryRoutes } from './routes/resourceCategoryRoutes.js';
import { registerProfileRoutes } from './routes/profileRoutes.js';
import { recycleExpiredTrialAccount } from './services/trialAccountService.js';
import { bindImageToResourceCategory } from './services/resourceBindingService.js';
import { processStoredImage, processTypeForOperation } from './services/imageProcessService.js';

await initDb();
const app = express();
const port = process.env.PORT || 3001;
const uploadDir = storageTempDir();
const legacyUploadDir = path.resolve('uploads');
const legacyOutputDir = path.resolve('outputs');
if(!fs.existsSync(legacyUploadDir)) fs.mkdirSync(legacyUploadDir,{recursive:true});
if(!fs.existsSync(legacyOutputDir)) fs.mkdirSync(legacyOutputDir,{recursive:true});
const upload = multer({ dest: uploadDir, limits:{fileSize:30*1024*1024} });

// FRONTEND_ORIGIN 线上应设置为正式域名；多个域名可用英文逗号分隔。
const corsOrigins = String(process.env.FRONTEND_ORIGIN || '*').split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins.includes('*') ? '*' : corsOrigins,
  credentials: true
}));
app.use(express.json({limit:'8mb'}));
app.use('/files', express.static(STORAGE_ROOT));
app.use('/api/files', express.static(STORAGE_ROOT));
// 兼容旧数据：历史图片仍可能存放在 /uploads 或 /outputs。
app.use('/uploads', express.static(legacyUploadDir));
app.use('/outputs', express.static(legacyOutputDir));
app.use('/api/uploads', express.static(legacyUploadDir));
app.use('/api/outputs', express.static(legacyOutputDir));
app.use((req,res,next)=>{
  if(['/api/images/upload','/api/merchant/resources','/api/admin/resources'].includes(req.path)){
    console.log('[upload:request]',req.method,req.path,'auth=',req.headers.authorization?'yes':'no','type=',req.headers['content-type']||'');
  }
  next();
});

function readConfiguredAppName() {
  try {
    const config = JSON.parse(fs.readFileSync(new URL('../../frontend/src/config/appConfig.json', import.meta.url), 'utf8'));
    return String(config.appName || '').trim();
  } catch {
    return '';
  }
}

function readAppConfigValue(key, fallback = '') {
  try {
    const config = JSON.parse(fs.readFileSync(new URL('../../frontend/src/config/appConfig.json', import.meta.url), 'utf8'));
    return String(config[key] || fallback || '').trim();
  } catch {
    return fallback;
  }
}

const APP_NAME = process.env.APP_NAME || readConfiguredAppName() || '家具修图';
const roleRank = { SYSTEM_ADMIN:100, MERCHANT_OWNER:80, MERCHANT_ADMIN:60, STAFF:30, TRIAL:10 };
const validSubRoles = ['MERCHANT_ADMIN','STAFF','TRIAL'];
const smsCodes = new Map();
function isSystemAdmin(u){ return u?.role === 'SYSTEM_ADMIN'; }
function isMerchantPower(u){ return ['MERCHANT_OWNER','MERCHANT_ADMIN'].includes(u?.role); }
function canManageRole(actor,targetRole){ return roleRank[actor.role] > roleRank[targetRole]; }
function validPhone(phone){ return /^1[3-9]\d{9}$/.test(String(phone||'')); }
function randomPassword(){ return Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,6); }
async function generateInternalAccount(merchantId, role){
  const prefix = role==='MERCHANT_ADMIN'?'MA':role==='TRIAL'?'TY':'YG';
  for(let i=0;i<20;i++){
    const n = Math.floor(100000 + Math.random()*900000);
    const account = `${prefix}${n}`;
    const [dup]=await pool.query('SELECT id FROM users WHERE username=?',[account]);
    if(!dup.length) return account;
  }
  return `${prefix}${Date.now().toString().slice(-8)}`;
}
function hoursSince(t){ return t ? (Date.now() - new Date(t).getTime())/36e5 : 9999; }

async function saveUploadedFile(file, options = {}){
  const saved = await saveUploadedImage(file, options);
  return saved?.url || '';
}


function pageParams(req){
  const page=Math.max(1,Number(req.query.page||1));
  const pageSize=Math.min(50,Math.max(5,Number(req.query.pageSize||10)));
  return {page,pageSize,offset:(page-1)*pageSize};
}
function like(v){ return `%${String(v||'').trim()}%`; }
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
async function assertMerchantActive(user){
  if(!user.merchant_id) throw new Error('当前账号未绑定商家');
  const [[m]]=await pool.query('SELECT * FROM merchants WHERE id=?',[user.merchant_id]);
  if(!m || m.status!=='ACTIVE') throw new Error('所属商家不可用');
  return m;
}
async function getSettingsMap(){ const [rows]=await pool.query('SELECT setting_key,setting_value FROM app_settings'); return Object.fromEntries(rows.map(r=>[r.setting_key,r.setting_value])); }
async function publicMe(user){
  const u = publicUser(user);
  if(user?.merchant_id){
    const [[m]]=await pool.query('SELECT id,company_name,merchant_code,quota_balance,status FROM merchants WHERE id=?',[user.merchant_id]);
    if(m){
      const usesMerchantQuota = ['MERCHANT_OWNER','MERCHANT_ADMIN'].includes(user.role);
      u.companyName = m.company_name || u.companyName;
      u.merchantCode = m.merchant_code;
      u.merchantQuota = Number(m.quota_balance || 0);
      u.merchantStatus = m.status;
      u.quota = usesMerchantQuota ? Number(m.quota_balance || 0) : Number(user.quota_balance || 0);
    }
  }
  return u;
}
function resolutionMultiplier(settings, resolution){
  const key=String(resolution||'2K').toLowerCase().replace(/\s/g,'');
  if(key==='1k') return Number(settings.resolution_multiplier_1k ?? 1);
  if(key==='4k') return Number(settings.resolution_multiplier_4k ?? 4);
  return Number(settings.resolution_multiplier_2k ?? 2);
}
function calcAiCost(settings, operation, resolution){
  const opKey = {remove_bg:'cost_remove_bg',replace_bg:'cost_replace_bg',enhance:'cost_enhance',material:'cost_material',multiview:'cost_multiview',lineart:'cost_lineart'}[operation];
  const base = Number(settings[opKey] ?? quotaCost[operation] ?? 1);
  const mul = resolutionMultiplier(settings, resolution);
  return Math.max(0, Math.ceil(base * mul));
}
app.get('/api/health',(req,res)=>res.json({ok:true,appName:APP_NAME}));

app.get('/api/health/public-url', async (req,res)=>{
  const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '').replace(/\/api$/i, '');
  const [[latest]] = await pool.query(
    'SELECT id,url FROM images WHERE url LIKE "/files/%" AND status="ACTIVE" ORDER BY created_at DESC LIMIT 1'
  );
  const samplePath = String(req.query.path || latest?.url || '/files/');
  res.json({
    ok: !!publicBaseUrl,
    publicBaseUrl,
    samplePath,
    sampleUrl: publicBaseUrl ? `${publicBaseUrl}${samplePath.startsWith('/') ? samplePath : `/${samplePath}`}` : '',
    note: '把 sampleUrl 放到无痕浏览器或外部网络打开；如果能直接看到图片，AI 平台也能读取。'
  });
});

app.post('/api/auth/login', async (req,res)=>{
  const identifier=String(req.body.identifier||req.body.username||req.body.phone||'').trim();
  const password=String(req.body.password||'');
  const user=await findUserByUsername(identifier);
  if(!user || !user.password_hash || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({message:'账号或密码错误'});
  if(user.status!=='ACTIVE') return res.status(403).json({message:'璐﹀彿宸茶绂佺敤'});
  if(user.role==='TRIAL'){
    const trial=await recycleExpiredTrialAccount(user);
    if(trial.expired) return res.status(403).json({message:'体验账号已过期，账号已删除，剩余额度已退回门店额度池'});
  }
  if(user.merchant_id){
    const [[m]]=await pool.query('SELECT status FROM merchants WHERE id=?',[user.merchant_id]);
    if(!m || m.status!=='ACTIVE') return res.status(403).json({message:'所属门店已被平台禁用'});
  }
  res.json({token:sign(user),user:await publicMe(user)});
});

app.post('/api/auth/send-code', async (req,res)=>{
  const phone=String(req.body.phone||'').trim();
  if(!validPhone(phone)) return res.status(400).json({message:'请输入正确手机号'});
  const [rows]=await pool.query('SELECT * FROM users WHERE phone=? AND role="MERCHANT_OWNER" AND status<>"DELETED" LIMIT 1',[phone]);
  if(!rows[0]) return res.status(404).json({message:'该手机号未开通门店管理员账号'});
  const code=String(Math.floor(100000 + Math.random()*900000));
  smsCodes.set(phone,{code,expires:Date.now()+5*60*1000});
  // 开发阶段不接短信平台，直接返回验证码；上线时改成阿里云/腾讯云短信发送。
  res.json({message:'验证码已生成（开发模式）', code});
});

app.post('/api/auth/code-login', async (req,res)=>{
  const phone=String(req.body.phone||'').trim();
  const code=String(req.body.code||'').trim();
  const saved=smsCodes.get(phone);
  if(!saved || saved.expires<Date.now() || saved.code!==code) return res.status(401).json({message:'验证码错误或已过期'});
  const [rows]=await pool.query('SELECT * FROM users WHERE phone=? AND role="MERCHANT_OWNER" AND status<>"DELETED" LIMIT 1',[phone]);
  const user=rows[0];
  if(!user) return res.status(404).json({message:'该手机号未开通门店管理员账号'});
  if(user.status!=='ACTIVE') return res.status(403).json({message:'璐﹀彿宸茶绂佺敤'});
  const [[m]]=await pool.query('SELECT status FROM merchants WHERE id=?',[user.merchant_id]);
  if(!m || m.status!=='ACTIVE') return res.status(403).json({message:'所属门店已被平台禁用'});
  smsCodes.delete(phone);
  res.json({token:sign(user),user:await publicMe(user)});
});
app.get('/api/me', requireAuth, async (req,res)=>res.json(await publicMe(req.user)));
app.get('/api/storage/me', requireAuth, async (req,res)=>{
  try{
    res.json(await getUserStorageSummary(pool, req.user.id));
  }catch(e){
    res.status(400).json({message:e.message||'读取存储空间失败'});
  }
});

app.post('/api/applications', async (req,res)=>{
  const {companyName,contactName,phone,inviteCode,note}=req.body;
  if(!companyName || !contactName || !validPhone(phone)) return res.status(400).json({message:'请填写公司名称、联系人和正确手机号'});
  const [exists]=await pool.query('SELECT id FROM merchant_applications WHERE phone=? AND status="PENDING" UNION SELECT id FROM merchants WHERE phone=?',[phone,phone]);
  if(exists.length) return res.status(400).json({message:'该手机号已提交申请或已开通商家'});
  await pool.query('INSERT INTO merchant_applications(id,company_name,contact_name,phone,invite_code,note) VALUES(?,?,?,?,?,?)',[uuid(),companyName,contactName,phone,inviteCode||null,note||null]);
  res.json({message:'申请已提交，请等待管理员审核'});
});

app.get('/api/announcements', requireAuth, async (req,res)=>{
  const aud = isSystemAdmin(req.user) ? ['ALL','ADMIN'] : ['ALL','MERCHANT'];
  const [rows]=await pool.query('SELECT * FROM announcements WHERE audience IN (?) ORDER BY created_at DESC LIMIT 20',[aud]);
  res.json(rows.map(r=>({id:r.id,title:r.title,content:r.content,audience:r.audience,createdAt:r.created_at})));
});

registerAdminRoutes(app,{upload});

registerResourceCategoryRoutes(app);

registerMerchantRoutes(app,{
  upload,
  isMerchantPower,
  assertMerchantActive,
  validSubRoles,
  canManageRole,
  validPhone,
  generateInternalAccount,
  getSettingsMap,
  publicMe,
  saveUploadedFile,
  paged,
  like
});

registerProfileRoutes(app,{upload});

app.get('/api/settings/public', requireAuth, async (req,res)=>{
  const s=await getSettingsMap();
  const keys=['cost_remove_bg','cost_replace_bg','cost_enhance','cost_material','cost_multiview','cost_lineart','resolution_multiplier_1k','resolution_multiplier_2k','resolution_multiplier_4k'];
  res.json(Object.fromEntries(keys.map(k=>[k,s[k]])));
});

app.post('/api/images/upload', requireAuth, (req,res)=>{
  upload.single('image')(req,res,async err=>{
    if(err){
      console.error('[upload:image] multer error',err);
      const msg = err.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 30MB' : (err.message || '图片上传失败');
      return res.status(400).json({message:msg});
    }
    let saved = null;
    try{
      if(!req.file) return res.status(400).json({message:'未收到图片文件，请重新选择 JPG/PNG/WebP 图片'});
      await assertUserStorageAvailable(pool, req.user.id, req.file.size || 0, { label: '图片上传' });

      const img={
        id:uuid(),
        merchantId:req.user.merchant_id||null,
        userId:req.user.id,
        originalName:normalizeUploadedFileName(req.file.originalname)||'',
        kind:'original'
      };
      saved = await saveUploadedImage(req.file,{merchantId:img.merchantId,userId:img.userId,kind:'original'});
      img.url = saved.url;
      img.storageProvider = saved.storageProvider;
      img.storageKey = saved.storageKey;
      img.fileName = saved.fileName;
      img.mimeType = saved.mimeType;
      img.sizeBytes = saved.sizeBytes;
      img.width = saved.width || null;
      img.height = saved.height || null;
      await pool.query(
        'INSERT INTO images(id,merchant_id,user_id,display_name,original_name,file_name,mime_type,size_bytes,width,height,storage_provider,storage_key,url,source_type,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [img.id,img.merchantId,img.userId,img.originalName,img.originalName,img.fileName,img.mimeType,img.sizeBytes,img.width,img.height,img.storageProvider,img.storageKey,img.url,'UPLOAD','ACTIVE']
      );
      await bindImageToResourceCategory(pool, {
        imageId: img.id,
        merchantId: img.merchantId,
        userId: img.userId,
        createdBy: img.userId,
        scope: isMerchantPower(req.user) ? 'MERCHANT' : 'USER',
        mainName: ''
      });
      const storage = await applyUserStorageDelta(pool, req.user.id, img.sizeBytes, {
        merchantId: img.merchantId,
        imageId: img.id,
        action: 'UPLOAD',
        message: 'user image uploaded'
      });
      res.json({...img,storage,createdAt:new Date().toISOString()});
    }catch(e){
      if(req.file?.path && fs.existsSync(req.file.path)) fs.rmSync(req.file.path,{force:true});
      if(saved?.url) await deleteStoredFile(saved);
      console.error('[upload:image] handler error',e);
      res.status(400).json({message:e.message||'图片上传失败'});
    }
  });
});

app.get('/api/images/recent', requireAuth, async (req,res)=>{
  const wh=['i.user_id=?','i.source_type<>"UPLOAD"','i.status="ACTIVE"'];
  const ps=[req.user.id];
  if(req.query.kind){ wh.push('i.source_type=?'); ps.push(req.query.kind); }
  if(req.query.keyword){ wh.push('(i.id LIKE ? OR i.source_type LIKE ? OR i.original_name LIKE ? OR i.display_name LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
  const where='WHERE '+wh.join(' AND ');
  const base=`FROM images i LEFT JOIN image_relations rel ON rel.target_image_id=i.id AND rel.relation_type='GENERATED_FROM' LEFT JOIN images src ON src.id=rel.source_image_id LEFT JOIN users u ON u.id=i.user_id LEFT JOIN merchants m ON m.id=i.merchant_id ${where}`;
  const sql=`SELECT i.id,i.merchant_id merchantId,i.user_id userId,rel.source_image_id sourceImageId,i.original_name originalName,i.url,i.source_type kind,NULL prompt,NULL userPrompt,0 quotaUsed,NULL settingsJson,0 freeRegenUsed,NULL watermark,i.created_at createdAt,src.url sourceUrl,src.original_name sourceOriginalName,u.display_name userName,m.company_name companyName ${base} ORDER BY i.created_at DESC`;
  const countSql=`SELECT COUNT(*) total ${base}`;
  const data=await paged(sql,countSql,ps,req,x=>x);
  res.json(data);
});

app.get('/api/images', requireAuth, async (req,res)=>{
  const wh=['i.status="ACTIVE"']; const ps=[];
  const taskOnly = String(req.query.task || '') === 'ai';
  if(isSystemAdmin(req.user)) {}
  else if(isMerchantPower(req.user)){ wh.push('i.merchant_id=?'); ps.push(req.user.merchant_id); }
  else { wh.push('i.user_id=?'); ps.push(req.user.id); }
  if(taskOnly) wh.push('i.source_type="AI_GENERATED"');
  if(req.query.kind){
    if(taskOnly){ wh.push('t.feature_key=?'); ps.push(req.query.kind); }
    else { wh.push('i.source_type=?'); ps.push(req.query.kind); }
  }
  if(req.query.keyword){ wh.push('(i.original_name LIKE ? OR i.display_name LIKE ? OR i.source_type LIKE ? OR t.feature_key LIKE ? OR u.display_name LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
  if(req.query.startDate){ wh.push('DATE(i.created_at)>=?'); ps.push(req.query.startDate); }
  if(req.query.endDate){ wh.push('DATE(i.created_at)<=?'); ps.push(req.query.endDate); }
  const where=wh.length?'WHERE '+wh.join(' AND '):'';
  const base=`FROM images i LEFT JOIN ai_task_outputs ato ON ato.image_id=i.id LEFT JOIN ai_tasks t ON t.id=ato.task_id LEFT JOIN image_relations rel ON rel.target_image_id=i.id AND rel.relation_type='GENERATED_FROM' LEFT JOIN users u ON u.id=i.user_id LEFT JOIN merchants m ON m.id=i.merchant_id ${where}`;
  const sql=`SELECT i.id,i.merchant_id merchantId,i.user_id userId,rel.source_image_id sourceImageId,i.original_name originalName,i.url,COALESCE(t.feature_key,i.source_type) kind,NULL prompt,NULL userPrompt,COALESCE(t.cost,0) quotaUsed,NULL watermark,i.created_at createdAt,u.display_name userName,m.company_name companyName ${base} ORDER BY i.created_at DESC`;
  const countSql=`SELECT COUNT(*) total ${base}`;
  const data=await paged(sql,countSql,ps,req,x=>x);
  res.json(data);
});


function buildGenerationPrompt({operation, templatePrompt, customText, options, resolution, hasReference}){
  const map={
    material:'替换家具表面材质，保持家具主体结构、比例、轮廓、坐垫和细节不变。',
    replace_bg:'将背景替换为现代家居场景，真实光影，电商产品图风格。图片清晰，画面干净，不要新增多余家具，不要改变原家具颜色。',
    remove_bg:'去除或净化图片背景，保留家具主体，生成高质量白底或干净背景电商图。',
    enhance:'一键提升为专业拍摄效果，增强清晰度、光影和质感，保留家具真实外观，不改变结构。',
    lineart:'基于产品图片生成干净精致的线稿轮廓图，线条清晰，适合设计沟通和方案展示。',
    multiview:'基于 Image A 生成同一件家具的多角度产品展示拼版图，只允许输出一张拼版图片，不允许输出多张独立图片。多个视图必须展示同一件家具在不同方向下的外观，并保持结构、尺寸比例、材质颜色、纹理质感和装饰细节一致。'
  };
  const opt=[];
  const o=options||{};
  if(operation==='remove_bg'){
    if(o.whiteBg) opt.push('输出纯白干净背景');
    if(o.mirror) opt.push('生成带镜像质感的产品图');
  }
  if(operation==='enhance'){
    if(o.focus) opt.push('开启产品聚焦，突出产品并增强背景虚化');
    if(o.angle) opt.push(`角度控制：${o.angle}`);
  }
  if(operation==='multiview') opt.push(o.view==='四角度视图'
    ? '四视图：同一张拼版图中展示正视图、侧视图、45度视图、背视图；背视图必须是背面直视图，不能生成成正视图、侧视图、俯视图或普通45度图'
    : '三视图：同一张拼版图中展示正视图、侧视图、45度视图');
  return [
    map[operation] || '优化这张家具商品图，保持主体真实自然。',
    templatePrompt ? `系统模板关键词：${templatePrompt}` : '',
    opt.length ? `功能选项：${opt.join('；')}` : '',
    hasReference ? '参考模板：使用用户上传的参考图风格、背景、材质或构图作为辅助，不要破坏产品主体。' : '',
    customText ? `用户补充要求：${customText}` : '用户补充要求：无',
    `输出规格：${resolution || '2K'}，商业产品图风格。`,
    '严格要求：不要改变家具主体结构和比例，不要生成多余产品；如果用户说明保留抱枕、水杯、坐垫、缝线、扶手纹理等细节，必须保留。'
  ].filter(Boolean).join('\n');
}

app.get('/api/ai/tasks/recent', requireAuth, async (req,res)=>{
  try{ res.json(await getRecentAiTasks(req.user,{pageSize:req.query.pageSize||20,keyword:req.query.keyword||''})); }
  catch(e){ res.status(400).json({message:e.message||'AI任务提交失败'}); }
});
app.post('/api/ai/tasks', requireAuth, async (req,res)=>{
  try{
    const d=await submitAiTask(req.body,req.user);
    const [[fresh]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
    res.json({...d,user:await publicMe(fresh)});
  }catch(e){ res.status(400).json({message:e.message||'任务提交失败'}); }
});
app.get('/api/ai/tasks/:id/status', requireAuth, async (req,res)=>{
  try{
    const task=await getAiTaskStatus(req.params.id,req.user);
    const [[fresh]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
    res.json({...task,user:await publicMe(fresh)});
  }catch(e){ res.status(404).json({message:e.message||'任务不存在'}); }
});
app.get('/api/ai/tasks/:id', requireAuth, async (req,res)=>{
  try{ res.json(await getAiTaskDetail(req.params.id,req.user)); }
  catch(e){ res.status(404).json({message:e.message||'任务不存在'}); }
});

app.delete('/api/ai/tasks/:id', requireAuth, async (req,res)=>{
  try{
    res.json(await deleteAiTask(req.params.id,req.user));
  }catch(e){
    res.status(400).json({message:e.message||'任务删除失败'});
  }
});

app.post('/api/ai/process', requireAuth, async (req,res)=>{
  return res.status(410).json({message:'旧版同步生成接口已停用，请使用 /api/ai/tasks'});
});
app.post('/api/ai/process-legacy', requireAuth, async (req,res)=>{
  return res.status(410).json({message:'旧版生成接口已停用，请使用 /api/ai/tasks'});
});


// 根据生成图 ID 查询对应的最初原图。只用于工作台右侧最近生成 hover 预览。
app.get('/api/images/:id/source', requireAuth, async (req,res)=>{
  try{
    const [[start]]=await pool.query(
      `SELECT i.* FROM images i WHERE i.id=? AND (? OR i.user_id=? OR i.merchant_id=?) LIMIT 1`,
      [req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]
    );
    if(!start) return res.status(404).json({message:'图片不存在'});

    let current=start;
    const visited=new Set();
    for(let i=0;i<8;i++){
      const [[rel]]=await pool.query('SELECT source_image_id FROM image_relations WHERE target_image_id=? AND relation_type IN ("GENERATED_FROM","REGENERATED_FROM") ORDER BY created_at DESC LIMIT 1',[current.id]);
      if(!rel?.source_image_id || visited.has(rel.source_image_id)) break;
      visited.add(rel.source_image_id);
      const [[parent]]=await pool.query('SELECT * FROM images WHERE id=? LIMIT 1',[rel.source_image_id]);
      if(!parent) break;
      current=parent;
      if(String(current.source_type||'')==='UPLOAD') break;
    }

    res.json({
      imageId:start.id,
      sourceId:current.id,
      sourceUrl:current.url || start.url,
      sourceOriginalName:current.original_name || start.original_name || '??',
      sourceKind:current.source_type || 'unknown'
    });
  }catch(e){
    res.status(400).json({message:e.message||'查询原图失败'});
  }
});

// 对生成图或上传图进行基础处理，处理结果继续走统一存储服务，OSS 模式下会自动上传到 OSS。
app.post('/api/images/:id/process', requireAuth, async (req,res)=>{
  let saved = null;
  try{
    const [[img]]=await pool.query(
      'SELECT * FROM images WHERE id=? AND status="ACTIVE" AND (? OR user_id=? OR merchant_id=?) LIMIT 1',
      [req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]
    );
    if(!img) return res.status(404).json({message:'图片不存在或无权操作'});

    saved = await processStoredImage(img, req.body, {
      merchantId: img.merchant_id || req.user.merchant_id || null,
      userId: req.user.id
    });

    const id=uuid();
    const displayName=`图片处理-${saved.operation}`;
    const conn=await pool.getConnection();
    try{
      await conn.beginTransaction();
      await assertUserStorageAvailable(conn, req.user.id, Number(saved.sizeBytes || 0), {
        label:'图片处理结果'
      });
      await conn.query(
        'INSERT INTO images(id,merchant_id,user_id,display_name,original_name,file_name,mime_type,size_bytes,width,height,storage_provider,storage_key,url,source_type,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id,img.merchant_id||req.user.merchant_id||null,req.user.id,displayName,saved.fileName||displayName,saved.fileName||'',saved.mimeType||'',Number(saved.sizeBytes||0),saved.width||null,saved.height||null,saved.storageProvider,saved.storageKey,saved.url,'PROCESS_RESULT','ACTIVE']
      );
      await conn.query(
        'INSERT INTO image_relations(id,source_image_id,target_image_id,relation_type) VALUES(?,?,?,"GENERATED_FROM")',
        [uuid(),img.id,id]
      );
      await conn.query(
        'INSERT INTO image_process_tasks(id,merchant_id,user_id,process_type,source_image_id,result_image_id,status,process_options_json,finished_at) VALUES(?,?,?,?,?,?,"succeeded",?,NOW())',
        [uuid(),img.merchant_id||req.user.merchant_id||null,req.user.id,processTypeForOperation(saved.operation),img.id,id,JSON.stringify(req.body||{})]
      );
      await applyUserStorageDelta(conn, req.user.id, Number(saved.sizeBytes||0), {
        action:'IMAGE_PROCESS_RESULT',
        imageId:id,
        message:'image process result saved'
      });
      await conn.commit();
    }catch(e){
      await conn.rollback();
      await deleteStoredFile({url:saved.url,storageKey:saved.storageKey});
      saved=null;
      throw e;
    }finally{
      conn.release();
    }

    return res.json({
      id,
      imageId:id,
      url:saved.url,
      originalName:displayName,
      width:saved.width||null,
      height:saved.height||null,
      format:saved.format,
      mimeType:saved.mimeType||''
    });
  }catch(e){
    if(saved?.url) await deleteStoredFile({url:saved.url,storageKey:saved.storageKey});
    return res.status(400).json({message:e.message||'图片处理失败'});
  }
});


app.get('/api/images/:id/detail-rich', requireAuth, async (req,res)=>{
  const [[img]]=await pool.query(`
    SELECT
      i.id,i.merchant_id merchantId,i.user_id userId,rel.source_image_id sourceImageId,
      i.original_name originalName,i.url,i.source_type kind,
      COALESCE(tp.final_prompt,t.final_prompt) prompt,
      COALESCE(tp.user_prompt,t.user_prompt) userPrompt,
      COALESCE(t.cost,0) quotaUsed,
      opt.options_json settingsJson,NULL processSettings,0 freeRegenUsed,i.created_at createdAt,
      src.url sourceUrl,src.original_name sourceOriginalName,
      u.display_name userName,m.company_name companyName,
      opt.options_json optionsJson,opt.output_format_json outputFormat,
      t.task_params taskParams,
      t.cost costUsed,COALESCE(opt.resolution,t.resolution) detailResolution,COALESCE(opt.ratio,t.ratio) detailRatio,
      t.id taskId,t.feature_key featureKey,t.status taskStatus
    FROM images i
    LEFT JOIN image_relations rel ON rel.target_image_id=i.id AND rel.relation_type='GENERATED_FROM'
    LEFT JOIN images src ON src.id=rel.source_image_id
    LEFT JOIN users u ON u.id=i.user_id
    LEFT JOIN merchants m ON m.id=i.merchant_id
    LEFT JOIN ai_task_outputs ato ON ato.image_id=i.id
    LEFT JOIN ai_tasks t ON t.id=ato.task_id
    LEFT JOIN ai_task_prompts tp ON tp.task_id=t.id
    LEFT JOIN ai_task_options opt ON opt.task_id=t.id
    WHERE i.id=? AND (? OR i.user_id=? OR i.merchant_id=?)
    LIMIT 1
  `,[req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]);
  if(!img) return res.status(404).json({message:'图片不存在'});
  try{
    const settings=typeof img.settingsJson==='string'?JSON.parse(img.settingsJson||'{}'):(img.settingsJson||{});
    const options=typeof img.optionsJson==='string'?JSON.parse(img.optionsJson||'{}'):(img.optionsJson||{});
    const taskParams=typeof img.taskParams==='string'?JSON.parse(img.taskParams||'{}'):(img.taskParams||{});
    let inputImages=[];
    if(img.taskId){
      const [rows]=await pool.query(
        `SELECT ti.input_role role,ti.sort_order sortOrder,im.id,im.url,im.original_name originalName
         FROM ai_task_inputs ti
         JOIN images im ON im.id=ti.image_id
         WHERE ti.task_id=?
         ORDER BY ti.sort_order ASC,ti.created_at ASC`,
        [img.taskId]
      );
      inputImages=rows||[];
    }
    const referenceImages=inputImages.filter(x=>x.role!=='IMAGE_A');
    img.inputImages=inputImages;
    img.referenceImages=referenceImages;
    img.taskParams=taskParams;
    img.settingsJson=JSON.stringify({
      ...settings,
      options: Object.keys(options||{}).length?options:(taskParams.options||{}),
      taskParams,
      selectedResource:taskParams.selectedResource||settings.selectedResource||null,
      referenceImages
    });
  }catch{}
  if(img.detailResolution&&!img.resolution) img.resolution=img.detailResolution;
  if(img.detailRatio&&!img.ratio) img.ratio=img.detailRatio;
  res.json(img);
});


app.get('/api/images/:id/detail', requireAuth, async (req,res)=>{
  const [[img]]=await pool.query(`SELECT i.id,i.merchant_id merchantId,i.user_id userId,rel.source_image_id sourceImageId,i.original_name originalName,i.url,i.source_type kind,NULL prompt,NULL userPrompt,0 quotaUsed,NULL settingsJson,0 freeRegenUsed,i.created_at createdAt,src.url sourceUrl,src.original_name sourceOriginalName,u.display_name userName,m.company_name companyName FROM images i LEFT JOIN image_relations rel ON rel.target_image_id=i.id AND rel.relation_type='GENERATED_FROM' LEFT JOIN images src ON src.id=rel.source_image_id LEFT JOIN users u ON u.id=i.user_id LEFT JOIN merchants m ON m.id=i.merchant_id WHERE i.id=? AND (? OR i.user_id=? OR i.merchant_id=?)`,[req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]);
  if(!img) return res.status(404).json({message:'图片不存在'});
  res.json(img);
});


app.post('/api/images/:id/regenerate', requireAuth, async (req,res)=>{
  return res.status(410).json({message:'旧版重新生成接口已停用，请使用 /api/ai/tasks'});
});


app.delete('/api/images/:id', requireAuth, async (req,res)=>{
  const conn = await pool.getConnection();
  let rowsToDelete = [];
  try{
    await conn.beginTransaction();
    const [[img]]=await conn.query('SELECT * FROM images WHERE id=? AND user_id=? FOR UPDATE',[req.params.id,req.user.id]);
    if(!img) throw new Error('图片不存在');

    const ids=[img.id];
    if(String(req.query.withSource||'')==='1'){
      const [[rel]]=await conn.query('SELECT source_image_id FROM image_relations WHERE target_image_id=? AND relation_type="GENERATED_FROM" LIMIT 1',[img.id]);
      if(rel?.source_image_id){
        const [[src]]=await conn.query('SELECT * FROM images WHERE id=? AND user_id=? FOR UPDATE',[rel.source_image_id,req.user.id]);
        if(src) ids.push(src.id);
      }
    }
    if(img.source_type==='UPLOAD'){
      const [children]=await conn.query('SELECT target_image_id id FROM image_relations WHERE source_image_id=? AND relation_type="GENERATED_FROM" FOR UPDATE',[img.id]);
      ids.push(...children.map(x=>x.id));
    }

    const uniqueIds=[...new Set(ids)];
    const placeholders=uniqueIds.map(()=>'?').join(',');
    const [rows]=await conn.query(`SELECT * FROM images WHERE id IN (${placeholders}) AND user_id=? FOR UPDATE`,[...uniqueIds,req.user.id]);
    rowsToDelete = rows || [];
    const totalBytes = rowsToDelete.reduce((sum,x)=>sum+Number(x.size_bytes||0),0);

    if(rowsToDelete.length){
      await conn.query(`UPDATE images SET status="DELETED",deleted_at=NOW() WHERE id IN (${rowsToDelete.map(()=>'?').join(',')}) AND user_id=?`,[...rowsToDelete.map(x=>x.id),req.user.id]);
      await applyUserStorageDelta(conn,req.user.id,-totalBytes,{merchantId:req.user.merchant_id,action:'DELETE',message:'images deleted'});
    }

    await conn.commit();
    for(const row of rowsToDelete){ await deleteStoredFile(row); }
    res.json({message:'删除成功',deleted:rowsToDelete.length,freedBytes:totalBytes,storage:await getUserStorageSummary(pool,req.user.id)});
  }catch(e){
    await conn.rollback();
    res.status(400).json({message:e.message||'删除图片失败'});
  }finally{
    conn.release();
  }
});


async function normalizeWatermarkConfigForSave(config, reqUser) {
  const next = { ...(config || {}) };
  if (next.mode === 'text' || !String(next.image || '').startsWith('data:image/')) return next;

  const raw = String(next.image);
  const comma = raw.indexOf(',');
  if (comma < 0) return next;

  const header = raw.slice(0, comma);
  const ext = header.includes('jpeg') || header.includes('jpg') ? 'jpg' : header.includes('webp') ? 'webp' : 'png';
  const buffer = Buffer.from(raw.slice(comma + 1), 'base64');
  const saved = await saveBufferToStorage(buffer, {
    merchantId: reqUser.merchant_id || null,
    userId: reqUser.id,
    kind: 'resource',
    op: 'watermark',
    ext
  });
  const imageId = uuid();
  const displayName = next.fileName || '门店水印';
  await pool.query(
    'INSERT INTO images(id,merchant_id,user_id,display_name,original_name,file_name,mime_type,size_bytes,width,height,storage_provider,storage_key,url,source_type,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      imageId,
      reqUser.merchant_id || null,
      reqUser.id,
      displayName,
      displayName,
      saved.fileName,
      saved.mimeType,
      saved.sizeBytes,
      saved.width || null,
      saved.height || null,
      saved.storageProvider,
      saved.storageKey,
      saved.url,
      'WATERMARK',
      'ACTIVE'
    ]
  );
  next.image = saved.url;
  next.imageId = imageId;
  next.storageKey = saved.storageKey;
  return next;
}


app.post('/api/watermark/image', requireAuth, (req,res)=>{
  upload.single('image')(req,res,async err=>{
    if(err) return res.status(400).json({message:err.message||'水印图片上传失败'});
    try{
      if(!isMerchantPower(req.user)) return res.status(403).json({message:'只有门店管理员可以配置门店水印'});
      if(!req.user.merchant_id) return res.status(400).json({message:'当前账号未绑定门店'});
      if(!req.file) return res.status(400).json({message:'请上传水印图片'});
      const saved=await saveUploadedImage(req.file,{merchantId:req.user.merchant_id,userId:req.user.id,kind:'resource'});
      const id=uuid();
      const displayName=normalizeUploadedFileName(req.file.originalname)||'门店水印';
      await pool.query(
        'INSERT INTO images(id,merchant_id,user_id,display_name,original_name,file_name,mime_type,size_bytes,width,height,storage_provider,storage_key,url,source_type,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id,req.user.merchant_id,req.user.id,displayName,displayName,saved.fileName,saved.mimeType,saved.sizeBytes,saved.width||null,saved.height||null,saved.storageProvider,saved.storageKey,saved.url,'WATERMARK','ACTIVE']
      );
      res.json({id,url:saved.url,fileName:saved.fileName,message:'水印图片已上传'});
    }catch(e){
      res.status(400).json({message:e.message||'水印图片上传失败'});
    }
  });
});


app.all('/api/watermark/settings', requireAuth, async (req,res,next)=>{
  if(req.method!=='GET'&&req.method!=='PUT') return next();
  try{
    const canConfigure=isMerchantPower(req.user);
    if(req.method==='GET'){
      if(!req.user.merchant_id) return res.json({enabled:false,configured:false,canConfigure,name:'门店水印',config:{}});
      const [rows]=await pool.query('SELECT * FROM watermarks WHERE merchant_id=? ORDER BY created_at DESC LIMIT 1',[req.user.merchant_id]);
      if(rows[0]){
        const config=typeof rows[0].config==='string'?JSON.parse(rows[0].config):rows[0].config;
        const configured=!!(config?.image || (config?.mode==='text' && String(config?.text||'').trim()));
        return res.json({enabled:!!config?.enabled,configured,canConfigure,name:rows[0].name,config});
      }
      return res.json({enabled:false,configured:false,canConfigure,name:'门店水印',config:{enabled:false,mode:'image',position:'center',offsetX:10,offsetY:10,widthPercent:23.5,opacity:100,image:''}});
    }
    if(!canConfigure) return res.status(403).json({message:'当前账号无权配置水印'});
    if(!req.user.merchant_id) return res.status(400).json({message:'当前账号未绑定门店'});
    const config=await normalizeWatermarkConfigForSave(req.body.config||{}, req.user);
    const enabled=!!req.body.enabled;
    const name=String(req.body.name||'门店水印').slice(0,100);
    await pool.query('DELETE FROM watermarks WHERE merchant_id=?',[req.user.merchant_id]);
    await pool.query('INSERT INTO watermarks(id,merchant_id,user_id,name,config) VALUES(?,?,?,?,?)',[uuid(),req.user.merchant_id,req.user.id,name,JSON.stringify({...config,enabled})]);
    return res.json({message:'水印配置已保存',enabled,configured:!!(config.image || (config.mode==='text' && String(config.text||'').trim())),name,config:{...config,enabled}});
  }catch(e){
    return res.status(400).json({message:e.message||'水印配置处理失败'});
  }
});

app.get('/api/images/:id/view', requireAuth, async (req,res)=>{
  try{
    const [[img]]=await pool.query(
      `SELECT i.* FROM images i
       LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
       LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
       LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
       WHERE i.id=? AND i.status="ACTIVE"
         AND (
           ?
           OR i.user_id=?
           OR COALESCE(imc.scope,i.resource_scope)="SYSTEM"
           OR (i.merchant_id=? AND (COALESCE(imc.scope,i.resource_scope)="MERCHANT" OR i.source_type="AI_GENERATED"))
         )
       LIMIT 1`,
      [req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]
    );
    if(!img) return res.status(404).json({message:'图片不存在'});
    const url=getImageAccessUrl(img);
    if(!url) return res.status(404).json({message:'图片地址不存在'});
    res.setHeader('Cache-Control','private, max-age=60');
    return res.redirect(url);
  }catch(e){
    return res.status(400).json({message:e.message||'图片预览失败'});
  }
});

app.get('/api/images/:id/download', requireAuth, async (req,res)=>{
  try{
    const [[img]]=await pool.query('SELECT * FROM images WHERE id=? AND (? OR user_id=? OR merchant_id=?)',[req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]);
    if(!img) return res.status(404).json({message:'图片不存在'});
    const merchantId=img.merchant_id||req.user.merchant_id||null;
    let finalUrl=getImageAccessUrl(img);
    let downloadName=`${APP_NAME}-${img.source_type||'image'}-${img.id}.png`;
    if(String(req.query.watermark||'')==='1'&&merchantId){
      const [rows]=await pool.query('SELECT * FROM watermarks WHERE merchant_id=? ORDER BY created_at DESC LIMIT 1',[merchantId]);
      if(rows[0]){
        const config=typeof rows[0].config==='string'?JSON.parse(rows[0].config):rows[0].config;
        if(config?.image||(config?.mode==='text'&&String(config?.text||'').trim())){
          const sourceInput=/^https?:\/\//i.test(finalUrl)?finalUrl:urlToDiskPath(img.url);
          const wmUrl=await applyWatermark({imagePath:sourceInput,config,merchantId,userId:req.user.id});
          if(wmUrl&&wmUrl!==sourceInput){
            finalUrl=getImageAccessUrl({url:wmUrl});
            downloadName=`${APP_NAME}-watermark-${img.id}.png`;
          }
        }
      }
    }
    if(/^https?:\/\//i.test(finalUrl)) return res.redirect(finalUrl);
    return res.download(urlToDiskPath(finalUrl||img.url), downloadName);
  }catch(e){
    return res.status(400).json({message:e.message||'图片下载失败'});
  }
});

app.get('/api/images/:id/watermark-preview', requireAuth, async (req,res)=>{
  let fallbackUrl='';
  try{
    const [[img]]=await pool.query('SELECT * FROM images WHERE id=? AND (? OR user_id=? OR merchant_id=?)',[req.params.id,isSystemAdmin(req.user),req.user.id,req.user.merchant_id]);
    if(!img) return res.status(404).json({message:'图片不存在'});
    fallbackUrl=getImageAccessUrl(img);
    const merchantId=img.merchant_id||req.user.merchant_id||null;
    if(!merchantId){
      if(/^https?:\/\//i.test(fallbackUrl)) return res.redirect(fallbackUrl);
      return res.sendFile(urlToDiskPath(fallbackUrl||img.url));
    }
    const [rows]=await pool.query('SELECT * FROM watermarks WHERE merchant_id=? ORDER BY created_at DESC LIMIT 1',[merchantId]);
    if(!rows[0]){
      if(/^https?:\/\//i.test(fallbackUrl)) return res.redirect(fallbackUrl);
      return res.sendFile(urlToDiskPath(fallbackUrl||img.url));
    }
    const config=typeof rows[0].config==='string'?JSON.parse(rows[0].config):rows[0].config;
    if(!(config?.image || (config?.mode==='text' && String(config?.text||'').trim()))){
      if(/^https?:\/\//i.test(fallbackUrl)) return res.redirect(fallbackUrl);
      return res.sendFile(urlToDiskPath(fallbackUrl||img.url));
    }
    const sourceInput=/^https?:\/\//i.test(fallbackUrl)?fallbackUrl:urlToDiskPath(img.url);
    const wmUrl=await applyWatermark({imagePath:sourceInput,config,merchantId,userId:req.user.id});
    if(!wmUrl||wmUrl===sourceInput){
      if(/^https?:\/\//i.test(fallbackUrl)) return res.redirect(fallbackUrl);
      return res.sendFile(urlToDiskPath(fallbackUrl||img.url));
    }
    const wmPath=getImageAccessUrl({url:wmUrl});
    res.setHeader('Cache-Control','no-store');
    if(/^https?:\/\//i.test(wmPath)) return res.redirect(wmPath);
    res.type('png');
    return res.sendFile(urlToDiskPath(wmPath));
  }catch(e){
    if(fallbackUrl){
      if(/^https?:\/\//i.test(fallbackUrl)) return res.redirect(fallbackUrl);
      return res.sendFile(urlToDiskPath(fallbackUrl));
    }
    return res.status(400).json({message:e.message||'水印预览生成失败'});
  }
});

app.get('/api/templates', requireAuth, async (req,res)=>{
  const [rows]=await pool.query(`
    SELECT isc.id,COALESCE(isc.name,imc.name) name,imc.name category,'' prompt,isc.created_at createdAt
    FROM image_sub_categories isc
    JOIN image_main_categories imc ON imc.id=isc.main_category_id
    WHERE imc.name='场景' AND isc.status='ACTIVE'
    ORDER BY isc.sort_order ASC, isc.created_at DESC
  `);
  res.json({items:rows,page:1,pageSize:rows.length,total:rows.length});
});
app.post('/api/templates', requireAuth, async (req,res)=>{
  return res.status(410).json({message:'场景模板创建接口已停用，请在资源库中维护资源'});
});
app.delete('/api/templates/:id', requireAuth, async (req,res)=>{
  return res.status(410).json({message:'场景模板删除接口已停用，请在资源库中维护资源'});
});



app.get('/api/export/:type', requireAuth, async (req,res)=>{
  const type=req.params.type;
  if(type==='images'){
    const wh=[]; const ps=[];
    if(!isSystemAdmin(req.user)){ wh.push(isMerchantPower(req.user)?'i.merchant_id=?':'i.user_id=?'); ps.push(isMerchantPower(req.user)?req.user.merchant_id:req.user.id); }
    const where=wh.length?'WHERE '+wh.join(' AND '):'';
    const [rows]=await pool.query(`SELECT i.id,i.source_type kind,i.original_name originalName,'' prompt,i.created_at createdAt,u.display_name userName,m.company_name companyName FROM images i LEFT JOIN users u ON u.id=i.user_id LEFT JOIN merchants m ON m.id=i.merchant_id ${where} ORDER BY i.created_at DESC LIMIT 500`,ps);
    return sendCsv(res,'images.csv',[{key:'id',label:'ID'},{key:'companyName',label:'商家'},{key:'userName',label:'用户'},{key:'kind',label:'类型'},{key:'originalName',label:'原文件'},{key:'prompt',label:'提示词'},{key:'createdAt',label:'时间'}],rows);
  }
  if(type==='merchant-users'){
    if(!req.user.merchant_id) return res.status(403).json({message:'当前账号未绑定门店'});
    const [rows]=await pool.query('SELECT username,phone,display_name displayName,role,0 quota,status,created_at createdAt FROM users WHERE merchant_id=? ORDER BY created_at DESC',[req.user.merchant_id]);
    return sendCsv(res,'merchant-users.csv',[{key:'username',label:'账号'},{key:'phone',label:'手机号'},{key:'displayName',label:'姓名'},{key:'role',label:'角色'},{key:'quota',label:'额度'},{key:'status',label:'状态'},{key:'createdAt',label:'创建时间'}],rows);
  }
  if(type==='merchants'){
    if(!isSystemAdmin(req.user)) return res.status(403).json({message:'需要系统管理员权限'});
    const [rows]=await pool.query('SELECT company_name companyName,contact_name contactName,phone,quota_balance quota,status,created_at createdAt FROM merchants ORDER BY created_at DESC LIMIT 1000');
    return sendCsv(res,'merchants.csv',[{key:'companyName',label:'商家'},{key:'contactName',label:'联系人'},{key:'phone',label:'手机号'},{key:'quota',label:'额度'},{key:'status',label:'状态'},{key:'createdAt',label:'创建时间'}],rows);
  }
  res.status(404).json({message:'不支持导出该数据'});
});

app.post('/api/feedbacks', requireAuth, async (req,res)=>{
  if(isSystemAdmin(req.user)) return res.status(403).json({message:'平台管理员不能提交反馈'});
  const {title,content,contact}=req.body;
  if(!title||!content) return res.status(400).json({message:'请填写反馈标题和内容'});
  await pool.query('INSERT INTO feedbacks(id,user_id,merchant_id,title,content,contact) VALUES(?,?,?,?,?,?)',[uuid(),req.user.id,req.user.merchant_id,title,content,String(contact||'').trim()]);
  res.json({message:'反馈已提交'});
});

app.listen(port,()=>console.log(`${APP_NAME} backend running on http://localhost:${port}`));
