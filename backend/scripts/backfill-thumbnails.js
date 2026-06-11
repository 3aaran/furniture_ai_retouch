import 'dotenv/config';

import { pool } from '../src/db.js';
import { generateThumbnailBestEffort } from '../src/services/thumbnailService.js';

function numberOption(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  const envName = `THUMB_BACKFILL_${name.replace(/-/g, '_').toUpperCase()}`;
  const raw = arg ? arg.slice(prefix.length) : process.env[envName];
  const n = Number(raw || fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const batchSize = Math.min(100, Math.max(1, numberOption('batch-size', 20)));
const maxBatches = numberOption('max-batches', 0);

function printUsage() {
  console.log('[thumb-backfill] Usage: pnpm run thumbs:backfill -- --batch-size=20');
  console.log('[thumb-backfill] Test one batch: pnpm run thumbs:backfill -- --batch-size=20 --max-batches=1');
}

async function assertThumbColumnExists() {
  const [rows] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME="images" AND COLUMN_NAME="thumb_url"'
  );
  if (!rows.length) {
    throw new Error(
      'images.thumb_url column does not exist. Deploy the DB migration first, or run: ALTER TABLE images ADD COLUMN thumb_url VARCHAR(800) NULL AFTER url;'
    );
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
  printUsage();
  await assertThumbColumnExists();

  let cursor = null;
  let batchNo = 0;
  let scanned = 0;
  let succeeded = 0;
  let failed = 0;

  const startMissing = await countMissingThumbnails();
  console.log(`[thumb-backfill] Start. Missing thumbnails: ${startMissing}. Batch size: ${batchSize}.`);

  while (true) {
    if (maxBatches && batchNo >= maxBatches) {
      console.log(`[thumb-backfill] Reached max-batches=${maxBatches}. Stop this run.`);
      break;
    }

    const rows = await loadBatch(cursor);
    if (!rows.length) break;

    batchNo += 1;
    console.log(`[thumb-backfill] Batch ${batchNo}: loaded ${rows.length} images.`);

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
        console.warn(`[thumb-backfill] SKIP ${row.id}: thumbnail generation failed; skipped in this run.`);
      }
    }

    const remaining = await countMissingThumbnails();
    console.log(`[thumb-backfill] Progress: scanned=${scanned}, success=${succeeded}, failed=${failed}, remaining=${remaining}`);
  }

  const remaining = await countMissingThumbnails();
  if (remaining === 0) {
    console.log('[thumb-backfill] No images without thumbnails. Finished.');
  } else {
    console.warn(
      `[thumb-backfill] Scan finished, but ${remaining} images still have no thumbnail. Usually original file read failed or generation failed. Fix the original file/network and run again with pnpm run thumbs:backfill.`
    );
  }

  console.log(`[thumb-backfill] Summary: scanned=${scanned}, success=${succeeded}, failed=${failed}.`);
}

main()
  .catch((err) => {
    console.error('[thumb-backfill] Failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
