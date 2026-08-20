ALTER TABLE design_masters
  MODIFY COLUMN master_type ENUM(
    'JEWELRY_GROUP',
    'COLLECTION',
    'JEWELRY_SIZE',
    'TAG',
    'DESIGN_STATUS',
    'STAGE',
    'METAL_NAME',
    'METAL_COLOR',
    'METAL_PURITY',
    'METAL_CARATAGE',
    'GOLD_COLOUR',
    'DIAMOND_TYPE',
    'DIAMOND_SPREAD',
    'DIAMOND_WEIGHT',
    'DIAMOND_QUALITY',
    'VENDOR_NAME',
    'LABOR_HEAD',
    'LABOR_RULE',
    'OVERHEAD_RULE',
    'FINDING_HEAD',
    'PACKET_STONE',
    'PACKET_SHAPE',
    'PACKET_SIZE',
    'PACKET_CUT',
    'PACKET_COLOR',
    'PACKET_QUALITY'
  ) NOT NULL;

DELIMITER $$

DROP PROCEDURE IF EXISTS upgrade_design_masters_labor_overhead $$

CREATE PROCEDURE upgrade_design_masters_labor_overhead()
BEGIN
  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'labor_apply_mode'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN labor_apply_mode VARCHAR(32) NULL AFTER default_wastage_percent;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'flat_cost'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN flat_cost DECIMAL(12,2) NULL AFTER labor_apply_mode;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'rate_per_stone'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN rate_per_stone DECIMAL(12,2) NULL AFTER flat_cost;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'rate_per_gram'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN rate_per_gram DECIMAL(12,2) NULL AFTER rate_per_stone;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'rate_per_group'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN rate_per_group DECIMAL(12,2) NULL AFTER rate_per_gram;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'overhead_apply_mode'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN overhead_apply_mode VARCHAR(32) NULL AFTER rate_per_group;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'rate_percent'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN rate_percent DECIMAL(8,3) NULL AFTER overhead_apply_mode;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'design_masters'
      AND COLUMN_NAME = 'flat_amount'
  ) = 0 THEN
    ALTER TABLE design_masters
      ADD COLUMN flat_amount DECIMAL(12,2) NULL AFTER rate_percent;
  END IF;
END $$

CALL upgrade_design_masters_labor_overhead() $$

DROP PROCEDURE IF EXISTS upgrade_design_masters_labor_overhead $$

DELIMITER ;
