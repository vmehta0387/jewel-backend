# Database Update SQL From 10 Aug

This file is the governance log for database SQL updates. Add every approved SQL change here before running it on the database.

## 2026-08-10 - Separate Master Tables Foundation

Purpose:
- Create separate master tables based on `DesignMasterType`.
- Keep the old `design_masters` table untouched.
- Use `INT(11)` auto-increment IDs for new master tables.
- Keep `created_by` and `updated_by` as `INT(11) NULL` for the future integer user-ID migration, without FK constraints yet.

```sql
CREATE TABLE IF NOT EXISTS jewelry_groups (
  id INT(11) NOT NULL AUTO_INCREMENT,
  value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL,
  alias_name VARCHAR(255) NULL,
  normalized_alias VARCHAR(255) NULL,
  scope_key VARCHAR(64) NOT NULL DEFAULT '',
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT(11) NULL,
  updated_by INT(11) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS collections LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS jewelry_sizes LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS tags LIKE jewelry_groups;

ALTER TABLE collections
  ADD COLUMN jewelry_group_id INT(11) NULL,
  ADD COLUMN jewelry_group VARCHAR(255) NULL;

ALTER TABLE jewelry_sizes
  ADD COLUMN jewelry_group_id INT(11) NULL,
  ADD COLUMN jewelry_group VARCHAR(255) NULL;

ALTER TABLE tags
  ADD COLUMN jewelry_group_id INT(11) NULL,
  ADD COLUMN jewelry_group VARCHAR(255) NULL;

ALTER TABLE collections
  ADD CONSTRAINT fk_collections_jewelry_group
  FOREIGN KEY (jewelry_group_id) REFERENCES jewelry_groups(id);

ALTER TABLE jewelry_sizes
  ADD CONSTRAINT fk_jewelry_sizes_jewelry_group
  FOREIGN KEY (jewelry_group_id) REFERENCES jewelry_groups(id);

ALTER TABLE tags
  ADD CONSTRAINT fk_tags_jewelry_group
  FOREIGN KEY (jewelry_group_id) REFERENCES jewelry_groups(id);

CREATE TABLE IF NOT EXISTS design_statuses LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS design_stages LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS metal_names LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS metal_colors LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS gold_colours LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS diamond_types LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS diamond_spreads LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS diamond_weights LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS diamond_qualities LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS vendor_names LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS labor_heads LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS packet_stones LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS packet_shapes LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS packet_sizes LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS packet_cuts LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS packet_colors LIKE jewelry_groups;
CREATE TABLE IF NOT EXISTS packet_qualities LIKE jewelry_groups;

CREATE TABLE IF NOT EXISTS metal_purities LIKE jewelry_groups;

ALTER TABLE metal_purities
  ADD COLUMN metal_id INT(11) NULL,
  ADD COLUMN purity_percentage DECIMAL(8,3) NULL;

CREATE INDEX idx_metal_purities_metal_id ON metal_purities (metal_id);

ALTER TABLE metal_purities
  ADD CONSTRAINT fk_metal_purities_metal
  FOREIGN KEY (metal_id) REFERENCES metal_names(id);

CREATE TABLE IF NOT EXISTS metal_caratages LIKE jewelry_groups;

ALTER TABLE metal_caratages
  ADD COLUMN metal_id INT(11) NULL,
  ADD COLUMN metal_color_id INT(11) NULL,
  ADD COLUMN metal_purity_id INT(11) NULL,
  ADD COLUMN purity_percentage DECIMAL(8,3) NULL,
  ADD COLUMN market_price_per_ounce DECIMAL(12,2) NULL,
  ADD COLUMN market_price_per_gm DECIMAL(12,4) NULL,
  ADD COLUMN live_price_per_gm DECIMAL(12,4) NULL,
  ADD COLUMN default_wastage_percent DECIMAL(8,3) NULL;

CREATE INDEX idx_metal_caratages_metal_id ON metal_caratages (metal_id);
CREATE INDEX idx_metal_caratages_metal_color_id ON metal_caratages (metal_color_id);
CREATE INDEX idx_metal_caratages_metal_purity_id ON metal_caratages (metal_purity_id);

ALTER TABLE metal_caratages
  ADD CONSTRAINT fk_metal_caratages_metal
  FOREIGN KEY (metal_id) REFERENCES metal_names(id),
  ADD CONSTRAINT fk_metal_caratages_metal_color
  FOREIGN KEY (metal_color_id) REFERENCES metal_colors(id),
  ADD CONSTRAINT fk_metal_caratages_metal_purity
  FOREIGN KEY (metal_purity_id) REFERENCES metal_purities(id);

CREATE TABLE IF NOT EXISTS labor_rules LIKE jewelry_groups;

ALTER TABLE labor_rules
  ADD COLUMN labor_apply_mode VARCHAR(32) NULL,
  ADD COLUMN flat_cost DECIMAL(12,2) NULL,
  ADD COLUMN rate_per_stone DECIMAL(12,2) NULL,
  ADD COLUMN rate_per_gram DECIMAL(12,2) NULL,
  ADD COLUMN rate_per_group DECIMAL(12,2) NULL;

CREATE TABLE IF NOT EXISTS overhead_rules LIKE jewelry_groups;

ALTER TABLE overhead_rules
  ADD COLUMN jewelry_group_id INT(11) NULL,
  ADD COLUMN overhead_apply_mode ENUM('per_of_materials','flat') NULL,
  ADD COLUMN rate_percent DECIMAL(8,3) NULL,
  ADD COLUMN flat_amount DECIMAL(12,2) NULL;

CREATE INDEX idx_overhead_rules_jewelry_group_id ON overhead_rules (jewelry_group_id);

ALTER TABLE overhead_rules
  ADD CONSTRAINT fk_overhead_rules_jewelry_group
  FOREIGN KEY (jewelry_group_id) REFERENCES jewelry_groups(id);

CREATE TABLE IF NOT EXISTS finding_heads LIKE jewelry_groups;

ALTER TABLE finding_heads
  ADD COLUMN finding_no VARCHAR(100) NULL,
  ADD COLUMN metal_caratage VARCHAR(100) NULL,
  ADD COLUMN price_in ENUM('PIECES','GRAM','PAIR','INCHES') NULL,
  ADD COLUMN price_per_unit DECIMAL(12,2) NULL,
  ADD COLUMN dimensions VARCHAR(255) NULL,
  ADD COLUMN weight_per_unit DECIMAL(12,3) NULL;

CREATE TABLE IF NOT EXISTS master_migration_map (
  old_design_master_id VARCHAR(36) NOT NULL,
  old_master_type VARCHAR(80) NOT NULL,
  new_table_name VARCHAR(80) NOT NULL,
  new_master_id INT(11) NOT NULL,
  PRIMARY KEY (old_design_master_id),
  INDEX idx_master_migration_new_ref (new_table_name, new_master_id)
);
```

## 2026-08-11 - Link `stone_packets` To Packet Master Tables

Purpose:
- Add master ID columns for `stone`, `shape`, `size`, `cut`, `color`, `quality`.
- Link those IDs to separate packet master tables.
- Backfill IDs from existing text values.
- Drop old text columns after successful backfill.

```sql
ALTER TABLE stone_packets
  ADD COLUMN stone_id INT(11) NULL,
  ADD COLUMN shape_id INT(11) NULL,
  ADD COLUMN size_id INT(11) NULL,
  ADD COLUMN cut_id INT(11) NULL,
  ADD COLUMN color_id INT(11) NULL,
  ADD COLUMN quality_id INT(11) NULL;

CREATE INDEX idx_stone_packets_stone_id ON stone_packets (stone_id);
CREATE INDEX idx_stone_packets_shape_id ON stone_packets (shape_id);
CREATE INDEX idx_stone_packets_size_id ON stone_packets (size_id);
CREATE INDEX idx_stone_packets_cut_id ON stone_packets (cut_id);
CREATE INDEX idx_stone_packets_color_id ON stone_packets (color_id);
CREATE INDEX idx_stone_packets_quality_id ON stone_packets (quality_id);

INSERT INTO packet_stones (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(stone), LOWER(TRIM(stone)), TRIM(stone), LOWER(TRIM(stone)), '', 1
FROM stone_packets
WHERE stone IS NOT NULL AND TRIM(stone) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM packet_stones master
    WHERE master.normalized_value = LOWER(TRIM(stone_packets.stone))
  );

INSERT INTO packet_shapes (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(shape), LOWER(TRIM(shape)), TRIM(shape), LOWER(TRIM(shape)), '', 1
FROM stone_packets
WHERE shape IS NOT NULL AND TRIM(shape) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM packet_shapes master
    WHERE master.normalized_value = LOWER(TRIM(stone_packets.shape))
  );

INSERT INTO packet_sizes (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(size), LOWER(TRIM(size)), TRIM(size), LOWER(TRIM(size)), '', 1
FROM stone_packets
WHERE size IS NOT NULL AND TRIM(size) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM packet_sizes master
    WHERE master.normalized_value = LOWER(TRIM(stone_packets.size))
  );

INSERT INTO packet_cuts (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(cut), LOWER(TRIM(cut)), TRIM(cut), LOWER(TRIM(cut)), '', 1
FROM stone_packets
WHERE cut IS NOT NULL AND TRIM(cut) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM packet_cuts master
    WHERE master.normalized_value = LOWER(TRIM(stone_packets.cut))
  );

INSERT INTO packet_colors (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(color), LOWER(TRIM(color)), TRIM(color), LOWER(TRIM(color)), '', 1
FROM stone_packets
WHERE color IS NOT NULL AND TRIM(color) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM packet_colors master
    WHERE master.normalized_value = LOWER(TRIM(stone_packets.color))
  );

INSERT INTO packet_qualities (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(quality), LOWER(TRIM(quality)), TRIM(quality), LOWER(TRIM(quality)), '', 1
FROM stone_packets
WHERE quality IS NOT NULL AND TRIM(quality) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM packet_qualities master
    WHERE master.normalized_value = LOWER(TRIM(stone_packets.quality))
  );

UPDATE stone_packets packet
LEFT JOIN packet_stones master ON master.normalized_value = LOWER(TRIM(packet.stone))
SET packet.stone_id = master.id
WHERE packet.stone IS NOT NULL AND TRIM(packet.stone) <> '';

UPDATE stone_packets packet
LEFT JOIN packet_shapes master ON master.normalized_value = LOWER(TRIM(packet.shape))
SET packet.shape_id = master.id
WHERE packet.shape IS NOT NULL AND TRIM(packet.shape) <> '';

UPDATE stone_packets packet
LEFT JOIN packet_sizes master ON master.normalized_value = LOWER(TRIM(packet.size))
SET packet.size_id = master.id
WHERE packet.size IS NOT NULL AND TRIM(packet.size) <> '';

UPDATE stone_packets packet
LEFT JOIN packet_cuts master ON master.normalized_value = LOWER(TRIM(packet.cut))
SET packet.cut_id = master.id
WHERE packet.cut IS NOT NULL AND TRIM(packet.cut) <> '';

UPDATE stone_packets packet
LEFT JOIN packet_colors master ON master.normalized_value = LOWER(TRIM(packet.color))
SET packet.color_id = master.id
WHERE packet.color IS NOT NULL AND TRIM(packet.color) <> '';

UPDATE stone_packets packet
LEFT JOIN packet_qualities master ON master.normalized_value = LOWER(TRIM(packet.quality))
SET packet.quality_id = master.id
WHERE packet.quality IS NOT NULL AND TRIM(packet.quality) <> '';

ALTER TABLE stone_packets
  ADD CONSTRAINT fk_stone_packets_stone
  FOREIGN KEY (stone_id) REFERENCES packet_stones(id),
  ADD CONSTRAINT fk_stone_packets_shape
  FOREIGN KEY (shape_id) REFERENCES packet_shapes(id),
  ADD CONSTRAINT fk_stone_packets_size
  FOREIGN KEY (size_id) REFERENCES packet_sizes(id),
  ADD CONSTRAINT fk_stone_packets_cut
  FOREIGN KEY (cut_id) REFERENCES packet_cuts(id),
  ADD CONSTRAINT fk_stone_packets_color
  FOREIGN KEY (color_id) REFERENCES packet_colors(id),
  ADD CONSTRAINT fk_stone_packets_quality
  FOREIGN KEY (quality_id) REFERENCES packet_qualities(id);

ALTER TABLE stone_packets
  DROP COLUMN stone,
  DROP COLUMN shape,
  DROP COLUMN size,
  DROP COLUMN cut,
  DROP COLUMN color,
  DROP COLUMN quality;
```

## 2026-08-12 - Restore `design_masters` Entity Columns

Purpose:
- Add the missing root upgrade file referenced by `backend/scripts/apply-sql-upgrades.js`.
- Keep the legacy `design_masters` table compatible with the current `DesignMaster` TypeORM entity.

## 2026-08-12 - Convert `stone_packets.id` To Integer

Purpose:
- Convert `stone_packets.id` from UUID `VARCHAR(36)` to `INT(11) NOT NULL AUTO_INCREMENT`.
- Convert `design_gemstones.packet_id` to `INT(11)` using the existing UUID references.
- Keep old packet UUID values in `stone_packets.legacy_uuid` for traceability.

SQL file:
- `DATABASE_STONE_PACKETS_INT_ID_UPGRADE.sql`
- Fix runtime errors such as `Unknown column 'master.jewelry_group' in 'field list'`.

```sql
-- See DATABASE_DESIGN_MASTERS_UPGRADE.sql.
-- The script is idempotent and adds missing legacy master columns, including:
-- jewelry_group_id, jewelry_group, vendor_email, finding fields,
-- metal price fields, labor fields, and overhead fields.
```

## 2026-08-12 - Restore Separate Master Table Columns

Purpose:
- Keep the separate master tables compatible with `design-master-tables.entity.ts`.
- Fix runtime errors such as `Unknown column 'master.market_price_per_ounce' in 'field list'`.
- Add missing table-specific columns for metal names, metal colors, metal purities, metal caratages, labor rules, overhead rules, and finding heads.

```sql
-- See DATABASE_MASTER_TABLE_COLUMNS_UPGRADE.sql.
-- The script is idempotent and adds only missing per-table master columns.
```

## 2026-08-11 - Correct `metal_caratages` To Use Metal Master IDs

Purpose:
- Use `metal_id`, `metal_color_id`, `metal_purity_id`.
- Link them with `metal_names`, `metal_colors`, `metal_purities`.
- Remove old text columns from `metal_caratages` if they were created from the earlier draft SQL.

Run this only if the earlier `metal_caratages` table already exists with `metal_name`, `metal_color`, or `metal_purity` text columns.

```sql
ALTER TABLE metal_caratages
  ADD COLUMN metal_id INT(11) NULL,
  ADD COLUMN metal_color_id INT(11) NULL,
  ADD COLUMN metal_purity_id INT(11) NULL;

CREATE INDEX idx_metal_caratages_metal_id ON metal_caratages (metal_id);
CREATE INDEX idx_metal_caratages_metal_color_id ON metal_caratages (metal_color_id);
CREATE INDEX idx_metal_caratages_metal_purity_id ON metal_caratages (metal_purity_id);

INSERT INTO metal_names (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(metal_name), LOWER(TRIM(metal_name)), TRIM(metal_name), LOWER(TRIM(metal_name)), '', 1
FROM metal_caratages
WHERE metal_name IS NOT NULL AND TRIM(metal_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM metal_names master
    WHERE master.normalized_value = LOWER(TRIM(metal_caratages.metal_name))
  );

INSERT INTO metal_colors (value, normalized_value, alias_name, normalized_alias, scope_key, is_active)
SELECT DISTINCT TRIM(metal_color), LOWER(TRIM(metal_color)), TRIM(metal_color), LOWER(TRIM(metal_color)), '', 1
FROM metal_caratages
WHERE metal_color IS NOT NULL AND TRIM(metal_color) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM metal_colors master
    WHERE master.normalized_value = LOWER(TRIM(metal_caratages.metal_color))
  );

INSERT INTO metal_purities (value, normalized_value, alias_name, normalized_alias, scope_key, purity_percentage, is_active)
SELECT DISTINCT TRIM(metal_purity), LOWER(TRIM(metal_purity)), TRIM(metal_purity), LOWER(TRIM(metal_purity)), '', purity_percentage, 1
FROM metal_caratages
WHERE metal_purity IS NOT NULL AND TRIM(metal_purity) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM metal_purities master
    WHERE master.normalized_value = LOWER(TRIM(metal_caratages.metal_purity))
  );

UPDATE metal_purities purity
LEFT JOIN metal_caratages caratage ON LOWER(TRIM(caratage.metal_purity)) = purity.normalized_value
LEFT JOIN metal_names metal ON metal.normalized_value = LOWER(TRIM(caratage.metal_name))
SET purity.metal_id = metal.id
WHERE purity.metal_id IS NULL
  AND caratage.metal_name IS NOT NULL
  AND TRIM(caratage.metal_name) <> '';

UPDATE metal_caratages row
LEFT JOIN metal_names master ON master.normalized_value = LOWER(TRIM(row.metal_name))
SET row.metal_id = master.id
WHERE row.metal_name IS NOT NULL AND TRIM(row.metal_name) <> '';

UPDATE metal_caratages row
LEFT JOIN metal_colors master ON master.normalized_value = LOWER(TRIM(row.metal_color))
SET row.metal_color_id = master.id
WHERE row.metal_color IS NOT NULL AND TRIM(row.metal_color) <> '';

UPDATE metal_caratages row
LEFT JOIN metal_purities master ON master.normalized_value = LOWER(TRIM(row.metal_purity))
SET row.metal_purity_id = master.id
WHERE row.metal_purity IS NOT NULL AND TRIM(row.metal_purity) <> '';

ALTER TABLE metal_caratages
  ADD CONSTRAINT fk_metal_caratages_metal
  FOREIGN KEY (metal_id) REFERENCES metal_names(id),
  ADD CONSTRAINT fk_metal_caratages_metal_color
  FOREIGN KEY (metal_color_id) REFERENCES metal_colors(id),
  ADD CONSTRAINT fk_metal_caratages_metal_purity
  FOREIGN KEY (metal_purity_id) REFERENCES metal_purities(id);

ALTER TABLE metal_caratages
  DROP COLUMN metal_name,
  DROP COLUMN metal_color,
  DROP COLUMN metal_purity;
```

## 2026-08-11 - Link `metal_purities` To `metal_names`

Purpose:
- Add `metal_purities.metal_id`.
- Link purity rows with `metal_names.id`.
- Backfill from existing `metal_caratages.metal_name` / `metal_caratages.metal_purity` text columns if those columns still exist.

```sql
ALTER TABLE metal_purities
  ADD COLUMN metal_id INT(11) NULL;

CREATE INDEX idx_metal_purities_metal_id ON metal_purities (metal_id);

UPDATE metal_purities purity
LEFT JOIN metal_caratages caratage ON LOWER(TRIM(caratage.metal_purity)) = purity.normalized_value
LEFT JOIN metal_names metal ON metal.normalized_value = LOWER(TRIM(caratage.metal_name))
SET purity.metal_id = metal.id
WHERE purity.metal_id IS NULL
  AND caratage.metal_name IS NOT NULL
  AND TRIM(caratage.metal_name) <> '';

ALTER TABLE metal_purities
  ADD CONSTRAINT fk_metal_purities_metal
  FOREIGN KEY (metal_id) REFERENCES metal_names(id);
```

## 2026-08-11 - Link `metal_colors` To `metal_names`

Purpose:
- Add `metal_colors.metal_id`.
- Link color rows with `metal_names.id`.
- Backfill from existing `metal_caratages.metal_name` / `metal_caratages.metal_color` text columns if those columns still exist.

```sql
ALTER TABLE metal_colors
  ADD COLUMN metal_id INT(11) NULL;

CREATE INDEX idx_metal_colors_metal_id ON metal_colors (metal_id);

UPDATE metal_colors color
LEFT JOIN metal_caratages caratage ON LOWER(TRIM(caratage.metal_color)) = color.normalized_value
LEFT JOIN metal_names metal ON metal.normalized_value = LOWER(TRIM(caratage.metal_name))
SET color.metal_id = metal.id
WHERE color.metal_id IS NULL
  AND caratage.metal_name IS NOT NULL
  AND TRIM(caratage.metal_name) <> '';

ALTER TABLE metal_colors
  ADD CONSTRAINT fk_metal_colors_metal
  FOREIGN KEY (metal_id) REFERENCES metal_names(id);
```

## 2026-08-11 - Add Price Columns To `metal_names`

Purpose:
- Store metal-level prices on `metal_names`.
- Use double data type as requested.
- Backfill from `metal_caratages` if old/current price values exist there.

```sql
ALTER TABLE metal_names
  ADD COLUMN market_price_per_ounce DOUBLE NULL,
  ADD COLUMN market_price_per_gm DOUBLE NULL,
  ADD COLUMN live_price_per_gm DOUBLE NULL;

UPDATE metal_names metal
LEFT JOIN metal_caratages caratage ON caratage.metal_id = metal.id
SET
  metal.market_price_per_ounce = COALESCE(metal.market_price_per_ounce, caratage.market_price_per_ounce),
  metal.market_price_per_gm = COALESCE(metal.market_price_per_gm, caratage.market_price_per_gm),
  metal.live_price_per_gm = COALESCE(metal.live_price_per_gm, caratage.live_price_per_gm)
WHERE caratage.metal_id IS NOT NULL;
```

## 2026-08-11 - Remove Jewelry Group Scope From `tags`

Purpose:
- `tags` should not contain `jewelry_group_id`.
- `tags` should not contain `jewelry_group`.
- Drop the FK before dropping the columns if it exists.

```sql
ALTER TABLE tags
  DROP FOREIGN KEY fk_tags_jewelry_group;

ALTER TABLE tags
  DROP COLUMN jewelry_group_id,
  DROP COLUMN jewelry_group;
```

## 2026-08-11 - Add Email Column To `vendor_names`

Purpose:
- Store vendor email in `vendor_names.email`.
- If an earlier draft created `vendor_email`, rename it to `email` instead of keeping both.

Fresh table:

```sql
-- See DATABASE_VENDOR_NAMES_EMAIL_UPGRADE.sql.
-- The script is idempotent and adds vendor_names.email if it is missing.
```

## 2026-08-11 - Add Jewelry Group And Apply Mode Enum To `overhead_rules`

Purpose:
- Add `overhead_rules.jewelry_group_id`.
- Join `overhead_rules.jewelry_group_id` with `jewelry_groups.id`.
- Use enum values `per_of_materials` and `flat` for `overhead_apply_mode`.

```sql
ALTER TABLE overhead_rules
  ADD COLUMN jewelry_group_id INT(11) NULL;

CREATE INDEX idx_overhead_rules_jewelry_group_id ON overhead_rules (jewelry_group_id);

ALTER TABLE overhead_rules
  MODIFY COLUMN overhead_apply_mode ENUM('per_of_materials','flat') NULL;

ALTER TABLE overhead_rules
  ADD CONSTRAINT fk_overhead_rules_jewelry_group
  FOREIGN KEY (jewelry_group_id) REFERENCES jewelry_groups(id);
```

Correction if `vendor_email` already exists:

```sql
ALTER TABLE vendor_names
  CHANGE COLUMN vendor_email email VARCHAR(255) NULL;
```
