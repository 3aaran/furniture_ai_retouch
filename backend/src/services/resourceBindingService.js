import { v4 as uuid } from 'uuid';

const FIXED_MAIN_PURPOSE = {
  '材质': 1,
  '软体': 1,
  '产品': 3,
  '场景模板': 2
};

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function isUncategorized(value) {
  const text = String(value ?? '').trim();
  return !text || text === '0' || text === '未分类';
}

async function ensureImageSubCategory(conn, {
  mainName = '',
  subName = '',
  scope = 'USER',
  merchantId = null,
  userId = null,
  createdBy = null
} = {}) {
  if (isUncategorized(mainName)) return null;

  const main = cleanText(mainName);
  const sub = cleanText(subName);
  const normalizedScope = scope === 'MERCHANT' ? 'MERCHANT' : scope === 'SYSTEM' ? 'SYSTEM' : 'USER';
  const purposeId = FIXED_MAIN_PURPOSE[main] || 3;
  const ownerClause = normalizedScope === 'SYSTEM'
    ? 'scope="SYSTEM"'
    : normalizedScope === 'MERCHANT'
      ? 'scope="MERCHANT" AND merchant_id=?'
      : 'scope="USER" AND owner_user_id=?';
  const ownerParams = normalizedScope === 'SYSTEM'
    ? []
    : normalizedScope === 'MERCHANT'
      ? [merchantId || null]
      : [userId || createdBy || null];

  let [[mainRow]] = await conn.query(
    `SELECT id FROM image_main_categories WHERE name=? AND ${ownerClause} AND status<>"DELETED" LIMIT 1`,
    [main, ...ownerParams]
  );

  if (!mainRow) {
    const id = uuid();
    await conn.query(
      'INSERT INTO image_main_categories(id,purpose_id,merchant_id,owner_user_id,scope,name,is_fixed,created_by) VALUES(?,?,?,?,?,?,0,?)',
      [
        id,
        purposeId,
        merchantId || null,
        normalizedScope === 'USER' ? (userId || createdBy || null) : null,
        normalizedScope,
        main,
        createdBy || null
      ]
    );
    mainRow = { id };
  }

  if (!sub) {
    let [[subRow]] = await conn.query(
      'SELECT id FROM image_sub_categories WHERE main_category_id=? AND is_main_only=1 AND status<>"DELETED" LIMIT 1',
      [mainRow.id]
    );
    if (!subRow) {
      const id = uuid();
      await conn.query(
        'INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,created_by) VALUES(?,?,NULL,1,0,?)',
        [id, mainRow.id, createdBy || null]
      );
      subRow = { id };
    }
    return subRow.id;
  }

  let [[subRow]] = await conn.query(
    'SELECT id FROM image_sub_categories WHERE main_category_id=? AND name=? AND status<>"DELETED" LIMIT 1',
    [mainRow.id, sub]
  );
  if (!subRow) {
    const id = uuid();
    await conn.query(
      'INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,created_by) VALUES(?,?,?,0,0,?)',
      [id, mainRow.id, sub, createdBy || null]
    );
    subRow = { id };
  }
  return subRow.id;
}

export async function bindImageToResourceCategory(conn, {
  imageId,
  merchantId = null,
  userId = null,
  createdBy = null,
  scope = 'USER',
  mainName = '',
  subName = ''
} = {}) {
  if (!imageId) return null;
  const normalizedScope = scope === 'MERCHANT' && merchantId ? 'MERCHANT' : scope === 'SYSTEM' ? 'SYSTEM' : 'USER';
  const subId = await ensureImageSubCategory(conn, {
    mainName,
    subName,
    scope: normalizedScope,
    merchantId,
    userId,
    createdBy: createdBy || userId
  });

  if (!subId) {
    await conn.query('DELETE FROM image_category_bindings WHERE image_id=?', [imageId]);
    return null;
  }

  await conn.query(
    'INSERT INTO image_category_bindings(image_id,sub_category_id) VALUES(?,?) ON DUPLICATE KEY UPDATE sub_category_id=VALUES(sub_category_id)',
    [imageId, subId]
  );
  return subId;
}
