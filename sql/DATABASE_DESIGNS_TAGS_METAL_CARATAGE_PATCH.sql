-- Incremental patch for designs.tags_id and designs.metal_caratage_id.
-- Use this if the backend errors with:
-- Unknown column 'design.tags_id' in 'on clause'

ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS tags_id INT(11) NULL AFTER design_status_id,
  ADD COLUMN IF NOT EXISTS metal_caratage_id INT(11) NULL AFTER tags_id;

UPDATE designs row
LEFT JOIN tags tags_master
  ON tags_master.normalized_value = LOWER(TRIM(
    CASE
      WHEN row.tags IS NULL THEN NULL
      WHEN JSON_VALID(row.tags) THEN JSON_UNQUOTE(JSON_EXTRACT(row.tags, '$[0]'))
      ELSE row.tags
    END
  ))
LEFT JOIN metal_caratages metal_caratage_master
  ON metal_caratage_master.normalized_value = LOWER(TRIM(row.gold_colour))
SET row.tags_id = COALESCE(row.tags_id, tags_master.id),
    row.metal_caratage_id = COALESCE(row.metal_caratage_id, metal_caratage_master.id);

ALTER TABLE designs
  ADD INDEX IF NOT EXISTS idx_designs_tags_id (tags_id),
  ADD INDEX IF NOT EXISTS idx_designs_metal_caratage_id (metal_caratage_id);

ALTER TABLE designs
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS gold_colour;
