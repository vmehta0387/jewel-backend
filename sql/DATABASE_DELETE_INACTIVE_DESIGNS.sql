-- Delete all inactive designs from prod DB safely
SET SQL_SAFE_UPDATES = 0;

UPDATE orders
SET design_id = NULL
WHERE design_id IN (SELECT id FROM designs WHERE is_active = 0);

DELETE FROM designs
WHERE is_active = 0;
