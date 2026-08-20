START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- Orders and SPIFF dependencies
DELETE FROM spiff_point_ledger;
DELETE FROM orders;

-- Design dependencies
DELETE FROM design_relevant;
DELETE FROM design_history;
DELETE FROM design_stl_files;
DELETE FROM design_vendors;
DELETE FROM design_pricing_tiers;
DELETE FROM design_process_stages;
DELETE FROM design_findings;
DELETE FROM design_labors;
DELETE FROM design_gemstones;
DELETE FROM design_metals;
DELETE FROM designs;

SET FOREIGN_KEY_CHECKS = 1;

COMMIT;
