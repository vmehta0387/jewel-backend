-- Jewelry Size <> Jewelry Group relation upgrade (compat version)
-- Use this on MySQL variants that do not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

SET @scope_key_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND column_name = 'scope_key'
);
SET @scope_key_sql := IF(
  @scope_key_exists = 0,
  'ALTER TABLE design_masters ADD COLUMN scope_key VARCHAR(64) NOT NULL DEFAULT '''' AFTER normalized_alias',
  'SELECT 1'
);
PREPARE stmt_scope_key FROM @scope_key_sql;
EXECUTE stmt_scope_key;
DEALLOCATE PREPARE stmt_scope_key;

SET @jewelry_group_id_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND column_name = 'jewelry_group_id'
);
SET @jewelry_group_id_sql := IF(
  @jewelry_group_id_exists = 0,
  'ALTER TABLE design_masters ADD COLUMN jewelry_group_id VARCHAR(36) NULL AFTER scope_key',
  'SELECT 1'
);
PREPARE stmt_jewelry_group_id FROM @jewelry_group_id_sql;
EXECUTE stmt_jewelry_group_id;
DEALLOCATE PREPARE stmt_jewelry_group_id;

SET @jewelry_group_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND column_name = 'jewelry_group'
);
SET @jewelry_group_sql := IF(
  @jewelry_group_exists = 0,
  'ALTER TABLE design_masters ADD COLUMN jewelry_group VARCHAR(255) NULL AFTER jewelry_group_id',
  'SELECT 1'
);
PREPARE stmt_jewelry_group FROM @jewelry_group_sql;
EXECUTE stmt_jewelry_group;
DEALLOCATE PREPARE stmt_jewelry_group;

UPDATE design_masters
SET scope_key = ''
WHERE scope_key IS NULL;

UPDATE design_masters size_master
JOIN design_masters group_master
  ON group_master.id = size_master.jewelry_group_id
SET
  size_master.jewelry_group = group_master.value,
  size_master.scope_key = group_master.id
WHERE size_master.master_type = 'JEWELRY_SIZE'
  AND size_master.jewelry_group_id IS NOT NULL;

UPDATE design_masters
SET
  jewelry_group_id = 'dm-jg-ring',
  jewelry_group = 'Ring',
  scope_key = 'dm-jg-ring'
WHERE id IN ('dm-size-us6', 'dm-size-us8');

UPDATE design_masters
SET
  jewelry_group_id = 'dm-jg-bracelet',
  jewelry_group = 'Bracelet',
  scope_key = 'dm-jg-bracelet'
WHERE id = 'dm-size-155cm';

UPDATE design_masters
SET
  jewelry_group_id = 'dm-jg-necklace',
  jewelry_group = 'Necklace',
  scope_key = 'dm-jg-necklace'
WHERE id = 'dm-size-6in';

SET @drop_unique_value_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND index_name = 'unique_master_type_value'
);
SET @drop_unique_value_sql := IF(
  @drop_unique_value_exists > 0,
  'ALTER TABLE design_masters DROP INDEX unique_master_type_value',
  'SELECT 1'
);
PREPARE stmt_drop_value FROM @drop_unique_value_sql;
EXECUTE stmt_drop_value;
DEALLOCATE PREPARE stmt_drop_value;

SET @drop_unique_alias_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND index_name = 'unique_master_type_alias'
);
SET @drop_unique_alias_sql := IF(
  @drop_unique_alias_exists > 0,
  'ALTER TABLE design_masters DROP INDEX unique_master_type_alias',
  'SELECT 1'
);
PREPARE stmt_drop_alias FROM @drop_unique_alias_sql;
EXECUTE stmt_drop_alias;
DEALLOCATE PREPARE stmt_drop_alias;

SET @idx_value_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND index_name = 'unique_master_type_value'
);
SET @idx_value_sql := IF(
  @idx_value_exists = 0,
  'ALTER TABLE design_masters ADD UNIQUE KEY unique_master_type_value (master_type, scope_key, normalized_value)',
  'SELECT 1'
);
PREPARE stmt_value FROM @idx_value_sql;
EXECUTE stmt_value;
DEALLOCATE PREPARE stmt_value;

SET @idx_alias_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND index_name = 'unique_master_type_alias'
);
SET @idx_alias_sql := IF(
  @idx_alias_exists = 0,
  'ALTER TABLE design_masters ADD UNIQUE KEY unique_master_type_alias (master_type, scope_key, normalized_alias)',
  'SELECT 1'
);
PREPARE stmt_alias FROM @idx_alias_sql;
EXECUTE stmt_alias;
DEALLOCATE PREPARE stmt_alias;
