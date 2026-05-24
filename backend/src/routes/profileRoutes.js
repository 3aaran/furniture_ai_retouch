// 该文件用于集中维护当前用户个人资料、头像访问、头像上传和密码修改接口。
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { pool, publicUser } from '../db.js';
import { requireAuth } from '../auth.js';
import { deleteStoredFile, saveUploadedImage, getImageAccessUrl, storageKeyFromUrl, avatarStorageKey } from '../services/storageService.js';

function isSystemAdmin(u){ return u?.role === 'SYSTEM_ADMIN'; }

export function registerProfileRoutes(app,{upload}){
  app.get('/api/users/:id/avatar', requireAuth, async (req,res)=>{
    const [[u]]=await pool.query('SELECT id,merchant_id,avatar_url FROM users WHERE id=? AND status="ACTIVE" LIMIT 1',[req.params.id]);
    if(!u?.avatar_url) return res.status(404).json({message:'头像不存在'});
    const canView=isSystemAdmin(req.user)||req.user.id===u.id||(req.user.merchant_id&&req.user.merchant_id===u.merchant_id);
    if(!canView) return res.status(403).json({message:'无权查看头像'});
    const storedKey=storageKeyFromUrl(u.avatar_url);
    const fallbackKey=String(u.avatar_url).startsWith('/api/users/')?avatarStorageKey(u.id):'';
    const directUrl=getImageAccessUrl({url:u.avatar_url,storage_key:storedKey||fallbackKey},{expires:300});
    if(!directUrl) return res.status(404).json({message:'头像地址不存在'});
    res.setHeader('Cache-Control','private, max-age=60');
    return res.redirect(directUrl);
  });

  app.patch('/api/me/profile', requireAuth, async (req,res)=>{
    const displayName=String(req.body.displayName||'').trim();
    if(!displayName) return res.status(400).json({message:'姓名不能为空'});
    await pool.query('UPDATE users SET display_name=? WHERE id=?',[displayName,req.user.id]);
    if(req.user.role==='MERCHANT_OWNER') await pool.query('UPDATE merchants SET contact_name=? WHERE id=?',[displayName,req.user.merchant_id]);
    const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
    res.json({message:'个人资料已保存',user:publicUser(u)});
  });

  app.post('/api/me/avatar', requireAuth, (req,res)=>{
    upload.single('avatar')(req,res,async err=>{
      if(err) return res.status(400).json({message:err.code==='LIMIT_FILE_SIZE'?'头像图片不能超过 30MB':(err.message||'头像上传失败')});
      try{
        if(!req.file) return res.status(400).json({message:'请上传头像图片'});
        const [[current]]=await pool.query('SELECT avatar_url FROM users WHERE id=?',[req.user.id]);
        const saved=await saveUploadedImage(req.file,{merchantId:req.user.merchant_id||null,userId:req.user.id,kind:'avatar'});
        const nextAvatarUrl=`/api/users/${req.user.id}/avatar?v=${Date.now()}`;
        await pool.query('UPDATE users SET avatar_url=? WHERE id=?',[nextAvatarUrl,req.user.id]);
        const currentKey=storageKeyFromUrl(current?.avatar_url||'');
        const nextKey=saved.storageKey||storageKeyFromUrl(saved.url);
        if(currentKey&&currentKey!==nextKey) await deleteStoredFile({url:current.avatar_url}).catch(()=>{});
        const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
        res.json({message:'头像已更新',avatarUrl:nextAvatarUrl,user:publicUser(u)});
      }catch(e){
        if(req.file?.path && fs.existsSync(req.file.path)) fs.rmSync(req.file.path,{force:true});
        res.status(400).json({message:e.message||'头像上传失败'});
      }
    });
  });

  app.patch('/api/me/password', requireAuth, async (req,res)=>{
    const oldPassword=String(req.body.oldPassword||'');
    const newPassword=String(req.body.newPassword||'');
    if(newPassword.length<6) return res.status(400).json({message:'密码至少 6 位'});
    const [[u]]=await pool.query('SELECT * FROM users WHERE id=?',[req.user.id]);
    if(!u || !(await bcrypt.compare(oldPassword,u.password_hash))) return res.status(400).json({message:'原密码不正确'});
    await pool.query('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(newPassword,10),req.user.id]);
    res.json({message:'密码已修改'});
  });
}
