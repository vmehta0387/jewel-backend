-- User Management Module Upgrade
-- Run this on an existing database before starting the updated backend.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS task_permissions JSON NULL AFTER branch_id;

UPDATE users
SET task_permissions = '["COMPANY_MANAGEMENT","BRANCH_MANAGEMENT","USER_MANAGEMENT","DESIGN_ENTRIES","ORDER_ENTRIES","ORDER_APPROVALS","PRICING_CONFIGURATION","VIEW_REPORTS"]'
WHERE role = 'SUPER_ADMIN' AND (task_permissions IS NULL OR task_permissions = '');

UPDATE users
SET task_permissions = '["COMPANY_MANAGEMENT","VIEW_REPORTS"]'
WHERE role = 'INTERNAL_REP' AND (task_permissions IS NULL OR task_permissions = '');
