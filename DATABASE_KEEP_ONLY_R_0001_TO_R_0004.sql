-- Keep only the requested designs and remove all other design rows.
-- Requested keep list: R-0001, R-0002, R-0003, R-0004

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS keep_design_ids;
CREATE TEMPORARY TABLE keep_design_ids (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO keep_design_ids (id)
SELECT d.id
FROM designs d
WHERE d.design_no IN ('R-0001', 'R-0002', 'R-0003', 'R-0004');

DROP TEMPORARY TABLE IF EXISTS delete_design_ids;
CREATE TEMPORARY TABLE delete_design_ids (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO delete_design_ids (id)
SELECT d.id
FROM designs d
WHERE d.id NOT IN (SELECT id FROM keep_design_ids);

-- Orders should not point to removed designs.
UPDATE orders
SET design_id = NULL
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_metals
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_gemstones
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_labors
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_findings
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_process_stages
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_pricing_tiers
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_vendors
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_stl_files
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_history
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_relevant
WHERE design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM design_relevant
WHERE related_design_id IN (SELECT id FROM delete_design_ids);

DELETE FROM designs
WHERE id IN (SELECT id FROM delete_design_ids);

COMMIT;
