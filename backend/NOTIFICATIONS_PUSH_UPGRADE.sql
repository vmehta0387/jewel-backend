CREATE TABLE IF NOT EXISTS notification_push_devices (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  platform VARCHAR(32) NULL,
  device_id VARCHAR(128) NULL,
  app_version VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_registered_at DATETIME NULL,
  last_delivered_at DATETIME NULL,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notification_push_devices_expo_push_token (expo_push_token),
  KEY idx_notification_push_devices_user_id (user_id),
  KEY idx_notification_push_devices_is_active (is_active)
);
