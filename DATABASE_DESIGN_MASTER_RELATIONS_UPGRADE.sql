-- One-time migration:
-- 1) Convert design-owned table primary keys from UUID varchar to INT(11) AUTO_INCREMENT.
-- 2) Convert design foreign keys from UUID varchar to INT(11).
-- 3) Store master references as *_id columns.
-- 4) Drop replaced master label columns from design tables.
--
-- Run after taking a DB backup. This is intentionally a table-design migration,
-- not an idempotent data patch.

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE designs
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_designs_legacy_uuid (legacy_uuid);

ALTER TABLE designs
  ADD COLUMN jewelry_group_id INT(11) NULL AFTER branch_id,
  ADD COLUMN collection_id INT(11) NULL AFTER jewelry_group_id,
  ADD COLUMN jewelry_size_id INT(11) NULL AFTER collection_id,
  ADD COLUMN stage_id INT(11) NULL AFTER jewelry_size_id,
  ADD COLUMN diamond_spread_id INT(11) NULL AFTER stage_id,
  ADD COLUMN diamond_type_id INT(11) NULL AFTER diamond_spread_id,
  ADD COLUMN diamond_weight_id INT(11) NULL AFTER diamond_type_id,
  ADD COLUMN diamond_quality_id INT(11) NULL AFTER diamond_weight_id,
  ADD COLUMN design_status_id INT(11) NULL AFTER diamond_quality_id,
  ADD COLUMN tags_id INT(11) NULL AFTER design_status_id,
  ADD COLUMN metal_caratage_id INT(11) NULL AFTER tags_id,
  ADD COLUMN family_design_id_int INT(11) NULL AFTER family_design_id;

UPDATE designs row
LEFT JOIN designs parent ON parent.legacy_uuid = row.family_design_id
LEFT JOIN jewelry_groups jewelry_group_master ON jewelry_group_master.normalized_value = LOWER(TRIM(row.jewelry_group))
LEFT JOIN collections collection_master ON collection_master.normalized_value = LOWER(TRIM(row.collection))
LEFT JOIN jewelry_sizes jewelry_size_master ON jewelry_size_master.normalized_value = LOWER(TRIM(row.jewelry_size))
LEFT JOIN design_stages stage_master ON stage_master.normalized_value = LOWER(TRIM(row.stage))
LEFT JOIN diamond_spreads diamond_spread_master ON diamond_spread_master.normalized_value = LOWER(TRIM(row.diamond_spread))
LEFT JOIN diamond_types diamond_type_master ON diamond_type_master.normalized_value = LOWER(TRIM(row.diamond_type))
LEFT JOIN diamond_weights diamond_weight_master ON diamond_weight_master.normalized_value = LOWER(TRIM(row.diamond_weight))
LEFT JOIN diamond_qualities diamond_quality_master ON diamond_quality_master.normalized_value = LOWER(TRIM(row.diamond_quality))
LEFT JOIN design_statuses design_status_master ON design_status_master.normalized_value = LOWER(TRIM(row.design_status))
LEFT JOIN tags tags_master ON tags_master.normalized_value = LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(row.tags, '$[0]'))))
LEFT JOIN metal_caratages metal_caratage_master ON metal_caratage_master.normalized_value = LOWER(TRIM(row.gold_colour))
SET row.family_design_id_int = parent.id,
    row.jewelry_group_id = jewelry_group_master.id,
    row.collection_id = collection_master.id,
    row.jewelry_size_id = jewelry_size_master.id,
    row.stage_id = stage_master.id,
    row.diamond_spread_id = diamond_spread_master.id,
    row.diamond_type_id = diamond_type_master.id,
    row.diamond_weight_id = diamond_weight_master.id,
    row.diamond_quality_id = diamond_quality_master.id,
    row.design_status_id = design_status_master.id,
    row.tags_id = tags_master.id,
    row.metal_caratage_id = metal_caratage_master.id;

ALTER TABLE designs
  DROP COLUMN family_design_id,
  CHANGE COLUMN family_design_id_int family_design_id INT(11) NULL,
  DROP COLUMN jewelry_group,
  DROP COLUMN collection,
  DROP COLUMN jewelry_size,
  DROP COLUMN stage,
  DROP COLUMN diamond_spread,
  DROP COLUMN diamond_type,
  DROP COLUMN diamond_weight,
  DROP COLUMN diamond_quality,
  DROP COLUMN design_status,
  DROP COLUMN tags,
  DROP COLUMN gold_colour,
  MODIFY COLUMN jewelry_group_id INT(11) NOT NULL;

ALTER TABLE design_metals
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN metal_caratage_id INT(11) NULL AFTER design_id_int,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_metals_legacy_uuid (legacy_uuid);

UPDATE design_metals row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN metal_caratages metal_caratage_master ON metal_caratage_master.normalized_value = LOWER(TRIM(row.gold_colour))
SET row.design_id_int = design_master.id,
    row.metal_caratage_id = metal_caratage_master.id;

ALTER TABLE design_metals
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  DROP COLUMN gold_colour;

ALTER TABLE design_gemstones
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN stone_id INT(11) NULL AFTER packet_id,
  ADD COLUMN shape_id INT(11) NULL AFTER stone_id,
  ADD COLUMN size_id INT(11) NULL AFTER shape_id,
  ADD COLUMN cut_id INT(11) NULL AFTER size_id,
  ADD COLUMN color_id INT(11) NULL AFTER cut_id,
  ADD COLUMN quality_id INT(11) NULL AFTER color_id,
  ADD COLUMN stone_type_id INT(11) NULL AFTER quality_id,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_gemstones_legacy_uuid (legacy_uuid);

UPDATE design_gemstones row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN packet_stones stone_master ON stone_master.normalized_value = LOWER(TRIM(row.stone))
LEFT JOIN packet_shapes shape_master ON shape_master.normalized_value = LOWER(TRIM(row.shape))
LEFT JOIN packet_sizes size_master ON size_master.normalized_value = LOWER(TRIM(row.size))
LEFT JOIN packet_cuts cut_master ON cut_master.normalized_value = LOWER(TRIM(row.cut))
LEFT JOIN packet_colors color_master ON color_master.normalized_value = LOWER(TRIM(row.color))
LEFT JOIN packet_qualities quality_master ON quality_master.normalized_value = LOWER(TRIM(row.quality))
LEFT JOIN diamond_types stone_type_master ON stone_type_master.normalized_value = LOWER(TRIM(row.stone_type))
SET row.design_id_int = design_master.id,
    row.stone_id = stone_master.id,
    row.shape_id = shape_master.id,
    row.size_id = size_master.id,
    row.cut_id = cut_master.id,
    row.color_id = color_master.id,
    row.quality_id = quality_master.id,
    row.stone_type_id = stone_type_master.id;

ALTER TABLE design_gemstones
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  DROP COLUMN stone,
  DROP COLUMN shape,
  DROP COLUMN size,
  DROP COLUMN cut,
  DROP COLUMN color,
  DROP COLUMN quality,
  DROP COLUMN stone_type;

ALTER TABLE design_labors
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN labor_head_id INT(11) NULL AFTER design_id_int,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_labors_legacy_uuid (legacy_uuid);

UPDATE design_labors row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN labor_heads labor_master ON labor_master.normalized_value = LOWER(TRIM(row.labor_head))
SET row.design_id_int = design_master.id,
    row.labor_head_id = labor_master.id;

ALTER TABLE design_labors
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  DROP COLUMN labor_head;

ALTER TABLE design_findings
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN finding_head_id INT(11) NULL AFTER design_id_int,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_findings_legacy_uuid (legacy_uuid);

UPDATE design_findings row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN finding_heads finding_master ON finding_master.normalized_value = LOWER(TRIM(row.finding_head))
SET row.design_id_int = design_master.id,
    row.finding_head_id = finding_master.id;

ALTER TABLE design_findings
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  DROP COLUMN finding_head;

ALTER TABLE design_process_stages
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN process_stage_id INT(11) NULL AFTER design_id_int,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_process_stages_legacy_uuid (legacy_uuid);

UPDATE design_process_stages row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN design_stages stage_master ON stage_master.normalized_value = LOWER(TRIM(row.process_stage))
SET row.design_id_int = design_master.id,
    row.process_stage_id = stage_master.id;

ALTER TABLE design_process_stages
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  DROP COLUMN process_stage;

ALTER TABLE design_vendors
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN vendor_name_id INT(11) NULL AFTER design_id_int,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_vendors_legacy_uuid (legacy_uuid);

UPDATE design_vendors row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN vendor_names vendor_master ON vendor_master.normalized_value = LOWER(TRIM(row.supplier_name))
SET row.design_id_int = design_master.id,
    row.vendor_name_id = vendor_master.id;

ALTER TABLE design_vendors
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  DROP COLUMN supplier_name;

ALTER TABLE design_pricing_tiers
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_pricing_tiers_legacy_uuid (legacy_uuid);

UPDATE design_pricing_tiers row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
SET row.design_id_int = design_master.id;

ALTER TABLE design_pricing_tiers
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL;

ALTER TABLE design_stl_files
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_stl_files_legacy_uuid (legacy_uuid);

UPDATE design_stl_files row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
SET row.design_id_int = design_master.id;

ALTER TABLE design_stl_files
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL;

ALTER TABLE design_history
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_history_legacy_uuid (legacy_uuid);

UPDATE design_history row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
SET row.design_id_int = design_master.id;

ALTER TABLE design_history
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL;

ALTER TABLE design_relevant
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id,
  ADD COLUMN related_design_id_int INT(11) NULL AFTER related_design_id,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_relevant_legacy_uuid (legacy_uuid);

UPDATE design_relevant row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
LEFT JOIN designs related_master ON related_master.legacy_uuid = row.related_design_id
SET row.design_id_int = design_master.id,
    row.related_design_id_int = related_master.id;

ALTER TABLE design_relevant
  DROP COLUMN design_id,
  DROP COLUMN related_design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NOT NULL,
  CHANGE COLUMN related_design_id_int related_design_id INT(11) NOT NULL;

ALTER TABLE orders
  ADD COLUMN design_id_int INT(11) NULL AFTER design_id;

UPDATE orders row
LEFT JOIN designs design_master ON design_master.legacy_uuid = row.design_id
SET row.design_id_int = design_master.id
WHERE row.design_id IS NOT NULL;

ALTER TABLE orders
  DROP COLUMN design_id,
  CHANGE COLUMN design_id_int design_id INT(11) NULL;

ALTER TABLE design_media_library
  DROP PRIMARY KEY,
  CHANGE COLUMN id legacy_uuid VARCHAR(36) NOT NULL,
  ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY ux_design_media_library_legacy_uuid (legacy_uuid);

ALTER TABLE designs
  ADD INDEX idx_designs_family_design_id (family_design_id),
  ADD INDEX idx_designs_jewelry_group_id (jewelry_group_id),
  ADD INDEX idx_designs_collection_id (collection_id),
  ADD INDEX idx_designs_jewelry_size_id (jewelry_size_id),
  ADD INDEX idx_designs_stage_id (stage_id),
  ADD INDEX idx_designs_diamond_type_id (diamond_type_id),
  ADD INDEX idx_designs_tags_id (tags_id),
  ADD INDEX idx_designs_metal_caratage_id (metal_caratage_id);

ALTER TABLE design_metals ADD INDEX idx_design_metals_design_master (design_id, metal_caratage_id);
ALTER TABLE design_gemstones ADD INDEX idx_design_gemstones_design_master (design_id, stone_id, shape_id, size_id, cut_id, color_id, quality_id, stone_type_id);
ALTER TABLE design_labors ADD INDEX idx_design_labors_design_master (design_id, labor_head_id);
ALTER TABLE design_findings ADD INDEX idx_design_findings_design_master (design_id, finding_head_id);
ALTER TABLE design_process_stages ADD INDEX idx_design_process_stages_design_master (design_id, process_stage_id);
ALTER TABLE design_vendors ADD INDEX idx_design_vendors_design_master (design_id, vendor_name_id);
ALTER TABLE design_pricing_tiers ADD INDEX idx_design_pricing_tiers_design_id (design_id);
ALTER TABLE design_stl_files ADD INDEX idx_design_stl_files_design_id (design_id);
ALTER TABLE design_history ADD INDEX idx_design_history_design_id (design_id);
ALTER TABLE design_relevant ADD INDEX idx_design_relevant_design_ids (design_id, related_design_id);
ALTER TABLE orders ADD INDEX idx_orders_design_id (design_id);

SET FOREIGN_KEY_CHECKS = 1;
