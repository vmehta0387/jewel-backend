ALTER TABLE metal_names
  ADD COLUMN IF NOT EXISTS market_price_per_ounce DOUBLE NULL AFTER description,
  ADD COLUMN IF NOT EXISTS market_price_per_gm DOUBLE NULL AFTER market_price_per_ounce,
  ADD COLUMN IF NOT EXISTS live_price_per_gm DOUBLE NULL AFTER market_price_per_gm;

ALTER TABLE metal_colors
  ADD COLUMN IF NOT EXISTS metal_id INT(11) NULL AFTER description;

ALTER TABLE metal_purities
  ADD COLUMN IF NOT EXISTS metal_id INT(11) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS purity_percentage DECIMAL(8,3) NULL AFTER metal_id;

ALTER TABLE metal_caratages
  ADD COLUMN IF NOT EXISTS metal_id INT(11) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS metal_color_id INT(11) NULL AFTER metal_id,
  ADD COLUMN IF NOT EXISTS metal_purity_id INT(11) NULL AFTER metal_color_id,
  ADD COLUMN IF NOT EXISTS purity_percentage DECIMAL(8,3) NULL AFTER metal_purity_id,
  ADD COLUMN IF NOT EXISTS market_price_per_ounce DECIMAL(12,2) NULL AFTER purity_percentage,
  ADD COLUMN IF NOT EXISTS market_price_per_gm DECIMAL(12,4) NULL AFTER market_price_per_ounce,
  ADD COLUMN IF NOT EXISTS live_price_per_gm DECIMAL(12,4) NULL AFTER market_price_per_gm,
  ADD COLUMN IF NOT EXISTS default_wastage_percent DECIMAL(8,3) NULL AFTER live_price_per_gm;

ALTER TABLE labor_rules
  ADD COLUMN IF NOT EXISTS labor_apply_mode VARCHAR(32) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS flat_cost DECIMAL(12,2) NULL AFTER labor_apply_mode,
  ADD COLUMN IF NOT EXISTS rate_per_stone DECIMAL(12,2) NULL AFTER flat_cost,
  ADD COLUMN IF NOT EXISTS rate_per_gram DECIMAL(12,2) NULL AFTER rate_per_stone,
  ADD COLUMN IF NOT EXISTS rate_per_group DECIMAL(12,2) NULL AFTER rate_per_gram;

ALTER TABLE overhead_rules
  ADD COLUMN IF NOT EXISTS jewelry_group_id INT(11) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS overhead_apply_mode ENUM('per_of_materials','flat') NULL AFTER jewelry_group_id,
  ADD COLUMN IF NOT EXISTS rate_percent DECIMAL(8,3) NULL AFTER overhead_apply_mode,
  ADD COLUMN IF NOT EXISTS flat_amount DECIMAL(12,2) NULL AFTER rate_percent;

ALTER TABLE finding_heads
  ADD COLUMN IF NOT EXISTS finding_no VARCHAR(100) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS metal_caratage_id INT(11) NULL AFTER finding_no,
  ADD COLUMN IF NOT EXISTS price_in ENUM('PIECES','GRAM','PAIR','INCHES') NULL AFTER metal_caratage_id,
  ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(12,2) NULL AFTER price_in,
  ADD COLUMN IF NOT EXISTS dimensions VARCHAR(255) NULL AFTER price_per_unit,
  ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(12,3) NULL AFTER dimensions;
