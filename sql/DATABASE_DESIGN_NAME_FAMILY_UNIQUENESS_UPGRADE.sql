-- A Design Name identifies a design family. Versions inside that family may
-- share the name, while primary designs (the family identities) remain unique.

SET @old_design_name_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND INDEX_NAME = 'uq_designs_design_name'
);

SET @drop_old_design_name_index_sql := IF(
  @old_design_name_index_exists > 0,
  'ALTER TABLE designs DROP INDEX uq_designs_design_name',
  'SELECT 1'
);

PREPARE drop_old_design_name_index_stmt FROM @drop_old_design_name_index_sql;
EXECUTE drop_old_design_name_index_stmt;
DEALLOCATE PREPARE drop_old_design_name_index_stmt;

SET @design_name_unique_key_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'design_name_unique_key'
);

SET @add_design_name_unique_key_sql := IF(
  @design_name_unique_key_exists = 0,
  'ALTER TABLE designs ADD COLUMN design_name_unique_key VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN is_primary = 1 AND design_name IS NOT NULL AND TRIM(design_name) <> '''' THEN LOWER(TRIM(design_name)) ELSE NULL END) STORED',
  'SELECT 1'
);

PREPARE add_design_name_unique_key_stmt FROM @add_design_name_unique_key_sql;
EXECUTE add_design_name_unique_key_stmt;
DEALLOCATE PREPARE add_design_name_unique_key_stmt;

SET @family_design_name_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND INDEX_NAME = 'uq_designs_primary_design_name'
);

SET @add_family_design_name_index_sql := IF(
  @family_design_name_index_exists = 0,
  'ALTER TABLE designs ADD UNIQUE INDEX uq_designs_primary_design_name (design_name_unique_key)',
  'SELECT 1'
);

PREPARE add_family_design_name_index_stmt FROM @add_family_design_name_index_sql;
EXECUTE add_family_design_name_index_stmt;
DEALLOCATE PREPARE add_family_design_name_index_stmt;
