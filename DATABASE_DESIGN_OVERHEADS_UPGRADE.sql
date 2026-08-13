CREATE TABLE IF NOT EXISTS design_overheads (
  id INT NOT NULL AUTO_INCREMENT,
  design_id INT NOT NULL,
  overhead_rule_id INT NULL,
  overhead_apply_mode VARCHAR(32) NULL,
  rate_percent DECIMAL(8,3) NULL,
  flat_amount DECIMAL(12,2) NULL,
  overhead_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_design_overheads_design_id (design_id),
  INDEX idx_design_overheads_rule_id (overhead_rule_id),
  CONSTRAINT fk_design_overheads_design
    FOREIGN KEY (design_id) REFERENCES designs(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_design_overheads_rule
    FOREIGN KEY (overhead_rule_id) REFERENCES overhead_rules(id)
    ON DELETE SET NULL
);

INSERT INTO design_overheads (
  design_id,
  overhead_rule_id,
  overhead_apply_mode,
  rate_percent,
  flat_amount,
  overhead_value,
  sort_order,
  created_at
)
SELECT
  dl.design_id,
  om.id AS overhead_rule_id,
  om.overhead_apply_mode,
  om.rate_percent,
  om.flat_amount,
  dl.labor_value AS overhead_value,
  dl.sort_order,
  dl.created_at
FROM design_labors dl
LEFT JOIN overhead_rules om
  ON LOWER(om.value) = LOWER(TRIM(REPLACE(dl.labor_head, 'Overhead -', '')))
WHERE LOWER(TRIM(dl.labor_head)) LIKE 'overhead -%'
  AND NOT EXISTS (
    SELECT 1
    FROM design_overheads existing
    WHERE existing.design_id = dl.design_id
      AND existing.sort_order = dl.sort_order
      AND existing.overhead_value = dl.labor_value
  );

DELETE FROM design_labors
WHERE LOWER(TRIM(labor_head)) LIKE 'overhead -%';
