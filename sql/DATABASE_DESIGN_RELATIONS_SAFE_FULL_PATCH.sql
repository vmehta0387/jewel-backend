-- Safe full patch for design relation columns.
-- Use this when backend errors like:
-- Unknown column 'design.tags_id'
-- Unknown column 'dm.metal_caratage_id'
-- Unknown column 'dg.stone_id'
--
-- This file:
-- - Adds all missing relation columns.
-- - Backfills from old text columns only if those old columns still exist.
-- - Drops old text columns only if they still exist.
-- - Does not change master tables.

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS jewelry_group_id INT(11) NULL AFTER branch_id,
  ADD COLUMN IF NOT EXISTS collection_id INT(11) NULL AFTER jewelry_group_id,
  ADD COLUMN IF NOT EXISTS jewelry_size_id INT(11) NULL AFTER collection_id,
  ADD COLUMN IF NOT EXISTS stage_id INT(11) NULL AFTER jewelry_size_id,
  ADD COLUMN IF NOT EXISTS diamond_spread_id INT(11) NULL AFTER stage_id,
  ADD COLUMN IF NOT EXISTS diamond_type_id INT(11) NULL AFTER diamond_spread_id,
  ADD COLUMN IF NOT EXISTS diamond_weight_id INT(11) NULL AFTER diamond_type_id,
  ADD COLUMN IF NOT EXISTS diamond_quality_id INT(11) NULL AFTER diamond_weight_id,
  ADD COLUMN IF NOT EXISTS design_status_id INT(11) NULL AFTER diamond_quality_id,
  ADD COLUMN IF NOT EXISTS tags_id INT(11) NULL AFTER design_status_id,
  ADD COLUMN IF NOT EXISTS metal_caratage_id INT(11) NULL AFTER tags_id;

ALTER TABLE design_metals
  ADD COLUMN IF NOT EXISTS metal_caratage_id INT(11) NULL AFTER design_id;

ALTER TABLE design_gemstones
  ADD COLUMN IF NOT EXISTS stone_id INT(11) NULL AFTER packet_id,
  ADD COLUMN IF NOT EXISTS shape_id INT(11) NULL AFTER stone_id,
  ADD COLUMN IF NOT EXISTS size_id INT(11) NULL AFTER shape_id,
  ADD COLUMN IF NOT EXISTS cut_id INT(11) NULL AFTER size_id,
  ADD COLUMN IF NOT EXISTS color_id INT(11) NULL AFTER cut_id,
  ADD COLUMN IF NOT EXISTS quality_id INT(11) NULL AFTER color_id,
  ADD COLUMN IF NOT EXISTS stone_type_id INT(11) NULL AFTER quality_id;

ALTER TABLE design_labors
  ADD COLUMN IF NOT EXISTS labor_head_id INT(11) NULL AFTER design_id;

ALTER TABLE design_findings
  ADD COLUMN IF NOT EXISTS finding_head_id INT(11) NULL AFTER design_id;

ALTER TABLE design_process_stages
  ADD COLUMN IF NOT EXISTS process_stage_id INT(11) NULL AFTER design_id;

ALTER TABLE design_vendors
  ADD COLUMN IF NOT EXISTS vendor_name_id INT(11) NULL AFTER design_id;

-- designs backfill
SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'jewelry_group');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN jewelry_groups m ON m.normalized_value = LOWER(TRIM(d.jewelry_group)) SET d.jewelry_group_id = COALESCE(d.jewelry_group_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'collection');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN collections m ON m.normalized_value = LOWER(TRIM(d.collection)) SET d.collection_id = COALESCE(d.collection_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'jewelry_size');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN jewelry_sizes m ON m.normalized_value = LOWER(TRIM(d.jewelry_size)) SET d.jewelry_size_id = COALESCE(d.jewelry_size_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'stage');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN design_stages m ON m.normalized_value = LOWER(TRIM(d.stage)) SET d.stage_id = COALESCE(d.stage_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'diamond_spread');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN diamond_spreads m ON m.normalized_value = LOWER(TRIM(d.diamond_spread)) SET d.diamond_spread_id = COALESCE(d.diamond_spread_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'diamond_type');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN diamond_types m ON m.normalized_value = LOWER(TRIM(d.diamond_type)) SET d.diamond_type_id = COALESCE(d.diamond_type_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'diamond_weight');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN diamond_weights m ON m.normalized_value = LOWER(TRIM(d.diamond_weight)) SET d.diamond_weight_id = COALESCE(d.diamond_weight_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'diamond_quality');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN diamond_qualities m ON m.normalized_value = LOWER(TRIM(d.diamond_quality)) SET d.diamond_quality_id = COALESCE(d.diamond_quality_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'design_status');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN design_statuses m ON m.normalized_value = LOWER(TRIM(d.design_status)) SET d.design_status_id = COALESCE(d.design_status_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'tags');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN tags m ON m.normalized_value = LOWER(TRIM(CASE WHEN d.tags IS NULL THEN NULL WHEN JSON_VALID(d.tags) THEN JSON_UNQUOTE(JSON_EXTRACT(d.tags, ''$[0]'')) ELSE d.tags END)) SET d.tags_id = COALESCE(d.tags_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'designs' AND COLUMN_NAME = 'gold_colour');
SET @sql := IF(@has_col > 0, 'UPDATE designs d LEFT JOIN metal_caratages m ON m.normalized_value = LOWER(TRIM(d.gold_colour)) SET d.metal_caratage_id = COALESCE(d.metal_caratage_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- child table backfill
SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_metals' AND COLUMN_NAME = 'gold_colour');
SET @sql := IF(@has_col > 0, 'UPDATE design_metals d LEFT JOIN metal_caratages m ON m.normalized_value = LOWER(TRIM(d.gold_colour)) SET d.metal_caratage_id = COALESCE(d.metal_caratage_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'stone');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN packet_stones m ON m.normalized_value = LOWER(TRIM(d.stone)) SET d.stone_id = COALESCE(d.stone_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'shape');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN packet_shapes m ON m.normalized_value = LOWER(TRIM(d.shape)) SET d.shape_id = COALESCE(d.shape_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'size');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN packet_sizes m ON m.normalized_value = LOWER(TRIM(d.size)) SET d.size_id = COALESCE(d.size_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'cut');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN packet_cuts m ON m.normalized_value = LOWER(TRIM(d.cut)) SET d.cut_id = COALESCE(d.cut_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'color');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN packet_colors m ON m.normalized_value = LOWER(TRIM(d.color)) SET d.color_id = COALESCE(d.color_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'quality');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN packet_qualities m ON m.normalized_value = LOWER(TRIM(d.quality)) SET d.quality_id = COALESCE(d.quality_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_gemstones' AND COLUMN_NAME = 'stone_type');
SET @sql := IF(@has_col > 0, 'UPDATE design_gemstones d LEFT JOIN diamond_types m ON m.normalized_value = LOWER(TRIM(d.stone_type)) SET d.stone_type_id = COALESCE(d.stone_type_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_labors' AND COLUMN_NAME = 'labor_head');
SET @sql := IF(@has_col > 0, 'UPDATE design_labors d LEFT JOIN labor_heads m ON m.normalized_value = LOWER(TRIM(d.labor_head)) SET d.labor_head_id = COALESCE(d.labor_head_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_findings' AND COLUMN_NAME = 'finding_head');
SET @sql := IF(@has_col > 0, 'UPDATE design_findings d LEFT JOIN finding_heads m ON m.normalized_value = LOWER(TRIM(d.finding_head)) SET d.finding_head_id = COALESCE(d.finding_head_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_process_stages' AND COLUMN_NAME = 'process_stage');
SET @sql := IF(@has_col > 0, 'UPDATE design_process_stages d LEFT JOIN design_stages m ON m.normalized_value = LOWER(TRIM(d.process_stage)) SET d.process_stage_id = COALESCE(d.process_stage_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'design_vendors' AND COLUMN_NAME = 'supplier_name');
SET @sql := IF(@has_col > 0, 'UPDATE design_vendors d LEFT JOIN vendor_names m ON m.normalized_value = LOWER(TRIM(d.supplier_name)) SET d.vendor_name_id = COALESCE(d.vendor_name_id, m.id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE designs
  ADD INDEX IF NOT EXISTS idx_designs_jewelry_group_id (jewelry_group_id),
  ADD INDEX IF NOT EXISTS idx_designs_collection_id (collection_id),
  ADD INDEX IF NOT EXISTS idx_designs_jewelry_size_id (jewelry_size_id),
  ADD INDEX IF NOT EXISTS idx_designs_stage_id (stage_id),
  ADD INDEX IF NOT EXISTS idx_designs_diamond_spread_id (diamond_spread_id),
  ADD INDEX IF NOT EXISTS idx_designs_diamond_type_id (diamond_type_id),
  ADD INDEX IF NOT EXISTS idx_designs_diamond_weight_id (diamond_weight_id),
  ADD INDEX IF NOT EXISTS idx_designs_diamond_quality_id (diamond_quality_id),
  ADD INDEX IF NOT EXISTS idx_designs_design_status_id (design_status_id),
  ADD INDEX IF NOT EXISTS idx_designs_tags_id (tags_id),
  ADD INDEX IF NOT EXISTS idx_designs_metal_caratage_id (metal_caratage_id);

ALTER TABLE design_metals ADD INDEX IF NOT EXISTS idx_design_metals_metal_caratage_id (metal_caratage_id);
ALTER TABLE design_gemstones ADD INDEX IF NOT EXISTS idx_design_gemstones_master_ids (stone_id, shape_id, size_id, cut_id, color_id, quality_id, stone_type_id);
ALTER TABLE design_labors ADD INDEX IF NOT EXISTS idx_design_labors_labor_head_id (labor_head_id);
ALTER TABLE design_findings ADD INDEX IF NOT EXISTS idx_design_findings_finding_head_id (finding_head_id);
ALTER TABLE design_process_stages ADD INDEX IF NOT EXISTS idx_design_process_stages_process_stage_id (process_stage_id);
ALTER TABLE design_vendors ADD INDEX IF NOT EXISTS idx_design_vendors_vendor_name_id (vendor_name_id);

ALTER TABLE designs
  DROP COLUMN IF EXISTS jewelry_group,
  DROP COLUMN IF EXISTS collection,
  DROP COLUMN IF EXISTS jewelry_size,
  DROP COLUMN IF EXISTS stage,
  DROP COLUMN IF EXISTS diamond_spread,
  DROP COLUMN IF EXISTS diamond_type,
  DROP COLUMN IF EXISTS diamond_weight,
  DROP COLUMN IF EXISTS diamond_quality,
  DROP COLUMN IF EXISTS design_status,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS gold_colour;

ALTER TABLE design_metals DROP COLUMN IF EXISTS gold_colour;

ALTER TABLE design_gemstones
  DROP COLUMN IF EXISTS stone,
  DROP COLUMN IF EXISTS shape,
  DROP COLUMN IF EXISTS size,
  DROP COLUMN IF EXISTS cut,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS quality,
  DROP COLUMN IF EXISTS stone_type;

ALTER TABLE design_labors DROP COLUMN IF EXISTS labor_head;
ALTER TABLE design_findings DROP COLUMN IF EXISTS finding_head;
ALTER TABLE design_process_stages DROP COLUMN IF EXISTS process_stage;
ALTER TABLE design_vendors DROP COLUMN IF EXISTS supplier_name;

SET FOREIGN_KEY_CHECKS = 1;
