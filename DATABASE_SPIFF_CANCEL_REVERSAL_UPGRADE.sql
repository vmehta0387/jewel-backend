-- Allow SPIFF cancellation reversal history entries

ALTER TABLE spiff_point_ledger
  MODIFY COLUMN event_type ENUM(
    'QUOTE_CREATED',
    'ORDER_PLACED',
    'ORDER_VALUE_BONUS',
    'FAST_CLOSE_BONUS',
    'ORDER_CANCELLED_REVERSAL',
    'MANUAL_ADJUSTMENT'
  ) NOT NULL;
