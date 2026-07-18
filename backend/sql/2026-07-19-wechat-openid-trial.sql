-- 中文说明：允许微信 OPENID 首次登录创建无门店体验账号，并使用个人算力。

ALTER TABLE quota_logs
  MODIFY COLUMN merchant_id VARCHAR(36) NULL;

INSERT IGNORE INTO app_settings(setting_key, setting_value)
VALUES('wechat_trial_initial_quota', '50');
