-- Convert stone_packets.id from UUID varchar(36) to INT(11) AUTO_INCREMENT.
-- Also converts design_gemstones.packet_id to INT(11) by mapping existing UUID refs.

SET @stone_packet_id_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stone_packets'
    AND COLUMN_NAME = 'id'
  LIMIT 1
);

SET @needs_stone_packet_int_id := IF(@stone_packet_id_type = 'int', 0, 1);

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'ALTER TABLE stone_packets ADD COLUMN numeric_id INT(11) NOT NULL AUTO_INCREMENT UNIQUE FIRST',
  'SELECT ''stone_packets.id already int'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'ALTER TABLE stone_packets ADD COLUMN legacy_uuid VARCHAR(36) NULL AFTER numeric_id',
  'SELECT ''stone_packets legacy_uuid not needed'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'UPDATE stone_packets SET legacy_uuid = id WHERE legacy_uuid IS NULL',
  'SELECT ''stone_packets legacy_uuid already handled'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @design_gemstones_packet_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'design_gemstones'
    AND COLUMN_NAME = 'packet_id'
);

SET @sql := IF(
  @needs_stone_packet_int_id = 1 AND @design_gemstones_packet_id_exists > 0,
  'UPDATE design_gemstones gem
   INNER JOIN stone_packets packet ON gem.packet_id = packet.legacy_uuid
   SET gem.packet_id = packet.numeric_id',
  'SELECT ''design_gemstones.packet_id mapping not needed'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1 AND @design_gemstones_packet_id_exists > 0,
  'UPDATE design_gemstones
   SET packet_id = NULL
   WHERE packet_id IS NOT NULL
     AND packet_id REGEXP ''[^0-9]''',
  'SELECT ''design_gemstones.packet_id cleanup not needed'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1 AND @design_gemstones_packet_id_exists > 0,
  'ALTER TABLE design_gemstones MODIFY COLUMN packet_id INT(11) NULL',
  'SELECT ''design_gemstones.packet_id already int or missing'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'ALTER TABLE stone_packets DROP PRIMARY KEY',
  'SELECT ''stone_packets primary key already int'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'ALTER TABLE stone_packets DROP COLUMN id',
  'SELECT ''stone_packets old id already removed'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'ALTER TABLE stone_packets CHANGE COLUMN numeric_id id INT(11) NOT NULL AUTO_INCREMENT',
  'SELECT ''stone_packets numeric id already renamed'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @needs_stone_packet_int_id = 1,
  'ALTER TABLE stone_packets ADD PRIMARY KEY (id)',
  'SELECT ''stone_packets primary key already set'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
