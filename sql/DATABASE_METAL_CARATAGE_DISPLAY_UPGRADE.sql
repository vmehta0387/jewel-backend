ALTER TABLE metal_caratages
  ADD COLUMN IF NOT EXISTS display_color VARCHAR(7) NULL AFTER default_wastage_percent,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER display_color;
