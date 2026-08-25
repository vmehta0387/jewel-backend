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
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  action_key VARCHAR(160) NOT NULL,
  data_scope ENUM('OWN', 'BRANCH', 'COMPANY') NOT NULL DEFAULT 'OWN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_permission_action (user_id, action_key),
  KEY idx_user_permission_actions_user (user_id),
  KEY idx_user_permission_actions_action (action_key)
);
INSERT INTO permission_modules (`key`, label, description, icon, sort_order, is_active)
VALUES ('order', 'Orders', 'Order list, order detail, create/update order, status changes, and approval actions.', 'bi-receipt-cutoff', 50, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  description = VALUES(description),
  icon = VALUES(icon),
  is_active = VALUES(is_active);

INSERT INTO permission_actions (`key`, module_key, label, description, action_group, platform, legacy_permission, supports_scope, `sensitive`, sort_order, is_active)
VALUES
  ('order.require_approval', 'order', 'Auto approval', 'If enabled, orders created by this user are approved automatically. If disabled, orders require manual approval.', 'Approvals', 'both', 'ORDER_ENTRIES', 1, 0, 70, 1),
  ('mobile.order.status_update', 'order', 'Update status', 'Change order status from mobile.', 'Approvals', 'mobile', 'ORDER_APPROVALS', 1, 0, 140, 1)
ON DUPLICATE KEY UPDATE
  module_key = VALUES(module_key),
  label = VALUES(label),
  description = VALUES(description),
  action_group = VALUES(action_group),
  platform = VALUES(platform),
  legacy_permission = VALUES(legacy_permission),
  supports_scope = VALUES(supports_scope),
  `sensitive` = VALUES(`sensitive`),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
