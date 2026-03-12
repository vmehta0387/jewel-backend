-- Orders Upgrade
-- Adds orders table with design-based ordering

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  company_id VARCHAR(36) NULL,
  branch_id VARCHAR(36) NULL,
  design_id VARCHAR(36) NULL,
  sales_rep_id VARCHAR(36) NULL,
  delivery_date DATE NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  short_description TEXT NULL,
  status ENUM('QUOTE','PENDING_APPROVAL','APPROVED','IN_PRODUCTION','SHIPPED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'QUOTE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_company (company_id),
  INDEX idx_orders_branch (branch_id),
  INDEX idx_orders_design (design_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_active (is_active),
  CONSTRAINT fk_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE orders
  MODIFY COLUMN status ENUM('QUOTE','PENDING_APPROVAL','APPROVED','IN_PRODUCTION','SHIPPED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'QUOTE';

SET @idx_orders_company := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_company'
);
SET @idx_orders_company_sql := IF(
  @idx_orders_company = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_company (company_id)',
  'SELECT 1'
);
PREPARE stmt_idx_orders_company FROM @idx_orders_company_sql;
EXECUTE stmt_idx_orders_company;
DEALLOCATE PREPARE stmt_idx_orders_company;

SET @idx_orders_branch := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_branch'
);
SET @idx_orders_branch_sql := IF(
  @idx_orders_branch = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_branch (branch_id)',
  'SELECT 1'
);
PREPARE stmt_idx_orders_branch FROM @idx_orders_branch_sql;
EXECUTE stmt_idx_orders_branch;
DEALLOCATE PREPARE stmt_idx_orders_branch;

SET @idx_orders_design := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_design'
);
SET @idx_orders_design_sql := IF(
  @idx_orders_design = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_design (design_id)',
  'SELECT 1'
);
PREPARE stmt_idx_orders_design FROM @idx_orders_design_sql;
EXECUTE stmt_idx_orders_design;
DEALLOCATE PREPARE stmt_idx_orders_design;

SET @idx_orders_status := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_status'
);
SET @idx_orders_status_sql := IF(
  @idx_orders_status = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_status (status)',
  'SELECT 1'
);
PREPARE stmt_idx_orders_status FROM @idx_orders_status_sql;
EXECUTE stmt_idx_orders_status;
DEALLOCATE PREPARE stmt_idx_orders_status;

SET @idx_orders_active := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_active'
);
SET @idx_orders_active_sql := IF(
  @idx_orders_active = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_active (is_active)',
  'SELECT 1'
);
PREPARE stmt_idx_orders_active FROM @idx_orders_active_sql;
EXECUTE stmt_idx_orders_active;
DEALLOCATE PREPARE stmt_idx_orders_active;

SET @fk_orders_company := (
  SELECT COUNT(1)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND constraint_name = 'fk_orders_company'
);
SET @fk_orders_company_sql := IF(
  @fk_orders_company = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_fk_orders_company FROM @fk_orders_company_sql;
EXECUTE stmt_fk_orders_company;
DEALLOCATE PREPARE stmt_fk_orders_company;

SET @fk_orders_branch := (
  SELECT COUNT(1)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND constraint_name = 'fk_orders_branch'
);
SET @fk_orders_branch_sql := IF(
  @fk_orders_branch = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_fk_orders_branch FROM @fk_orders_branch_sql;
EXECUTE stmt_fk_orders_branch;
DEALLOCATE PREPARE stmt_fk_orders_branch;

SET @fk_orders_design := (
  SELECT COUNT(1)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND constraint_name = 'fk_orders_design'
);
SET @fk_orders_design_sql := IF(
  @fk_orders_design = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_fk_orders_design FROM @fk_orders_design_sql;
EXECUTE stmt_fk_orders_design;
DEALLOCATE PREPARE stmt_fk_orders_design;

SET @fk_orders_sales_rep := (
  SELECT COUNT(1)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND constraint_name = 'fk_orders_sales_rep'
);
SET @fk_orders_sales_rep_sql := IF(
  @fk_orders_sales_rep = 0,
  'ALTER TABLE orders ADD CONSTRAINT fk_orders_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_fk_orders_sales_rep FROM @fk_orders_sales_rep_sql;
EXECUTE stmt_fk_orders_sales_rep;
DEALLOCATE PREPARE stmt_fk_orders_sales_rep;
