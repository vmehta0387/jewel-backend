-- User Management Module Upgrade
-- Run this on an existing database before starting the updated backend.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS task_permissions JSON NULL AFTER branch_id;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS street_address_2 VARCHAR(255) NULL AFTER street_address;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS street_address_2 VARCHAR(255) NULL AFTER street_address;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS branch_manager_id VARCHAR(36) NULL AFTER phone;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS enable_slab_pricing BOOLEAN DEFAULT FALSE AFTER branch_multiplier;

CREATE TABLE IF NOT EXISTS branch_pricing_slabs (
  id VARCHAR(36) PRIMARY KEY,
  branch_id VARCHAR(36) NOT NULL,
  min_cost DECIMAL(10,2) NOT NULL,
  max_cost DECIMAL(10,2) NOT NULL,
  multiplier DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id),
  INDEX idx_cost_range (min_cost, max_cost),
  CONSTRAINT fk_branch_slab_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

UPDATE users
SET task_permissions = '["COMPANY_MANAGEMENT","BRANCH_MANAGEMENT","USER_MANAGEMENT","DESIGN_ENTRIES","ORDER_ENTRIES","ORDER_APPROVALS","PRICING_CONFIGURATION","VIEW_REPORTS"]'
WHERE role = 'SUPER_ADMIN' AND (task_permissions IS NULL OR task_permissions = '');

UPDATE users
SET task_permissions = '["COMPANY_MANAGEMENT","VIEW_REPORTS"]'
WHERE role = 'INTERNAL_REP' AND (task_permissions IS NULL OR task_permissions = '');
