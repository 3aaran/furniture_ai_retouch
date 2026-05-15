import { v4 as uuid } from 'uuid';

export async function writeSystemLog(conn, {
  level = 'INFO',
  module = 'app',
  action = '',
  message = '',
  userId = null,
  merchantId = null,
  requestId = null,
  metadata = null
} = {}) {
  try {
    await conn.query(
      `INSERT INTO system_logs(id, level, module, action, message, user_id, merchant_id, request_id, metadata_json)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [
        uuid(),
        String(level || 'INFO').toUpperCase(),
        module,
        action,
        String(message || '').slice(0, 2000),
        userId,
        merchantId,
        requestId,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
  } catch (err) {
    console.warn('[system_log_failed]', err.message);
  }
}

export async function writeStorageLog(conn, {
  userId,
  merchantId = null,
  imageId = null,
  action,
  deltaBytes = 0,
  usedBytes = null,
  limitBytes = null,
  message = ''
} = {}) {
  return null;
}

export default {
  writeSystemLog,
  writeStorageLog
};
