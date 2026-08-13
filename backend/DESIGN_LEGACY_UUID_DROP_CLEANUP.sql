-- Post-migration cleanup for old design UUID bridge columns.
-- Runtime entities use integer IDs and no longer read or write legacy_uuid.

SET @table_name := 'designs';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_designs_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `designs` DROP INDEX `ux_designs_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_designs_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `designs` DROP INDEX `idx_designs_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `designs` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_metals';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_metals_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_metals` DROP INDEX `ux_design_metals_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_metals_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_metals` DROP INDEX `idx_design_metals_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_metals` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_gemstones';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_gemstones_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_gemstones` DROP INDEX `ux_design_gemstones_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_gemstones_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_gemstones` DROP INDEX `idx_design_gemstones_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_gemstones` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_labors';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_labors_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_labors` DROP INDEX `ux_design_labors_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_labors_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_labors` DROP INDEX `idx_design_labors_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_labors` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_findings';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_findings_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_findings` DROP INDEX `ux_design_findings_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_findings_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_findings` DROP INDEX `idx_design_findings_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_findings` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_process_stages';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_process_stages_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_process_stages` DROP INDEX `ux_design_process_stages_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_process_stages_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_process_stages` DROP INDEX `idx_design_process_stages_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_process_stages` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_vendors';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_vendors_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_vendors` DROP INDEX `ux_design_vendors_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_vendors_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_vendors` DROP INDEX `idx_design_vendors_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_vendors` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_pricing_tiers';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_pricing_tiers_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_pricing_tiers` DROP INDEX `ux_design_pricing_tiers_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_pricing_tiers_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_pricing_tiers` DROP INDEX `idx_design_pricing_tiers_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_pricing_tiers` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_stl_files';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_stl_files_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_stl_files` DROP INDEX `ux_design_stl_files_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_stl_files_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_stl_files` DROP INDEX `idx_design_stl_files_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_stl_files` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_history';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_history_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_history` DROP INDEX `ux_design_history_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_history_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_history` DROP INDEX `idx_design_history_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_history` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_relevant';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_relevant_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_relevant` DROP INDEX `ux_design_relevant_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_relevant_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_relevant` DROP INDEX `idx_design_relevant_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_relevant` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @table_name := 'design_media_library';
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND COLUMN_NAME = 'legacy_uuid');
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'ux_design_media_library_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_media_library` DROP INDEX `ux_design_media_library_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @index_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table_name AND INDEX_NAME = 'idx_design_media_library_legacy_uuid');
SET @sql := IF(@column_exists > 0 AND @index_exists > 0, 'ALTER TABLE `design_media_library` DROP INDEX `idx_design_media_library_legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@column_exists > 0, 'ALTER TABLE `design_media_library` DROP COLUMN `legacy_uuid`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
