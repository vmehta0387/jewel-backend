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

ALTER TABLE design_masters
  ADD COLUMN IF NOT EXISTS labor_apply_mode VARCHAR(32) NULL AFTER default_wastage_percent,
  ADD COLUMN IF NOT EXISTS flat_cost DECIMAL(12,2) NULL AFTER labor_apply_mode,
  ADD COLUMN IF NOT EXISTS rate_per_stone DECIMAL(12,2) NULL AFTER flat_cost,
  ADD COLUMN IF NOT EXISTS rate_per_gram DECIMAL(12,2) NULL AFTER rate_per_stone,
  ADD COLUMN IF NOT EXISTS rate_per_group DECIMAL(12,2) NULL AFTER rate_per_gram,
  ADD COLUMN IF NOT EXISTS overhead_apply_mode VARCHAR(32) NULL AFTER rate_per_group,
  ADD COLUMN IF NOT EXISTS rate_percent DECIMAL(8,3) NULL AFTER overhead_apply_mode,
  ADD COLUMN IF NOT EXISTS flat_amount DECIMAL(12,2) NULL AFTER rate_percent;
