-- Convert orders and order_history tables to use INT(11) as primary key

-- Step 1: Drop foreign key constraint from order_history
ALTER TABLE `order_history` DROP FOREIGN KEY `fk_order_history_order_id`;

-- Step 2: Modify order_history table - change id to int(11) with auto_increment
ALTER TABLE `order_history` 
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,
  MODIFY `order_id` int(11) NOT NULL;

-- Step 3: Modify orders table - change id to int(11) with auto_increment
ALTER TABLE `orders` 
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Step 4: Re-add foreign key constraint
ALTER TABLE `order_history`
  ADD CONSTRAINT `fk_order_history_order_id` 
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE;

-- Verify the changes
-- SELECT COLUMN_NAME, COLUMN_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('orders', 'order_history') AND COLUMN_NAME IN ('id', 'order_id');
