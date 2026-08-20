ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL AFTER status;

UPDATE orders
SET completed_at = COALESCE(updated_at, created_at)
WHERE status = 'COMPLETED'
  AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_completed_sales
  ON orders (status, is_active, completed_at);
