-- Gemstone Packet Link Upgrade
-- Adds packet_id on design_gemstones so selected stone packet can be persisted with design rows.

SET @packet_col_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'design_gemstones'
    AND column_name = 'packet_id'
);
SET @packet_col_sql := IF(
  @packet_col_exists = 0,
  'ALTER TABLE design_gemstones ADD COLUMN packet_id VARCHAR(36) NULL AFTER design_id',
  'SELECT 1'
);
PREPARE stmt FROM @packet_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @packet_idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_gemstones'
    AND index_name = 'idx_design_gems_packet'
);
SET @packet_idx_sql := IF(
  @packet_idx_exists = 0,
  'ALTER TABLE design_gemstones ADD INDEX idx_design_gems_packet (packet_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @packet_idx_sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
