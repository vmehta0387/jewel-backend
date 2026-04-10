-- iJewel 3D Embed Upgrade
-- Adds optional iJewel model ID and base name fields for embedding 3D viewers.
-- Compatible with MySQL versions that do not support `ADD COLUMN IF NOT EXISTS`.

SET @col_exists_model := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'ijewel_model_id'
);

SET @ddl_model := IF(
  @col_exists_model = 0,
  'ALTER TABLE designs ADD COLUMN ijewel_model_id VARCHAR(120) NULL AFTER image_urls',
  'SELECT 1'
);

PREPARE stmt_model FROM @ddl_model;
EXECUTE stmt_model;
DEALLOCATE PREPARE stmt_model;

SET @col_exists_base := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'ijewel_base_name'
);

SET @ddl_base := IF(
  @col_exists_base = 0,
  'ALTER TABLE designs ADD COLUMN ijewel_base_name VARCHAR(80) NULL AFTER ijewel_model_id',
  'SELECT 1'
);

PREPARE stmt_base FROM @ddl_base;
EXECUTE stmt_base;
DEALLOCATE PREPARE stmt_base;
