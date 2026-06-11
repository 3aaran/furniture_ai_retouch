import 'dotenv/config';

import { pool } from '../src/db.js';
import { generateThumbnailBestEffort } from '../src/services/thumbnailService.js';

function numberOption(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  const raw = arg ? arg.slice(prefix.length) : process.env[`THUMB_BACKFILL_${name.replace(/-/g, '_').toUpperCase()}`];
  const n = Number(raw || fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const batchSize = Math.min(100, Math.max(1, numberOption('batch-size', 20)));
const maxBatches = numberOption('max-batches', 0);

async function assertThumbColumnExists() {
  const [rows] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME="images" AND COLUMN_NAME="thumb_url"'
  );
  if (!rows.length) {
    throw new Error('images.thumb_url 字段不存在，请先部署包含数据库迁移的新版本，或先执行 ALTER TABLE images ADD COLUMN thumb_url VARCHAR(800) NULL AFTER url;');
  }
}

async function countMissingThumbnails() {
  const [[row]] = await pool.query(
    'SELECT COUNT(*) total FROM images WHERE status="ACTIVE" AND COALESCE(url,"")<>"" AND (thumb_url IS NULL OR thumb_url="")'
  );
  return Number(row?.total || 0);
}

async function loadBatch(cursor) {
  const params = [];
  let cursorSql = '';
  if (cursor) {
    cursorSql = ' AND (created_at>? OR (created_at=? AND id>?))';
    params.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  const [rows] = await pool.query(
    `
    SELECT id, merchant_id, user_id, url, storage_key, source_type, created_at
    FROM images
    WHERE status="ACTIVE"
      AND COALESCE(url,"")<>""
      AND (thumb_url IS NULL OR thumb_url="")
      ${cursorSql}
    ORDER BY created_at ASC, id ASC
    LIMIT ?
    `,
    [...params, batchSize]
  );
  return rows || [];
}

async function main() {
  await assertThumbColumnExists();

  let cursor = null;
  let batchNo = 0;
  let scanned = 0;
  let succeeded = 0;
  let failed = 0;

  const startMissing = await countMissingThumbnails();
  console.log(`[thumb-backfill] 开始处理：当前缺少缩略图 ${startMissing} 张；每批 ${batchSize} 张`);

  while (true) {
    if (maxBatches && batchNo >= maxBatches) {
      console.log(`[thumb-backfill] 已达到 max-batches=${maxBatches}，停止本次运行`);
      break;
    }

    const rows = await loadBatch(cursor);
    if (!rows.length) break;

    batchNo += 1;
    console.log(`[thumb-backfill] 第 ${batchNo} 批：读取 ${rows.length} 张`);

    for (const row of rows) {
      cursor = { createdAt: row.created_at, id: row.id };
      scanned += 1;

      const thumbUrl = await generateThumbnailBestEffort(pool, row, {
        merchantId: row.merchant_id || null,
        userId: row.user_id || null
      });

      if (thumbUrl) {
        succeeded += 1;
        console.log(`[thumb-backfill] OK ${row.id} -> ${thumbUrl}`);
      } else {
        failed += 1;
        console.warn(`[thumb-backfill] SKIP ${row.id}：缩略图生成失败，已跳过本次运行`);
      }
    }

    const remaining = await countMissingThumbnails();
    console.log(`[thumb-backfill] 进度：已扫描 ${scanned}，成功 ${succeeded}，失败 ${failed}，当前仍缺少 ${remaining}`);
  }

  const remaining = await countMissingThumbnails();
  if (remaining === 0) {
    console.log('[thumb-backfill] 没有图片缺少缩略图，结束');
  } else {
    console.warn(`[thumb-backfill] 本次扫描结束，但仍有 ${remaining} 张缺少缩略图。通常是原图读取失败或本次生成失败；修复原图/网络后重新运行脚本即可重试。`);
  }

  console.log(`[thumb-backfill] 汇总：扫描 ${scanned}，成功 ${succeeded}，失败 ${failed}`);
}

main()
  .catch((err) => {
    console.error('[thumb-backfill] 运行失败：', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
