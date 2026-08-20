ALTER TABLE designs
  ADD INDEX idx_designs_family_design_id (family_design_id),
  ADD INDEX idx_designs_design_no (design_no),
  ADD INDEX idx_designs_scope_active (company_id, branch_id, is_active);

ALTER TABLE design_metals
  ADD INDEX idx_design_metals_design_id (design_id);

ALTER TABLE design_gemstones
  ADD INDEX idx_design_gemstones_design_id (design_id);
