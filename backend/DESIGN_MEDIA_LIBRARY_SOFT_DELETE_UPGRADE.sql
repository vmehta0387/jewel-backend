ALTER TABLE design_media_library
  ADD COLUMN IF NOT EXISTS status INT NOT NULL DEFAULT 1;

UPDATE design_media_library
SET status = 1
WHERE status IS NULL;
