-- 中文说明：为 AUTO_INIT_DB=false 的生产数据库幂等增加参考生视频任务结构。

DELIMITER //

DROP PROCEDURE IF EXISTS add_column_if_missing//
CREATE PROCEDURE add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS add_index_if_missing//
CREATE PROCEDURE add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL add_column_if_missing('ai_tasks', 'media_type', 'VARCHAR(20) NOT NULL DEFAULT ''image'' AFTER `feature_key`');
CALL add_column_if_missing('ai_tasks', 'provider_task_id', 'VARCHAR(160) NULL AFTER `result_image_id`');
CALL add_column_if_missing('ai_tasks', 'provider_status', 'VARCHAR(50) NULL AFTER `provider_task_id`');
CALL add_column_if_missing('ai_tasks', 'provider_progress', 'INT NOT NULL DEFAULT 0 AFTER `provider_status`');
CALL add_column_if_missing('ai_tasks', 'next_poll_at', 'DATETIME NULL AFTER `provider_progress`');
CALL add_column_if_missing('ai_tasks', 'last_polled_at', 'DATETIME NULL AFTER `next_poll_at`');
CALL add_column_if_missing('ai_tasks', 'poll_count', 'INT NOT NULL DEFAULT 0 AFTER `last_polled_at`');
CALL add_column_if_missing('ai_tasks', 'client_request_id', 'VARCHAR(120) NULL AFTER `poll_count`');
CALL add_column_if_missing('ai_tasks', 'duration_seconds', 'INT NULL AFTER `client_request_id`');
CALL add_column_if_missing('ai_tasks', 'result_video_id', 'VARCHAR(36) NULL AFTER `result_image_id`');

CALL add_index_if_missing('ai_tasks', 'idx_ai_tasks_video_poll', 'INDEX `idx_ai_tasks_video_poll` (`media_type`,`status`,`next_poll_at`)');
CALL add_index_if_missing('ai_tasks', 'uniq_ai_tasks_user_client_request', 'UNIQUE INDEX `uniq_ai_tasks_user_client_request` (`user_id`,`client_request_id`)');
CALL add_index_if_missing('ai_tasks', 'uniq_ai_tasks_provider_task', 'UNIQUE INDEX `uniq_ai_tasks_provider_task` (`provider`,`provider_task_id`)');

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(36) PRIMARY KEY,
  merchant_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(36) NULL,
  original_name VARCHAR(255) NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_provider VARCHAR(30) NOT NULL DEFAULT 'local',
  storage_key VARCHAR(700) NOT NULL,
  url VARCHAR(800) NOT NULL,
  mime_type VARCHAR(80) NOT NULL DEFAULT 'video/mp4',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INT NULL,
  height INT NULL,
  duration_seconds INT NULL,
  codec VARCHAR(80) NULL,
  poster_url VARCHAR(800) NULL,
  poster_storage_key VARCHAR(700) NULL,
  status ENUM('ACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_videos_merchant(merchant_id),
  INDEX idx_videos_user(user_id),
  INDEX idx_videos_task(task_id),
  INDEX idx_videos_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_task_video_outputs (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  video_id VARCHAR(36) NOT NULL,
  output_role VARCHAR(60) NOT NULL DEFAULT 'RESULT',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_video_output_task(task_id),
  INDEX idx_video_output_video(video_id),
  UNIQUE KEY uniq_task_video_output(task_id,video_id,output_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_column_if_missing;
