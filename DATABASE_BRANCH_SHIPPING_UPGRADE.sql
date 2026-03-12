-- Branch Shipping Upgrade
-- Adds ship-to configuration fields for branches.

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS ship_to_type ENUM('BRANCH_ADDRESS', 'CUSTOM') NOT NULL DEFAULT 'BRANCH_ADDRESS' AFTER phone,
  ADD COLUMN IF NOT EXISTS ship_street_address VARCHAR(255) NULL AFTER ship_to_type,
  ADD COLUMN IF NOT EXISTS ship_city VARCHAR(120) NULL AFTER ship_street_address,
  ADD COLUMN IF NOT EXISTS ship_state_province VARCHAR(120) NULL AFTER ship_city,
  ADD COLUMN IF NOT EXISTS ship_postal_code VARCHAR(40) NULL AFTER ship_state_province,
  ADD COLUMN IF NOT EXISTS ship_country VARCHAR(120) NULL AFTER ship_postal_code;
