SET @design_primary_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'is_primary'
);

SET @design_primary_alter_sql := IF(
  @design_primary_column_exists = 0,
  'ALTER TABLE designs ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);

PREPARE design_primary_stmt FROM @design_primary_alter_sql;
EXECUTE design_primary_stmt;
DEALLOCATE PREPARE design_primary_stmt;

UPDATE designs d
SET d.is_primary = 1
WHERE d.is_primary = 0
  AND d.version = 'V1'
  AND NOT EXISTS (
    SELECT 1
    FROM designs p
    WHERE p.is_primary = 1
      AND (CASE
             WHEN p.design_no REGEXP '-V[0-9]+$' THEN SUBSTRING_INDEX(p.design_no, '-V', 1)
             ELSE p.design_no
           END) =
          (CASE
             WHEN d.design_no REGEXP '-V[0-9]+$' THEN SUBSTRING_INDEX(d.design_no, '-V', 1)
             ELSE d.design_no
           END)
      AND p.company_id <=> d.company_id
      AND p.branch_id <=> d.branch_id
  );
