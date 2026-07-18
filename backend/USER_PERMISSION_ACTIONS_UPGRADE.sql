CREATE TABLE IF NOT EXISTS permission_modules (
  `key` VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(80) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`),
  KEY idx_permission_modules_active_sort (is_active, sort_order)
);

CREATE TABLE IF NOT EXISTS permission_actions (
  `key` VARCHAR(160) NOT NULL,
  module_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  description TEXT NULL,
  action_group VARCHAR(120) NULL,
  platform ENUM('web', 'mobile', 'both') NOT NULL DEFAULT 'web',
  legacy_permission ENUM(
    'COMPANY_MANAGEMENT',
    'BRANCH_MANAGEMENT',
    'USER_MANAGEMENT',
    'DESIGN_ENTRIES',
    'ORDER_ENTRIES',
    'ORDER_APPROVALS',
    'PRICING_CONFIGURATION',
    'VIEW_REPORTS'
  ) NULL,
  supports_scope TINYINT(1) NOT NULL DEFAULT 1,
  `sensitive` TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`),
  KEY idx_permission_actions_module_sort (module_key, sort_order),
  KEY idx_permission_actions_active (is_active),
  CONSTRAINT fk_permission_actions_module
    FOREIGN KEY (module_key) REFERENCES permission_modules (`key`)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permission_actions (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  action_key VARCHAR(160) NOT NULL,
  data_scope ENUM('OWN', 'BRANCH', 'COMPANY') NOT NULL DEFAULT 'OWN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_permission_action (user_id, action_key),
  KEY idx_user_permission_actions_user (user_id),
  KEY idx_user_permission_actions_action (action_key)
);
