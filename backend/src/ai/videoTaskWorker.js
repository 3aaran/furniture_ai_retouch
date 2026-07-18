// 中文说明：持久领取并恢复参考生视频任务，轮询供应商后流式转存结果。
import { v4 as uuid } from 'uuid';

import { pool } from '../db.js';
import {
  createSeedanceReferenceTask,
  getSeedanceReferenceTaskStatus
} from './adapters/seedance-reference-video.js';
import { getSeedanceVideoConfig } from './configService.js';
import { nextVideoPollAt, usesMerchantQuota, videoRetryDelayMs } from './videoTaskDomain.js';
import { applyUserStorageDelta, deleteStoredFile, getImageAccessUrl } from '../services/storageService.js';
import { saveRemoteVideoToStorage } from '../services/videoStorageService.js';
import { writeSystemLog } from '../services/loggerService.js';

function parseJson(value, fallback = {}) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function envEnabled(name, fallback = true) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function errorMessage(error) {
  return String(error?.message || error || '视频任务处理失败').slice(0, 2000);
}

export function createVideoTaskWorker(options = {}) {
  const repository = options.repository || createMysqlVideoWorkerRepository(options.pool || pool);
  const adapter = options.adapter || {
    create: (input, config) => createSeedanceReferenceTask(input, config),
    getStatus: (taskId, config) => getSeedanceReferenceTaskStatus(taskId, config)
  };
  const storage = options.storage || {
    save: (url, task) => saveRemoteVideoToStorage(url, {
      merchantId: task.merchant_id,
      userId: task.user_id,
      originalName: `${task.id}.mp4`
    }),
    remove: (stored) => deleteStoredFile(stored)
  };
  const getConfig = options.getConfig || (() => getSeedanceVideoConfig({ includeSecret: true }));
  const now = options.now || (() => new Date());
  const setTimer = options.setTimer || setTimeout;
  const clearTimer = options.clearTimer || clearTimeout;
  const enabled = options.enabled ?? envEnabled('VIDEO_WORKER_ENABLED', true);
  let timer = null;
  let started = false;
  let inFlight = null;

  async function executeOnce() {
    const config = await getConfig();
    if (config?.enabled === false || !config?.apiKey) return false;
    const current = now();
    const task = await repository.claimNextTask(current);
    if (!task) return false;
    const pollIntervalMs = Math.max(1000, Number(config.pollIntervalMs || process.env.VIDEO_POLL_INTERVAL_MS || 4000));

    if (!task.provider_task_id) {
      try {
        const input = await repository.loadProviderInput(task);
        const created = await adapter.create(input, config);
        await repository.saveProviderTask(
          task.id,
          created.providerTaskId,
          created.providerStatus || 'pending',
          new Date(new Date(current).getTime() + pollIntervalMs)
        );
      } catch (error) {
        await repository.failTask(task.id, errorMessage(error), 'provider_create');
      }
      return true;
    }

    let status;
    try {
      status = await adapter.getStatus(task.provider_task_id, config);
    } catch (error) {
      if (error?.recoverable) {
        const delay = videoRetryDelayMs(Number(task.poll_count || 0), { baseMs: pollIntervalMs, maxMs: 60000 });
        await repository.deferTask(task.id, errorMessage(error), new Date(new Date(current).getTime() + delay), 'provider_query');
      } else {
        await repository.failTask(task.id, errorMessage(error), 'provider_query');
      }
      return true;
    }

    if (!status.isFinal) {
      await repository.recordPoll(task.id, status, new Date(new Date(current).getTime() + pollIntervalMs));
      return true;
    }
    if (status.status === 'failed') {
      await repository.failTask(task.id, status.errorMessage || '供应商视频生成失败', 'provider', status);
      return true;
    }
    if (!status.resultUrl) {
      await repository.deferTask(task.id, '供应商成功状态暂未返回结果 URL', nextVideoPollAt(current, Number(task.poll_count || 0), { baseMs: pollIntervalMs }), 'provider_result');
      return true;
    }

    let stored = null;
    try {
      stored = await storage.save(status.resultUrl, task);
      const completed = await repository.completeTask(task.id, stored, status);
      if (completed?.duplicate) await storage.remove(stored);
    } catch (error) {
      if (stored) await storage.remove(stored).catch(() => {});
      const delay = videoRetryDelayMs(Number(task.poll_count || 0), { baseMs: pollIntervalMs, maxMs: 60000 });
      await repository.deferTask(task.id, errorMessage(error), new Date(new Date(current).getTime() + delay), 'storage');
    }
    return true;
  }

  async function runOnce() {
    if (inFlight) return inFlight;
    inFlight = executeOnce().finally(() => { inFlight = null; });
    return inFlight;
  }

  function schedule(delayMs) {
    if (!started) return;
    if (timer) clearTimer(timer);
    timer = setTimer(async () => {
      timer = null;
      try { await runOnce(); } catch (error) { console.error('[video-worker]', errorMessage(error)); }
      if (started) {
        const config = await getConfig().catch(() => ({}));
        schedule(Math.max(1000, Number(config.pollIntervalMs || process.env.VIDEO_POLL_INTERVAL_MS || 4000)));
      }
    }, Math.max(0, Number(delayMs || 0)));
  }

  return {
    start() {
      if (!enabled || started) return;
      started = true;
      schedule(0);
    },
    stop() {
      started = false;
      if (timer) clearTimer(timer);
      timer = null;
    },
    wake() {
      if (started) schedule(0);
    },
    runOnce,
    get started() { return started; }
  };
}

function publicUrlForImage(image) {
  const value = String(getImageAccessUrl(image, { expires: Number(process.env.AI_IMAGE_URL_EXPIRES || 3600) }) || '');
  if (/^https?:\/\//i.test(value)) return value;
  const base = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '').replace(/\/api$/i, '');
  if (!/^https?:\/\//i.test(base)) throw new Error('视频参考图需要公网访问，请配置 PUBLIC_BASE_URL');
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

export function createMysqlVideoWorkerRepository(databasePool = pool) {
  return {
    async claimNextTask(current) {
      const conn = await databasePool.getConnection();
      try {
        await conn.beginTransaction();
        const [[candidate]] = await conn.query(
          `SELECT * FROM ai_tasks
           WHERE media_type='video' AND status IN ('queued','running')
             AND (next_poll_at IS NULL OR next_poll_at<=?)
           ORDER BY submitted_at ASC LIMIT 1 FOR UPDATE`,
          [current]
        );
        if (!candidate) {
          await conn.commit();
          return null;
        }
        const leaseUntil = new Date(new Date(current).getTime() + 2 * 60 * 1000);
        const [update] = await conn.query(
          `UPDATE ai_tasks SET status='running',started_at=COALESCE(started_at,NOW()),next_poll_at=?
           WHERE id=? AND media_type='video' AND status IN ('queued','running')`,
          [leaseUntil, candidate.id]
        );
        if (!Number(update?.affectedRows || 0)) {
          await conn.rollback();
          return null;
        }
        await conn.commit();
        return { ...candidate, status: 'running', next_poll_at: leaseUntil };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async loadProviderInput(task) {
      const params = parseJson(task.task_params, {});
      const [images] = await databasePool.query(
        `SELECT i.* FROM ai_task_inputs ti JOIN images i ON i.id=ti.image_id
         WHERE ti.task_id=? AND i.deleted_at IS NULL ORDER BY ti.sort_order ASC,ti.created_at ASC`,
        [task.id]
      );
      if (!images.length || images.length > 9) throw new Error('视频任务参考图片数量无效');
      return {
        prompt: String(task.final_prompt || task.user_prompt || ''),
        params: {
          ...(params.providerParams || {}),
          images: images.map(publicUrlForImage)
        },
        ...(params.notifyUrl ? { notifyUrl: params.notifyUrl } : {})
      };
    },
    async saveProviderTask(taskId, providerTaskId, providerStatus, nextPollAt) {
      await databasePool.query(
        `UPDATE ai_tasks SET provider_task_id=?,provider_status=?,provider_progress=0,next_poll_at=?,last_polled_at=NULL,poll_count=0
         WHERE id=? AND media_type='video' AND provider_task_id IS NULL`,
        [providerTaskId, providerStatus, nextPollAt, taskId]
      );
      await databasePool.query('INSERT INTO ai_task_events(id,task_id,event_type,event_detail) VALUES(?,?,?,?)', [uuid(), taskId, 'provider_submit', `供应商任务 ${providerTaskId} 已创建`]);
    },
    async recordPoll(taskId, status, nextPollAt) {
      await databasePool.query(
        `UPDATE ai_tasks SET status='running',provider_status=?,provider_progress=?,last_polled_at=NOW(),poll_count=poll_count+1,next_poll_at=?,error_message=NULL
         WHERE id=? AND media_type='video' AND status='running'`,
        [status.providerStatus, Number(status.progress || 0), nextPollAt, taskId]
      );
    },
    async deferTask(taskId, message, nextPollAt, stage) {
      await databasePool.query(
        `UPDATE ai_tasks SET last_polled_at=NOW(),poll_count=poll_count+1,next_poll_at=?,error_message=?,failure_stage=?
         WHERE id=? AND media_type='video' AND status='running'`,
        [nextPollAt, String(message || '').slice(0, 2000), stage, taskId]
      );
      await databasePool.query('INSERT INTO ai_task_events(id,task_id,event_type,event_detail) VALUES(?,?,?,?)', [uuid(), taskId, 'retry', String(message || '').slice(0, 500)]);
    },
    async failTask(taskId, message, stage, providerStatus = {}) {
      const conn = await databasePool.getConnection();
      try {
        await conn.beginTransaction();
        const [[task]] = await conn.query("SELECT * FROM ai_tasks WHERE id=? AND media_type='video' FOR UPDATE", [taskId]);
        if (!task || task.status === 'succeeded') {
          await conn.commit();
          return { duplicate: true };
        }
        await conn.query(
          `UPDATE ai_tasks SET status='failed',provider_status=?,provider_progress=?,error_message=?,failure_code='VIDEO_PROVIDER_FAILED',failure_stage=?,finished_at=NOW(),next_poll_at=NULL
           WHERE id=?`,
          [providerStatus.providerStatus || task.provider_status || 'failed', Number(providerStatus.progress || task.provider_progress || 0), message, stage, taskId]
        );
        if (!Number(task.refunded || 0)) {
          const [[user]] = await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE', [task.user_id]);
          const merchantMode = usesMerchantQuota(user);
          if (merchantMode) await conn.query('UPDATE merchants SET quota_balance=quota_balance+? WHERE id=?', [task.cost, task.merchant_id]);
          else await conn.query('UPDATE users SET quota_balance=quota_balance+? WHERE id=?', [task.cost, task.user_id]);
          const [[balanceRow]] = merchantMode
            ? await conn.query('SELECT quota_balance balance FROM merchants WHERE id=?', [task.merchant_id])
            : await conn.query('SELECT quota_balance balance FROM users WHERE id=?', [task.user_id]);
          await conn.query(
            `INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,related_task_id,balance_after,remark)
             VALUES(?,?,?,?,?,'AI_REFUND',?,?,?)`,
            [uuid(), task.merchant_id, task.user_id, task.user_id, task.cost, task.id, Number(balanceRow?.balance || 0), merchantMode ? '视频任务失败退款（门店共享算力）' : '视频任务失败退款（个人算力）']
          );
          await conn.query('UPDATE ai_tasks SET refunded=1 WHERE id=? AND refunded=0', [task.id]);
          await conn.query('INSERT INTO ai_task_events(id,task_id,event_type,event_detail) VALUES(?,?,?,?)', [uuid(), task.id, 'refund', `失败退款 ${task.cost} 算力`]);
        }
        await conn.query('INSERT INTO ai_task_events(id,task_id,event_type,event_detail) VALUES(?,?,?,?)', [uuid(), task.id, 'fail', message]);
        await writeSystemLog(conn, {
          level: 'ERROR', module: 'video_task', action: 'failed', message,
          userId: task.user_id, merchantId: task.merchant_id,
          metadata: { taskId, stage }
        });
        await conn.commit();
        return { duplicate: Number(task.refunded || 0) === 1 };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async completeTask(taskId, stored, providerStatus) {
      const conn = await databasePool.getConnection();
      try {
        await conn.beginTransaction();
        const [[task]] = await conn.query("SELECT * FROM ai_tasks WHERE id=? AND media_type='video' FOR UPDATE", [taskId]);
        if (!task) throw new Error('视频任务不存在');
        if (task.result_video_id || task.status === 'succeeded') {
          await conn.commit();
          return { duplicate: true, videoId: task.result_video_id };
        }
        if (task.refunded || task.status === 'failed') throw new Error('已退款失败任务不能写入视频结果');
        const videoId = uuid();
        await conn.query(
          `INSERT INTO videos(id,merchant_id,user_id,task_id,original_name,file_name,storage_provider,storage_key,url,mime_type,size_bytes,duration_seconds,status)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?, 'ACTIVE')`,
          [videoId, task.merchant_id, task.user_id, task.id, stored.originalName || `${task.id}.mp4`, stored.fileName || `${task.id}.mp4`, stored.storageProvider || 'local', stored.storageKey, stored.url, stored.mimeType || 'video/mp4', Number(stored.sizeBytes || 0), task.duration_seconds]
        );
        await conn.query(
          "INSERT IGNORE INTO ai_task_video_outputs(id,task_id,video_id,output_role,sort_order) VALUES(?,?,?,'RESULT',0)",
          [uuid(), task.id, videoId]
        );
        await applyUserStorageDelta(conn, task.user_id, Number(stored.sizeBytes || 0), { action: 'SAVE_VIDEO_TASK_RESULT', videoId });
        await conn.query(
          `UPDATE ai_tasks SET status='succeeded',result_video_id=?,provider_status=?,provider_progress=100,error_message=NULL,failure_code=NULL,failure_stage=NULL,finished_at=NOW(),next_poll_at=NULL
           WHERE id=?`,
          [videoId, providerStatus.providerStatus || 'success', task.id]
        );
        await conn.query('INSERT INTO ai_task_events(id,task_id,event_type,event_detail) VALUES(?,?,?,?)', [uuid(), task.id, 'success', '视频结果已流式转存']);
        await conn.query(
          `INSERT INTO ai_model_call_logs(id,task_id,merchant_id,user_id,model_id,api_path,status,raw_response_json)
           VALUES(?,?,?,?,?,?, 'SUCCESS',?)`,
          [uuid(), task.id, task.merchant_id, task.user_id, task.model_id, task.api_path, JSON.stringify({ providerStatus: providerStatus.providerStatus, progress: providerStatus.progress })]
        );
        await writeSystemLog(conn, {
          module: 'video_task', action: 'succeeded', message: 'reference video task succeeded',
          userId: task.user_id, merchantId: task.merchant_id,
          metadata: { taskId, videoId, sizeBytes: Number(stored.sizeBytes || 0) }
        });
        await conn.commit();
        return { duplicate: false, videoId };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    }
  };
}

export const videoTaskWorker = createVideoTaskWorker();
