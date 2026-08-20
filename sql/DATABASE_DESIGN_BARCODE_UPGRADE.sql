SET @design_barcode_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND COLUMN_NAME = 'barcode'
);

SET @design_barcode_alter_sql := IF(
  @design_barcode_column_exists = 0,
  'ALTER TABLE designs ADD COLUMN barcode VARCHAR(7) NULL AFTER design_no',
  'SELECT 1'
);

PREPARE design_barcode_stmt FROM @design_barcode_alter_sql;
EXECUTE design_barcode_stmt;
DEALLOCATE PREPARE design_barcode_stmt;

UPDATE designs d
JOIN (
  SELECT
    id,
    CONCAT(
      CHAR(65 + FLOOR((rn - 1) / 6760000) % 26),
      CHAR(65 + FLOOR((rn - 1) / 260000) % 26),
      CHAR(65 + FLOOR((rn - 1) / 10000) % 26),
      LPAD((rn - 1) % 10000, 4, '0')
    ) AS generated_barcode
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
    FROM designs
  ) numbered_designs
) g
  ON g.id = d.id
SET d.barcode = g.generated_barcode;

ALTER TABLE designs MODIFY COLUMN barcode VARCHAR(7) NULL;

SET @design_barcode_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'designs'
    AND INDEX_NAME = 'ux_designs_barcode'
);

SET @design_barcode_index_sql := IF(
  @design_barcode_index_exists = 0,
  'ALTER TABLE designs ADD UNIQUE INDEX ux_designs_barcode (barcode)',
  'SELECT 1'
);

PREPARE design_barcode_index_stmt FROM @design_barcode_index_sql;
EXECUTE design_barcode_index_stmt;
DEALLOCATE PREPARE design_barcode_index_stmt;
