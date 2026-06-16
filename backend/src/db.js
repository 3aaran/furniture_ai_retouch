import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const DEFAULT_USER_STORAGE_LIMIT_BYTES = Number(process.env.USER_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024 * 1024);

export const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'furniture_ai_retouch',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  multipleStatements: false
};

export const pool = mysql.createPool(cfg);

async function createDatabaseIfNeeded(){
  const boot = await mysql.createConnection({host:cfg.host, port:cfg.port, user:cfg.user, password:cfg.password});
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await boot.end();
}

function envFlag(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

async function ensureColumn(table, column, definition, afterColumn = '') {
  const [rows] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [table, column]
  );
  if (!rows.length) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}${afterColumn ? ` AFTER ${afterColumn}` : ''}`);
  }
}

export async function initDb(){
  // AUTO_INIT_DB=false 用于线上跳过自动初始化。
  if (!envFlag('AUTO_INIT_DB', true)) {
    console.log('[db] AUTO_INIT_DB=false，跳过自动数据库初始化');
    return;
  }

  await createDatabaseIfNeeded();

  // RESET_LEGACY_TABLES 仅用于本地重构迁移，生产环境不要开启。
  if (envFlag('RESET_LEGACY_TABLES', false)) {
    for (const legacyTable of ['resources','resource_categories','ai_logs','image_task_details','ai_provider_config','ai_feature_config','scene_templates','storage_logs','ai_model_configs','merchant_resources','system_resources']) {
      await pool.query(`DROP TABLE IF EXISTS ${legacyTable}`);
    }
  }


  await pool.query(`CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(160) NOT NULL,
    contact_name VARCHAR(80) NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    merchant_code VARCHAR(6) UNIQUE NULL,
    invite_code VARCHAR(80) NULL,
    note TEXT NULL,
    quota_balance INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','DISABLED','DELETED') NOT NULL DEFAULT 'ACTIVE',
    approved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NULL,
    phone VARCHAR(20) UNIQUE NULL,
    username VARCHAR(80) UNIQUE NULL,
    display_name VARCHAR(80) NULL,
    avatar_url VARCHAR(500) NULL,
    company_name VARCHAR(160) NULL,
    password_hash VARCHAR(255) NULL,
    role ENUM('SYSTEM_ADMIN','MERCHANT_OWNER','MERCHANT_ADMIN','STAFF','TRIAL') NOT NULL,
    quota_balance INT NOT NULL DEFAULT 0,
    storage_limit_bytes BIGINT NOT NULL DEFAULT ${DEFAULT_USER_STORAGE_LIMIT_BYTES},
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','DISABLED','DELETED') NOT NULL DEFAULT 'ACTIVE',
    deleted_at DATETIME NULL,
    trial_expire_at DATETIME NULL,
    pre_merchant_disable_status VARCHAR(20) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_merchant(merchant_id),
    INDEX idx_phone(phone),
    CONSTRAINT fk_users_merchant FOREIGN KEY(merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  await ensureColumn('users', 'avatar_url', 'VARCHAR(500) NULL', 'display_name');
  await ensureColumn('users', 'storage_limit_bytes', `BIGINT NOT NULL DEFAULT ${DEFAULT_USER_STORAGE_LIMIT_BYTES}`, 'quota_balance');
  await ensureColumn('users', 'storage_used_bytes', 'BIGINT NOT NULL DEFAULT 0', 'storage_limit_bytes');
  await pool.query(`CREATE TABLE IF NOT EXISTS merchant_applications (
    id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(160) NOT NULL,
    contact_name VARCHAR(80) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    invite_code VARCHAR(80) NULL,
    note TEXT NULL,
    status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    reject_reason TEXT NULL,
    reviewer_id VARCHAR(36) NULL,
    reviewed_at DATETIME NULL,
    merchant_id VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status(status),
    INDEX idx_phone(phone)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS sms_codes (
    id VARCHAR(36) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    scene VARCHAR(40) NOT NULL DEFAULT 'LOGIN',
    ip VARCHAR(64) NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME NULL,
    INDEX idx_sms_phone_scene_created(phone, scene, created_at),
    INDEX idx_sms_ip_created(ip, created_at),
    INDEX idx_sms_expires(expires_at),
    INDEX idx_sms_used(used)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_by VARCHAR(36) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    audience ENUM('ALL','MERCHANT','ADMIN') NOT NULL DEFAULT 'ALL',
    valid_until DATETIME NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audience(audience)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  await ensureColumn('announcements', 'valid_until', 'DATETIME NULL', 'audience');

  await pool.query(`CREATE TABLE IF NOT EXISTS announcement_reads (
    announcement_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(announcement_id,user_id),
    INDEX idx_notice_read_user(user_id),
    CONSTRAINT fk_notice_read_announcement FOREIGN KEY(announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    CONSTRAINT fk_notice_read_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS finance_logs (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NULL,
    type ENUM('INCOME','COST') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    title VARCHAR(160) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created(created_at),
    INDEX idx_type(type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS images (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    display_name VARCHAR(120) NULL,
    original_name VARCHAR(255) NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(80) NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    width INT NULL,
    height INT NULL,
    storage_provider VARCHAR(30) NOT NULL DEFAULT 'local',
    storage_key VARCHAR(700) NOT NULL,
    url VARCHAR(800) NOT NULL,
    thumb_url VARCHAR(800) NULL,
    thumb_storage_key VARCHAR(700) NULL,
    source_type ENUM('UPLOAD','AI_GENERATED','WATERMARK','PROCESS_RESULT','RESOURCE','PHOTO','OTHER') NOT NULL DEFAULT 'UPLOAD',
    resource_scope ENUM('SYSTEM','MERCHANT','USER') NULL,
    status ENUM('ACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE',
    deleted_at DATETIME NULL,
    trial_expire_at DATETIME NULL,
    pre_merchant_disable_status VARCHAR(20) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_images_merchant(merchant_id),
    INDEX idx_images_user(user_id),
    INDEX idx_images_source_type(source_type),
    INDEX idx_images_created(created_at),
    CONSTRAINT fk_images_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_images_merchant FOREIGN KEY(merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`UPDATE users u SET storage_used_bytes=(SELECT IFNULL(SUM(i.size_bytes),0) FROM images i WHERE i.user_id=u.id AND i.deleted_at IS NULL)`);


  await pool.query(`CREATE TABLE IF NOT EXISTS quota_logs (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL,
    operator_user_id VARCHAR(36) NULL,
    related_user_id VARCHAR(36) NULL,
    amount INT NOT NULL,
    type ENUM('RECHARGE','AI_COST','AI_REFUND','ACCOUNT_DELETE_RECYCLE','MANUAL_ADJUST','REDEEM') NOT NULL,
    related_task_id VARCHAR(36) NULL,
    related_order_id VARCHAR(36) NULL,
    balance_after INT NOT NULL DEFAULT 0,
    remark VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_merchant(merchant_id),
    INDEX idx_created(created_at),
    INDEX idx_related_task(related_task_id),
    INDEX idx_related_order(related_order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);


  await pool.query(`CREATE TABLE IF NOT EXISTS system_logs (
    id VARCHAR(36) PRIMARY KEY,
    level ENUM('DEBUG','INFO','WARN','ERROR') NOT NULL DEFAULT 'INFO',
    module VARCHAR(80) NOT NULL,
    action VARCHAR(120) NULL,
    message TEXT NULL,
    user_id VARCHAR(36) NULL,
    merchant_id VARCHAR(36) NULL,
    request_id VARCHAR(80) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_system_logs_level(level),
    INDEX idx_system_logs_module(module),
    INDEX idx_system_logs_created(created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);


  await pool.query(`CREATE TABLE IF NOT EXISTS recharge_orders (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    quota INT NOT NULL,
    status ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PAID',
    remark VARCHAR(255) NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_merchant(merchant_id),
    INDEX idx_status(status),
    INDEX idx_created(created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS watermarks (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    name VARCHAR(100) NOT NULL,
    config JSON NOT NULL,
    config_json JSON NULL,
    status ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user(user_id),
    INDEX idx_merchant(merchant_id),
    CONSTRAINT fk_watermarks_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  await ensureColumn('images', 'file_name', 'VARCHAR(255) NULL', 'original_name');
  await ensureColumn('images', 'mime_type', 'VARCHAR(80) NULL', 'file_name');
  await ensureColumn('images', 'size_bytes', 'BIGINT NOT NULL DEFAULT 0', 'mime_type');
  await ensureColumn('images', 'width', 'INT NULL', 'size_bytes');
  await ensureColumn('images', 'height', 'INT NULL', 'width');
  await ensureColumn('images', 'storage_provider', "VARCHAR(30) NOT NULL DEFAULT 'local'", 'height');
  await ensureColumn('images', 'storage_key', "VARCHAR(700) NOT NULL DEFAULT ''", 'storage_provider');
  await ensureColumn('images', 'thumb_url', 'VARCHAR(800) NULL', 'url');
  await ensureColumn('images', 'thumb_storage_key', 'VARCHAR(700) NULL', 'thumb_url');
  await ensureColumn('images', 'resource_scope', "ENUM('SYSTEM','MERCHANT','USER') NULL", 'source_type');
  await pool.query(`
    UPDATE images i
    LEFT JOIN image_category_bindings icb ON icb.image_id=i.id
    SET i.resource_scope=CASE
      WHEN i.source_type='RESOURCE' AND i.merchant_id IS NULL THEN 'SYSTEM'
      WHEN i.source_type='RESOURCE' AND i.merchant_id IS NOT NULL THEN 'MERCHANT'
      WHEN i.source_type='RESOURCE' THEN 'USER'
      ELSE i.resource_scope
    END
    WHERE i.resource_scope IS NULL AND i.source_type='RESOURCE' AND icb.image_id IS NULL
  `);
  const [userQuotaColumns] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='quota_balance'"
  );
  if (!userQuotaColumns.length) {
    await pool.query('ALTER TABLE users ADD COLUMN quota_balance INT NOT NULL DEFAULT 0 AFTER role');
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS resource_purposes (
    id TINYINT UNSIGNED PRIMARY KEY,
    purpose_key VARCHAR(40) NOT NULL UNIQUE,
    purpose_name VARCHAR(40) NOT NULL,
    description VARCHAR(255) NULL,
    is_fixed TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','DISABLED','DELETED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`INSERT INTO resource_purposes(id,purpose_key,purpose_name,description,sort_order) VALUES
    (1,'material','材质替换','用于材质替换功能的图片资源',1),
    (2,'scene','场景融合','用于场景融合功能的图片资源',2),
    (3,'user_reference','产品参考','用于上传图、AI生成图、水印图和个人图片管理',3)
    ON DUPLICATE KEY UPDATE purpose_name=VALUES(purpose_name),description=VALUES(description),sort_order=VALUES(sort_order),status='ACTIVE'`);
  await pool.query(`CREATE TABLE IF NOT EXISTS image_main_categories (
    id VARCHAR(36) PRIMARY KEY,
    purpose_id TINYINT UNSIGNED NOT NULL,
    merchant_id VARCHAR(36) NULL,
    owner_user_id VARCHAR(36) NULL,
    scope ENUM('SYSTEM','MERCHANT','USER') NOT NULL DEFAULT 'USER',
    name VARCHAR(80) NOT NULL,
    is_fixed TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','DISABLED','DELETED') NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_main_purpose(purpose_id),
    INDEX idx_main_merchant(merchant_id),
    INDEX idx_main_owner(owner_user_id),
    INDEX idx_main_scope(scope,status),
    CONSTRAINT fk_main_purpose FOREIGN KEY (purpose_id) REFERENCES resource_purposes(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS image_sub_categories (
    id VARCHAR(36) PRIMARY KEY,
    main_category_id VARCHAR(36) NULL,
    name VARCHAR(80) NULL,
    is_main_only TINYINT(1) NOT NULL DEFAULT 0,
    is_fixed TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','DISABLED','DELETED') NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sub_main(main_category_id),
    INDEX idx_sub_status(status),
    CONSTRAINT fk_sub_main FOREIGN KEY (main_category_id) REFERENCES image_main_categories(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS image_category_bindings (
    image_id VARCHAR(36) PRIMARY KEY,
    sub_category_id VARCHAR(36) NOT NULL DEFAULT '0',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bind_sub(sub_category_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS image_relations (
    id VARCHAR(36) PRIMARY KEY,
    source_image_id VARCHAR(36) NOT NULL,
    target_image_id VARCHAR(36) NOT NULL,
    relation_type ENUM('GENERATED_FROM','WATERMARK_CUT_FROM','REGENERATED_FROM','REFERENCE_OF') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rel_source(source_image_id),
    INDEX idx_rel_target(target_image_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  const fixedCategories=[
    ['main_material',1,'SYSTEM','材质',1,10,'sub_material_main'],
    ['main_soft',1,'SYSTEM','软体',1,20,'sub_soft_main'],
    ['main_product',3,'SYSTEM','产品',1,30,'sub_product_main'],
    ['main_scene_template',2,'SYSTEM','场景模板',1,40,'sub_scene_main']
  ];
  for(const [id,purposeId,scope,name,isFixed,sortOrder,subId] of fixedCategories){
    await pool.query('INSERT INTO image_main_categories(id,purpose_id,scope,name,is_fixed,sort_order,status) VALUES(?,?,?,?,?,?,"ACTIVE") ON DUPLICATE KEY UPDATE purpose_id=VALUES(purpose_id),scope=VALUES(scope),name=VALUES(name),is_fixed=VALUES(is_fixed),sort_order=VALUES(sort_order),status="ACTIVE"',[id,purposeId,scope,name,isFixed,sortOrder]);
    if(subId!=='0') await pool.query('INSERT IGNORE INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,status) VALUES(?,?,NULL,1,1,"ACTIVE")',[subId,id]);
  }
  await pool.query('UPDATE image_sub_categories SET status="DELETED" WHERE main_category_id="main_product" AND id IN ("sub_product_material","sub_product_scene","sub_product_remove_bg","sub_product_enhance","sub_product_lineart","sub_product_multiview")');

  await pool.query(`CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    merchant_id VARCHAR(36) NULL,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    contact VARCHAR(160) NULL,
    status ENUM('PENDING','PROCESSING','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    reply TEXT NULL,
    handled_by VARCHAR(36) NULL,
    handled_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status(status), INDEX idx_merchant(merchant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS redeem_codes (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    quota INT NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    target_scope ENUM('ALL','MERCHANT_OWNER','MERCHANT_USER','TRIAL') NOT NULL DEFAULT 'ALL',
    status ENUM('ACTIVE','DISABLED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    valid_until DATETIME NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status(status), INDEX idx_valid(valid_until)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS redeem_logs (
    id VARCHAR(36) PRIMARY KEY,
    code_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    merchant_id VARCHAR(36) NULL,
    quota INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user(user_id), INDEX idx_code(code_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);


  await pool.query(`CREATE TABLE IF NOT EXISTS ai_models (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(120) NOT NULL,
    base_url VARCHAR(500) NULL,
    api_path VARCHAR(255) NULL,
    api_key_encrypted TEXT NULL,
    auth_type VARCHAR(40) NOT NULL DEFAULT 'bearer',
    timeout_ms INT NOT NULL DEFAULT 120000,
    poll_interval_ms INT NOT NULL DEFAULT 2000,
    max_concurrency INT NOT NULL DEFAULT 3,
    max_retries INT NOT NULL DEFAULT 1,
    input_modes_json JSON NULL,
    output_format VARCHAR(40) NOT NULL DEFAULT 'image',
    max_prompt_chars INT NOT NULL DEFAULT 8000,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_models_provider(provider),
    INDEX idx_ai_models_enabled(enabled)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_features (
    id VARCHAR(36) PRIMARY KEY,
    feature_key VARCHAR(50) NOT NULL UNIQUE,
    feature_name VARCHAR(80) NOT NULL,
    model_id VARCHAR(36) NOT NULL,
    cost_key VARCHAR(80) NULL,
    default_cost INT NOT NULL DEFAULT 0,
    input_schema_json JSON NULL,
    output_schema_json JSON NULL,
    prompt_template TEXT NULL,
    negative_prompt TEXT NULL,
    quality_rules TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_features_model(model_id),
    CONSTRAINT fk_ai_features_model FOREIGN KEY (model_id) REFERENCES ai_models(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_tasks (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NOT NULL,
    feature_key VARCHAR(50) NOT NULL,
    feature_id VARCHAR(36) NULL,
    model_id VARCHAR(36) NULL,
    origin_image_id VARCHAR(36) NOT NULL,
    reference_image_ids JSON NULL,
    task_params JSON NULL,
    user_prompt TEXT NULL,
    prompt_extra_requirements JSON NULL,
    output_format JSON NULL,
    system_prompt TEXT NULL,
    final_prompt TEXT NULL,
    resolution VARCHAR(20) NOT NULL DEFAULT '2K',
    ratio VARCHAR(20) NULL DEFAULT '1:1',
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(120) NOT NULL,
    api_path VARCHAR(255) NULL,
    cost INT NOT NULL DEFAULT 0,
    status ENUM('queued','running','succeeded','failed') NOT NULL DEFAULT 'queued',
    result_image_id VARCHAR(36) NULL,
    error_message TEXT NULL,
    failure_code VARCHAR(80) NULL,
    failure_stage VARCHAR(80) NULL,
    refunded TINYINT(1) NOT NULL DEFAULT 0,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    INDEX idx_task_merchant(merchant_id),
    INDEX idx_task_user(user_id),
    INDEX idx_task_feature(feature_key),
    INDEX idx_task_status(status),
    INDEX idx_task_submitted(submitted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_task_inputs (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    image_id VARCHAR(36) NOT NULL,
    input_role ENUM('IMAGE_A','IMAGE_B','IMAGE_C') NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_input_task(task_id),
    INDEX idx_input_image(image_id),
    UNIQUE KEY uniq_task_input(task_id,input_role,image_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_task_outputs (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    image_id VARCHAR(36) NOT NULL,
    output_role VARCHAR(60) NOT NULL DEFAULT 'RESULT',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_output_task(task_id),
    INDEX idx_output_image(image_id),
    UNIQUE KEY uniq_task_output(task_id,image_id,output_role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_task_prompts (
    task_id VARCHAR(36) PRIMARY KEY,
    user_prompt TEXT NULL,
    system_prompt TEXT NULL,
    admin_prompt TEXT NULL,
    template_prompt TEXT NULL,
    final_prompt LONGTEXT NULL,
    negative_prompt TEXT NULL,
    extra_requirements_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_task_options (
    task_id VARCHAR(36) PRIMARY KEY,
    resolution VARCHAR(20) NOT NULL DEFAULT '2K',
    ratio VARCHAR(30) NOT NULL DEFAULT '自适应',
    output_count INT NOT NULL DEFAULT 1,
    options_json JSON NULL,
    output_format_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_model_call_logs (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NULL,
    merchant_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    model_id VARCHAR(36) NULL,
    api_path VARCHAR(255) NULL,
    status ENUM('SUCCESS','FAILED') NOT NULL,
    error_code VARCHAR(80) NULL,
    error_message TEXT NULL,
    latency_ms INT NULL,
    raw_response_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_call_task(task_id),
    INDEX idx_call_model(model_id),
    INDEX idx_call_status(status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS image_process_tasks (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NOT NULL,
    process_type ENUM('CROP','REMOVE_BACKGROUND','WATERMARK_CUTOUT','COMPRESS','FORMAT_CONVERT') NOT NULL,
    source_image_id VARCHAR(36) NOT NULL,
    result_image_id VARCHAR(36) NULL,
    process_options_json JSON NULL,
    status ENUM('queued','running','succeeded','failed') NOT NULL DEFAULT 'queued',
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL,
    INDEX idx_process_user(user_id),
    INDEX idx_process_source(source_image_id),
    INDEX idx_process_status(status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS ai_task_events (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_detail TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_event_task(task_id),
    INDEX idx_ai_event_type(event_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  const defaults = [
    ['recharge_ratio','10'],
    ['income_per_quota','0.10'],
    ['cost_per_ai_quota','0.03'],
    ['monthly_free_quota','100'],
    ['single_upload_max_mb','15'],
    ['cost_remove_bg','10'],
    ['cost_replace_bg','12'],
    ['cost_enhance','8'],
    ['cost_material','10'],
    ['cost_multiview','20'],
    ['cost_lineart','8'],
    ['cost_video_generate','30'],
    ['video_default_duration_seconds','10'],
    ['video_max_duration_seconds','30'],
    ['announcement_retention_days','30'],
    ['announcement_user_max_count','50'],
    ['resolution_multiplier_1k','1'],
    ['resolution_multiplier_2k','2'],
    ['resolution_multiplier_4k','4'],
    ['cost_resolution_1k','0'],
    ['cost_resolution_2k','0'],
    ['cost_resolution_4k','8'],
    ['invite_new_store_reward_ratio','0.10'],
    ['invite_source_store_reward_ratio','0.05'],
    ['trial_account_hours','72'],
    ['user_storage_limit_bytes',String(DEFAULT_USER_STORAGE_LIMIT_BYTES)],
    ['ai_generation_enabled','1'],
    ['notice_mail_enabled','1']
  ];
  for(const [k,v] of defaults){
    await pool.query('INSERT IGNORE INTO app_settings(setting_key,setting_value) VALUES(?,?)',[k,v]);
  }

  const [admins] = await pool.query('SELECT id FROM users WHERE username=? LIMIT 1',['admin']);
  if(admins.length===0){
    await pool.query('INSERT INTO users(id,merchant_id,phone,username,display_name,company_name,password_hash,role,status) VALUES(?,?,?,?,?,?,?,?,?)',[
      uuid(), null, null, 'admin', '系统管理员', null, await bcrypt.hash('admin123456',10), 'SYSTEM_ADMIN', 'ACTIVE'
    ]);
  }

  const [ms] = await pool.query('SELECT id FROM merchants WHERE phone=? LIMIT 1',['13800000000']);
  if(ms.length===0){
    const mid=uuid();
    await pool.query('INSERT INTO merchants(id,company_name,contact_name,phone,merchant_code,invite_code,note,quota_balance,status,approved_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())',[
      mid,'示例家具有限公司','测试商家','13800000000','100001','TEST2026','系统内置测试商家',1000,'ACTIVE'
    ]);
    await pool.query('INSERT INTO users(id,merchant_id,phone,username,display_name,company_name,password_hash,role,status) VALUES(?,?,?,?,?,?,?,?,?)',[
      uuid(), mid, '13800000000', '13800000000', '测试商家', '示例家具有限公司', await bcrypt.hash('merchant123456',10), 'MERCHANT_OWNER', 'ACTIVE'
    ]);
    await pool.query('INSERT INTO users(id,merchant_id,phone,username,display_name,company_name,password_hash,role,status) VALUES(?,?,?,?,?,?,?,?,?)',[
      uuid(), mid, '13900000000', '13900000000', '示例门店人员', '示例家具有限公司', await bcrypt.hash('staff123456',10), 'STAFF', 'ACTIVE'
    ]);
    await pool.query('INSERT INTO finance_logs(id,merchant_id,type,amount,title,created_at) VALUES(?,?,?,?,?,DATE_SUB(NOW(), INTERVAL 20 DAY)),(?,?,?,?,?,DATE_SUB(NOW(), INTERVAL 12 DAY)),(?,?,?,?,?,DATE_SUB(NOW(), INTERVAL 6 DAY))',[
      uuid(),mid,'INCOME',298,'示例商家充值', uuid(),mid,'COST',46,'AI处理成本', uuid(),mid,'INCOME',198,'示例加购额度'
    ]);
  }

  await ensureMerchantGeneratedCategories();
}

async function ensureMerchantGeneratedCategories(){
  await pool.query('UPDATE image_main_categories SET name="材质" WHERE name IN ("鏉愯川")');
  await pool.query('UPDATE image_main_categories SET name="软体" WHERE name IN ("杞綋")');
  await pool.query('UPDATE image_main_categories SET name="场景模板" WHERE name IN ("鍦烘櫙妯℃澘")');
  await pool.query('UPDATE image_sub_categories SET name="材质替换生成" WHERE name IN ("鏉愯川鏇挎崲鐢熸垚")');
  await pool.query('UPDATE image_sub_categories SET name="场景融合生成" WHERE name IN ("鍦烘櫙铻嶅悎鐢熸垚")');
  const [merchants] = await pool.query('SELECT id FROM merchants WHERE status<>"DELETED"');
  const generatedSubs=[
    ['材质替换生成',10],
    ['场景融合生成',20],
    ['背景净化生成',30],
    ['摄影增强生成',40],
    ['线稿图生成',50],
    ['多角度视图生成',60]
  ];
  for(const merchant of merchants){
    const [[existingProduct]] = await pool.query(
      'SELECT id FROM image_main_categories WHERE scope="MERCHANT" AND merchant_id=? AND name="产品" AND status<>"DELETED" LIMIT 1',
      [merchant.id]
    );
    if(existingProduct){
      await pool.query('UPDATE image_main_categories SET status="DELETED" WHERE scope="MERCHANT" AND merchant_id=? AND name IN ("浜у搧")',[merchant.id]);
    }else{
      await pool.query('UPDATE image_main_categories SET name="产品" WHERE scope="MERCHANT" AND merchant_id=? AND name IN ("浜у搧")',[merchant.id]);
    }
    let [[main]] = await pool.query(
      'SELECT id FROM image_main_categories WHERE scope="MERCHANT" AND merchant_id=? AND name="产品" AND status<>"DELETED" LIMIT 1',
      [merchant.id]
    );
    if(!main){
      const id=uuid();
      await pool.query(
        'INSERT INTO image_main_categories(id,purpose_id,merchant_id,scope,name,is_fixed,sort_order,status) VALUES(?,3,?,"MERCHANT","产品",1,10,"ACTIVE")',
        [id, merchant.id]
      );
      main={id};
    }else{
      await pool.query('UPDATE image_main_categories SET purpose_id=3,is_fixed=1,sort_order=10,status="ACTIVE" WHERE id=?',[main.id]);
    }
    const subIds = new Map();
    for(const [name,sortOrder] of generatedSubs){
      let [[sub]] = await pool.query(
        'SELECT id FROM image_sub_categories WHERE main_category_id=? AND name=? AND status<>"DELETED" LIMIT 1',
        [main.id,name]
      );
      if(!sub){
        await pool.query(
          'INSERT INTO image_sub_categories(id,main_category_id,name,is_main_only,is_fixed,sort_order,status) VALUES(?,?,?,0,1,?,"ACTIVE")',
          [uuid(),main.id,name,sortOrder]
        );
        [[sub]] = await pool.query(
          'SELECT id FROM image_sub_categories WHERE main_category_id=? AND name=? AND status<>"DELETED" LIMIT 1',
          [main.id,name]
        );
      }else{
        await pool.query('UPDATE image_sub_categories SET is_fixed=1,sort_order=?,status="ACTIVE" WHERE id=?',[sortOrder,sub.id]);
      }
      if(sub?.id) subIds.set(name, sub.id);
    }
    const featureToSubName={
      material:'材质替换生成',
      replace_bg:'场景融合生成',
      remove_bg:'背景净化生成',
      enhance:'摄影增强生成',
      lineart:'线稿图生成',
      multiview:'多角度视图生成'
    };
    const [generatedImages] = await pool.query(`
      SELECT i.id,t.feature_key
      FROM images i
      LEFT JOIN ai_task_outputs ato ON ato.image_id=i.id
      LEFT JOIN ai_tasks t ON t.id=ato.task_id
      WHERE i.merchant_id=? AND i.source_type='AI_GENERATED' AND i.status<>'DELETED'
    `,[merchant.id]);
    for(const image of generatedImages){
      const subName = featureToSubName[image.feature_key] || '材质替换生成';
      const subId = subIds.get(subName);
      if(subId){
        await pool.query(
          'INSERT INTO image_category_bindings(image_id,sub_category_id) VALUES(?,?) ON DUPLICATE KEY UPDATE sub_category_id=VALUES(sub_category_id)',
          [image.id,subId]
        );
      }
    }
    await pool.query(
      'UPDATE image_sub_categories SET status="DELETED" WHERE main_category_id=? AND name IN ("AI生成","AI鐢熸垚")',
      [main.id]
    );
  }
}

export function publicUser(u){
  if(!u) return null;
  return {
    id:u.id,
    merchantId:u.merchant_id ?? u.merchantId ?? null,
    phone:u.phone,
    username:u.username || u.phone,
    displayName:u.display_name || u.displayName || u.username || u.phone,
    avatarUrl:u.avatar_url || u.avatarUrl || '',
    companyName:u.company_name || u.companyName || null,
    role:u.role,
    quota:Number(u.quota_balance ?? u.quota ?? 0),
    merchantQuota:Number(u.merchantQuota ?? 0),
    storageLimitBytes:Number(u.storage_limit_bytes ?? u.storageLimitBytes ?? DEFAULT_USER_STORAGE_LIMIT_BYTES),
    storageUsedBytes:Number(u.storage_used_bytes ?? u.storageUsedBytes ?? 0),
    storageRemainingBytes:Math.max(0, Number(u.storage_limit_bytes ?? u.storageLimitBytes ?? DEFAULT_USER_STORAGE_LIMIT_BYTES) - Number(u.storage_used_bytes ?? u.storageUsedBytes ?? 0)),
    status:u.status,
    createdAt:u.created_at || u.createdAt,
    trialExpireAt:u.trial_expire_at || u.trialExpireAt || null,
    deletedAt:u.deleted_at || u.deletedAt || null
  };
}
export function publicMerchant(m){
  if(!m) return null;
  return {
    id:m.id, companyName:m.company_name, contactName:m.contact_name, phone:m.phone,
    merchantCode:m.merchant_code, inviteCode:m.invite_code, note:m.note, quota:Number(m.quota_balance ?? 0),
    quotaBalance:Number(m.quota_balance ?? 0),
    status:m.status, approvedAt:m.approved_at, createdAt:m.created_at
  };
}
export function publicApplication(a){
  if(!a) return null;
  return {
    id:a.id, companyName:a.company_name, contactName:a.contact_name, phone:a.phone,
    inviteCode:a.invite_code, note:a.note, status:a.status, rejectReason:a.reject_reason,
    reviewedAt:a.reviewed_at, merchantId:a.merchant_id, createdAt:a.created_at
  };
}
export async function findUserByUsername(username){ const [r]=await pool.query('SELECT * FROM users WHERE (username=? OR phone=?) AND status<>\"DELETED\"',[username,username]); return r[0]; }
export async function findUserByPhone(phone){ const [r]=await pool.query('SELECT * FROM users WHERE phone=? AND status<>\"DELETED\"',[phone]); return r[0]; }
export async function findUserById(id){ const [r]=await pool.query('SELECT * FROM users WHERE id=? AND status<>\"DELETED\"',[id]); return r[0]; }

