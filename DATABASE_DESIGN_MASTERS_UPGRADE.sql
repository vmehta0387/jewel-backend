-- Design Masters Upgrade
-- Run this on an existing database to support dropdown masters in Add New Design.

CREATE TABLE IF NOT EXISTS design_masters (
  id VARCHAR(36) PRIMARY KEY,
  master_type ENUM('JEWELRY_GROUP', 'COLLECTION', 'JEWELRY_SIZE', 'TAG', 'DESIGN_STATUS', 'STAGE', 'METAL_NAME', 'METAL_COLOR', 'METAL_PURITY', 'METAL_CARATAGE', 'GOLD_COLOUR', 'DIAMOND_TYPE', 'DIAMOND_SPREAD', 'LABOR_HEAD', 'FINDING_HEAD', 'PACKET_STONE', 'PACKET_SHAPE', 'PACKET_SIZE', 'PACKET_CUT', 'PACKET_COLOR', 'PACKET_QUALITY') NOT NULL,
  value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL,
  alias_name VARCHAR(255) NULL,
  normalized_alias VARCHAR(255) NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_master_type_value (master_type, normalized_value),
  UNIQUE KEY unique_master_type_alias (master_type, normalized_alias),
  INDEX idx_master_type_active (master_type, is_active),
  CONSTRAINT fk_design_master_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_design_master_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE design_masters
  MODIFY COLUMN master_type ENUM('JEWELRY_GROUP', 'COLLECTION', 'JEWELRY_SIZE', 'TAG', 'DESIGN_STATUS', 'STAGE', 'METAL_NAME', 'METAL_COLOR', 'METAL_PURITY', 'METAL_CARATAGE', 'GOLD_COLOUR', 'DIAMOND_TYPE', 'DIAMOND_SPREAD', 'LABOR_HEAD', 'FINDING_HEAD', 'PACKET_STONE', 'PACKET_SHAPE', 'PACKET_SIZE', 'PACKET_CUT', 'PACKET_COLOR', 'PACKET_QUALITY') NOT NULL;

ALTER TABLE design_masters
  ADD COLUMN IF NOT EXISTS alias_name VARCHAR(255) NULL AFTER normalized_value,
  ADD COLUMN IF NOT EXISTS normalized_alias VARCHAR(255) NULL AFTER alias_name,
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER normalized_alias,
  ADD COLUMN IF NOT EXISTS finding_no VARCHAR(100) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS metal_caratage VARCHAR(100) NULL AFTER finding_no,
  ADD COLUMN IF NOT EXISTS price_in ENUM('PIECES', 'GRAM', 'PAIR', 'INCHES') NULL AFTER metal_caratage,
  ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(12,2) NULL AFTER price_in,
  ADD COLUMN IF NOT EXISTS dimensions VARCHAR(255) NULL AFTER price_per_unit,
  ADD COLUMN IF NOT EXISTS weight_per_unit DECIMAL(12,3) NULL AFTER dimensions,
  ADD COLUMN IF NOT EXISTS metal_name VARCHAR(120) NULL AFTER weight_per_unit,
  ADD COLUMN IF NOT EXISTS metal_color VARCHAR(120) NULL AFTER metal_name,
  ADD COLUMN IF NOT EXISTS metal_purity VARCHAR(120) NULL AFTER metal_color,
  ADD COLUMN IF NOT EXISTS purity_percentage DECIMAL(8,3) NULL AFTER metal_purity,
  ADD COLUMN IF NOT EXISTS market_price_per_ounce DECIMAL(12,2) NULL AFTER purity_percentage,
  ADD COLUMN IF NOT EXISTS market_price_per_gm DECIMAL(12,4) NULL AFTER market_price_per_ounce,
  ADD COLUMN IF NOT EXISTS live_price_per_gm DECIMAL(12,4) NULL AFTER market_price_per_gm,
  ADD COLUMN IF NOT EXISTS default_wastage_percent DECIMAL(8,3) NULL AFTER live_price_per_gm;

UPDATE design_masters
SET alias_name = value
WHERE alias_name IS NULL OR TRIM(alias_name) = '';

UPDATE design_masters
SET normalized_alias = LOWER(TRIM(alias_name))
WHERE normalized_alias IS NULL OR TRIM(normalized_alias) = '';

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND index_name = 'unique_master_type_alias'
);
SET @idx_sql := IF(
  @idx_exists = 0,
  'ALTER TABLE design_masters ADD UNIQUE KEY unique_master_type_alias (master_type, normalized_alias)',
  'SELECT 1'
);
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_finding_no_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'design_masters'
    AND index_name = 'unique_master_type_finding_no'
);
SET @idx_finding_no_sql := IF(
  @idx_finding_no_exists = 0,
  'ALTER TABLE design_masters ADD UNIQUE KEY unique_master_type_finding_no (master_type, finding_no)',
  'SELECT 1'
);
PREPARE stmt2 FROM @idx_finding_no_sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS diamond_spread VARCHAR(100) NULL AFTER stage;

ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS diamond_type VARCHAR(120) NULL AFTER diamond_spread;

CREATE TABLE IF NOT EXISTS stone_packets (
  id VARCHAR(36) PRIMARY KEY,
  packet_name VARCHAR(120) NOT NULL UNIQUE,
  stock_type VARCHAR(100) NULL,
  stone VARCHAR(100) NULL,
  shape VARCHAR(100) NULL,
  size VARCHAR(100) NULL,
  cut VARCHAR(100) NULL,
  color VARCHAR(100) NULL,
  quality VARCHAR(100) NULL,
  price_in ENUM('WT', 'PCS') NOT NULL DEFAULT 'WT',
  selling_price DECIMAL(12,2) NULL,
  weight_per_pc DECIMAL(12,3) NULL,
  pieces INT NOT NULL DEFAULT 0,
  weight DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  weight_unit ENUM('CTS', 'GMS') NOT NULL DEFAULT 'CTS',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_packet_search (packet_name, stone, shape, size, cut, color, quality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stone_packets
  ADD COLUMN IF NOT EXISTS price_in ENUM('WT', 'PCS') NOT NULL DEFAULT 'WT' AFTER quality,
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12,2) NULL AFTER price_in,
  ADD COLUMN IF NOT EXISTS weight_per_pc DECIMAL(12,3) NULL AFTER selling_price;

UPDATE stone_packets
SET weight_per_pc = CASE
  WHEN weight_per_pc IS NOT NULL AND weight_per_pc > 0 THEN weight_per_pc
  WHEN pieces IS NOT NULL AND pieces > 0 THEN ROUND(weight / pieces, 3)
  ELSE ROUND(weight, 3)
END
WHERE weight_per_pc IS NULL OR weight_per_pc <= 0;

UPDATE stone_packets
SET pieces = 1
WHERE pieces IS NULL OR pieces <= 0;

UPDATE stone_packets
SET weight = ROUND(weight_per_pc * pieces, 3)
WHERE weight_per_pc IS NOT NULL AND weight_per_pc > 0;

-- Stone packets are intentionally not seeded.
-- Create packets from the app (Masters > Stone Packet) based on your own data.

INSERT INTO design_masters (id, master_type, value, normalized_value, alias_name, normalized_alias, description, is_active)
VALUES
('dm-jg-ring', 'JEWELRY_GROUP', 'Ring', 'ring', 'Ring', 'ring', 'Ring group', TRUE),
('dm-jg-bracelet', 'JEWELRY_GROUP', 'Bracelet', 'bracelet', 'Bracelet', 'bracelet', 'Bracelet group', TRUE),
('dm-jg-earring', 'JEWELRY_GROUP', 'Earring', 'earring', 'Earring', 'earring', 'Earring group', TRUE),
('dm-jg-pendant', 'JEWELRY_GROUP', 'Pendant', 'pendant', 'Pendant', 'pendant', 'Pendant group', TRUE),
('dm-jg-necklace', 'JEWELRY_GROUP', 'Necklace', 'necklace', 'Necklace', 'necklace', 'Necklace group', TRUE),
('dm-jg-nosepin', 'JEWELRY_GROUP', 'Nose Pin', 'nose pin', 'Nose Pin', 'nose pin', 'Nose pin group', TRUE),
('dm-col-gold', 'COLLECTION', 'Gold', 'gold', 'Gold', 'gold', 'Gold collection', TRUE),
('dm-col-silver', 'COLLECTION', 'Silver', 'silver', 'Silver', 'silver', 'Silver collection', TRUE),
('dm-col-casual', 'COLLECTION', 'Casual', 'casual', 'Casual', 'casual', 'Casual collection', TRUE),
('dm-col-wedding', 'COLLECTION', 'Wedding', 'wedding', 'Wedding', 'wedding', 'Wedding collection', TRUE),
('dm-size-us6', 'JEWELRY_SIZE', 'US 6', 'us 6', 'US 6', 'us 6', 'US ring size 6', TRUE),
('dm-size-us8', 'JEWELRY_SIZE', 'US 8', 'us 8', 'US 8', 'us 8', 'US ring size 8', TRUE),
('dm-size-155cm', 'JEWELRY_SIZE', '15.5 CM', '15.5 cm', '15.5 CM', '15.5 cm', 'Bracelet size 15.5 CM', TRUE),
('dm-size-6in', 'JEWELRY_SIZE', '6 Inches', '6 inches', '6 Inches', '6 inches', 'Jewelry size 6 inches', TRUE),
('dm-tag-diamondring', 'TAG', 'Diamond Ring', 'diamond ring', 'Diamond Ring', 'diamond ring', 'Diamond ring tag', TRUE),
('dm-tag-silverbracelet', 'TAG', 'Silver Bracelet', 'silver bracelet', 'Silver Bracelet', 'silver bracelet', 'Silver bracelet tag', TRUE),
('dm-tag-goldearring', 'TAG', 'Gold Earring', 'gold earring', 'Gold Earring', 'gold earring', 'Gold earring tag', TRUE),
('dm-tag-wedding', 'TAG', 'Wedding', 'wedding', 'Wedding', 'wedding', 'Wedding tag', TRUE),
('dm-tag-minimal', 'TAG', 'Minimal', 'minimal', 'Minimal', 'minimal', 'Minimal style tag', TRUE),
('dm-status-mold', 'DESIGN_STATUS', 'Mold', 'mold', 'Mold', 'mold', 'Design in mold stage', TRUE),
('dm-status-active', 'DESIGN_STATUS', 'Active', 'active', 'Active', 'active', 'Design available for use', TRUE),
('dm-status-inactive', 'DESIGN_STATUS', 'Inactive', 'inactive', 'Inactive', 'inactive', 'Design inactive', TRUE),
('dm-stage-sketch', 'STAGE', 'Sketch', 'sketch', 'Sketch', 'sketch', 'Sketch stage', TRUE),
('dm-stage-cad', 'STAGE', 'CAD', 'cad', 'CAD', 'cad', 'CAD stage', TRUE),
('dm-stage-casting', 'STAGE', 'Casting', 'casting', 'Casting', 'casting', 'Casting stage', TRUE),
('dm-stage-polish', 'STAGE', 'Polish', 'polish', 'Polish', 'polish', 'Polish stage', TRUE),
('dm-stage-quality-check', 'STAGE', 'Quality Check', 'quality check', 'Quality Check', 'quality check', 'Quality check stage', TRUE),
('dm-gc-22k-rose-gold', 'GOLD_COLOUR', '22 karat-Rose-Gold', '22 karat-rose-gold', '22 karat-Rose-Gold', '22 karat-rose-gold', '22 karat rose gold finish', TRUE),
('dm-gc-18k-white-gold', 'GOLD_COLOUR', '18 Karat-White-Gold', '18 karat-white-gold', '18 Karat-White-Gold', '18 karat-white-gold', '18 karat white gold finish', TRUE),
('dm-gc-22k-white-gold', 'GOLD_COLOUR', '22 karat-White-Gold', '22 karat-white-gold', '22 karat-White-Gold', '22 karat-white-gold', '22 karat white gold finish', TRUE),
('dm-gc-18k-yellow-gold', 'GOLD_COLOUR', '18 K-Yellow-Gold', '18 k-yellow-gold', '18 K-Yellow-Gold', '18 k-yellow-gold', '18 karat yellow gold finish', TRUE),
('dm-gc-90-silver', 'GOLD_COLOUR', '90-silver-Silver', '90-silver-silver', '90-silver-Silver', '90-silver-silver', '90 silver finish', TRUE),
('dm-dt-lab-ef-vvs-vs', 'DIAMOND_TYPE', 'Lab Diamonds - EF/VVS-VS', 'lab diamonds - ef/vvs-vs', 'Lab Diamonds - EF/VVS-VS', 'lab diamonds - ef/vvs-vs', 'Lab-grown diamond choice', TRUE),
('dm-dt-natural-gh-vs', 'DIAMOND_TYPE', 'Natural Diamonds - GH/VS', 'natural diamonds - gh/vs', 'Natural Diamonds - GH/VS', 'natural diamonds - gh/vs', 'Natural diamond choice', TRUE),
('dm-ds-half-way', 'DIAMOND_SPREAD', '1/2 Way', '1/2 way', 'Half Way', 'half way', 'Half eternity diamond spread', TRUE),
('dm-ds-three-quarter-way', 'DIAMOND_SPREAD', '3/4 Way', '3/4 way', 'Three Quarter Way', 'three quarter way', 'Three quarter eternity spread', TRUE),
('dm-ds-full-eternity', 'DIAMOND_SPREAD', 'Full Eternity', 'full eternity', 'Full Eternity', 'full eternity', 'Full eternity spread', TRUE),
('dm-lh-setting', 'LABOR_HEAD', 'Setting', 'setting', 'Setting', 'setting', 'Labor head: setting', TRUE),
('dm-lh-polish', 'LABOR_HEAD', 'Polish', 'polish', 'Polish', 'polish', 'Labor head: polish', TRUE),
('dm-lh-cad', 'LABOR_HEAD', 'CAD Work', 'cad work', 'CAD Work', 'cad work', 'Labor head: CAD work', TRUE),
('dm-fh-silver-chain', 'FINDING_HEAD', 'Silver Chain', 'silver chain', 'Silver Chain', 'silver chain', 'Finding head: silver chain', TRUE),
('dm-fh-clasp', 'FINDING_HEAD', 'Clasp', 'clasp', 'Clasp', 'clasp', 'Finding head: clasp', TRUE),
('dm-fh-lock', 'FINDING_HEAD', 'Lock', 'lock', 'Lock', 'lock', 'Finding head: lock', TRUE),
('dm-ps-diamond', 'PACKET_STONE', 'Diamond', 'diamond', 'Diamond', 'diamond', 'Packet stone: diamond', TRUE),
('dm-ps-emerald', 'PACKET_STONE', 'Emerald', 'emerald', 'Emerald', 'emerald', 'Packet stone: emerald', TRUE),
('dm-ph-round', 'PACKET_SHAPE', 'Round', 'round', 'Round', 'round', 'Packet shape: round', TRUE),
('dm-ph-hexagonal', 'PACKET_SHAPE', 'Hexagonal', 'hexagonal', 'Hexagonal', 'hexagonal', 'Packet shape: hexagonal', TRUE),
('dm-pz-13x8mm', 'PACKET_SIZE', '13X8MM', '13x8mm', '13X8MM', '13x8mm', 'Packet size 13X8MM', TRUE),
('dm-pz-17mm', 'PACKET_SIZE', '1.7MM', '1.7mm', '1.7MM', '1.7mm', 'Packet size 1.7MM', TRUE),
('dm-pc-fancy', 'PACKET_CUT', 'Fancy', 'fancy', 'Fancy', 'fancy', 'Packet cut: fancy', TRUE),
('dm-pc-rose-cut', 'PACKET_CUT', 'Rose Cut', 'rose cut', 'Rose Cut', 'rose cut', 'Packet cut: rose cut', TRUE),
('dm-po-navy-blue', 'PACKET_COLOR', 'Navy Blue', 'navy blue', 'Navy Blue', 'navy blue', 'Packet color: navy blue', TRUE),
('dm-po-pink', 'PACKET_COLOR', 'Pink', 'pink', 'Pink', 'pink', 'Packet color: pink', TRUE),
('dm-pq-vs-vvs', 'PACKET_QUALITY', 'VS-VVS', 'vs-vvs', 'VS-VVS', 'vs-vvs', 'Packet quality VS-VVS', TRUE),
('dm-pq-si', 'PACKET_QUALITY', 'SI', 'si', 'SI', 'si', 'Packet quality SI', TRUE)
ON DUPLICATE KEY UPDATE
  value = VALUES(value),
  normalized_value = VALUES(normalized_value),
  alias_name = VALUES(alias_name),
  normalized_alias = VALUES(normalized_alias),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

UPDATE design_masters
SET
  finding_no = 'ACS-002',
  metal_caratage = '22K',
  price_in = 'PIECES',
  price_per_unit = 12.00,
  dimensions = 'N/A',
  weight_per_unit = 0.250
WHERE id = 'dm-fh-silver-chain';

UPDATE design_masters
SET
  finding_no = 'ACS-003',
  metal_caratage = '18K',
  price_in = 'PIECES',
  price_per_unit = 8.50,
  dimensions = 'N/A',
  weight_per_unit = 0.150
WHERE id = 'dm-fh-clasp';

UPDATE design_masters
SET
  finding_no = 'ACS-004',
  metal_caratage = '18K',
  price_in = 'PIECES',
  price_per_unit = 6.75,
  dimensions = 'N/A',
  weight_per_unit = 0.100
WHERE id = 'dm-fh-lock';
