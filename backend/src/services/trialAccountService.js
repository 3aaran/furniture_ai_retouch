import { pool } from '../db.js';

export async function recycleExpiredTrialAccount(userOrId) {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
  if (!userId) return { expired: false };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE', [userId]);
    if (!user || user.role !== 'TRIAL' || user.status === 'DELETED') {
      await conn.commit();
      return { expired: false };
    }

    const [[expired]] = await conn.query('SELECT NOW() >= ? AS expired', [user.trial_expire_at]);
    if (!user.trial_expire_at || !Number(expired?.expired || 0)) {
      await conn.commit();
      return { expired: false };
    }

    await conn.query('UPDATE users SET status="DELETED", deleted_at=NOW() WHERE id=?', [user.id]);
    await conn.commit();
    return { expired: true, recycledQuota: 0 };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function recycleExpiredTrialAccountsForMerchant(merchantId) {
  if (!merchantId) return 0;
  const [rows] = await pool.query(
    'SELECT id FROM users WHERE merchant_id=? AND role="TRIAL" AND status="ACTIVE" AND trial_expire_at IS NOT NULL AND trial_expire_at<=NOW()',
    [merchantId]
  );
  for (const row of rows) {
    await recycleExpiredTrialAccount(row.id);
  }
  return rows.length;
}
