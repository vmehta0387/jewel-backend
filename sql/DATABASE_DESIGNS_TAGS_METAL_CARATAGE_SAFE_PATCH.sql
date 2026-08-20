-- Safe incremental patch for designs.tags_id and designs.metal_caratage_id.
-- This version checks whether old columns exist before referencing them.

ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS tags_id INT(11) NULL AFTER design_status_id,
  ADD COLUMN IF NOT EXISTS metal_caratage_id INT(11) NULL AFTER tags_id;

SET @has_design_tags_column := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'tags'
);

SET @sql := IF(
  @has_design_tags_column > 0,
  'UPDATE designs row
   LEFT JOIN tags tags_master
     ON tags_master.normalized_value = LOWER(TRIM(
       CASE
         WHEN row.tags IS NULL THEN NULL
         WHEN JSON_VALID(row.tags) THEN JSON_UNQUOTE(JSON_EXTRACT(row.tags, ''$[0]''))
         ELSE row.tags
       END
     ))
   SET row.tags_id = COALESCE(row.tags_id, tags_master.id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_design_gold_colour_column := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'gold_colour'
);

SET @sql := IF(
  @has_design_gold_colour_column > 0,
  'UPDATE designs row
   LEFT JOIN metal_caratages metal_caratage_master
     ON metal_caratage_master.normalized_value = LOWER(TRIM(row.gold_colour))
   SET row.metal_caratage_id = COALESCE(row.metal_caratage_id, metal_caratage_master.id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE designs
  ADD INDEX IF NOT EXISTS idx_designs_tags_id (tags_id),
  ADD INDEX IF NOT EXISTS idx_designs_metal_caratage_id (metal_caratage_id);

ALTER TABLE designs
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS gold_colour;
