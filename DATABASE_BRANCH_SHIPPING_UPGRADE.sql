-- Branch Shipping Upgrade
-- Adds ship-to configuration fields for branches.

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'branches'
    AND column_name = 'ship_to_type'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE branches ADD COLUMN ship_to_type ENUM(\'BRANCH_ADDRESS\', \'CUSTOM\') NOT NULL DEFAULT \'BRANCH_ADDRESS\' AFTER phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'branches'
    AND column_name = 'ship_street_address'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE branches ADD COLUMN ship_street_address VARCHAR(255) NULL AFTER ship_to_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'branches'
    AND column_name = 'ship_city'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE branches ADD COLUMN ship_city VARCHAR(120) NULL AFTER ship_street_address',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'branches'
    AND column_name = 'ship_state_province'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE branches ADD COLUMN ship_state_province VARCHAR(120) NULL AFTER ship_city',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'branches'
    AND column_name = 'ship_postal_code'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE branches ADD COLUMN ship_postal_code VARCHAR(40) NULL AFTER ship_state_province',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'branches'
    AND column_name = 'ship_country'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE branches ADD COLUMN ship_country VARCHAR(120) NULL AFTER ship_postal_code',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
