// 中文说明：提供独立视频任务的幂等提交、查询、删除及 MySQL 事务持久化。
import { v4 as uuid } from 'uuid';

import { pool } from '../db.js';
import { getSeedanceVideoConfig } from './configService.js';
import {
  calculateVideoTaskCost,
  canAccessVideoTask,
  normalizeVideoTaskPayload,
  usesMerchantQuota
} from './videoTaskDomain.js';
import {
  applyUserStorageDelta,
  deleteStoredFile,
  getImageAccessUrl,
  getUserStorageSummary
} from '../services/storageService.js';
import { buildVideoAccessFields } from '../services/videoStorageService.js';
import { assertPublicHttpUrlLiteral } from '../services/publicUrlSafety.js';
import { writeSystemLog } from '../services/loggerService.js';

const VIDEO_FEATURE_KEY = 'video_generate';
const VIDEO_PROVIDER = 'seedance-reference';
const VIDEO_MODEL = 'kwvideo-v2-ref';
let defaultWakeWorker = () => {};

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function defaultPublicImageUrl(image) {
  const value = String(getImageAccessUrl(image, { expires: Number(process.env.AI_IMAGE_URL_EXPIRES || 3600) }) || '').trim();
  const baseUrl = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '').replace(/\/api$/i, '');
  const publicUrl = /^https?:\/\//i.test(value)
    ? value
    : baseUrl && /^https?:\/\//i.test(baseUrl)
      ? `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`
      : '';
  if (!publicUrl) throw new Error('视频参考图需要公网访问，请配置 PUBLIC_BASE_URL 或 OSS');
  try {
    return assertPublicHttpUrlLiteral(publicUrl, '视频参考图').toString();
  } catch {
    throw new Error('视频参考图当前仍是本地地址，请配置公网 PUBLIC_BASE_URL 或 OSS 后再生成视频');
  }
}

export function publicVideoTask(row = {}) {
  const resultVideoId = row.result_video_id || row.resultVideoId || null;
  const access = buildVideoAccessFields({ ...row, id: resultVideoId || '' });
  const taskParams = parseJson(row.task_params ?? row.taskParams, {});
  const extraRequirements = parseJson(row.prompt_extra_requirements ?? row.extraRequirements, []);
  const status = row.status || 'queued';
  return {
    id: row.id,
    mediaType: 'video',
    featureKey: row.feature_key || row.featureKey || VIDEO_FEATURE_KEY,
    status,
    providerStatus: row.provider_status || row.providerStatus || '',
    progress: status === 'succeeded' ? 100 : Number(row.provider_progress ?? row.progress ?? 0),
    duration: row.duration_seconds ?? row.durationSeconds ?? null,
    durationSeconds: row.duration_seconds ?? row.durationSeconds ?? null,
    videoId: resultVideoId,
    videoUrl: access.videoUrl,
    posterUrl: access.posterUrl,
    downloadUrl: access.downloadUrl,
    prompt: row.user_prompt ?? row.prompt ?? '',
    finalPrompt: row.final_prompt ?? row.finalPrompt ?? '',
    extraRequirements,
    taskParams,
    version: taskParams?.providerParams?.version || taskParams?.version || '',
    resolution: row.resolution || taskParams?.providerParams?.resolution || '',
    aspectRatio: row.ratio || taskParams?.providerParams?.aspect_ratio || '',
    cost: Number(row.cost || 0),
    errorMessage: row.error_message || row.errorMessage || '',
    failureCode: row.failure_code || row.failureCode || '',
    failureStage: row.failure_stage || row.failureStage || '',
    clientRequestId: row.client_request_id || row.clientRequestId || '',
    submittedAt: row.submitted_at || row.submittedAt || null,
    startedAt: row.started_at || row.startedAt || null,
    finishedAt: row.finished_at || row.finishedAt || null
  };
}

export function setVideoTaskWakeHandler(handler) {
  defaultWakeWorker = typeof handler === 'function' ? handler : () => {};
}

export function createVideoTaskService(options = {}) {
  const repository = options.repository || createMysqlVideoTaskRepository(options.pool || pool);
  const id = options.id || uuid;
  const getConfig = options.getConfig || (() => getSeedanceVideoConfig({ includeSecret: true }));
  const publicImageUrl = options.publicImageUrl || defaultPublicImageUrl;
  const wakeWorker = options.wakeWorker || (() => defaultWakeWorker());

  async function wake() {
    await Promise.resolve(wakeWorker()).catch(() => {});
  }

  async function submitVideoTask(payload, user) {
    if (payload?.featureKey && payload.featureKey !== VIDEO_FEATURE_KEY) {
      throw new Error('该接口是 video_generate 视频专用链路');
    }
    const normalized = normalizeVideoTaskPayload(payload);
    const config = await getConfig();
    if (!config?.enabled) throw new Error('参考生视频模型未启用');

    const existing = await repository.findByClientRequest(user.id, normalized.clientRequestId);
    if (existing) {
      await wake();
      return {
        task: publicVideoTask(existing),
        balance: await repository.getBalance(user),
        idempotent: true
      };
    }

    const settings = await repository.getSettings();
    const cost = calculateVideoTaskCost(settings);
    let outcome;
    try {
      outcome = await repository.transaction(async (tx) => {
        const duplicate = await tx.findByClientRequest(user.id, normalized.clientRequestId);
        if (duplicate) return { duplicate, balance: await repository.getBalance(user) };

        const dbUser = await tx.lockUser(user.id);
        if (!dbUser || dbUser.status !== 'ACTIVE') throw new Error('账号不可用');
        const merchant = user.merchant_id ? await tx.lockMerchant(user.merchant_id) : null;
        if (!merchant || merchant.status !== 'ACTIVE') throw new Error('所属门店不可用');

        const images = await tx.listAuthorizedImages(normalized.imageIds, user);
        const imageById = new Map(images.map((image) => [String(image.id), image]));
        const orderedImages = normalized.imageIds.map((imageId) => imageById.get(String(imageId))).filter(Boolean);
        if (orderedImages.length !== normalized.imageIds.length) throw new Error('部分参考图片不存在或无权使用');
        const imageUrls = orderedImages.map((image) => publicImageUrl(image));
        if (imageUrls.some((url) => !/^https?:\/\//i.test(String(url || '')))) {
          throw new Error('参考图片无法构造公网 URL');
        }

        const quotaMode = usesMerchantQuota(dbUser);
        const balance = await tx.chargeQuota({
          user: dbUser,
          merchant,
          cost,
          useMerchantQuota: quotaMode
        });
        const taskId = id();
        const taskParams = {
          featureKey: VIDEO_FEATURE_KEY,
          clientRequestId: normalized.clientRequestId,
          imageIds: normalized.imageIds,
          providerParams: {
            ...normalized.providerParams,
            images: imageUrls
          },
          ...(normalized.notifyUrl ? { notifyUrl: normalized.notifyUrl } : {})
        };
        const record = {
          id: taskId,
          merchant_id: user.merchant_id || null,
          user_id: user.id,
          feature_key: VIDEO_FEATURE_KEY,
          media_type: 'video',
          feature_id: 'feature_video_generate',
          model_id: config.id || 'model_seedance_reference_video',
          origin_image_id: normalized.imageIds[0],
          reference_image_ids: normalized.imageIds,
          task_params: taskParams,
          user_prompt: normalized.prompt,
          prompt_extra_requirements: normalized.extraRequirements,
          output_format: { mediaType: 'video', resolution: normalized.resolution, aspectRatio: normalized.aspectRatio },
          system_prompt: '',
          final_prompt: normalized.finalPrompt,
          resolution: normalized.resolution,
          ratio: normalized.aspectRatio,
          provider: VIDEO_PROVIDER,
          model_name: VIDEO_MODEL,
          api_path: config.createPath || '/v1/media/generate',
          cost,
          status: 'queued',
          provider_status: 'pending',
          provider_progress: 0,
          next_poll_at: new Date(),
          client_request_id: normalized.clientRequestId,
          duration_seconds: normalized.durationSeconds
        };
        await tx.insertTask(record);
        await tx.insertPrompt({
          taskId,
          userPrompt: normalized.prompt,
          finalPrompt: normalized.finalPrompt,
          extraRequirements: normalized.extraRequirements
        });
        await tx.insertOptions({
          taskId,
          resolution: normalized.resolution,
          ratio: normalized.aspectRatio,
          options: normalized.providerParams,
          outputFormat: record.output_format
        });
        await tx.insertInputs(normalized.imageIds.map((imageId, index) => ({
          id: id(),
          taskId,
          imageId,
          role: index === 0 ? 'IMAGE_A' : 'IMAGE_C',
          sortOrder: index
        })));
        await tx.insertQuotaLog({
          id: id(),
          taskId,
          merchantId: user.merchant_id,
          userId: user.id,
          amount: -cost,
          balance,
          remark: quotaMode ? '视频任务提交扣费（门店共享算力）' : '视频任务提交扣费（个人算力）'
        });
        await tx.insertEvent('submit', taskId, '用户提交参考生视频任务');
        await tx.insertEvent('deduct', taskId, `已扣除 ${cost} 算力`);
        await tx.insertSystemLog({
          taskId,
          userId: user.id,
          merchantId: user.merchant_id,
          cost,
          clientRequestId: normalized.clientRequestId
        });
        return { task: record, balance };
      });
    } catch (error) {
      if (error?.code !== 'ER_DUP_ENTRY') throw error;
      const duplicate = await repository.findByClientRequest(user.id, normalized.clientRequestId);
      if (!duplicate) throw error;
      outcome = { duplicate, balance: await repository.getBalance(user) };
    }

    await wake();
    if (outcome.duplicate) {
      return { task: publicVideoTask(outcome.duplicate), balance: outcome.balance, idempotent: true };
    }
    return { task: publicVideoTask(outcome.task), balance: outcome.balance, idempotent: false };
  }

  async function getVideoTaskStatus(taskId, user) {
    const task = await repository.getTaskForUser(taskId, user);
    if (!task) throw new Error('视频任务不存在');
    return publicVideoTask(task);
  }

  async function getVideoTaskDetail(taskId, user) {
    const task = await repository.getTaskForUser(taskId, user);
    if (!task) throw new Error('视频任务不存在');
    return {
      ...publicVideoTask(task),
      events: await repository.getTaskEvents(taskId),
      inputImages: await repository.getTaskInputs(taskId)
    };
  }

  async function getRecentVideoTasks(user, query = {}) {
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize || 20)));
    const rows = await repository.listRecentTasks(user, { pageSize, keyword: String(query.keyword || '') });
    return { items: rows.map(publicVideoTask), page: 1, pageSize, total: rows.length };
  }

  async function deleteVideoTask(taskId, user) {
    return repository.deleteTask(taskId, user);
  }

  return {
    submitVideoTask,
    getVideoTaskStatus,
    getVideoTaskDetail,
    getRecentVideoTasks,
    deleteVideoTask
  };
}

export function createMysqlVideoTaskRepository(databasePool = pool) {
  async function findByClientRequest(userId, clientRequestId, conn = databasePool, lock = false) {
    const [[row]] = await conn.query(
      `SELECT t.*,v.storage_provider,v.storage_key,v.url,v.original_name,v.file_name,v.poster_url,v.poster_storage_key
       FROM ai_tasks t
       LEFT JOIN videos v ON v.id=t.result_video_id AND v.deleted_at IS NULL
       WHERE t.user_id=? AND t.client_request_id=? AND t.media_type='video'
       LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [userId, clientRequestId]
    );
    return row || null;
  }

  async function getTaskForUser(taskId, user) {
    const [[row]] = await databasePool.query(
      `SELECT t.*,v.storage_provider,v.storage_key,v.url,v.original_name,v.file_name,v.mime_type,v.size_bytes,v.poster_url,v.poster_storage_key
       FROM ai_tasks t
       LEFT JOIN videos v ON v.id=t.result_video_id AND v.deleted_at IS NULL
       WHERE t.id=? AND t.media_type='video' LIMIT 1`,
      [taskId]
    );
    return row && canAccessVideoTask(row, user) ? row : null;
  }

  return {
    findByClientRequest,
    async getSettings() {
      const [rows] = await databasePool.query('SELECT setting_key,setting_value FROM app_settings');
      return Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
    },
    async getBalance(user) {
      const [[freshUser]] = await databasePool.query('SELECT role,quota_balance FROM users WHERE id=? LIMIT 1', [user.id]);
      if (usesMerchantQuota(freshUser) && user.merchant_id) {
        const [[merchant]] = await databasePool.query('SELECT quota_balance FROM merchants WHERE id=? LIMIT 1', [user.merchant_id]);
        return Number(merchant?.quota_balance || 0);
      }
      return Number(freshUser?.quota_balance || 0);
    },
    async transaction(work) {
      const conn = await databasePool.getConnection();
      try {
        await conn.beginTransaction();
        const tx = {
          findByClientRequest: (userId, clientRequestId) => findByClientRequest(userId, clientRequestId, conn, true),
          async lockUser(userId) {
            const [[row]] = await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE', [userId]);
            return row || null;
          },
          async lockMerchant(merchantId) {
            const [[row]] = await conn.query('SELECT * FROM merchants WHERE id=? FOR UPDATE', [merchantId]);
            return row || null;
          },
          async listAuthorizedImages(imageIds, user) {
            const placeholders = imageIds.map(() => '?').join(',');
            const params = [...imageIds];
            let scope = '';
            if (user.role !== 'SYSTEM_ADMIN') {
              if (user.merchant_id) {
                scope = ' AND (user_id=? OR merchant_id=?)';
                params.push(user.id, user.merchant_id);
              } else {
                scope = ' AND user_id=?';
                params.push(user.id);
              }
            }
            const [rows] = await conn.query(
              `SELECT * FROM images WHERE id IN (${placeholders}) AND status='ACTIVE' AND deleted_at IS NULL${scope} FOR UPDATE`,
              params
            );
            return rows;
          },
          async chargeQuota({ user, merchant, cost, useMerchantQuota }) {
            const current = useMerchantQuota ? Number(merchant?.quota_balance || 0) : Number(user?.quota_balance || 0);
            if (current < cost) throw new Error('算力余额不足');
            if (useMerchantQuota) {
              await conn.query('UPDATE merchants SET quota_balance=quota_balance-? WHERE id=?', [cost, merchant.id]);
            } else {
              await conn.query('UPDATE users SET quota_balance=quota_balance-? WHERE id=?', [cost, user.id]);
            }
            return current - cost;
          },
          async insertTask(record) {
            const columns = [
              'id','merchant_id','user_id','feature_key','media_type','feature_id','model_id','origin_image_id',
              'reference_image_ids','task_params','user_prompt','prompt_extra_requirements','output_format','system_prompt',
              'final_prompt','resolution','ratio','provider','model_name','api_path','cost','status','provider_status',
              'provider_progress','next_poll_at','client_request_id','duration_seconds'
            ];
            const values = columns.map((column) => {
              const value = record[column];
              return ['reference_image_ids','task_params','prompt_extra_requirements','output_format'].includes(column)
                ? JSON.stringify(value ?? null)
                : value;
            });
            await conn.query(`INSERT INTO ai_tasks(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`, values);
          },
          async insertPrompt(record) {
            await conn.query(
              `INSERT INTO ai_task_prompts(task_id,user_prompt,system_prompt,admin_prompt,template_prompt,final_prompt,negative_prompt,extra_requirements_json)
               VALUES(?,?,'','','',?,'',?)`,
              [record.taskId, record.userPrompt, record.finalPrompt, JSON.stringify(record.extraRequirements || [])]
            );
          },
          async insertOptions(record) {
            await conn.query(
              'INSERT INTO ai_task_options(task_id,resolution,ratio,output_count,options_json,output_format_json) VALUES(?,?,?,1,?,?)',
              [record.taskId, record.resolution, record.ratio, JSON.stringify(record.options || {}), JSON.stringify(record.outputFormat || {})]
            );
          },
          async insertInputs(records) {
            for (const record of records) {
              await conn.query(
                'INSERT IGNORE INTO ai_task_inputs(id,task_id,image_id,input_role,sort_order) VALUES(?,?,?,?,?)',
                [record.id, record.taskId, record.imageId, record.role, record.sortOrder]
              );
            }
          },
          async insertQuotaLog(record) {
            await conn.query(
              `INSERT INTO quota_logs(id,merchant_id,related_user_id,operator_user_id,amount,type,related_task_id,balance_after,remark)
               VALUES(?,?,?,?,?,'AI_COST',?,?,?)`,
              [record.id, record.merchantId, record.userId, record.userId, record.amount, record.taskId, record.balance, record.remark]
            );
          },
          async insertEvent(type, taskId, detail) {
            await conn.query('INSERT INTO ai_task_events(id,task_id,event_type,event_detail) VALUES(?,?,?,?)', [uuid(), taskId, type, detail]);
          },
          async insertSystemLog(record) {
            await writeSystemLog(conn, {
              module: 'video_task',
              action: 'submit',
              message: 'reference video task submitted',
              userId: record.userId,
              merchantId: record.merchantId,
              requestId: record.clientRequestId,
              metadata: { taskId: record.taskId, cost: record.cost, model: VIDEO_MODEL }
            });
          }
        };
        const result = await work(tx);
        await conn.commit();
        return result;
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    getTaskForUser,
    async getTaskEvents(taskId) {
      const [rows] = await databasePool.query(
        'SELECT event_type eventType,event_detail eventDetail,created_at createdAt FROM ai_task_events WHERE task_id=? ORDER BY created_at ASC',
        [taskId]
      );
      return rows;
    },
    async getTaskInputs(taskId) {
      const [rows] = await databasePool.query(
        `SELECT ti.input_role role,ti.sort_order sortOrder,i.id,i.url,i.storage_key storageKey,i.original_name originalName
         FROM ai_task_inputs ti JOIN images i ON i.id=ti.image_id
         WHERE ti.task_id=? ORDER BY ti.sort_order ASC`,
        [taskId]
      );
      return rows.map((row) => ({ ...row, url: getImageAccessUrl({ url: row.url, storage_key: row.storageKey }) }));
    },
    async listRecentTasks(user, { pageSize, keyword }) {
      const where = ["t.media_type='video'"];
      const params = [];
      if (user.role !== 'SYSTEM_ADMIN') {
        if (usesMerchantQuota(user)) { where.push('t.merchant_id=?'); params.push(user.merchant_id); }
        else { where.push('t.user_id=?'); params.push(user.id); }
      }
      if (keyword) { where.push('(t.id LIKE ? OR t.user_prompt LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`); }
      const [rows] = await databasePool.query(
        `SELECT t.*,v.storage_provider,v.storage_key,v.url,v.original_name,v.file_name,v.poster_url,v.poster_storage_key
         FROM ai_tasks t LEFT JOIN videos v ON v.id=t.result_video_id AND v.deleted_at IS NULL
         WHERE ${where.join(' AND ')} ORDER BY t.submitted_at DESC LIMIT ?`,
        [...params, pageSize]
      );
      return rows;
    },
    async deleteTask(taskId, user) {
      const conn = await databasePool.getConnection();
      let video = null;
      let task = null;
      try {
        await conn.beginTransaction();
        [[task]] = await conn.query("SELECT * FROM ai_tasks WHERE id=? AND media_type='video' FOR UPDATE", [taskId]);
        if (!task) throw new Error('视频任务不存在');
        if (!canAccessVideoTask(task, user)) throw new Error('无权删除该视频任务');
        if (['queued', 'running'].includes(task.status)) throw new Error('进行中的视频任务不能删除');
        if (task.result_video_id) {
          [[video]] = await conn.query('SELECT * FROM videos WHERE id=? FOR UPDATE', [task.result_video_id]);
          if (video && !video.deleted_at) {
            await conn.query("UPDATE videos SET status='DELETED',deleted_at=NOW() WHERE id=? AND deleted_at IS NULL", [video.id]);
            await applyUserStorageDelta(conn, task.user_id, -Number(video.size_bytes || 0), { action: 'DELETE_VIDEO_TASK_RESULT', videoId: video.id });
          }
        }
        for (const table of ['ai_task_video_outputs','ai_task_events','ai_task_inputs','ai_task_prompts','ai_task_options']) {
          await conn.query(`DELETE FROM ${table} WHERE ${table === 'ai_task_video_outputs' ? 'task_id' : 'task_id'}=?`, [taskId]);
        }
        await conn.query('DELETE FROM ai_tasks WHERE id=?', [taskId]);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      if (video) await deleteStoredFile(video);
      return {
        message: '生成视频已删除',
        deletedTaskId: taskId,
        deletedVideos: video ? 1 : 0,
        freedBytes: Number(video?.size_bytes || 0),
        storage: task?.user_id ? await getUserStorageSummary(databasePool, task.user_id) : null
      };
    }
  };
}

const defaultService = createVideoTaskService();
export const submitVideoTask = (...args) => defaultService.submitVideoTask(...args);
export const getVideoTaskStatus = (...args) => defaultService.getVideoTaskStatus(...args);
export const getVideoTaskDetail = (...args) => defaultService.getVideoTaskDetail(...args);
export const getRecentVideoTasks = (...args) => defaultService.getRecentVideoTasks(...args);
export const deleteVideoTask = (...args) => defaultService.deleteVideoTask(...args);
