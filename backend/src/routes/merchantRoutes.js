import { v4 as uuid } from 'uuid';
import { pool, publicApplication } from '../db.js';
import { requireAuth } from '../auth.js';
import { requireMerchantAccount, requireMerchantManager } from '../middleware/roleMiddleware.js';
import { registerInternalUserRoutes } from './merchant/internalUserRoutes.js';
import { deleteStoredFile, getStoredFileMeta, normalizeUploadedFileName } from '../services/storageService.js';

export function registerMerchantRoutes(app,deps){
  const {
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

  }=deps;
  registerInternalUserRoutes(app,deps);
  const merchantOnly = [requireAuth, requireMerchantAccount];
  const merchantManagerOnly = [requireAuth, requireMerchantManager];
  const fixedMainPurpose = { '材质':1, '软体':1, '产品':3, '场景模板':2 };

  async function ensureImageSubCategory({mainName='',subName='',scope='USER',merchantId=null,userId=null,createdBy=null}){
    const main=String(mainName||'').trim();
    const sub=String(subName||'').trim();
    if(!main || main==='0' || main==='未分类') return null;
    const purposeId=fixedMainPurpose[main]||3;
    const ownerClause=scope==='SYSTEM'
      ? 'scope="SYSTEM"'
      : scope==='MERCHANT'
        ? 'scope="MERCHANT" AND merchant_id=?'
        : 'scope="USER" AND owner_user_id=?';
    const ownerParams=scope==='SYSTEM'?[]:scope==='MERCHANT'?[merchantId||null]:[userId||createdBy||null];
    let [[mainRow]]=await pool.query(`SELECT * FROM image_main_categories WHERE name=? AND ${ownerClause} AND status<>"DELETED" LIMIT 1`,[main,...ownerParams]);
    if(!mainRow){
      const id=uuid();
      await pool.query('INSERT INTO image_main_categories(id,purpose_id,merchant_id,owner_user_id,scope,name,is_fixed,created_by) VALUES(?,?,?,?,?,?,0,?)',[id,purposeId,merchantId||null,scope==='USER'?(userId||createdBy||null):null,scope,main,createdBy||null]);
      mainRow={id};
    }
    if(!sub){
      let [[subRow]]=await pool.query('SELECT id FROM image_sub_categories WHERE main_category_id=? AND is_main_only=1 AND status<>"DELETED" LIMIT 1',[mainRow.id]);
      if(!subRow){
        const id=uuid();
        await pool.query('INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,created_by) VALUES(?,?,NULL,1,0,?)',[id,mainRow.id,createdBy||null]);
        subRow={id};
      }
      return subRow.id;
    }
    let [[subRow]]=await pool.query('SELECT id FROM image_sub_categories WHERE main_category_id=? AND name=? AND status<>"DELETED" LIMIT 1',[mainRow.id,sub]);
    if(!subRow){
      const id=uuid();
      await pool.query('INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,created_by) VALUES(?,?,?,0,0,?)',[id,mainRow.id,sub,createdBy||null]);
      subRow={id};
    }
    return subRow.id;
  }

  function resourceTypeFromMain(main){
    if(main==='材质'||main==='软体') return 'material';
    if(main==='场景模板') return 'scene';
    return 'user_reference';
  }

  function stripImageExt(name=''){
    return String(name||'').trim().replace(/\.(jpe?g|png|webp|gif|bmp)$/i,'');
  }

  function mapResourceRow(r){
    const mainCategoryName=r.mainCategoryName || r.object_name || '未分类';
    const subCategoryName=Number(r.isMainOnly||0)?'':(r.subCategoryName || r.color_name || '');
    const displayName=r.display_name || r.name || r.original_name || `资源-${String(r.id||'').slice(0,8)}`;
    return {
      id:r.id,
      merchantId:r.merchant_id,
      name:stripImageExt(displayName),
      resourceType:r.resource_type || resourceTypeFromMain(mainCategoryName),
      objectName:mainCategoryName,
      colorName:subCategoryName,
      mainCategoryName,
      subCategoryName,
      description:r.description || '',
      imageUrl:r.url || r.image_url,
      status:r.status,
      scope:r.scope || r.resource_scope,
      createdById:r.user_id || r.created_by,
      createdByName:r.createdByName,
      createdAt:r.created_at,
      source:r.source || r.source_type || 'RESOURCE'
    };
  }

  function normalizeResourceScope(input, user) {
    const requested = String(input || '').trim().toUpperCase();
    if (isMerchantPower(user) && requested === 'MERCHANT') return 'MERCHANT';
    return 'USER';
  }

  function resourceWriteAccessSql(user) {
    if (isMerchantPower(user)) {
      return {
        sql: `i.id=? AND ((COALESCE(imc.scope,i.resource_scope)="MERCHANT" AND i.merchant_id=?) OR ((COALESCE(imc.scope,i.resource_scope)="USER" OR (imc.scope IS NULL AND i.resource_scope IS NULL)) AND i.user_id=?))`,
        params: [user.merchant_id || '', user.id]
      };
    }
    return {
      sql: `i.id=? AND ((COALESCE(imc.scope,i.resource_scope)="USER" OR (imc.scope IS NULL AND i.resource_scope IS NULL)) AND i.user_id=?)`,
      params: [user.id]
    };
  }

  app.get('/api/merchant/quota-logs', ...merchantOnly, async (req,res)=>{
    if(!req.user.merchant_id) return res.status(403).json({message:'需要商家账号'});
    const wh=['q.merchant_id=?']; const ps=[req.user.merchant_id];
    const power=isMerchantPower(req.user);
    if(!power){ wh.push('(q.related_user_id=? OR q.operator_user_id=?)'); ps.push(req.user.id, req.user.id); }
    if(req.query.type){
      const t=String(req.query.type);
      if(t==='AI_GENERATE') wh.push('q.type="AI_COST"');
      else if(t==='AUTO_RECHARGE') wh.push('(q.type IN ("REDEEM","ACCOUNT_DELETE_RECYCLE","AI_REFUND") OR (q.type="MANUAL_ADJUST" AND q.related_user_id IS NOT NULL))');
      else if(t==='MANUAL_RECHARGE') wh.push('(q.type="RECHARGE" OR (q.type="MANUAL_ADJUST" AND q.related_user_id IS NULL))');
      else { wh.push('q.type=?'); ps.push(t); }
    }
    if(req.query.keyword){
      wh.push('(tu.username LIKE ? OR tu.phone LIKE ? OR tu.display_name LIKE ? OR ou.username LIKE ? OR ou.phone LIKE ? OR ou.display_name LIKE ? OR q.id LIKE ? OR q.related_task_id LIKE ?)');
      ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword),like(req.query.keyword));
    }
    const where='WHERE '+wh.join(' AND ');
    const base=`FROM quota_logs q LEFT JOIN users tu ON tu.id=q.related_user_id LEFT JOIN users ou ON ou.id=q.operator_user_id ${where}`;
  
    const page=Math.max(1,Number(req.query.page||1));
    const pageSize=Math.min(100,Math.max(1,Number(req.query.pageSize||10)));
    const offset=(page-1)*pageSize;
  
    const [rows]=await pool.query(
      `SELECT q.*,tu.username targetUsername,tu.phone targetPhone,tu.display_name targetName,ou.username operatorUsername,ou.phone operatorPhone,ou.display_name operatorName ${base} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
      [...ps,pageSize,offset]
    );
    const [[cnt]]=await pool.query(`SELECT COUNT(*) total ${base}`,ps);
    const [allLogs]=await pool.query(`SELECT q.id,q.type,q.amount,q.related_user_id,q.operator_user_id,q.created_at,q.balance_after ${base} ORDER BY q.created_at DESC`,ps);
  
    const [[balanceRow]]=power
      ? await pool.query('SELECT quota_balance balance FROM merchants WHERE id=?',[req.user.merchant_id])
      : await pool.query('SELECT quota_balance balance FROM users WHERE id=?',[req.user.id]);
    const currentBalance=Number(balanceRow?.balance||0);
  
    function signedAmount(r){
      const amount=Number(r.amount||0);
      if(power){
        if(r.type==='AI_COST') return -Math.abs(amount);
        if(r.type==='MANUAL_ADJUST' && r.related_user_id) return -amount;
        if(['RECHARGE','AI_REFUND','ACCOUNT_DELETE_RECYCLE','MANUAL_ADJUST','REDEEM'].includes(r.type)) return amount;
        return amount;
      }
      if(r.type==='AI_COST') return -Math.abs(amount);
      if(String(r.related_user_id||'')===String(req.user.id)) return amount;
      if(String(r.operator_user_id||'')===String(req.user.id)) return -Math.abs(amount);
      return amount;
    }
  
    function businessTypeLabel(r){
      if(r.type==='AI_COST') return 'AI生成';
      if(r.type==='AI_REFUND') return 'AI退款';
      if(r.type==='REDEEM'||r.type==='ACCOUNT_DELETE_RECYCLE') return '自动充值';
      if(r.type==='MANUAL_ADJUST') return r.related_user_id ? '自动充值' : '人工充值';
      if(r.type==='RECHARGE') return '人工充值';
      return r.type;
    }
    const balanceAfterMap=new Map();
    if(power){
      let cursor=currentBalance;
      for(const r of allLogs){
        balanceAfterMap.set(r.id,cursor);
        cursor-=signedAmount(r);
      }
    }
    const signedRows=rows.map(r=>({
      ...r,
      signedAmount:signedAmount(r),
      typeLabel:businessTypeLabel(r),
      balanceAfter:power ? Number(balanceAfterMap.get(r.id) ?? r.balance_after ?? 0) : Number(r.balance_after ?? 0)
    }));
    const totalIncome=allLogs.reduce((s,r)=>s+Math.max(0,signedAmount(r)),0);
    const totalExpense=allLogs.reduce((s,r)=>s+Math.min(0,signedAmount(r)),0);
  
    res.json({items:signedRows,page,pageSize,total:cnt.total,summary:{currentBalance,totalIncome,totalExpense}});
  });
  
  app.get('/api/resources', requireAuth, async (req,res)=>{
    const keyword=String(req.query.keyword||'').trim();
    const type=String(req.query.resourceType||'').trim();
    const params=[];
    const wh=['i.status="ACTIVE"'];
    wh.push('(COALESCE(imc.scope,i.resource_scope)="SYSTEM" OR (COALESCE(imc.scope,i.resource_scope)="MERCHANT" AND i.merchant_id=?) OR (COALESCE(imc.scope,i.resource_scope)="USER" AND i.user_id=?) OR (icb.image_id IS NULL AND i.resource_scope IS NULL AND i.user_id=?))');
    params.push(req.user.merchant_id||'',req.user.id,req.user.id);
    if(keyword){ wh.push('(i.display_name LIKE ? OR i.original_name LIKE ? OR imc.name LIKE ? OR isc.name LIKE ?)'); params.push(like(keyword),like(keyword),like(keyword),like(keyword)); }
    if(type){
      if(type==='material') wh.push('imc.name IN ("材质","软体")');
      else if(type==='scene') wh.push('imc.name="场景模板"');
      else wh.push('imc.name IN ("产品","未分类")');
    }
    const [rows]=await pool.query(`
      SELECT i.*,u.display_name createdByName,imc.name mainCategoryName,isc.name subCategoryName,isc.is_main_only isMainOnly,COALESCE(imc.scope,i.resource_scope) scope,
             CASE WHEN imc.name IN ('材质','软体') THEN 'material' WHEN imc.name='场景模板' THEN 'scene' ELSE 'user_reference' END resource_type
      FROM images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      LEFT JOIN users u ON u.id=i.user_id
      WHERE ${wh.join(' AND ')}
      ORDER BY FIELD(imc.scope,'USER','MERCHANT','SYSTEM'),i.created_at DESC
      LIMIT 999
    `,params);
    res.json({items:rows.map(mapResourceRow),total:rows.length,page:1,pageSize:999});
  });
  
  app.get('/api/merchant/resources', requireAuth, async (req,res)=>{
    const keyword=String(req.query.keyword||'').trim();
    const mainCategory=String(req.query.mainCategory||'').trim();
    const subCategory=String(req.query.subCategory||'').trim();
    const status=String(req.query.status||'').trim();
    const scope=String(req.query.scope||'').trim();
    const params=[];
    const wh=[];
    if(scope==='MERCHANT'){
      wh.push('((COALESCE(imc.scope,i.resource_scope)="MERCHANT" AND i.merchant_id=?) OR (icb.image_id IS NULL AND i.resource_scope IS NULL AND i.merchant_id=? AND i.user_id<>?))');
      params.push(req.user.merchant_id,req.user.merchant_id,req.user.id);
    }else if(scope==='USER'){
      wh.push('((COALESCE(imc.scope,i.resource_scope)="USER" AND i.user_id=?) OR (icb.image_id IS NULL AND i.resource_scope IS NULL AND i.user_id=?))');
      params.push(req.user.id,req.user.id);
    }else{
      wh.push('(COALESCE(imc.scope,i.resource_scope)="SYSTEM")');
    }
    if(status){ wh.push('i.status=?'); params.push(status); } else wh.push('i.status="ACTIVE"');
    if(mainCategory){
      if(mainCategory==='未分类') wh.push('icb.image_id IS NULL');
      else { wh.push('imc.name=?'); params.push(mainCategory); }
    }
    if(subCategory){ wh.push('isc.name=?'); params.push(subCategory); }
    if(keyword){ wh.push('(i.display_name LIKE ? OR i.original_name LIKE ? OR imc.name LIKE ? OR isc.name LIKE ?)'); params.push(like(keyword),like(keyword),like(keyword),like(keyword)); }
    const where='WHERE '+wh.join(' AND ');
    const base=`FROM images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      LEFT JOIN users u ON u.id=i.user_id
      ${where}`;
    const sql=`SELECT i.*,u.display_name createdByName,imc.name mainCategoryName,isc.name subCategoryName,isc.is_main_only isMainOnly,COALESCE(imc.scope,i.resource_scope) scope,
        CASE WHEN imc.name IN ('材质','软体') THEN 'material' WHEN imc.name='场景模板' THEN 'scene' ELSE 'user_reference' END resource_type ${base} ORDER BY i.created_at DESC`;
    const countSql=`SELECT COUNT(*) total ${base}`;
    res.json(await paged(sql,countSql,params,req,mapResourceRow));
  });
  
  app.post('/api/merchant/resources', requireAuth, (req,res)=>{
    upload.array('image',50)(req,res,async err=>{
      if(err) return res.status(400).json({message:err.message||'操作失败'});
      try{
        await assertMerchantActive(req.user);
        const {name,objectName='',colorName='',imageUrl=''}=req.body;
        const files=Array.isArray(req.files)?req.files:[];
        if(!files.length && !imageUrl) return res.status(400).json({message:'请上传资源图片或填写图片URL'});
        const scope=normalizeResourceScope(req.body.scope, req.user);
        const subId=await ensureImageSubCategory({mainName:objectName,subName:colorName,scope,merchantId:req.user.merchant_id,userId:req.user.id,createdBy:req.user.id});
        const targets=files.length?files:[null];
        const ids=[];
        for(const file of targets){
          const uploadedUrl=file?await saveUploadedFile(file,{kind:'resource',merchantId:req.user.merchant_id,userId:req.user.id}):'';
          const finalUrl=uploadedUrl||imageUrl;
          const originalName=normalizeUploadedFileName(file?.originalname)||String(finalUrl).split('/').pop()||'资源图片';
          const displayName=String(name||'').trim()||stripImageExt(originalName);
          const id=uuid();
          const meta=await getStoredFileMeta(finalUrl);
          await pool.query('INSERT INTO images(id,merchant_id,user_id,display_name,original_name,url,source_type,resource_scope,status,storage_provider,storage_key,file_name,mime_type,size_bytes,width,height) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,req.user.merchant_id||null,req.user.id,displayName,originalName,finalUrl,'RESOURCE',scope,'ACTIVE',meta.storageProvider||'local',meta.storageKey||finalUrl,meta.fileName||file?.filename||'',meta.mimeType||file?.mimetype||'',Number(meta.sizeBytes||file?.size||0),meta.width||null,meta.height||null]);
          if(subId){
            await pool.query('INSERT INTO image_category_bindings(image_id,sub_category_id) VALUES(?,?) ON DUPLICATE KEY UPDATE sub_category_id=VALUES(sub_category_id)',[id,subId]);
          }
          ids.push(id);
        }
        res.json({message:'资源已创建',ids,id:ids[0],count:ids.length});
      }catch(e){ res.status(400).json({message:e.message||'操作失败'}); }
    });
  });
  
  app.patch('/api/merchant/resources/:id', requireAuth, upload.single('image'), async (req,res)=>{
    const {name,objectName,colorName,status}=req.body;
    const access=resourceWriteAccessSql(req.user);
    const [[img]]=await pool.query(`
      SELECT i.*,COALESCE(imc.scope,i.resource_scope) scope
      FROM images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      WHERE ${access.sql}
      LIMIT 1
    `,[req.params.id,...access.params]);
    if(!img) return res.status(404).json({message:'图片不存在或无权操作'});
    const fields=[]; const vals=[];
    if(name!==undefined){fields.push('display_name=?'); vals.push(name||null);}
    if(status!==undefined){fields.push('status=?'); vals.push(status);}
    if(fields.length){ vals.push(req.params.id); await pool.query(`UPDATE images SET ${fields.join(',')} WHERE id=?`,vals); }
    if(objectName!==undefined || colorName!==undefined){
      const requestedScope=normalizeResourceScope(req.body.scope, req.user);
      const scope=img.scope==='MERCHANT'||requestedScope==='MERCHANT'?'MERCHANT':'USER';
      await pool.query('UPDATE images SET resource_scope=? WHERE id=?',[scope,req.params.id]);
      const subId=await ensureImageSubCategory({mainName:objectName||'',subName:colorName||'',scope,merchantId:req.user.merchant_id,userId:req.user.id,createdBy:req.user.id});
      if(subId) await pool.query('INSERT INTO image_category_bindings(image_id,sub_category_id) VALUES(?,?) ON DUPLICATE KEY UPDATE sub_category_id=VALUES(sub_category_id)',[req.params.id,subId]);
      else await pool.query('DELETE FROM image_category_bindings WHERE image_id=?',[req.params.id]);
    }
    res.json({message:'操作成功'});
  });
  
  app.delete('/api/merchant/resources/:id', requireAuth, async (req,res)=>{
    const access=resourceWriteAccessSql(req.user);
    const [[img]]=await pool.query(`
      SELECT i.* FROM images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      WHERE ${access.sql}
      LIMIT 1
    `,[req.params.id,...access.params]);
    if(!img) return res.status(404).json({message:'图片不存在或无权操作'});
    const [result]=await pool.query(`
      UPDATE images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      SET i.status="DELETED",i.deleted_at=NOW()
      WHERE ${access.sql}
    `,[req.params.id,...access.params]);
    if(!result.affectedRows) return res.status(404).json({message:'图片不存在或无权操作'});
    await deleteStoredFile(img);
    res.json({message:'操作成功'});
  });
  
  app.get('/api/merchant/promotion', requireAuth, async (req,res)=>{
    if(!req.user.merchant_id) return res.status(403).json({message:'需要门店账号'});
    const [[m]]=await pool.query('SELECT * FROM merchants WHERE id=?',[req.user.merchant_id]);
    const wh=['invite_code=?']; const ps=[m?.merchant_code||m?.invite_code||''];
    if(req.query.keyword){ wh.push('(company_name LIKE ? OR contact_name LIKE ? OR phone LIKE ?)'); ps.push(like(req.query.keyword),like(req.query.keyword),like(req.query.keyword)); }
    const data=await paged(`SELECT * FROM merchant_applications WHERE ${wh.join(' AND ')} ORDER BY created_at DESC`,`SELECT COUNT(*) total FROM merchant_applications WHERE ${wh.join(' AND ')}`,ps,req,publicApplication);
    res.json({merchantCode:m?.merchant_code,inviteCode:m?.invite_code||m?.merchant_code,inviteLink:`/apply?invite=${m?.merchant_code||''}`,...data});
  });
}
