import { pool } from '../db.js';

const FEATURES = [
  ['material', '材质替换', 'cost_material', 10],
  ['replace_bg', '场景融合', 'cost_replace_bg', 20],
  ['remove_bg', '背景净化', 'cost_remove_bg', 30],
  ['enhance', '摄影增强', 'cost_enhance', 40],
  ['lineart', '线稿图', 'cost_lineart', 50],
  ['multiview', '多角度视图', 'cost_multiview', 60],
  ['video_generate', '宣传视频生成', 'cost_video_generate', 70]
];

function maskKey(key = '') {
  const v = String(key || '');
  if (!v) return '';
  if (v.length <= 8) return '****';
  return `${v.slice(0, 4)}****${v.slice(-4)}`;
}

function parseJson(v, fallback) {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || ''); } catch { return fallback; }
}

function jsonValue(v, fallback) {
  if (v === undefined || v === null || v === '') return JSON.stringify(fallback);
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export async function ensureAiConfigRows() {
  await pool.query(`
    INSERT IGNORE INTO ai_models(
      id,provider,model_name,base_url,api_path,api_key_encrypted,
      timeout_ms,poll_interval_ms,max_concurrency,max_retries,
      input_modes_json,output_format,max_prompt_chars,enabled
    ) VALUES(
      'model_default','mock','local-mock-model','','','',
      120000,2000,3,1,'[]','image',8000,1
    )
  `);

  for (const [key, name, costKey, sortOrder] of FEATURES) {
    await pool.query(
      `INSERT IGNORE INTO ai_features(
        id,feature_key,feature_name,model_id,cost_key,default_cost,
        input_schema_json,output_schema_json,prompt_template,negative_prompt,quality_rules,enabled,sort_order
      ) VALUES(?,?,?,?,?,0,'{}','{}','','','',1,?)`,
      [`feature_${key}`, key, name, 'model_default', costKey, sortOrder]
    );
  }
}

export async function getAiConfig({ includeSecret = false } = {}) {
  await ensureAiConfigRows();
  const [[model]] = await pool.query('SELECT * FROM ai_models WHERE id="model_default" LIMIT 1');
  const [features] = await pool.query(`
    SELECT f.*,m.provider,m.model_name,m.api_path
    FROM ai_features f
    LEFT JOIN ai_models m ON m.id=f.model_id
    ORDER BY f.sort_order ASC
  `);

  return {
    providerConfig: {
      provider: model?.provider || 'mock',
      baseUrl: model?.base_url || '',
      apiKey: includeSecret ? (model?.api_key_encrypted || '') : undefined,
      apiKeyMasked: maskKey(model?.api_key_encrypted || ''),
      defaultModel: model?.model_name || '',
      defaultApiPath: model?.api_path || '',
      timeoutMs: Number(model?.timeout_ms || 120000),
      pollIntervalMs: Number(model?.poll_interval_ms || 2000),
      maxConcurrency: Number(model?.max_concurrency || 3),
      maxRetries: Number(model?.max_retries || 1),
      inputModes: parseJson(model?.input_modes_json, []),
      outputFormat: model?.output_format || 'image',
      maxPromptChars: Number(model?.max_prompt_chars || 8000),
      safetyNote: '',
      enabled: !!Number(model?.enabled || 0)
    },
    features: features.map((f) => ({
      id: f.id,
      featureKey: f.feature_key,
      featureName: f.feature_name,
      modelId: f.model_id,
      provider: f.provider,
      modelName: f.model_name,
      apiPath: f.api_path || '',
      inputSchema: parseJson(f.input_schema_json, {}),
      outputSchema: parseJson(f.output_schema_json, {}),
      negativePrompt: f.negative_prompt || '',
      qualityRules: f.quality_rules || '',
      costKey: f.cost_key || '',
      defaultCost: Number(f.default_cost || 0),
      enabled: !!Number(f.enabled),
      promptTemplate: f.prompt_template || ''
    }))
  };
}

export async function saveAiConfig(data = {}) {
  await ensureAiConfigRows();
  const p = data.providerConfig || {};
  const fields = [];
  const vals = [];
  if (p.provider !== undefined) { fields.push('provider=?'); vals.push(String(p.provider || 'mock')); }
  if (p.baseUrl !== undefined) { fields.push('base_url=?'); vals.push(String(p.baseUrl || '')); }
  if (p.apiKey !== undefined && String(p.apiKey).trim()) { fields.push('api_key_encrypted=?'); vals.push(String(p.apiKey).trim()); }
  if (p.defaultModel !== undefined) { fields.push('model_name=?'); vals.push(String(p.defaultModel || '')); }
  if (p.defaultApiPath !== undefined) { fields.push('api_path=?'); vals.push(String(p.defaultApiPath || '')); }
  if (p.timeoutMs !== undefined) { fields.push('timeout_ms=?'); vals.push(Math.max(10000, Number(p.timeoutMs || 120000))); }
  if (p.pollIntervalMs !== undefined) { fields.push('poll_interval_ms=?'); vals.push(Math.max(1000, Number(p.pollIntervalMs || 2000))); }
  if (p.maxConcurrency !== undefined) { fields.push('max_concurrency=?'); vals.push(Math.max(1, Number(p.maxConcurrency || 3))); }
  if (p.maxRetries !== undefined) { fields.push('max_retries=?'); vals.push(Math.max(0, Number(p.maxRetries || 1))); }
  if (p.inputModes !== undefined) { fields.push('input_modes_json=?'); vals.push(JSON.stringify(p.inputModes || [])); }
  if (p.outputFormat !== undefined) { fields.push('output_format=?'); vals.push(String(p.outputFormat || 'image')); }
  if (p.maxPromptChars !== undefined) { fields.push('max_prompt_chars=?'); vals.push(Math.max(1000, Number(p.maxPromptChars || 8000))); }
  if (p.enabled !== undefined) { fields.push('enabled=?'); vals.push(p.enabled ? 1 : 0); }
  if (fields.length) {
    vals.push('model_default');
    await pool.query(`UPDATE ai_models SET ${fields.join(',')} WHERE id=?`, vals);
  }

  const [[defaultModel]] = await pool.query('SELECT * FROM ai_models WHERE id="model_default" LIMIT 1');

  for (const f of data.features || []) {
    if (!f.featureKey) continue;
    const provider = String(f.provider || defaultModel.provider || 'mock');
    const modelName = String(f.modelName || defaultModel.model_name || '');
    const apiPath = String(f.apiPath || '');
    const usesDefaultModel =
      provider === String(defaultModel.provider || 'mock') &&
      modelName === String(defaultModel.model_name || '') &&
      apiPath === String(defaultModel.api_path || '');
    const modelId = usesDefaultModel ? 'model_default' : `model_${f.featureKey}`;

    if (!usesDefaultModel) {
      await pool.query(
        `INSERT INTO ai_models(
          id,provider,model_name,base_url,api_path,api_key_encrypted,
          timeout_ms,poll_interval_ms,max_concurrency,max_retries,
          input_modes_json,output_format,max_prompt_chars,enabled
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          provider=VALUES(provider),
          model_name=VALUES(model_name),
          base_url=VALUES(base_url),
          api_path=VALUES(api_path),
          api_key_encrypted=VALUES(api_key_encrypted),
          timeout_ms=VALUES(timeout_ms),
          poll_interval_ms=VALUES(poll_interval_ms),
          max_concurrency=VALUES(max_concurrency),
          max_retries=VALUES(max_retries),
          input_modes_json=VALUES(input_modes_json),
          output_format=VALUES(output_format),
          max_prompt_chars=VALUES(max_prompt_chars),
          enabled=VALUES(enabled)`,
        [
          modelId,
          provider,
          modelName,
          defaultModel.base_url || '',
          apiPath,
          defaultModel.api_key_encrypted || '',
          Number(defaultModel.timeout_ms || 120000),
          Number(defaultModel.poll_interval_ms || 2000),
          Number(defaultModel.max_concurrency || 3),
          Number(defaultModel.max_retries || 1),
          jsonValue(defaultModel.input_modes_json, []),
          defaultModel.output_format || 'image',
          Number(defaultModel.max_prompt_chars || 8000),
          Number(defaultModel.enabled || 0)
        ]
      );
    }

    await pool.query(
      `UPDATE ai_features
       SET feature_name=COALESCE(?,feature_name),
           model_id=?,
           input_schema_json=?,
           output_schema_json=?,
           negative_prompt=?,
           quality_rules=?,
           cost_key=?,
           enabled=?
       WHERE feature_key=?`,
      [
        f.featureName || null,
        modelId,
        JSON.stringify(f.inputSchema || {}),
        JSON.stringify(f.outputSchema || {}),
        String(f.negativePrompt || ''),
        String(f.qualityRules || ''),
        String(f.costKey || ''),
        f.enabled ? 1 : 0,
        f.featureKey
      ]
    );
  }

  return getAiConfig({ includeSecret: false });
}

export async function getFeatureConfig(featureKey) {
  await ensureAiConfigRows();
  const [[f]] = await pool.query(`
    SELECT
      f.*,
      m.provider,
      m.model_name,
      m.api_path,
      m.base_url,
      m.api_key_encrypted,
      m.timeout_ms,
      m.poll_interval_ms
    FROM ai_features f
    LEFT JOIN ai_models m ON m.id=f.model_id
    WHERE f.feature_key=?
    LIMIT 1
  `, [featureKey]);
  if (!f) return null;
  return {
    ...f,
    feature_key: f.feature_key,
    feature_name: f.feature_name,
    provider: f.provider,
    model_name: f.model_name,
    api_path: f.api_path || '',
    negative_prompt: f.negative_prompt || '',
    quality_rules: f.quality_rules || '',
    enabled: f.enabled
  };
}
