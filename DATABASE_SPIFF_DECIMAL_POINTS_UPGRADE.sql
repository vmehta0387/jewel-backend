-- Upgrade SPIFF points columns to support fractional points (e.g. 6.25)

ALTER TABLE spiff_point_ledger
  MODIFY COLUMN points DECIMAL(12,2) NOT NULL;

ALTER TABLE spiff_redemption_claims
  MODIFY COLUMN requested_points DECIMAL(12,2) NOT NULL;

