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

INSERT INTO permission_modules (`key`, label, description, icon, sort_order, is_active)
VALUES ('spiff', 'SPIFF Rewards', 'SPIFF summary, claims, reviews, and rewards access.', 'bi-stars', 70, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  description = VALUES(description),
  icon = VALUES(icon),
  is_active = VALUES(is_active);

INSERT INTO permission_actions (`key`, module_key, label, description, action_group, platform, legacy_permission, supports_scope, `sensitive`, sort_order, is_active)
VALUES
  ('order.require_approval', 'order', 'Auto approval', 'If enabled, orders created by this user are approved automatically. If disabled, orders require manual approval.', 'Approvals', 'both', 'ORDER_ENTRIES', 1, 0, 70, 1),
  ('mobile.order.status_update', 'order', 'Update status', 'Change order status from mobile.', 'Approvals', 'mobile', 'ORDER_APPROVALS', 1, 0, 140, 1),
  ('spiff.view', 'spiff', 'View SPIFF', 'Open SPIFF rewards screens.', 'SPIFF Access', 'both', 'ORDER_ENTRIES', 1, 0, 10, 1),
  ('spiff.claim.create', 'spiff', 'Submit claim', 'Create SPIFF redemption claims.', 'Claims', 'both', 'ORDER_ENTRIES', 1, 0, 20, 1),
  ('spiff.claim.review', 'spiff', 'Review claim', 'Approve, hold, or reject SPIFF claims.', 'Claims', 'both', 'ORDER_APPROVALS', 1, 1, 30, 1)
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

CREATE TABLE IF NOT EXISTS role_permission_defaults (
  id INT(11) NOT NULL AUTO_INCREMENT,
  role ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'SALES_REP', 'INTERNAL_REP') NOT NULL,
  name VARCHAR(160) NOT NULL DEFAULT 'Default',
  task_permissions JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_permission_defaults_role (role),
  KEY idx_role_permission_defaults_active (is_active)
);

CREATE TABLE IF NOT EXISTS role_default_permission_actions (
  id INT(11) NOT NULL AUTO_INCREMENT,
  default_id INT(11) NOT NULL,
  action_key VARCHAR(160) NOT NULL,
  data_scope ENUM('OWN', 'BRANCH', 'COMPANY') NOT NULL DEFAULT 'OWN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_default_permission_action (default_id, action_key),
  KEY idx_role_default_permission_actions_default (default_id),
  KEY idx_role_default_permission_actions_action (action_key),
  CONSTRAINT fk_role_default_permission_actions_default
    FOREIGN KEY (default_id) REFERENCES role_permission_defaults (id)
    ON DELETE CASCADE
);

-- Restore the required SPIFF actions without replacing any existing user or role permissions.
INSERT IGNORE INTO role_permission_defaults (role, name, task_permissions, is_active)
VALUES
  ('SALES_REP', 'Default', JSON_ARRAY('DESIGN_ENTRIES', 'ORDER_ENTRIES', 'VIEW_REPORTS'), 1),
  ('BRANCH_MANAGER', 'Default', JSON_ARRAY('DESIGN_ENTRIES', 'ORDER_ENTRIES', 'ORDER_APPROVALS', 'VIEW_REPORTS'), 1);

INSERT IGNORE INTO role_default_permission_actions (default_id, action_key, data_scope)
SELECT role_defaults.id, required_permissions.action_key, required_permissions.data_scope
FROM role_permission_defaults role_defaults
JOIN (
  SELECT 'SALES_REP' AS role, 'spiff.view' AS action_key, 'OWN' AS data_scope
  UNION ALL SELECT 'SALES_REP', 'spiff.claim.create', 'OWN'
  UNION ALL SELECT 'SALES_REP', 'spiff.claim.review', 'OWN'
  UNION ALL SELECT 'BRANCH_MANAGER', 'spiff.view', 'BRANCH'
  UNION ALL SELECT 'BRANCH_MANAGER', 'spiff.claim.create', 'BRANCH'
  UNION ALL SELECT 'BRANCH_MANAGER', 'spiff.claim.review', 'BRANCH'
) required_permissions ON required_permissions.role = role_defaults.role
WHERE role_defaults.is_active = 1;

INSERT IGNORE INTO user_permission_actions (user_id, action_key, data_scope)
SELECT users.id, required_permissions.action_key, required_permissions.data_scope
FROM users
JOIN (
  SELECT 'SALES_REP' AS role, 'spiff.view' AS action_key, 'OWN' AS data_scope
  UNION ALL SELECT 'SALES_REP', 'spiff.claim.create', 'OWN'
  UNION ALL SELECT 'SALES_REP', 'spiff.claim.review', 'OWN'
  UNION ALL SELECT 'BRANCH_MANAGER', 'spiff.view', 'BRANCH'
  UNION ALL SELECT 'BRANCH_MANAGER', 'spiff.claim.create', 'BRANCH'
  UNION ALL SELECT 'BRANCH_MANAGER', 'spiff.claim.review', 'BRANCH'
) required_permissions ON required_permissions.role = users.role;
