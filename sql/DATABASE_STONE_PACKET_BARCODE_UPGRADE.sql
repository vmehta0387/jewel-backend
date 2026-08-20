SET @db_name = DATABASE();

SET @add_barcode_column = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'stone_packets'
        AND COLUMN_NAME = 'barcode'
    ),
    'SELECT 1',
    'ALTER TABLE stone_packets ADD COLUMN barcode VARCHAR(32) NULL AFTER id'
  )
);
PREPARE stmt FROM @add_barcode_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @rownum := 0;
UPDATE stone_packets
SET barcode = CONCAT('1', LPAD((@rownum := @rownum + 1), 11, '0'))
WHERE barcode IS NULL OR TRIM(barcode) = '';

SET @create_barcode_index = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'stone_packets'
        AND INDEX_NAME = 'ux_stone_packets_barcode'
    ),
    'SELECT 1',
    'ALTER TABLE stone_packets ADD UNIQUE INDEX ux_stone_packets_barcode (barcode)'
  )
);
PREPARE stmt FROM @create_barcode_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
