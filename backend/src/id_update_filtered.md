# UUID/Varchar ID to INT(11) Migration

Use this for an existing database with UUID/varchar IDs. This migration preserves data by creating integer shadow columns, copying/remapping old IDs into them, then replacing the old columns.

Before running:

- Take a full database backup.
- Stop the backend while this runs.
- Run first on staging or a copied database.
- Keep this file as a migration record.

Important: this script assumes MySQL/MariaDB and that the listed tables/columns exist. If your DB has extra FK constraints, the first block drops FK constraints dynamically for the affected tables.

```sql
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS drop_fks_for_table;
DELIMITER $$
CREATE PROCEDURE drop_fks_for_table(IN p_table_name VARCHAR(128))
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_constraint_name VARCHAR(128);
  DECLARE cur CURSOR FOR
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;
  fk_loop: LOOP
    FETCH cur INTO v_constraint_name;
    IF done = 1 THEN
      LEAVE fk_loop;
    END IF;
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` DROP FOREIGN KEY `', v_constraint_name, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur;
END$$
DELIMITER ;

CALL drop_fks_for_table('users');
CALL drop_fks_for_table('companies');
CALL drop_fks_for_table('branches');
CALL drop_fks_for_table('company_pricing_slabs');
CALL drop_fks_for_table('branch_pricing_slabs');
CALL drop_fks_for_table('collection_pricing_overrides');
CALL drop_fks_for_table('notifications');
CALL drop_fks_for_table('notification_push_devices');
CALL drop_fks_for_table('user_permission_actions');
CALL drop_fks_for_table('global_base_prices');
CALL drop_fks_for_table('metal_price_history');
CALL drop_fks_for_table('orders');
CALL drop_fks_for_table('order_history');
CALL drop_fks_for_table('designs');
CALL drop_fks_for_table('design_metals');
CALL drop_fks_for_table('design_gemstones');
CALL drop_fks_for_table('design_labors');
CALL drop_fks_for_table('design_overheads');
CALL drop_fks_for_table('design_findings');
CALL drop_fks_for_table('design_process_stages');
CALL drop_fks_for_table('design_pricing_tiers');
CALL drop_fks_for_table('design_vendors');
CALL drop_fks_for_table('design_relevant');
CALL drop_fks_for_table('design_tags');
CALL drop_fks_for_table('design_history');
CALL drop_fks_for_table('design_media_library');
CALL drop_fks_for_table('design_stl_files');
CALL drop_fks_for_table('activity_events');
CALL drop_fks_for_table('spiff_point_ledger');
CALL drop_fks_for_table('spiff_redemption_claims');
CALL drop_fks_for_table('spiff_system_settings');
DROP PROCEDURE drop_fks_for_table;

ALTER TABLE companies ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE branches ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE users ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE help_requests ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE company_pricing_slabs ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE branch_pricing_slabs ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE collection_pricing_overrides ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE notifications ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE notification_push_devices ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE user_permission_actions ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE global_base_prices ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE metal_price_history ADD COLUMN id_int INT(11) NOT NULL AUTO_INCREMENT UNIQUE;

CREATE TEMPORARY TABLE id_map_companies AS SELECT id AS old_id, id_int AS new_id FROM companies;
CREATE TEMPORARY TABLE id_map_branches AS SELECT id AS old_id, id_int AS new_id FROM branches;
CREATE TEMPORARY TABLE id_map_users AS SELECT id AS old_id, id_int AS new_id FROM users;
CREATE TEMPORARY TABLE id_map_help_requests AS SELECT id AS old_id, id_int AS new_id FROM help_requests;
CREATE TEMPORARY TABLE id_map_company_pricing_slabs AS SELECT id AS old_id, id_int AS new_id FROM company_pricing_slabs;
CREATE TEMPORARY TABLE id_map_branch_pricing_slabs AS SELECT id AS old_id, id_int AS new_id FROM branch_pricing_slabs;
CREATE TEMPORARY TABLE id_map_collection_pricing_overrides AS SELECT id AS old_id, id_int AS new_id FROM collection_pricing_overrides;
CREATE TEMPORARY TABLE id_map_notifications AS SELECT id AS old_id, id_int AS new_id FROM notifications;
CREATE TEMPORARY TABLE id_map_notification_push_devices AS SELECT id AS old_id, id_int AS new_id FROM notification_push_devices;
CREATE TEMPORARY TABLE id_map_user_permission_actions AS SELECT id AS old_id, id_int AS new_id FROM user_permission_actions;
CREATE TEMPORARY TABLE id_map_global_base_prices AS SELECT id AS old_id, id_int AS new_id FROM global_base_prices;
CREATE TEMPORARY TABLE id_map_metal_price_history AS SELECT id AS old_id, id_int AS new_id FROM metal_price_history;

ALTER TABLE users ADD COLUMN company_id_int INT(11) NULL, ADD COLUMN branch_id_int INT(11) NULL;
UPDATE users u LEFT JOIN id_map_companies c ON c.old_id = u.company_id SET u.company_id_int = c.new_id;
UPDATE users u LEFT JOIN id_map_branches b ON b.old_id = u.branch_id SET u.branch_id_int = b.new_id;

ALTER TABLE companies ADD COLUMN account_manager_id_int INT(11) NULL;
UPDATE companies c LEFT JOIN id_map_users u ON u.old_id = c.account_manager_id SET c.account_manager_id_int = u.new_id;

ALTER TABLE branches ADD COLUMN company_id_int INT(11) NULL, ADD COLUMN branch_manager_id_int INT(11) NULL;
UPDATE branches b LEFT JOIN id_map_companies c ON c.old_id = b.company_id SET b.company_id_int = c.new_id;
UPDATE branches b LEFT JOIN id_map_users u ON u.old_id = b.branch_manager_id SET b.branch_manager_id_int = u.new_id;

ALTER TABLE company_pricing_slabs ADD COLUMN company_id_int INT(11) NULL;
UPDATE company_pricing_slabs s LEFT JOIN id_map_companies c ON c.old_id = s.company_id SET s.company_id_int = c.new_id;

ALTER TABLE branch_pricing_slabs ADD COLUMN branch_id_int INT(11) NULL;
UPDATE branch_pricing_slabs s LEFT JOIN id_map_branches b ON b.old_id = s.branch_id SET s.branch_id_int = b.new_id;

ALTER TABLE collection_pricing_overrides ADD COLUMN company_id_int INT(11) NULL;
UPDATE collection_pricing_overrides o LEFT JOIN id_map_companies c ON c.old_id = o.company_id SET o.company_id_int = c.new_id;

ALTER TABLE notifications
  ADD COLUMN recipient_user_id_int INT(11) NULL,
  ADD COLUMN company_id_int INT(11) NULL,
  ADD COLUMN branch_id_int INT(11) NULL,
  ADD COLUMN entity_id_int INT(11) NULL;
UPDATE notifications n LEFT JOIN id_map_users u ON u.old_id = n.recipient_user_id SET n.recipient_user_id_int = u.new_id;
UPDATE notifications n LEFT JOIN id_map_companies c ON c.old_id = n.company_id SET n.company_id_int = c.new_id;
UPDATE notifications n LEFT JOIN id_map_branches b ON b.old_id = n.branch_id SET n.branch_id_int = b.new_id;
UPDATE notifications n SET entity_id_int = CAST(entity_id AS UNSIGNED) WHERE entity_id REGEXP '^[0-9]+$';
UPDATE notifications n JOIN id_map_users u ON n.entity_type IN ('USER', 'users') AND u.old_id = n.entity_id SET n.entity_id_int = u.new_id;
UPDATE notifications n JOIN id_map_companies c ON n.entity_type IN ('COMPANY', 'companies') AND c.old_id = n.entity_id SET n.entity_id_int = c.new_id;
UPDATE notifications n JOIN id_map_branches b ON n.entity_type IN ('BRANCH', 'branches') AND b.old_id = n.entity_id SET n.entity_id_int = b.new_id;

ALTER TABLE notification_push_devices ADD COLUMN user_id_int INT(11) NULL;
UPDATE notification_push_devices d LEFT JOIN id_map_users u ON u.old_id = d.user_id SET d.user_id_int = u.new_id;

ALTER TABLE user_permission_actions ADD COLUMN user_id_int INT(11) NULL;
UPDATE user_permission_actions p LEFT JOIN id_map_users u ON u.old_id = p.user_id SET p.user_id_int = u.new_id;

ALTER TABLE global_base_prices ADD COLUMN created_by_int INT(11) NULL, ADD COLUMN updated_by_int INT(11) NULL;
UPDATE global_base_prices p LEFT JOIN id_map_users u ON u.old_id = p.created_by SET p.created_by_int = u.new_id;
UPDATE global_base_prices p LEFT JOIN id_map_users u ON u.old_id = p.updated_by SET p.updated_by_int = u.new_id;

ALTER TABLE metal_price_history ADD COLUMN changed_by_int INT(11) NULL;
UPDATE metal_price_history h LEFT JOIN id_map_users u ON u.old_id = h.changed_by SET h.changed_by_int = u.new_id;

ALTER TABLE orders
  ADD COLUMN company_id_int INT(11) NULL,
  ADD COLUMN branch_id_int INT(11) NULL,
  ADD COLUMN sales_rep_id_int INT(11) NULL,
  ADD COLUMN created_by_int INT(11) NULL,
  ADD COLUMN updated_by_int INT(11) NULL;
UPDATE orders o LEFT JOIN id_map_companies c ON c.old_id = o.company_id SET o.company_id_int = c.new_id;
UPDATE orders o LEFT JOIN id_map_branches b ON b.old_id = o.branch_id SET o.branch_id_int = b.new_id;
UPDATE orders o LEFT JOIN id_map_users u ON u.old_id = o.sales_rep_id SET o.sales_rep_id_int = u.new_id;
UPDATE orders o LEFT JOIN id_map_users u ON u.old_id = o.created_by SET o.created_by_int = u.new_id;
UPDATE orders o LEFT JOIN id_map_users u ON u.old_id = o.updated_by SET o.updated_by_int = u.new_id;

ALTER TABLE order_history ADD COLUMN performed_by_int INT(11) NULL;
UPDATE order_history h LEFT JOIN id_map_users u ON u.old_id = h.performed_by SET h.performed_by_int = u.new_id;

ALTER TABLE designs
  ADD COLUMN company_id_int INT(11) NULL,
  ADD COLUMN branch_id_int INT(11) NULL,
  ADD COLUMN created_by_int INT(11) NULL,
  ADD COLUMN updated_by_int INT(11) NULL;
UPDATE designs d LEFT JOIN id_map_companies c ON c.old_id = d.company_id SET d.company_id_int = c.new_id;
UPDATE designs d LEFT JOIN id_map_branches b ON b.old_id = d.branch_id SET d.branch_id_int = b.new_id;
UPDATE designs d LEFT JOIN id_map_users u ON u.old_id = d.created_by SET d.created_by_int = u.new_id;
UPDATE designs d LEFT JOIN id_map_users u ON u.old_id = d.updated_by SET d.updated_by_int = u.new_id;

ALTER TABLE design_history ADD COLUMN performed_by_int INT(11) NULL;
UPDATE design_history h LEFT JOIN id_map_users u ON u.old_id = h.performed_by SET h.performed_by_int = u.new_id;

ALTER TABLE design_media_library ADD COLUMN uploaded_by_int INT(11) NULL;
UPDATE design_media_library m LEFT JOIN id_map_users u ON u.old_id = m.uploaded_by SET m.uploaded_by_int = u.new_id;

ALTER TABLE design_stl_files ADD COLUMN uploaded_by_int INT(11) NULL;
UPDATE design_stl_files f LEFT JOIN id_map_users u ON u.old_id = f.uploaded_by SET f.uploaded_by_int = u.new_id;

-- Extra tables that reference users/companies/branches but were not in the original entity edit list.
ALTER TABLE activity_events
  ADD COLUMN user_id_int INT(11) NULL,
  ADD COLUMN entity_id_int INT(11) NULL;
UPDATE activity_events e LEFT JOIN id_map_users u ON u.old_id = e.user_id SET e.user_id_int = u.new_id;
UPDATE activity_events e SET entity_id_int = CAST(entity_id AS UNSIGNED) WHERE entity_id REGEXP '^[0-9]+$';
UPDATE activity_events e JOIN id_map_users u ON e.entity_type IN ('USER', 'users') AND u.old_id = e.entity_id SET e.entity_id_int = u.new_id;
UPDATE activity_events e JOIN id_map_companies c ON e.entity_type IN ('COMPANY', 'companies') AND c.old_id = e.entity_id SET e.entity_id_int = c.new_id;
UPDATE activity_events e JOIN id_map_branches b ON e.entity_type IN ('BRANCH', 'branches') AND b.old_id = e.entity_id SET e.entity_id_int = b.new_id;

ALTER TABLE spiff_point_ledger
  ADD COLUMN user_id_int INT(11) NULL,
  ADD COLUMN company_id_int INT(11) NULL,
  ADD COLUMN branch_id_int INT(11) NULL;
UPDATE spiff_point_ledger s LEFT JOIN id_map_users u ON u.old_id = s.user_id SET s.user_id_int = u.new_id;
UPDATE spiff_point_ledger s LEFT JOIN id_map_companies c ON c.old_id = s.company_id SET s.company_id_int = c.new_id;
UPDATE spiff_point_ledger s LEFT JOIN id_map_branches b ON b.old_id = s.branch_id SET s.branch_id_int = b.new_id;

ALTER TABLE spiff_redemption_claims
  ADD COLUMN user_id_int INT(11) NULL,
  ADD COLUMN company_id_int INT(11) NULL,
  ADD COLUMN branch_id_int INT(11) NULL,
  ADD COLUMN approved_by_id_int INT(11) NULL;
UPDATE spiff_redemption_claims s LEFT JOIN id_map_users u ON u.old_id = s.user_id SET s.user_id_int = u.new_id;
UPDATE spiff_redemption_claims s LEFT JOIN id_map_companies c ON c.old_id = s.company_id SET s.company_id_int = c.new_id;
UPDATE spiff_redemption_claims s LEFT JOIN id_map_branches b ON b.old_id = s.branch_id SET s.branch_id_int = b.new_id;
UPDATE spiff_redemption_claims s LEFT JOIN id_map_users u ON u.old_id = s.approved_by_id SET s.approved_by_id_int = u.new_id;

ALTER TABLE spiff_system_settings ADD COLUMN updated_by_id_int INT(11) NULL;
UPDATE spiff_system_settings s LEFT JOIN id_map_users u ON u.old_id = s.updated_by_id SET s.updated_by_id_int = u.new_id;

-- Stop here and inspect these before the destructive column swap.
SELECT 'users.company_id unmapped' AS check_name, COUNT(*) AS bad_rows FROM users WHERE company_id IS NOT NULL AND company_id_int IS NULL
UNION ALL SELECT 'users.branch_id unmapped', COUNT(*) FROM users WHERE branch_id IS NOT NULL AND branch_id_int IS NULL
UNION ALL SELECT 'companies.account_manager_id unmapped', COUNT(*) FROM companies WHERE account_manager_id IS NOT NULL AND account_manager_id_int IS NULL
UNION ALL SELECT 'branches.company_id unmapped', COUNT(*) FROM branches WHERE company_id IS NOT NULL AND company_id_int IS NULL
UNION ALL SELECT 'branches.branch_manager_id unmapped', COUNT(*) FROM branches WHERE branch_manager_id IS NOT NULL AND branch_manager_id_int IS NULL
UNION ALL SELECT 'company_pricing_slabs.company_id unmapped', COUNT(*) FROM company_pricing_slabs WHERE company_id IS NOT NULL AND company_id_int IS NULL
UNION ALL SELECT 'branch_pricing_slabs.branch_id unmapped', COUNT(*) FROM branch_pricing_slabs WHERE branch_id IS NOT NULL AND branch_id_int IS NULL
UNION ALL SELECT 'collection_pricing_overrides.company_id unmapped', COUNT(*) FROM collection_pricing_overrides WHERE company_id IS NOT NULL AND company_id_int IS NULL
UNION ALL SELECT 'notifications.recipient_user_id unmapped', COUNT(*) FROM notifications WHERE recipient_user_id IS NOT NULL AND recipient_user_id_int IS NULL
UNION ALL SELECT 'notification_push_devices.user_id unmapped', COUNT(*) FROM notification_push_devices WHERE user_id IS NOT NULL AND user_id_int IS NULL
UNION ALL SELECT 'user_permission_actions.user_id unmapped', COUNT(*) FROM user_permission_actions WHERE user_id IS NOT NULL AND user_id_int IS NULL
UNION ALL SELECT 'orders.company_id unmapped', COUNT(*) FROM orders WHERE company_id IS NOT NULL AND company_id_int IS NULL
UNION ALL SELECT 'orders.branch_id unmapped', COUNT(*) FROM orders WHERE branch_id IS NOT NULL AND branch_id_int IS NULL
UNION ALL SELECT 'orders.sales_rep_id unmapped', COUNT(*) FROM orders WHERE sales_rep_id IS NOT NULL AND sales_rep_id_int IS NULL
UNION ALL SELECT 'designs.company_id unmapped', COUNT(*) FROM designs WHERE company_id IS NOT NULL AND company_id_int IS NULL
UNION ALL SELECT 'designs.branch_id unmapped', COUNT(*) FROM designs WHERE branch_id IS NOT NULL AND branch_id_int IS NULL
UNION ALL SELECT 'activity_events.user_id unmapped', COUNT(*) FROM activity_events WHERE user_id IS NOT NULL AND user_id_int IS NULL
UNION ALL SELECT 'spiff_point_ledger.user_id unmapped', COUNT(*) FROM spiff_point_ledger WHERE user_id IS NOT NULL AND user_id_int IS NULL
UNION ALL SELECT 'spiff_redemption_claims.user_id unmapped', COUNT(*) FROM spiff_redemption_claims WHERE user_id IS NOT NULL AND user_id_int IS NULL;
```

If every `bad_rows` value is `0`, run the swap block:

```sql
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE users DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NULL;
ALTER TABLE users DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NULL;
ALTER TABLE companies DROP COLUMN account_manager_id, CHANGE account_manager_id_int account_manager_id INT(11) NULL;
ALTER TABLE branches DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NOT NULL;
ALTER TABLE branches DROP COLUMN branch_manager_id, CHANGE branch_manager_id_int branch_manager_id INT(11) NULL;
ALTER TABLE company_pricing_slabs DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NOT NULL;
ALTER TABLE branch_pricing_slabs DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NOT NULL;
ALTER TABLE collection_pricing_overrides DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NOT NULL;
ALTER TABLE notifications DROP COLUMN recipient_user_id, CHANGE recipient_user_id_int recipient_user_id INT(11) NOT NULL;
ALTER TABLE notifications DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NULL;
ALTER TABLE notifications DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NULL;
ALTER TABLE notifications DROP COLUMN entity_id, CHANGE entity_id_int entity_id INT(11) NULL;
ALTER TABLE notification_push_devices DROP COLUMN user_id, CHANGE user_id_int user_id INT(11) NOT NULL;
ALTER TABLE user_permission_actions DROP COLUMN user_id, CHANGE user_id_int user_id INT(11) NOT NULL;
ALTER TABLE global_base_prices DROP COLUMN created_by, CHANGE created_by_int created_by INT(11) NULL;
ALTER TABLE global_base_prices DROP COLUMN updated_by, CHANGE updated_by_int updated_by INT(11) NULL;
ALTER TABLE metal_price_history DROP COLUMN changed_by, CHANGE changed_by_int changed_by INT(11) NULL;
ALTER TABLE orders DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NULL;
ALTER TABLE orders DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NULL;
ALTER TABLE orders DROP COLUMN sales_rep_id, CHANGE sales_rep_id_int sales_rep_id INT(11) NULL;
ALTER TABLE orders DROP COLUMN created_by, CHANGE created_by_int created_by INT(11) NULL;
ALTER TABLE orders DROP COLUMN updated_by, CHANGE updated_by_int updated_by INT(11) NULL;
ALTER TABLE order_history DROP COLUMN performed_by, CHANGE performed_by_int performed_by INT(11) NULL;
ALTER TABLE designs DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NULL;
ALTER TABLE designs DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NULL;
ALTER TABLE designs DROP COLUMN created_by, CHANGE created_by_int created_by INT(11) NULL;
ALTER TABLE designs DROP COLUMN updated_by, CHANGE updated_by_int updated_by INT(11) NULL;
ALTER TABLE design_history DROP COLUMN performed_by, CHANGE performed_by_int performed_by INT(11) NULL;
ALTER TABLE design_media_library DROP COLUMN uploaded_by, CHANGE uploaded_by_int uploaded_by INT(11) NULL;
ALTER TABLE design_stl_files DROP COLUMN uploaded_by, CHANGE uploaded_by_int uploaded_by INT(11) NULL;
ALTER TABLE activity_events DROP COLUMN user_id, CHANGE user_id_int user_id INT(11) NULL;
ALTER TABLE activity_events DROP COLUMN entity_id, CHANGE entity_id_int entity_id INT(11) NULL;
ALTER TABLE spiff_point_ledger DROP COLUMN user_id, CHANGE user_id_int user_id INT(11) NOT NULL;
ALTER TABLE spiff_point_ledger DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NULL;
ALTER TABLE spiff_point_ledger DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NULL;
ALTER TABLE spiff_redemption_claims DROP COLUMN user_id, CHANGE user_id_int user_id INT(11) NOT NULL;
ALTER TABLE spiff_redemption_claims DROP COLUMN company_id, CHANGE company_id_int company_id INT(11) NULL;
ALTER TABLE spiff_redemption_claims DROP COLUMN branch_id, CHANGE branch_id_int branch_id INT(11) NULL;
ALTER TABLE spiff_redemption_claims DROP COLUMN approved_by_id, CHANGE approved_by_id_int approved_by_id INT(11) NULL;
ALTER TABLE spiff_system_settings DROP COLUMN updated_by_id, CHANGE updated_by_id_int updated_by_id INT(11) NULL;

ALTER TABLE companies DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE branches DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE users DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE help_requests DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE company_pricing_slabs DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE branch_pricing_slabs DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE collection_pricing_overrides DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE notifications DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE notification_push_devices DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE user_permission_actions DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE global_base_prices DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);
ALTER TABLE metal_price_history DROP PRIMARY KEY, DROP COLUMN id, CHANGE id_int id INT(11) NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);

ALTER TABLE order_history MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY order_id INT(11) NOT NULL;
ALTER TABLE designs MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE design_metals MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY metal_caratage_id INT(11) NULL;
ALTER TABLE design_gemstones MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY packet_id INT(11) NULL, MODIFY stone_id INT(11) NULL, MODIFY shape_id INT(11) NULL, MODIFY size_id INT(11) NULL, MODIFY cut_id INT(11) NULL, MODIFY color_id INT(11) NULL, MODIFY quality_id INT(11) NULL, MODIFY stone_type_id INT(11) NULL;
ALTER TABLE design_labors MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY labor_head_id INT(11) NULL, MODIFY labor_rule_id INT(11) NULL;
ALTER TABLE design_overheads MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY overhead_rule_id INT(11) NULL;
ALTER TABLE design_findings MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY finding_head_id INT(11) NULL;
ALTER TABLE design_process_stages MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY process_stage_id INT(11) NOT NULL;
ALTER TABLE design_pricing_tiers MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL;
ALTER TABLE design_vendors MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY vendor_name_id INT(11) NOT NULL;
ALTER TABLE design_relevant MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY related_design_id INT(11) NOT NULL;
ALTER TABLE design_tags MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL, MODIFY tag_id INT(11) NOT NULL;
ALTER TABLE design_media_library MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE design_stl_files MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY design_id INT(11) NOT NULL;
ALTER TABLE stone_packets MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY stone_id INT(11) NULL, MODIFY shape_id INT(11) NULL, MODIFY size_id INT(11) NULL, MODIFY cut_id INT(11) NULL, MODIFY color_id INT(11) NULL, MODIFY quality_id INT(11) NULL;

ALTER TABLE jewelry_groups MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE collections MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY jewelry_group_id INT(11) NULL;
ALTER TABLE jewelry_sizes MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE tags MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE design_statuses MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE design_stages MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE metal_names MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE metal_colors MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY metal_id INT(11) NULL;
ALTER TABLE metal_purities MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY metal_id INT(11) NULL;
ALTER TABLE metal_caratages MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY metal_id INT(11) NULL, MODIFY metal_color_id INT(11) NULL, MODIFY metal_purity_id INT(11) NULL;
ALTER TABLE diamond_types MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE diamond_spreads MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE diamond_weights MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE diamond_qualities MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE vendor_names MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE labor_heads MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE labor_rules MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY jewelry_group_id INT(11) NULL;
ALTER TABLE overhead_rules MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY jewelry_group_id INT(11) NULL;
ALTER TABLE finding_heads MODIFY id INT(11) NOT NULL AUTO_INCREMENT, MODIFY metal_caratage_id INT(11) NULL;
ALTER TABLE packet_stones MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE packet_shapes MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE packet_sizes MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE packet_cuts MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE packet_colors MODIFY id INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE packet_qualities MODIFY id INT(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE branches ADD CONSTRAINT fk_branches_company_id FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE branches ADD CONSTRAINT fk_branches_branch_manager_id FOREIGN KEY (branch_manager_id) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT fk_users_company_id FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE users ADD CONSTRAINT fk_users_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE companies ADD CONSTRAINT fk_companies_account_manager_id FOREIGN KEY (account_manager_id) REFERENCES users(id);
ALTER TABLE company_pricing_slabs ADD CONSTRAINT fk_company_pricing_slabs_company_id FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE branch_pricing_slabs ADD CONSTRAINT fk_branch_pricing_slabs_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE collection_pricing_overrides ADD CONSTRAINT fk_collection_pricing_overrides_company_id FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_recipient_user_id FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_push_devices ADD CONSTRAINT fk_notification_push_devices_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE user_permission_actions ADD CONSTRAINT fk_user_permission_actions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

DROP TEMPORARY TABLE IF EXISTS id_map_companies;
DROP TEMPORARY TABLE IF EXISTS id_map_branches;
DROP TEMPORARY TABLE IF EXISTS id_map_users;
DROP TEMPORARY TABLE IF EXISTS id_map_help_requests;
DROP TEMPORARY TABLE IF EXISTS id_map_company_pricing_slabs;
DROP TEMPORARY TABLE IF EXISTS id_map_branch_pricing_slabs;
DROP TEMPORARY TABLE IF EXISTS id_map_collection_pricing_overrides;
DROP TEMPORARY TABLE IF EXISTS id_map_notifications;
DROP TEMPORARY TABLE IF EXISTS id_map_notification_push_devices;
DROP TEMPORARY TABLE IF EXISTS id_map_user_permission_actions;
DROP TEMPORARY TABLE IF EXISTS id_map_global_base_prices;
DROP TEMPORARY TABLE IF EXISTS id_map_metal_price_history;

SET FOREIGN_KEY_CHECKS = 1;
```

## After Running

Run:

```sql
SHOW CREATE TABLE users;
SHOW CREATE TABLE companies;
SHOW CREATE TABLE branches;
SELECT id, company_id, branch_id FROM users LIMIT 10;
SELECT id, company_id, branch_manager_id FROM branches LIMIT 10;
SELECT id, recipient_user_id, company_id, branch_id, entity_id FROM notifications LIMIT 10;
```

## Still String By Design

- `permission_modules.key`
- `permission_actions.key`
- `notification_push_devices.device_id`
- `designs.ijewel_model_id`
- `pricing_rules.entity_id` is not changed here because it may be polymorphic. Convert only if every stored value is numeric or has a known mapping.

