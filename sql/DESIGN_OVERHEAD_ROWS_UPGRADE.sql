CREATE TABLE IF NOT EXISTS design_overheads (
  id INT NOT NULL AUTO_INCREMENT,
  design_id INT NOT NULL,
  overhead_rule_id INT NULL,
  overhead_apply_mode VARCHAR(32) NULL,
  rate_percent DECIMAL(8,3) NULL,
  flat_amount DECIMAL(12,2) NULL,
  overhead_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX idx_design_overheads_design_id (design_id),
  INDEX idx_design_overheads_rule_id (overhead_rule_id),
  CONSTRAINT fk_design_overheads_design
    FOREIGN KEY (design_id)
    REFERENCES designs (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_design_overheads_rule
    FOREIGN KEY (overhead_rule_id)
    REFERENCES overhead_rules (id)
    ON DELETE SET NULL
);
