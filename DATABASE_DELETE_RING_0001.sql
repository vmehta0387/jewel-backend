-- remove stray RING-0001 designs and related rows
DELETE FROM design_metals WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_gemstones WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_labors WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_findings WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_process_stages WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_pricing_tiers WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_vendors WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_relevant WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%') OR related_design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_stl_files WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM design_history WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
UPDATE orders SET design_id = NULL WHERE design_id IN (SELECT id FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%');
DELETE FROM designs WHERE design_no = 'RING-0001' OR design_no LIKE 'RING-0001-V%';
