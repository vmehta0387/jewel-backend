-- Global Base Pricing Upgrade
-- Super Admin can manage central metal and diamond prices here.
-- These rates are auto-applied to design calculations.

CREATE TABLE IF NOT EXISTS global_base_prices (
  id VARCHAR(36) PRIMARY KEY,
  category ENUM('METAL', 'DIAMOND') NOT NULL,
  reference_value VARCHAR(255) NOT NULL,
  sub_value VARCHAR(255) NULL,
  price_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit ENUM('GRAM', 'CARAT') NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_global_price_category_active (category, is_active),
  INDEX idx_global_price_reference (reference_value),
  INDEX idx_global_price_sub_value (sub_value),
  INDEX idx_global_price_effective_from (effective_from),
  CONSTRAINT fk_global_price_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_global_price_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO global_base_prices (
  id,
  category,
  reference_value,
  sub_value,
  price_per_unit,
  unit,
  currency,
  notes,
  is_active
)
VALUES
  ('gbp-metal-22k-rose', 'METAL', '22 karat-Rose-Gold', NULL, 72.50, 'GRAM', 'USD', 'Seed metal base rate', TRUE),
  ('gbp-metal-18k-white', 'METAL', '18 Karat-White-Gold', NULL, 61.20, 'GRAM', 'USD', 'Seed metal base rate', TRUE),
  ('gbp-metal-22k-white', 'METAL', '22 karat-White-Gold', NULL, 72.50, 'GRAM', 'USD', 'Seed metal base rate', TRUE),
  ('gbp-metal-18k-yellow', 'METAL', '18 K-Yellow-Gold', NULL, 61.20, 'GRAM', 'USD', 'Seed metal base rate', TRUE),
  ('gbp-metal-90-silver', 'METAL', '90-silver-Silver', NULL, 0.95, 'GRAM', 'USD', 'Seed silver base rate', TRUE),
  ('gbp-dia-lab-ef-vvs-vs', 'DIAMOND', 'Lab Diamonds - EF/VVS-VS', NULL, 1200.00, 'CARAT', 'USD', 'Seed diamond base rate', TRUE),
  ('gbp-dia-natural-gh-vs', 'DIAMOND', 'Natural Diamonds - GH/VS', NULL, 2800.00, 'CARAT', 'USD', 'Seed diamond base rate', TRUE),
  ('gbp-dia-natural-gh-si', 'DIAMOND', 'Natural Diamonds - GH/SI', NULL, 2200.00, 'CARAT', 'USD', 'Seed diamond base rate', TRUE)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  reference_value = VALUES(reference_value),
  sub_value = VALUES(sub_value),
  price_per_unit = VALUES(price_per_unit),
  unit = VALUES(unit),
  currency = VALUES(currency),
  notes = VALUES(notes),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

