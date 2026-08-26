CREATE TABLE IF NOT EXISTS design_masters (
  id VARCHAR(36) NOT NULL,
  master_type ENUM(
    'JEWELRY_GROUP',
    'COLLECTION',
    'JEWELRY_SIZE',
    'TAG',
    'DESIGN_STATUS',
    'STAGE',
    'METAL_NAME',
    'METAL_COLOR',
    'METAL_PURITY',
    'METAL_CARATAGE',
    'GOLD_COLOUR',
    'DIAMOND_TYPE',
    'DIAMOND_SPREAD',
    'DIAMOND_WEIGHT',
    'DIAMOND_QUALITY',
    'VENDOR_NAME',
    'LABOR_HEAD',
    'LABOR_RULE',
    'OVERHEAD_RULE',
    'FINDING_HEAD',
    'PACKET_STONE',
    'PACKET_SHAPE',
    'PACKET_SIZE',
    'PACKET_CUT',
    'PACKET_COLOR',
    'PACKET_QUALITY'
  ) NOT NULL,
  value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL,
  alias_name VARCHAR(255) NULL,
  normalized_alias VARCHAR(255) NULL,
  scope_key VARCHAR(64) NOT NULL DEFAULT '',
  jewelry_group_id VARCHAR(36) NULL,
  jewelry_group VARCHAR(255) NULL,
  description TEXT NULL,
  vendor_email VARCHAR(255) NULL,
  finding_no VARCHAR(100) NULL,
  metal_caratage VARCHAR(100) NULL,
  price_in ENUM('PIECES','GRAM','PAIR','INCHES') NULL,
  price_per_unit DECIMAL(12,2) NULL,
  dimensions VARCHAR(255) NULL,
  weight_per_unit DECIMAL(12,3) NULL,
  metal_name VARCHAR(120) NULL,
  metal_color VARCHAR(120) NULL,
  metal_purity VARCHAR(120) NULL,
  purity_percentage DECIMAL(8,3) NULL,
  market_price_per_ounce DECIMAL(12,2) NULL,
  market_price_per_gm DECIMAL(12,4) NULL,
  live_price_per_gm DECIMAL(12,4) NULL,
  default_wastage_percent DECIMAL(8,3) NULL,
  labor_apply_mode VARCHAR(32) NULL,
  flat_cost DECIMAL(12,2) NULL,
  rate_per_stone DECIMAL(12,2) NULL,
  rate_per_gram DECIMAL(12,2) NULL,
  rate_per_group DECIMAL(12,2) NULL,
  overhead_apply_mode VARCHAR(32) NULL,
  rate_percent DECIMAL(8,3) NULL,
  flat_amount DECIMAL(12,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY unique_master_type_value (master_type, scope_key, normalized_value),
  UNIQUE KEY unique_master_type_alias (master_type, scope_key, normalized_alias),
  UNIQUE KEY unique_master_type_finding_no (master_type, finding_no),
  KEY idx_master_type_active (master_type, is_active)
);

ALTER TABLE design_masters
  MODIFY COLUMN master_type ENUM(
    'JEWELRY_GROUP',
    'COLLECTION',
    'JEWELRY_SIZE',
    'TAG',
    'DESIGN_STATUS',
    'STAGE',
    'METAL_NAME',
    'METAL_COLOR',
    'METAL_PURITY',
    'METAL_CARATAGE',
    'GOLD_COLOUR',
    'DIAMOND_TYPE',
    'DIAMOND_SPREAD',
    'DIAMOND_WEIGHT',
    'DIAMOND_QUALITY',
    'VENDOR_NAME',
    'LABOR_HEAD',
    'LABOR_RULE',
    'OVERHEAD_RULE',
    'FINDING_HEAD',
    'PACKET_STONE',
    'PACKET_SHAPE',
    'PACKET_SIZE',
    'PACKET_CUT',
    'PACKET_COLOR',
    'PACKET_QUALITY'
  ) NOT NULL;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'jewelry_group_id'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN jewelry_group_id VARCHAR(36) NULL AFTER scope_key', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'jewelry_group'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN jewelry_group VARCHAR(255) NULL AFTER jewelry_group_id', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'vendor_email'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN vendor_email VARCHAR(255) NULL AFTER description', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'finding_no'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN finding_no VARCHAR(100) NULL AFTER vendor_email', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'metal_caratage'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN metal_caratage VARCHAR(100) NULL AFTER finding_no', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'price_in'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN price_in ENUM(''PIECES'',''GRAM'',''PAIR'',''INCHES'') NULL AFTER metal_caratage', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'price_per_unit'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN price_per_unit DECIMAL(12,2) NULL AFTER price_in', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'dimensions'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN dimensions VARCHAR(255) NULL AFTER price_per_unit', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'weight_per_unit'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN weight_per_unit DECIMAL(12,3) NULL AFTER dimensions', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'metal_name'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN metal_name VARCHAR(120) NULL AFTER weight_per_unit', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'metal_color'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN metal_color VARCHAR(120) NULL AFTER metal_name', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'metal_purity'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN metal_purity VARCHAR(120) NULL AFTER metal_color', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'purity_percentage'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN purity_percentage DECIMAL(8,3) NULL AFTER metal_purity', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'market_price_per_ounce'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN market_price_per_ounce DECIMAL(12,2) NULL AFTER purity_percentage', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'market_price_per_gm'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN market_price_per_gm DECIMAL(12,4) NULL AFTER market_price_per_ounce', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'live_price_per_gm'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN live_price_per_gm DECIMAL(12,4) NULL AFTER market_price_per_gm', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'default_wastage_percent'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN default_wastage_percent DECIMAL(8,3) NULL AFTER live_price_per_gm', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'labor_apply_mode'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN labor_apply_mode VARCHAR(32) NULL AFTER default_wastage_percent', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'flat_cost'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN flat_cost DECIMAL(12,2) NULL AFTER labor_apply_mode', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'rate_per_stone'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN rate_per_stone DECIMAL(12,2) NULL AFTER flat_cost', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'rate_per_gram'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN rate_per_gram DECIMAL(12,2) NULL AFTER rate_per_stone', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'rate_per_group'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN rate_per_group DECIMAL(12,2) NULL AFTER rate_per_gram', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'overhead_apply_mode'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN overhead_apply_mode VARCHAR(32) NULL AFTER rate_per_group', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'rate_percent'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN rate_percent DECIMAL(8,3) NULL AFTER overhead_apply_mode', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_masters'
    AND COLUMN_NAME = 'flat_amount'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE design_masters ADD COLUMN flat_amount DECIMAL(12,2) NULL AFTER rate_percent', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
