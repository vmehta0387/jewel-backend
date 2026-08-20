SET @design_name_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'design_name'
);

SET @design_name_alter_sql := IF(
  @design_name_column_exists = 0,
  'ALTER TABLE designs ADD COLUMN design_name VARCHAR(255) NULL AFTER design_no',
  'SELECT 1'
);

PREPARE design_name_stmt FROM @design_name_alter_sql;
EXECUTE design_name_stmt;
DEALLOCATE PREPARE design_name_stmt;

UPDATE designs
SET design_name = NULLIF(TRIM(CONCAT(COALESCE(jewelry_group, ''), ' ', COALESCE(design_no, ''))), '')
WHERE design_name IS NULL OR TRIM(design_name) = '';
