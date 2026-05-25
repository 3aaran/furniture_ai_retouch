import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { getStoredFileMeta } from '../services/storageService.js';

const purposeMap = {
  product: { id: 3, name: '产品参考', key: 'user_reference' },
  user_reference: { id: 3, name: '产品参考', key: 'user_reference' },
  material: { id: 1, name: '材质替换', key: 'material' },
  scene: { id: 2, name: '场景融合', key: 'scene' }
};

function isSystemAdmin(user) {
  return user?.role === 'SYSTEM_ADMIN';
}

function isMerchantManager(user) {
  return user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_ADMIN';
}

function normalizeScope(scope, user) {
  const next = String(scope || '').toUpperCase();
  if (next === 'SYSTEM') return 'SYSTEM';
  if (next === 'MERCHANT' && user?.merchant_id) return 'MERCHANT';
  return 'USER';
}

function canManageCategory(row, user) {
  if (!row) return false;
  if (Number(row.is_fixed || 0)) return false;
  if (row.scope === 'SYSTEM') return isSystemAdmin(user);
  if (row.scope === 'MERCHANT') return isMerchantManager(user) && row.merchant_id === user.merchant_id;
  return row.owner_user_id === user.id;
}

function ownerWhere(scope, user, alias = 'imc') {
  const prefix = alias ? `${alias}.` : '';
  if (scope === 'SYSTEM') return { sql: `${prefix}scope="SYSTEM"`, params: [] };
  if (scope === 'MERCHANT') return { sql: `${prefix}scope="MERCHANT" AND ${prefix}merchant_id=?`, params: [user.merchant_id || ''] };
  return { sql: `${prefix}scope="USER" AND ${prefix}owner_user_id=?`, params: [user.id] };
}

function mapPurpose(row) {
  if (row.purpose_id === 1) return { purposeKey: 'material', purposeName: '材质替换' };
  if (row.purpose_id === 2) return { purposeKey: 'scene', purposeName: '场景融合' };
  return { purposeKey: 'user_reference', purposeName: '产品参考' };
}

async function loadMain(id) {
  const [[row]] = await pool.query('SELECT * FROM image_main_categories WHERE id=? AND status<>"DELETED" LIMIT 1', [id]);
  return row || null;
}

async function loadSub(id) {
  const [[row]] = await pool.query(`
    SELECT isc.*,imc.scope,imc.merchant_id,imc.owner_user_id
    FROM image_sub_categories isc
    JOIN image_main_categories imc ON imc.id=isc.main_category_id
    WHERE isc.id=? AND isc.status<>"DELETED"
    LIMIT 1
  `, [id]);
  return row || null;
}

async function resourceAccessWhere(user, id) {
  if (isSystemAdmin(user)) return { sql: 'i.id=?', params: [id] };
  return {
    sql: 'i.id=? AND (COALESCE(imc.scope,i.resource_scope)="SYSTEM" OR (COALESCE(imc.scope,i.resource_scope)="MERCHANT" AND i.merchant_id=?) OR (COALESCE(imc.scope,i.resource_scope)="USER" AND i.user_id=?) OR (icb.image_id IS NULL AND i.resource_scope IS NULL AND i.user_id=?))',
    params: [id, user.merchant_id || '', user.id, user.id]
  };
}

export function registerResourceCategoryRoutes(app) {
  app.get('/api/categories/tree', requireAuth, async (req, res) => {
    const scope = normalizeScope(req.query.scope, req.user);
    const owner = ownerWhere(scope, req.user);
    const [mains] = await pool.query(`
      SELECT imc.*,rp.purpose_key purposeKey,rp.purpose_name purposeName
      FROM image_main_categories imc
      LEFT JOIN resource_purposes rp ON rp.id=imc.purpose_id
      WHERE ${owner.sql} AND imc.status<>"DELETED"
      ORDER BY FIELD(imc.purpose_id,3,1,2), IF(imc.sort_order>0,0,1), imc.sort_order ASC, imc.created_at ASC
    `, owner.params);
    const mainIds = mains.map(x => x.id);
    let subs = [];
    if (mainIds.length) {
      const [rows] = await pool.query(`
        SELECT *
        FROM image_sub_categories
        WHERE status<>"DELETED" AND main_category_id IN (?)
        ORDER BY IF(sort_order>0,0,1), sort_order ASC, created_at ASC
      `, [mainIds]);
      subs = rows;
    }
    const subsByMain = new Map();
    for (const sub of subs) {
      if (!subsByMain.has(sub.main_category_id)) subsByMain.set(sub.main_category_id, []);
      if (!Number(sub.is_main_only || 0)) subsByMain.get(sub.main_category_id).push({
        id: sub.id,
        name: sub.name,
        sortOrder: sub.sort_order,
        createdAt: sub.created_at
      });
    }
    const purposeOrder = [
      { purposeKey: 'user_reference', purposeName: '产品参考', mains: [] },
      { purposeKey: 'material', purposeName: '材质替换', mains: [] },
      { purposeKey: 'scene', purposeName: '场景融合', mains: [] }
    ];
    const purposeByKey = new Map(purposeOrder.map(p => [p.purposeKey, p]));
    for (const main of mains) {
      const p = mapPurpose(main);
      const bucket = purposeByKey.get(p.purposeKey) || purposeByKey.get('user_reference');
      bucket.mains.push({
        id: main.id,
        name: main.name,
        scope: main.scope,
        purposeKey: p.purposeKey,
        purposeName: p.purposeName,
        sortOrder: main.sort_order,
        isFixed: !!main.is_fixed,
        canManage: canManageCategory(main, req.user),
        subs: subsByMain.get(main.id) || []
      });
    }
    res.json({ scope, purposes: purposeOrder });
  });

  app.post('/api/categories/main', requireAuth, async (req, res) => {
    const scope = normalizeScope(req.body.scope, req.user);
    if (scope === 'SYSTEM' && !isSystemAdmin(req.user)) return res.status(403).json({ message: '无权维护系统分类' });
    if (scope === 'MERCHANT' && !isMerchantManager(req.user)) return res.status(403).json({ message: '无权维护门店分类' });
    const name = String(req.body.name || '').trim();
    const purpose = purposeMap[String(req.body.purposeKey || '').trim()] || null;
    const sortOrder = Math.max(0, Number(req.body.sortOrder || 0));
    if (!name) return res.status(400).json({ message: '分类名称不能为空' });
    if (!purpose) return res.status(400).json({ message: '请选择功能类型/用途' });
    const [exists] = await pool.query(`SELECT id FROM image_main_categories WHERE name=? AND ${owner.sql} AND status<>"DELETED" LIMIT 1`, [name, ...owner.params]);
    if (exists.length) return res.status(400).json({ message: '主分类已存在' });
    const id = uuid();
    await pool.query(
      'INSERT INTO image_main_categories(id,purpose_id,merchant_id,owner_user_id,scope,name,is_fixed,sort_order,created_by) VALUES(?,?,?,?,?,?,0,?,?)',
      [id, purpose.id, scope === 'MERCHANT' ? req.user.merchant_id : null, scope === 'USER' ? req.user.id : null, scope, name, sortOrder, req.user.id]
    );
    res.json({ message: '主分类已创建', id });
  });

  app.post('/api/categories/:mainId/sub', requireAuth, async (req, res) => {
    const main = await loadMain(req.params.mainId);
    if (!main) return res.status(404).json({ message: '主分类不存在' });
    if (!canManageCategory(main, req.user)) return res.status(403).json({ message: '无权维护该分类' });
    const name = String(req.body.name || '').trim();
    const sortOrder = Math.max(0, Number(req.body.sortOrder || 0));
    if (!name) return res.status(400).json({ message: '分类名称不能为空' });
    const [exists] = await pool.query('SELECT id FROM image_sub_categories WHERE main_category_id=? AND name=? AND status<>"DELETED" LIMIT 1', [main.id, name]);
    if (exists.length) return res.status(400).json({ message: '子分类已存在' });
    const id = uuid();
    await pool.query('INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,sort_order,created_by) VALUES(?,?,?,0,0,?,?)', [id, main.id, name, sortOrder, req.user.id]);
    res.json({ message: '子分类已创建', id });
  });

  app.patch('/api/categories/main/:id', requireAuth, async (req, res) => {
    const main = await loadMain(req.params.id);
    if (!main) return res.status(404).json({ message: '主分类不存在' });
    if (!canManageCategory(main, req.user)) return res.status(403).json({ message: '无权维护该分类' });
    const fields = [];
    const params = [];
    if (req.body.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: '分类名称不能为空' });
      fields.push('name=?');
      params.push(name);
    }
    if (req.body.status !== undefined) {
      fields.push('status=?');
      params.push(String(req.body.status) === 'DELETED' ? 'DELETED' : 'ACTIVE');
    }
    if (req.body.sortOrder !== undefined) {
      fields.push('sort_order=?');
      params.push(Math.max(0, Number(req.body.sortOrder || 0)));
    }
    if (!fields.length) return res.json({ message: '无变更' });
    params.push(main.id);
    await pool.query(`UPDATE image_main_categories SET ${fields.join(',')} WHERE id=?`, params);
    res.json({ message: '分类已更新' });
  });

  app.patch('/api/categories/sub/:id', requireAuth, async (req, res) => {
    const sub = await loadSub(req.params.id);
    if (!sub) return res.status(404).json({ message: '子分类不存在' });
    if (!canManageCategory(sub, req.user)) return res.status(403).json({ message: '无权维护该分类' });
    const fields = [];
    const params = [];
    if (req.body.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: '分类名称不能为空' });
      fields.push('name=?');
      params.push(name);
    }
    if (req.body.status !== undefined) {
      fields.push('status=?');
      params.push(String(req.body.status) === 'DELETED' ? 'DELETED' : 'ACTIVE');
    }
    if (req.body.sortOrder !== undefined) {
      fields.push('sort_order=?');
      params.push(Math.max(0, Number(req.body.sortOrder || 0)));
    }
    if (!fields.length) return res.json({ message: '无变更' });
    params.push(sub.id);
    await pool.query(`UPDATE image_sub_categories SET ${fields.join(',')} WHERE id=?`, params);
    res.json({ message: '分类已更新' });
  });

  app.patch('/api/categories/reorder', requireAuth, async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    for (const item of items) {
      const type = String(item.type || '');
      const id = String(item.id || '');
      const sortOrder = Math.max(0, Number(item.sortOrder || 0));
      if (!id) continue;
      if (type === 'main') {
        const main = await loadMain(id);
        if (main && canManageCategory(main, req.user)) await pool.query('UPDATE image_main_categories SET sort_order=? WHERE id=?', [sortOrder, id]);
      }
      if (type === 'sub') {
        const sub = await loadSub(id);
        if (sub && canManageCategory(sub, req.user)) await pool.query('UPDATE image_sub_categories SET sort_order=? WHERE id=?', [sortOrder, id]);
      }
    }
    res.json({ message: '排序已更新' });
  });
  app.get('/api/resources/:id/detail', requireAuth, async (req, res) => {
    const access = await resourceAccessWhere(req.user, req.params.id);
    const [[image]] = await pool.query(`
      SELECT i.*,imc.name mainCategoryName,isc.name subCategoryName,isc.is_main_only isMainOnly,imc.scope
      FROM images i
      LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
      LEFT JOIN image_sub_categories isc ON isc.id=icb.sub_category_id
      LEFT JOIN image_main_categories imc ON imc.id=isc.main_category_id
      WHERE ${access.sql}
      LIMIT 1
    `, access.params);
    if (!image) return res.status(404).json({ message: '资源不存在或无权查看' });
    const currentWidth = Number(image.width || 0);
    const currentHeight = Number(image.height || 0);
    if ((!currentWidth || !currentHeight || !Number(image.size_bytes || 0)) && image.url) {
      const meta = await getStoredFileMeta(image);
      if (meta.width || meta.height || meta.sizeBytes) {
        image.width = currentWidth || meta.width;
        image.height = currentHeight || meta.height;
        image.size_bytes = Number(image.size_bytes || meta.sizeBytes || 0);
        image.mime_type = image.mime_type || meta.mimeType;
        image.file_name = image.file_name || meta.fileName;
        image.storage_key = image.storage_key || meta.storageKey;
        await pool.query(
          'UPDATE images SET width=COALESCE(width,?),height=COALESCE(height,?),size_bytes=IF(size_bytes>0,size_bytes,?),mime_type=COALESCE(NULLIF(mime_type,""),?),file_name=COALESCE(NULLIF(file_name,""),?),storage_key=COALESCE(NULLIF(storage_key,""),?) WHERE id=?',
          [meta.width || null, meta.height || null, Number(meta.sizeBytes || 0), meta.mimeType || null, meta.fileName || null, meta.storageKey || null, image.id]
        );
      }
    }
    const taskScopeSql = isSystemAdmin(req.user) ? '' : 'AND (t.user_id=? OR t.merchant_id=?)';
    const taskScopeParams = isSystemAdmin(req.user) ? [] : [req.user.id, req.user.merchant_id || ''];
    const [tasks] = await pool.query(`
      SELECT DISTINCT t.id,t.feature_key featureKey,t.status,t.cost,t.submitted_at submittedAt,t.finished_at finishedAt,t.result_image_id resultImageId
      FROM ai_tasks t
      LEFT JOIN ai_task_inputs ati ON ati.task_id=t.id
      LEFT JOIN ai_task_outputs ato ON ato.task_id=t.id
      WHERE (ati.image_id=? OR ato.image_id=? OR t.origin_image_id=? OR t.result_image_id=?)
      ${taskScopeSql}
      ORDER BY t.submitted_at DESC
      LIMIT 20
    `, [image.id, image.id, image.id, image.id, ...taskScopeParams]);
    res.json({
      image: {
        id: image.id,
        name: image.display_name || image.original_name || `资源-${String(image.id).slice(0, 8)}`,
        url: image.url,
        fileSize: Number(image.size_bytes || 0),
        width: image.width,
        height: image.height,
        mimeType: image.mime_type,
        mainCategoryName: image.mainCategoryName || '未分类',
        subCategoryName: Number(image.isMainOnly || 0) ? '' : (image.subCategoryName || ''),
        scope: image.scope || 'USER',
        sourceType: image.source_type,
        createdAt: image.created_at
      },
      relatedTasks: tasks
    });
  });
}




