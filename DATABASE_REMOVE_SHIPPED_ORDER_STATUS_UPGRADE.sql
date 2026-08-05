-- Replace the removed SHIPPED order status with COMPLETED.
-- Run before deploying code that removes SHIPPED from the application enum.

UPDATE orders
SET status = 'COMPLETED'
WHERE status = 'SHIPPED';

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'QUOTE',
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_PRODUCTION',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'QUOTE';
