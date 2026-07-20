SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_media_library'
    AND COLUMN_NAME = 'status'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE design_media_library ADD COLUMN status INT NOT NULL DEFAULT 1',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE design_media_library
SET status = 1
WHERE status IS NULL;
