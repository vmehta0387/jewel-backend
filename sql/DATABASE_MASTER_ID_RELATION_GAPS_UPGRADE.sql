-- Complete the remaining ID-based master relations.
-- Take a backup before applying this one-time upgrade.

ALTER TABLE finding_heads
  ADD COLUMN IF NOT EXISTS metal_caratage_id INT(11) NULL;

SET @has_finding_metal_caratage := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'finding_heads'
    AND COLUMN_NAME = 'metal_caratage'
);

SET @sql := IF(
  @has_finding_metal_caratage > 0,
  'UPDATE finding_heads fh
   LEFT JOIN metal_caratages mc ON mc.normalized_value = LOWER(TRIM(fh.metal_caratage))
   SET fh.metal_caratage_id = COALESCE(fh.metal_caratage_id, mc.id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE finding_heads
  ADD INDEX IF NOT EXISTS idx_finding_heads_metal_caratage_id (metal_caratage_id);

SET @sql := IF(
  @has_finding_metal_caratage > 0,
  'ALTER TABLE finding_heads DROP COLUMN metal_caratage',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS design_tags (
  id INT(11) NOT NULL AUTO_INCREMENT,
  design_id INT(11) NOT NULL,
  tag_id INT(11) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_design_tags_design_tag (design_id, tag_id),
  KEY idx_design_tags_tag_id (tag_id),
  CONSTRAINT fk_design_tags_design
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Preserve the single legacy tag while enabling multiple tags per design.
INSERT IGNORE INTO design_tags (design_id, tag_id)
SELECT id, tags_id
FROM designs
WHERE tags_id IS NOT NULL;

ALTER TABLE design_gemstones
  ADD INDEX IF NOT EXISTS idx_design_gemstones_packet_id (packet_id);

ALTER TABLE labor_rules
  ADD COLUMN IF NOT EXISTS jewelry_group_id INT(11) NULL AFTER description,
  ADD INDEX IF NOT EXISTS idx_labor_rules_jewelry_group_id (jewelry_group_id);

ALTER TABLE design_labors
  ADD COLUMN IF NOT EXISTS labor_rule_id INT(11) NULL AFTER labor_head_id,
  ADD INDEX IF NOT EXISTS idx_design_labors_labor_rule_id (labor_rule_id);

ALTER TABLE metal_price_history
  ADD COLUMN IF NOT EXISTS metal_name_id INT(11) NULL AFTER master_id,
  ADD INDEX IF NOT EXISTS idx_metal_price_history_metal_name_id (metal_name_id);

-- Recent history rows already store the numeric metal-name ID in legacy master_id.
UPDATE metal_price_history mph
JOIN metal_names mn ON CAST(mph.master_id AS UNSIGNED) = mn.id
SET mph.metal_name_id = COALESCE(mph.metal_name_id, mn.id)
WHERE mph.master_id REGEXP '^[0-9]+$';
