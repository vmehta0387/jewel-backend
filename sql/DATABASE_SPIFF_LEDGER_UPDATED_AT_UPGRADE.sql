-- Ensure SPIFF ledger matches the TypeORM entity timestamp columns.

ALTER TABLE spiff_point_ledger
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
