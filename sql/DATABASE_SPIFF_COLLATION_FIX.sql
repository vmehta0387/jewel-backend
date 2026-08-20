-- Align SPIFF tables with existing app collation to avoid cross-table comparison errors.

ALTER TABLE spiff_point_ledger
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE spiff_redemption_claims
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
