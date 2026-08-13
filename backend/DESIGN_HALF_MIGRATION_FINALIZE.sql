-- Finalize the local half-migrated design schema.
-- designs.id is already INT AUTO_INCREMENT, but family_design_id was left
-- as varchar by the interrupted migration.

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'family_design_id_int'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE designs ADD COLUMN family_design_id_int INT(11) NULL AFTER family_design_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE designs
SET family_design_id_int = CAST(family_design_id AS UNSIGNED)
WHERE family_design_id IS NOT NULL
  AND TRIM(family_design_id) <> ''
  AND family_design_id REGEXP '^[0-9]+$';

UPDATE designs
SET family_design_id_int = id
WHERE family_design_id_int IS NULL;

ALTER TABLE designs
  DROP COLUMN family_design_id,
  CHANGE COLUMN family_design_id_int family_design_id INT(11) NULL;
