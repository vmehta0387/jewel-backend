CREATE TABLE IF NOT EXISTS metal_price_history (
  id VARCHAR(36) NOT NULL,
  master_id VARCHAR(36) NOT NULL,
  market_price_per_ounce DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  market_price_per_gm DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  live_price_per_gm DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  changed_by VARCHAR(36) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_metal_price_history_master_id (master_id),
  INDEX idx_metal_price_history_changed_by (changed_by)
);
