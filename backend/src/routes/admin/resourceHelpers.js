import { v4 as uuid } from 'uuid';
import { pool } from '../../db.js';

const fixedMainPurpose = { '材质':1, '软体':1, '产品':3, '场景模板':2 };

export function parseStorageLimitBytes(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb|tb)?$/i);
  if (!match) throw new Error('存储上限格式不正确，请填写字节数或 5GB、500MB 这类格式');
  const n = Number(match[1]);
  const unit = String(match[2] || 'b').toLowerCase();
  const multiplier = unit === 'tb' ? 1024 ** 4 : unit === 'gb' ? 1024 ** 3 : unit === 'mb' ? 1024 ** 2 : unit === 'kb' ? 1024 : 1;
  const bytes = Math.floor(n * multiplier);
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error('存储上限不能小于 0');
  return bytes;
}

export async function ensureSystemSubCategory({mainName='',subName='',createdBy=null}){
  const main=String(mainName||'').trim();
  const sub=String(subName||'').trim();
  if(!main || main==='0' || main==='未分类') return null;
  let [[mainRow]]=await pool.query('SELECT id FROM image_main_categories WHERE scope="SYSTEM" AND name=? AND status<>"DELETED" LIMIT 1',[main]);
  if(!mainRow){
    const id=uuid();
    await pool.query('INSERT INTO image_main_categories(id,purpose_id,scope,name,is_fixed,created_by) VALUES(?,?, "SYSTEM", ?,0,?)',[id,fixedMainPurpose[main]||3,main,createdBy]);
    mainRow={id};
  }
  if(!sub){
    let [[subRow]]=await pool.query('SELECT id FROM image_sub_categories WHERE main_category_id=? AND is_main_only=1 AND status<>"DELETED" LIMIT 1',[mainRow.id]);
    if(!subRow){
      const id=uuid();
      await pool.query('INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,created_by) VALUES(?,?,NULL,1,0,?)',[id,mainRow.id,createdBy]);
      subRow={id};
    }
    return subRow.id;
  }
  let [[subRow]]=await pool.query('SELECT id FROM image_sub_categories WHERE main_category_id=? AND name=? AND status<>"DELETED" LIMIT 1',[mainRow.id,sub]);
  if(!subRow){
    const id=uuid();
    await pool.query('INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,created_by) VALUES(?,?,?,0,0,?)',[id,mainRow.id,sub,createdBy]);
    subRow={id};
  }
  return subRow.id;
}

export function resourceTypeFromMain(main){
  if(main==='材质'||main==='软体') return 'material';
  if(main==='场景模板') return 'scene';
  return 'user_reference';
}

export function stripImageExt(name=''){
  return String(name||'').trim().replace(/\.(jpe?g|png|webp|gif|bmp)$/i,'');
}
