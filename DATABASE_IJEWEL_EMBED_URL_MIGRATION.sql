-- iJewel Embed URL Migration
-- Convert legacy model-id/base-name rows into full embed URLs.
-- If ijewel_model_id already contains http(s), it is left as-is.

UPDATE designs
SET ijewel_model_id = CASE
  WHEN ijewel_model_id IS NULL OR TRIM(ijewel_model_id) = '' THEN ijewel_model_id
  WHEN ijewel_model_id REGEXP '^https?://' THEN ijewel_model_id
  WHEN ijewel_base_name IS NULL OR TRIM(ijewel_base_name) = '' THEN CONCAT('https://drive.ijewel3d.com/drive/files/', TRIM(ijewel_model_id), '/embedded')
  WHEN LOCATE('.', TRIM(ijewel_base_name)) > 0 THEN CONCAT('https://', TRIM(ijewel_base_name), '/drive/files/', TRIM(ijewel_model_id), '/embedded')
  ELSE CONCAT('https://', TRIM(ijewel_base_name), '.ijewel3d.com/', TRIM(ijewel_base_name), '/files/', TRIM(ijewel_model_id), '/embedded')
END,
    ijewel_base_name = CASE
  WHEN ijewel_model_id REGEXP '^https?://' THEN NULL
  ELSE ijewel_base_name
END
WHERE ijewel_model_id IS NOT NULL AND TRIM(ijewel_model_id) <> '';
