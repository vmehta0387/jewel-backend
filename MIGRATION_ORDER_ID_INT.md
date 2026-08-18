# Order ID Migration: VARCHAR(36) to INT(11)

## Summary
Changed the primary ID columns in both `orders` and `order_history` tables from `varchar(36)` (UUID format) to `int(11)` with auto-increment.

## Files Modified

### Database Schema
- **DATABASE_ORDER_ID_INT_UPGRADE.sql** - Migration script to convert both tables

### Backend Entity Files
- **backend/src/modules/orders/entities/order.entity.ts**
  - Changed `id` from `@PrimaryColumn('varchar', { length: 36 })` to `@PrimaryGeneratedColumn('int')`
  - Removed UUID generation logic from `@BeforeInsert()`
  - Updated `formatOrderNumber()` to only handle order number formatting

- **backend/src/modules/orders/entities/order-history.entity.ts**
  - Changed `id` from `@PrimaryColumn('varchar', { length: 36 })` to `@PrimaryGeneratedColumn('int')`
  - Changed `orderId` type from `string` to `number` with `type: 'int'`
  - Removed UUID generation from `@BeforeInsert()` hook

### Service Files
- **backend/src/modules/orders/orders.service.ts**
  - Updated `ensureOrderHistoryTable()` to reflect new INT(11) schema with AUTO_INCREMENT

## Migration Steps

### 1. Backup Your Database
```bash
mysqldump -u your_user -p your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run the Migration Script
Execute the migration file against your database:
```bash
mysql -u your_user -p your_database < DATABASE_ORDER_ID_INT_UPGRADE.sql
```

### 3. Deploy Updated Code
Deploy the updated backend code with the entity changes.

### 4. Verify Migration
Check that the tables have the correct structure:
```sql
DESCRIBE orders;
DESCRIBE order_history;
```

Expected output for `orders`:
- `id` should be `int(11)` with `auto_increment`

Expected output for `order_history`:
- `id` should be `int(11)` with `auto_increment`
- `order_id` should be `int(11)`

## Important Notes

⚠️ **Breaking Changes**:
- All existing API calls that expect string IDs will need to be updated
- Frontend code may need updates if it's handling order IDs as strings
- Any custom scripts or integrations using order IDs need to be updated

## Rollback
If needed, you can restore from the backup:
```bash
mysql -u your_user -p your_database < backup_YYYYMMDD_HHMMSS.sql
```

## Data Integrity
The migration script:
1. Creates new tables with INT(11) primary keys
2. Copies existing data while preserving values
3. Maintains all foreign key relationships
4. Preserves all other columns and their data types
