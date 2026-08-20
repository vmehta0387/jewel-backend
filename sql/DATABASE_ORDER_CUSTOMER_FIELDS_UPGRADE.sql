-- Order Entry Customer & PO Fields Upgrade
-- Adds customer-facing fields for order capture in admin order entry.
-- Compatible with MySQL variants that do not support ADD COLUMN IF NOT EXISTS.

SET @db_name = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db_name AND table_name = 'orders' AND column_name = 'customer_name') = 0,
  'ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) NULL AFTER short_description',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db_name AND table_name = 'orders' AND column_name = 'customer_phone') = 0,
  'ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50) NULL AFTER customer_name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db_name AND table_name = 'orders' AND column_name = 'customer_email') = 0,
  'ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255) NULL AFTER customer_phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db_name AND table_name = 'orders' AND column_name = 'purchase_order_number') = 0,
  'ALTER TABLE orders ADD COLUMN purchase_order_number VARCHAR(120) NULL AFTER customer_email',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
