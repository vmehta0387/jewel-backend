-- Safe rerunnable repair for half-migrated design child tables.
-- If a table still has id VARCHAR(36), convert it to INT AUTO_INCREMENT
-- and keep the old id in legacy_uuid. Already-fixed tables are skipped.

SET FOREIGN_KEY_CHECKS = 0;

SET @table_name := 'design_metals';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_metals DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_metals MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_gemstones';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_gemstones DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_gemstones MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_labors';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_labors DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_labors MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_findings';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_findings DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_findings MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_process_stages';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_process_stages DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_process_stages MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_vendors';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_vendors DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_vendors MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_pricing_tiers';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_pricing_tiers DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_pricing_tiers MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_stl_files';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_stl_files DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_stl_files MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_history';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_history DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_history MODIFY COLUMN design_id INT(11) NOT NULL;

SET @table_name := 'design_relevant';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_relevant DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE design_relevant
  MODIFY COLUMN design_id INT(11) NOT NULL,
  MODIFY COLUMN related_design_id INT(11) NOT NULL;

SET @table_name := 'design_media_library';
SET @id_is_varchar := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'id' AND DATA_TYPE IN ('varchar', 'char'));
SET @sql := IF(@id_is_varchar > 0, 'ALTER TABLE design_media_library DROP PRIMARY KEY, CHANGE COLUMN id legacy_uuid VARCHAR(36) NULL DEFAULT NULL, ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
