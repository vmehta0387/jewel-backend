-- Products Module Upgrade (Design Management)
-- Run this on an existing database before starting the updated backend.

CREATE TABLE IF NOT EXISTS designs (
  id VARCHAR(36) PRIMARY KEY,
  design_no VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT 'V1',
  company_id VARCHAR(36) NULL,
  branch_id VARCHAR(36) NULL,
  jewelry_group VARCHAR(100) NOT NULL,
  collection VARCHAR(100) NULL,
  jewelry_size VARCHAR(100) NULL,
  stage VARCHAR(100) NULL,
  diamond_spread VARCHAR(100) NULL,
  diamond_type VARCHAR(120) NULL,
  design_status VARCHAR(100) NULL,
  gold_colour VARCHAR(120) NULL,
  stone_info VARCHAR(120) NULL,
  tags JSON NULL,
  drawer_location VARCHAR(255) NULL,
  design_description TEXT NULL,
  remarks TEXT NULL,
  metal_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gem_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  labor_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  finding_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gross_weight DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  live_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stl_file_url VARCHAR(500) NULL,
  image_urls JSON NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_design_version_company (company_id, design_no, version),
  INDEX idx_design_no (design_no),
  INDEX idx_design_status (is_active, stage, design_status),
  INDEX idx_design_company (company_id),
  INDEX idx_design_branch (branch_id),
  CONSTRAINT fk_design_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_design_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_design_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_design_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_metals (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  gold_colour VARCHAR(120) NULL,
  net_wt DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  wastage_percent DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  wastage_wt DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  total_wt DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  price_per_gm DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  components INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_metals_design (design_id, sort_order),
  CONSTRAINT fk_design_metals_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_gemstones (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  stone VARCHAR(100) NULL,
  shape VARCHAR(100) NULL,
  size VARCHAR(100) NULL,
  cut VARCHAR(100) NULL,
  color VARCHAR(100) NULL,
  quality VARCHAR(100) NULL,
  stone_type VARCHAR(100) NULL,
  wt_per_pcs DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  pcs INT NOT NULL DEFAULT 0,
  wt_in_cts DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  price_per_ct DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_gems_design (design_id, sort_order),
  INDEX idx_design_gems_filter (stone, shape, cut, color, quality),
  CONSTRAINT fk_design_gemstones_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_labors (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  labor_head VARCHAR(120) NULL,
  labor_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit_qty DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  labor_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_labors_design (design_id, sort_order),
  CONSTRAINT fk_design_labors_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_findings (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  finding_head VARCHAR(120) NULL,
  price_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  units DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  total_weight DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  finding_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_findings_design (design_id, sort_order),
  CONSTRAINT fk_design_findings_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_process_stages (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  process_stage VARCHAR(120) NOT NULL,
  net_weight DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  duration DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  duration_type ENUM('MINUTES', 'HOURS', 'DAYS') NOT NULL DEFAULT 'MINUTES',
  remarks TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_process_design (design_id, sort_order),
  INDEX idx_design_process_stage (process_stage),
  CONSTRAINT fk_design_process_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_pricing_tiers (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  increment_by ENUM('PERCENTAGE', 'FLAT') NOT NULL DEFAULT 'PERCENTAGE',
  unit VARCHAR(60) NULL,
  weight_by VARCHAR(60) NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  code VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_tiers_design (design_id, sort_order),
  INDEX idx_design_tiers_name (name),
  CONSTRAINT fk_design_pricing_tiers_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_vendors (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  stock_type VARCHAR(80) NULL,
  supplier_style_no VARCHAR(150) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_vendors_design (design_id, sort_order),
  INDEX idx_design_vendors_supplier (supplier_name),
  CONSTRAINT fk_design_vendors_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_relevant (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  related_design_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_design_relevant_pair (design_id, related_design_id),
  INDEX idx_design_relevant_related (related_design_id),
  CONSTRAINT fk_design_relevant_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_relevant_related FOREIGN KEY (related_design_id) REFERENCES designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_stl_files (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  notes TEXT NULL,
  uploaded_by VARCHAR(36) NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_stl_design (design_id, uploaded_at),
  CONSTRAINT fk_design_stl_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_stl_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_history (
  id VARCHAR(36) PRIMARY KEY,
  design_id VARCHAR(36) NOT NULL,
  action_type VARCHAR(120) NOT NULL,
  remarks TEXT NOT NULL,
  performed_by VARCHAR(36) NULL,
  metadata JSON NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_design_history_design (design_id, performed_at),
  CONSTRAINT fk_design_history_design FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_history_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stone_packets (
  id VARCHAR(36) PRIMARY KEY,
  packet_name VARCHAR(120) NOT NULL UNIQUE,
  stock_type VARCHAR(80) NULL,
  stone VARCHAR(100) NULL,
  shape VARCHAR(100) NULL,
  size VARCHAR(100) NULL,
  cut VARCHAR(100) NULL,
  color VARCHAR(100) NULL,
  quality VARCHAR(100) NULL,
  pieces INT NOT NULL DEFAULT 0,
  weight DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  weight_unit ENUM('CTS', 'GMS') NOT NULL DEFAULT 'CTS',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stone_packets_filter (stock_type, stone, shape, cut, color, quality),
  INDEX idx_stone_packets_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stone packets are intentionally not seeded.
-- Create packets from the app (Masters > Stone Packet) based on your own data.

CREATE TABLE IF NOT EXISTS design_masters (
  id VARCHAR(36) PRIMARY KEY,
  master_type ENUM('JEWELRY_GROUP', 'COLLECTION', 'JEWELRY_SIZE', 'TAG', 'DESIGN_STATUS', 'STAGE', 'GOLD_COLOUR', 'DIAMOND_TYPE', 'DIAMOND_SPREAD', 'PACKET_STONE', 'PACKET_SHAPE', 'PACKET_SIZE', 'PACKET_CUT', 'PACKET_COLOR', 'PACKET_QUALITY') NOT NULL,
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

