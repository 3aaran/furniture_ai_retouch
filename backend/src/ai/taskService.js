import path from 'path';
import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';
import { quotaCost } from '../aiService.js';
import { getAiConfig, getFeatureConfig } from './configService.js';
import { buildAiPrompt, buildPromptParts, featureNameMap } from './promptService.js';
import { normalizeTaskParams, validateTaskParams } from './taskParamService.js';
import { callImageModel } from './providerService.js';
import { urlToDiskPath, getLocalFileMeta, MIN_GENERATION_STORAGE_BYTES, assertUserStorageAvailable, applyUserStorageDelta, deleteLocalStoredFile, getUserStorageSummary } from '../services/storageService.js';
import { writeSystemLog } from '../services/loggerService.js';
import { bindImageToResourceCategory } from '../services/resourceBindingService.js';

function isSystemAdmin(user) {
  return user?.role === 'SYSTEM_ADMIN';
}

function isMerchantPower(user) {
  return ['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(user?.role);
}

function usesMerchantQuota(user) {
  return ['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(user?.role);
}

function canSeeTask(task, user) {
  if (!task || !user) return false;
  if (isSystemAdmin(user)) return true;
  if (isMerchantPower(user)) {
    return String(task.merchant_id || '') === String(user.merchant_id || '');
  }
  return String(task.user_id || '') === String(user.id || '');
}

async function settingsMap() {
  const [rows] = await pool.query(
    'SELECT setting_key, setting_value FROM app_settings'
  );
  return Object.fromEntries(
    rows.map((r) => [r.setting_key, r.setting_value])
  );
}

function resolutionMultiplier(settings, resolution) {
  const key = String(resolution || '2K').toLowerCase().replace(/\s/g, '');
  if (key === '1k') return Number(settings.resolution_multiplier_1k ?? 1);
  if (key === '4k') return Number(settings.resolution_multiplier_4k ?? 4);
  return Number(settings.resolution_multiplier_2k ?? 2);
}

function calcCost(settings, featureKey, resolution) {
  const opKeyMap = {
    remove_bg: 'cost_remove_bg',
    replace_bg: 'cost_replace_bg',
    enhance: 'cost_enhance',
    material: 'cost_material',
    multiview: 'cost_multiview',
    lineart: 'cost_lineart'
  };
  const opKey = opKeyMap[featureKey];
  const base = Number(settings[opKey] ?? quotaCost[featureKey] ?? 1);
  const multiplier = resolutionMultiplier(settings, resolution);
  return Math.max(0, Math.ceil(base * multiplier));
}

async function addEvent(conn, taskId, eventType, detail = '') {
  await conn.query(
    'INSERT INTO ai_task_events(id, task_id, event_type, event_detail) VALUES(?,?,?,?)',
    [uuid(), taskId, eventType, String(detail || '')]
  );
}

function toDiskPath(urlPath) {
  return urlToDiskPath(urlPath);
}

function toPublicUrl(urlPath = '') {
  const raw = String(urlPath || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '').replace(/\/api$/i, '');
  return base ? `${base}${raw.startsWith('/') ? raw : `/${raw}`}` : '';
}

function safeParseJson(v, fallback = []) {
  if (v && typeof v === 'object') return v;
  try {
    return JSON.parse(v || '[]');
  } catch {
    return fallback;
  }
}

async function getTaskForUser(taskId, user) {
  const [[task]] = await pool.query(
    `
    SELECT
      t.*,
      ri.url AS resultUrl,
      oi.url AS originUrl,
      oi.original_name AS originOriginalName,
      u.display_name AS userName,
      u.phone AS userPhone,
      m.company_name AS companyName,
      fc.feature_name AS featureName
    FROM ai_tasks t
    LEFT JOIN images ri ON ri.id = t.result_image_id
    LEFT JOIN images oi ON oi.id = t.origin_image_id
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN merchants m ON m.id = t.merchant_id
    LEFT JOIN ai_features fc ON fc.feature_key = t.feature_key
    WHERE t.id = ?
    `,
    [taskId]
  );

  if (!task) return null;
  if (!canSeeTask(task, user)) return null;
  return task;
}

function publicTask(task) {
  if (!task) return null;
  const taskParams = safeParseJson(task.task_params, {});
  const extraRequirements = safeParseJson(task.prompt_extra_requirements, []);
  const outputFormat = safeParseJson(task.output_format, {
    resolution: task.resolution,
    ratio: task.ratio
  });

  return {
    id: task.id,
    itemType: 'task',
    status: task.status,
    featureKey: task.feature_key,
    featureName:
      task.featureName || featureNameMap[task.feature_key] || task.feature_key,
    kind: task.feature_key,

    cost: Number(task.cost || 0),
    quotaUsed: Number(task.cost || 0),

    resolution: task.resolution,
    ratio: task.ratio,

    url: task.resultUrl || task.originUrl,
    previewUrl: task.resultUrl || task.originUrl,
    resultUrl: task.resultUrl || null,
    sourceUrl: task.originUrl || null,

    userPrompt: task.user_prompt || '',
    taskParams,
    extraRequirements,
    outputFormat,
    systemPrompt: task.system_prompt || '',
    prompt: task.final_prompt || '',

    provider: task.provider || '',
    modelName: task.model_name || '',
    apiPath: task.api_path || '',

    errorMessage: task.error_message || '',
    failureCode: task.failure_code || '',
    failureStage: task.failure_stage || '',
    statusLabel:
      task.status === 'queued' ? '排队中' :
      task.status === 'running' ? '生成中' :
      task.status === 'succeeded' ? '生成成功' :
      task.status === 'failed' ? '生成失败' : task.status,
    statusMessage:
      task.status === 'failed'
        ? (task.error_message || '生成失败，系统已记录失败原因')
        : task.status === 'running'
          ? '模型正在生成图片'
          : task.status === 'queued'
            ? '任务已提交，等待处理'
            : '任务已完成',
    refunded: !!Number(task.refunded || 0),

    createdAt: task.submitted_at,
    submittedAt: task.submitted_at,
    finishedAt: task.finished_at,

    imageId: task.result_image_id || null,
    resultImage: task.result_image_id
      ? { id: task.result_image_id, url: task.resultUrl }
      : null,

    originImage: {
      id: task.origin_image_id,
      url: task.originUrl,
      originalName: task.originOriginalName || ''
    },

    settingsJson: JSON.stringify({
      taskId: task.id,
      resolution: task.resolution,
      ratio: task.ratio,
      cost: Number(task.cost || 0),
      taskParams,
      options: taskParams.options || {},
      selectedResource: taskParams.selectedResource || null,
      extraRequirements,
      outputFormat,
      provider: task.provider || '',
      modelName: task.model_name || '',
      apiPath: task.api_path || '',
      status: task.status
    })
  };
}

/**
 * 提交 AI 任务
 */
export async function submitAiTask(payload, user) {
  const normalizedTaskParams = normalizeTaskParams(payload);
  validateTaskParams(normalizedTaskParams);
  const featureKey = normalizedTaskParams.featureKey;
  const originImageId = normalizedTaskParams.imageA.imageId;

  if (!featureKey) throw new Error('请选择生成功能');
  if (!originImageId) throw new Error('请先上传家具原图');

  const resolution = normalizedTaskParams.resolution || payload.resolution || '2K';
  const ratio = normalizedTaskParams.ratio || payload.ratio || '自适应';
  const userPrompt = String(normalizedTaskParams.userPrompt ?? payload.userPrompt ?? payload.customText ?? '').trim();

  const referenceIds = normalizedTaskParams.referenceImageIds || [];

  const aiCfg = await getAiConfig({ includeSecret: true });
  if (!aiCfg.providerConfig.enabled) {
    throw new Error('平台尚未启用 AI 大模型，请联系管理员在系统配置中开启');
  }

  const feature = await getFeatureConfig(featureKey);
  if (!feature || !Number(feature.enabled)) {
    throw new Error('该 AI 功能未启用');
  }

  const settings = await settingsMap();
  const cost = calcCost(settings, featureKey, resolution);

  const promptParts = buildPromptParts({
    featureKey,
    userPrompt,
    options: normalizedTaskParams.options || payload.options || {},
    resolution,
    ratio,
    taskParams: normalizedTaskParams
  });
  const finalPrompt = buildAiPrompt({
    featureKey,
    userPrompt,
    options: normalizedTaskParams.options || payload.options || {},
    resolution,
    ratio,
    taskParams: normalizedTaskParams
  });

  const resolvedProvider =
    feature.provider && feature.provider !== 'mock'
      ? feature.provider
      : aiCfg.providerConfig.provider;

  const resolvedModel =
    feature.model_name && feature.model_name !== '本地模拟模型'
      ? feature.model_name
      : aiCfg.providerConfig.defaultModel;

  const taskId = uuid();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[dbUser]] = await conn.query(
      'SELECT * FROM users WHERE id=? FOR UPDATE',
      [user.id]
    );
    if (!dbUser || dbUser.status !== 'ACTIVE') {
      throw new Error('账号不可用');
    }

    const [[origin]] = await conn.query(
      'SELECT * FROM images WHERE id=? AND (user_id=? OR merchant_id=?)',
      [originImageId, user.id, user.merchant_id]
    );
    if (!origin) {
      throw new Error('原图不存在或无权限使用');
    }

    await assertUserStorageAvailable(conn, user.id, MIN_GENERATION_STORAGE_BYTES, {
      label: '生成结果预留空间'
    });

    let merchant = null;
    if (user.merchant_id) {
      [[merchant]] = await conn.query(
        'SELECT * FROM merchants WHERE id=? FOR UPDATE',
        [user.merchant_id]
      );
      if (!merchant || merchant.status !== 'ACTIVE') {
        throw new Error('所属门店已被平台禁用');
      }
    }

    if (!merchant) {
      throw new Error('当前账号未绑定门店，无法提交 AI 任务');
    }
    const merchantQuotaMode = usesMerchantQuota(dbUser);
    const currentQuota = merchantQuotaMode ? Number(merchant?.quota_balance || 0) : Number(dbUser?.quota_balance || 0);
    if (currentQuota < cost) {
      throw new Error('算力余额不足');
    }
    if (merchantQuotaMode) {
      await conn.query('UPDATE merchants SET quota_balance=quota_balance-? WHERE id=?', [
        cost,
        user.merchant_id
      ]);
    } else {
      await conn.query('UPDATE users SET quota_balance=quota_balance-? WHERE id=?', [
        cost,
        user.id
      ]);
    }

    await conn.query(
      `
      INSERT INTO ai_tasks(
        id, merchant_id, user_id, feature_key, origin_image_id, reference_image_ids, task_params,
        user_prompt, prompt_extra_requirements, output_format, system_prompt, final_prompt,
        resolution, ratio,
        provider, model_name, api_path,
        cost, status
      )
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'queued')
      `,
      [
        taskId,
        user.merchant_id || null,
        user.id,
        featureKey,
        originImageId,
        JSON.stringify(referenceIds),
        JSON.stringify(normalizedTaskParams),
        userPrompt,
        JSON.stringify(promptParts.extraRequirements || []),
        JSON.stringify(promptParts.outputFormat || { resolution, ratio }),
        '',
        finalPrompt,
        resolution,
        ratio,
        resolvedProvider,
        resolvedModel,
        feature.api_path || '',
        cost
      ]
    );

    const [[featureRow]] = await conn.query('SELECT id,model_id FROM ai_features WHERE feature_key=? LIMIT 1',[featureKey]);
    if(featureRow){
      await conn.query('UPDATE ai_tasks SET feature_id=?,model_id=? WHERE id=?',[featureRow.id,featureRow.model_id,taskId]);
    }

    await conn.query(
      `INSERT INTO ai_task_prompts(
        task_id,user_prompt,system_prompt,template_prompt,final_prompt,negative_prompt,extra_requirements_json
      ) VALUES(?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        user_prompt=VALUES(user_prompt),
        system_prompt=VALUES(system_prompt),
        template_prompt=VALUES(template_prompt),
        final_prompt=VALUES(final_prompt),
        negative_prompt=VALUES(negative_prompt),
        extra_requirements_json=VALUES(extra_requirements_json)`,
      [
        taskId,
        userPrompt,
        '',
        feature.prompt_template || '',
        finalPrompt,
        feature.negative_prompt || '',
        JSON.stringify(promptParts.extraRequirements || [])
      ]
    );

    await conn.query(
      `INSERT INTO ai_task_options(
        task_id,resolution,ratio,output_count,options_json,output_format_json
      ) VALUES(?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        resolution=VALUES(resolution),
        ratio=VALUES(ratio),
        output_count=VALUES(output_count),
        options_json=VALUES(options_json),
        output_format_json=VALUES(output_format_json)`,
      [
        taskId,
        resolution,
        ratio,
        Number(normalizedTaskParams.outputCount || payload.outputCount || 1),
        JSON.stringify(normalizedTaskParams.options || payload.options || {}),
        JSON.stringify(promptParts.outputFormat || { resolution, ratio })
      ]
    );

    const taskInputs=[
      {imageId:originImageId,role:'IMAGE_A',order:0},
      normalizedTaskParams.imageB?.imageId ? {imageId:normalizedTaskParams.imageB.imageId,role:'IMAGE_B',order:0} : null,
      normalizedTaskParams.selectedResource?.imageId ? {imageId:normalizedTaskParams.selectedResource.imageId,role:'IMAGE_B',order:1} : null,
      ...(referenceIds||[]).map((imageId,index)=>({imageId,role:'IMAGE_C',order:index}))
    ].filter(x=>x?.imageId);
    for(const input of taskInputs){
      await conn.query(
        `INSERT IGNORE INTO ai_task_inputs(id,task_id,image_id,input_role,sort_order) VALUES(?,?,?,?,?)`,
        [uuid(),taskId,input.imageId,input.role,input.order]
      );
    }

    await conn.query(
      `
      INSERT INTO quota_logs(
        id, merchant_id, related_user_id, operator_user_id, amount, type, related_task_id, balance_after, remark
      )
      VALUES(?,?,?,?,?,?,?,?,?)
      `,
      [uuid(), user.merchant_id, user.id, user.id, -cost, 'AI_COST', taskId, currentQuota - cost, merchantQuotaMode ? 'AI任务提交扣费（门店共享算力）' : 'AI任务提交扣费（个人算力）']
    );

    await addEvent(conn, taskId, 'submit', '用户提交 AI 生成任务');
    await addEvent(conn, taskId, 'deduct', `已扣除 ${cost} 算力`);

    await writeSystemLog(conn, {
      module: 'ai_task',
      action: 'submit',
      message: 'AI task submitted',
      userId: user.id,
      merchantId: user.merchant_id || null,
      metadata: { taskId, featureKey, cost, resolution, ratio, finalPrompt }
    });
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // 异步执行
  setImmediate(() => {
    runAiTask(taskId).catch((e) => {
      console.error('[runAiTask] error:', e);
    });
  });

  const task = await getTaskForUser(taskId, user);

  const [[freshUser]] = await pool.query('SELECT * FROM users WHERE id=?', [user.id]);
  const [[freshMerchant]] = await pool.query('SELECT quota_balance FROM merchants WHERE id=?', [user.merchant_id]);
  const balance = usesMerchantQuota(freshUser) ? Number(freshMerchant?.quota_balance || 0) : Number(freshUser?.quota_balance || 0);

  return {
    task: publicTask(task),
    balance
  };
}

/**
 * 执行 AI 任务
 */
export async function runAiTask(taskId) {
  const [[task]] = await pool.query('SELECT * FROM ai_tasks WHERE id=?', [taskId]);
  if (!task || !['queued', 'running'].includes(task.status)) return;

  // 标记 running
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE ai_tasks SET status="running", started_at=COALESCE(started_at, NOW()) WHERE id=?',
      [taskId]
    );
    await addEvent(conn, taskId, 'start', '开始调用大模型');
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  try {
    const [[full]] = await pool.query(
      `
      SELECT
        t.*,
        img.url AS originUrl,
        img.original_name AS originName
      FROM ai_tasks t
      LEFT JOIN images img ON img.id = t.origin_image_id
      WHERE t.id = ?
      `,
      [taskId]
    );

    if (!full) {
      throw new Error('任务不存在');
    }
    if (!full.originUrl) {
      throw new Error('原图地址不存在');
    }

    const aiCfg = await getAiConfig({ includeSecret: true });
    const feature = await getFeatureConfig(full.feature_key);

    const taskParams = safeParseJson(full.task_params, {});
    const referenceIds = safeParseJson(full.reference_image_ids, []);
    let refs = [];
    if (referenceIds.length > 0) {
      const [rows] = await pool.query(
        `SELECT id, url FROM images WHERE id IN (${referenceIds.map(() => '?').join(',')})`,
        referenceIds
      );
      refs = rows || [];
    }
    const imageBPath = taskParams.selectedResource?.url || taskParams.selectedResource?.imageUrl || null;
    const referenceImagePaths = [
      imageBPath ? toDiskPath(imageBPath) : null,
      ...refs.map((r) => toDiskPath(r.url))
    ].filter(Boolean);
    const runtimePrompt = full.final_prompt || buildAiPrompt({
      featureKey: full.feature_key,
      userPrompt: full.user_prompt || '',
      options: taskParams.options || {},
      resolution: full.resolution,
      ratio: full.ratio,
      taskParams
    });

    const callStartedAt = Date.now();
    const resultUrl = await callImageModel({
      providerConfig: {
        provider: aiCfg.providerConfig.provider,
        base_url: aiCfg.providerConfig.baseUrl,
        api_key: aiCfg.providerConfig.apiKey,
        default_model: aiCfg.providerConfig.defaultModel,
        default_api_path: aiCfg.providerConfig.defaultApiPath,
        timeout_ms: aiCfg.providerConfig.timeoutMs,
        enabled: aiCfg.providerConfig.enabled
      },
      featureConfig: feature,
      featureKey: full.feature_key,
      imagePath: toDiskPath(full.originUrl),
      imageUrl: toPublicUrl(full.originUrl),
      referenceImagePaths,
      referenceImageUrls: [
        imageBPath ? toPublicUrl(imageBPath) : '',
        ...refs.map((r) => toPublicUrl(r.url))
      ].filter(Boolean),
      prompt: runtimePrompt,
      resolution: full.resolution,
      ratio: full.ratio,
      merchantId: full.merchant_id || null,
      userId: full.user_id || null
    });
    const latencyMs = Date.now() - callStartedAt;

    const imageId = uuid();
    const conn2 = await pool.getConnection();

    try {
      await conn2.beginTransaction();

      // 这里一定写 process_settings，不要写 settings_json
      const resultMeta = getLocalFileMeta(resultUrl);
      try {
        await assertUserStorageAvailable(conn2, full.user_id, resultMeta.sizeBytes, {
          label: '生成结果图片'
        });
      } catch (storageErr) {
        deleteLocalStoredFile(resultUrl);
        throw storageErr;
      }

      await conn2.query(
        `
        INSERT INTO images(
          id, merchant_id, user_id, display_name, original_name, file_name, mime_type,
          size_bytes, width, height, storage_provider, storage_key, url, source_type, status
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          imageId,
          full.merchant_id || null,
          full.user_id,
          `AI??-${imageId.slice(0,8)}`,
          resultMeta.fileName,
          resultMeta.fileName,
          resultMeta.mimeType,
          resultMeta.sizeBytes,
          resultMeta.width || null,
          resultMeta.height || null,
          resultMeta.storageProvider,
          resultMeta.storageKey,
          resultUrl,
          'AI_GENERATED',
          'ACTIVE'
        ]
      );

      await applyUserStorageDelta(conn2, full.user_id, resultMeta.sizeBytes, {
        merchantId: full.merchant_id || null,
        imageId,
        action: 'GENERATE',
        message: 'AI generation result saved'
      });

      await bindImageToResourceCategory(conn2, {
        imageId,
        merchantId: full.merchant_id || null,
        userId: full.user_id,
        createdBy: full.user_id,
        scope: full.merchant_id ? 'MERCHANT' : 'USER',
        mainName: '产品',
        subName: 'AI生成'
      });

      await conn2.query(
        `INSERT IGNORE INTO ai_task_outputs(id,task_id,image_id,output_role,sort_order) VALUES(?,?,?,?,?)`,
        [uuid(),full.id,imageId,'RESULT',0]
      );

      await conn2.query(
        `INSERT INTO image_relations(id,source_image_id,target_image_id,relation_type) VALUES(?,?,?,'GENERATED_FROM')`,
        [uuid(),full.origin_image_id,imageId]
      );

      await conn2.query(
        `INSERT INTO ai_model_call_logs(
          id,task_id,merchant_id,user_id,model_id,api_path,status,latency_ms,raw_response_json
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
        [
          uuid(),
          full.id,
          full.merchant_id || null,
          full.user_id,
          full.model_id || 'model_default',
          full.api_path || '',
          'SUCCESS',
          latencyMs,
          JSON.stringify({ imageUrl: resultUrl })
        ]
      );

      const [settingsRows] = await conn2.query(
        'SELECT setting_key, setting_value FROM app_settings'
      );
      const settings = Object.fromEntries(
        settingsRows.map((r) => [r.setting_key, r.setting_value])
      );

      await conn2.query(
        `
        INSERT INTO finance_logs(id, merchant_id, type, amount, title)
        VALUES(?,?,?,?,?)
        `,
        [
          uuid(),
          full.merchant_id || null,
          'COST',
          Number(settings.cost_per_ai_quota || 0.03) * Number(full.cost || 0),
          'AI任务处理成本'
        ]
      );

      await conn2.query(
        'UPDATE ai_tasks SET status="succeeded", result_image_id=?, finished_at=NOW() WHERE id=?',
        [imageId, full.id]
      );

      await addEvent(conn2, full.id, 'success', '任务生成成功');

      await conn2.commit();
    } catch (err) {
      await conn2.rollback();
      throw err;
    } finally {
      conn2.release();
    }
  } catch (err) {
    await markTaskFailed(taskId, err.message || 'AI任务处理失败', 'RUNTIME_ERROR', 'model_or_storage');
  }
}

/**
 * 任务失败 + 退款
 */
export async function markTaskFailed(taskId, errorMessage, failureCode = 'TASK_FAILED', failureStage = 'unknown') {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[task]] = await conn.query('SELECT * FROM ai_tasks WHERE id=? FOR UPDATE', [taskId]);
    if (!task) throw new Error('任务不存在');

    const message = String(errorMessage || '未知错误').slice(0, 2000);
    await conn.query(
      'UPDATE ai_tasks SET status="failed", error_message=?, failure_code=?, failure_stage=?, finished_at=NOW() WHERE id=?',
      [message, failureCode, failureStage, taskId]
    );
    await addEvent(conn, taskId, 'fail', message);

    if (!Number(task.refunded || 0)) {
      const [[taskUser]] = await conn.query('SELECT * FROM users WHERE id=? FOR UPDATE', [task.user_id]);
      const merchantQuotaMode = usesMerchantQuota(taskUser);
      if (merchantQuotaMode) {
        await conn.query('UPDATE merchants SET quota_balance=quota_balance+? WHERE id=?', [task.cost, task.merchant_id]);
      } else {
        await conn.query('UPDATE users SET quota_balance=quota_balance+? WHERE id=?', [task.cost, task.user_id]);
      }
      const [[balanceRow]] = merchantQuotaMode
        ? await conn.query('SELECT quota_balance AS balance FROM merchants WHERE id=?', [task.merchant_id])
        : await conn.query('SELECT quota_balance AS balance FROM users WHERE id=?', [task.user_id]);

      await conn.query(
        'INSERT INTO quota_logs(id, merchant_id, related_user_id, operator_user_id, amount, type, related_task_id, balance_after, remark) VALUES(?,?,?,?,?,?,?,?,?)',
        [uuid(), task.merchant_id || null, task.user_id, task.user_id, task.cost, 'AI_REFUND', task.id, Number(balanceRow?.balance || 0), merchantQuotaMode ? 'AI任务失败退款（门店共享算力）' : 'AI任务失败退款（个人算力）']
      );

      await conn.query('UPDATE ai_tasks SET refunded=1 WHERE id=?', [task.id]);
      await addEvent(conn, taskId, 'refund', `失败退款 ${task.cost} 算力`);
    }

    await conn.query(
      'INSERT INTO ai_model_call_logs(id,task_id,merchant_id,user_id,model_id,api_path,status,error_message) VALUES(UUID(),?,?,?,?,?,?,?)',
      [task.id, task.merchant_id || null, task.user_id, task.model_id || 'model_default', task.api_path || '', 'FAILED', message]
    );
    await writeSystemLog(conn, {
      level: 'ERROR',
      module: 'ai_task',
      action: 'failed',
      message,
      userId: task.user_id,
      merchantId: task.merchant_id || null,
      metadata: { taskId, failureCode, failureStage }
    });

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
export async function getAiTaskStatus(taskId, user) {
  const task = await getTaskForUser(taskId, user);
  if (!task) throw new Error('任务不存在');
  return publicTask(task);
}

export async function getAiTaskDetail(taskId, user) {
  const task = await getTaskForUser(taskId, user);
  if (!task) throw new Error('任务不存在');

  const t = publicTask(task);
  const [events] = await pool.query(
    'SELECT event_type eventType,event_detail eventDetail,created_at createdAt FROM ai_task_events WHERE task_id=? ORDER BY created_at ASC',
    [taskId]
  );
  const [inputImages] = await pool.query(
    `SELECT ti.input_role role,ti.sort_order sortOrder,im.id,im.url,im.original_name originalName
     FROM ai_task_inputs ti
     JOIN images im ON im.id=ti.image_id
     WHERE ti.task_id=?
     ORDER BY ti.sort_order ASC,ti.created_at ASC`,
    [taskId]
  );
  const referenceImages=(inputImages||[]).filter(x=>x.role!=='IMAGE_A');
  return {
    ...t,
    events,
    inputImages,
    referenceImages,
    sourceUrl: t.originImage?.url,
    userName: task.userName || task.userPhone || '',
    companyName: task.companyName || '',
    taskParams: t.taskParams,
    extraRequirements: t.extraRequirements,
    outputFormat: t.outputFormat,
    settingsJson: JSON.stringify({
      taskId: t.id,
      resolution: t.resolution,
      ratio: t.ratio,
      provider: t.provider,
      modelName: t.modelName,
      apiPath: t.apiPath,
      cost: t.cost,
      status: t.status,
      taskParams: t.taskParams,
      options: t.taskParams?.options || {},
      selectedResource: t.taskParams?.selectedResource || null,
      referenceImages,
      inputImages,
      extraRequirements: t.extraRequirements,
      outputFormat: t.outputFormat
    })
  };
}

export async function getRecentAiTasks(user, { pageSize = 20, keyword = '' } = {}) {
  const whereParts = [];
  const params = [];

  if (isSystemAdmin(user)) {
    // 查看全部
  } else if (isMerchantPower(user)) {
    whereParts.push('t.merchant_id = ?');
    params.push(user.merchant_id);
  } else {
    whereParts.push('t.user_id = ?');
    params.push(user.id);
  }

  if (keyword) {
    whereParts.push('(t.id LIKE ? OR t.feature_key LIKE ? OR fc.feature_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `
    SELECT
      t.*,
      ri.url AS resultUrl,
      oi.url AS originUrl,
      oi.original_name AS originOriginalName,
      fc.feature_name AS featureName,
      u.display_name AS userName,
      m.company_name AS companyName
    FROM ai_tasks t
    LEFT JOIN images ri ON ri.id = t.result_image_id
    LEFT JOIN images oi ON oi.id = t.origin_image_id
    LEFT JOIN ai_features fc ON fc.feature_key = t.feature_key
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN merchants m ON m.id = t.merchant_id
    ${whereSql}
    ORDER BY t.submitted_at DESC
    LIMIT ?
    `,
    [...params, Math.min(50, Math.max(1, Number(pageSize || 20)))]
  );

  return {
    items: rows.map(publicTask),
    page: 1,
    pageSize: Number(pageSize || 20),
    total: rows.length
  };
}


export async function deleteAiTask(taskId, user) {
  const conn = await pool.getConnection();
  let deletedFiles = [];
  let ownerUserId = user?.id || null;
  try {
    await conn.beginTransaction();
    const [[task]] = await conn.query('SELECT * FROM ai_tasks WHERE id=? FOR UPDATE', [taskId]);
    if (!task) throw new Error('任务不存在');
    if (!canSeeTask(task, user)) throw new Error('无权删除该任务');

    ownerUserId = task.user_id || ownerUserId;

    const imageIds = [];
    if (task.result_image_id) imageIds.push(task.result_image_id);

    let imageRows = [];
    if (imageIds.length) {
      const [rows] = await conn.query(
        `SELECT * FROM images WHERE id IN (${imageIds.map(() => '?').join(',')}) FOR UPDATE`,
        imageIds
      );
      imageRows = rows || [];
    }

    const totalBytes = imageRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);

    await conn.query('DELETE FROM ai_task_events WHERE task_id=?', [taskId]);
    await conn.query('DELETE FROM ai_tasks WHERE id=?', [taskId]);

    if (imageRows.length) {
      await conn.query(
        `DELETE FROM images WHERE id IN (${imageRows.map(() => '?').join(',')})`,
        imageRows.map((row) => row.id)
      );
      if (totalBytes > 0 && task.user_id) {
        await applyUserStorageDelta(conn, task.user_id, -totalBytes, {
          merchantId: task.merchant_id,
          action: 'DELETE_TASK_RESULT',
          imageId: task.result_image_id || null,
          message: 'task result deleted'
        });
      }
      deletedFiles = imageRows.map((row) => row.url).filter(Boolean);
    }

    await conn.commit();

    for (const url of deletedFiles) {
      deleteLocalStoredFile(url);
    }

    return {
      message: '生成图片已删除',
      deletedTaskId: taskId,
      deletedImages: imageRows.length,
      freedBytes: totalBytes,
      storage: ownerUserId ? await getUserStorageSummary(pool, ownerUserId) : null
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getAdminAiTasks(req) {
  const whereParts = [];
  const params = [];

  if (req.query.status) {
    whereParts.push('t.status = ?');
    params.push(req.query.status);
  }

  if (req.query.featureKey) {
    whereParts.push('t.feature_key = ?');
    params.push(req.query.featureKey);
  }

  if (req.query.keyword) {
    whereParts.push('(t.id LIKE ? OR u.display_name LIKE ? OR m.company_name LIKE ?)');
    params.push(
      `%${req.query.keyword}%`,
      `%${req.query.keyword}%`,
      `%${req.query.keyword}%`
    );
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize || 10)));
  const offset = (page - 1) * pageSize;

  const [[countRow]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM ai_tasks t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN merchants m ON m.id = t.merchant_id
    ${whereSql}
    `,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT
      t.*,
      ri.url AS resultUrl,
      oi.url AS originUrl,
      fc.feature_name AS featureName,
      u.display_name AS userName,
      m.company_name AS companyName
    FROM ai_tasks t
    LEFT JOIN images ri ON ri.id = t.result_image_id
    LEFT JOIN images oi ON oi.id = t.origin_image_id
    LEFT JOIN ai_features fc ON fc.feature_key = t.feature_key
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN merchants m ON m.id = t.merchant_id
    ${whereSql}
    ORDER BY t.submitted_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset]
  );

  return {
    items: rows.map(publicTask),
    page,
    pageSize,
    total: Number(countRow?.total || 0)
  };
}

export default {
  submitAiTask,
  runAiTask,
  markTaskFailed,
  getAiTaskStatus,
  getAiTaskDetail,
  getRecentAiTasks,
  getAdminAiTasks
};
