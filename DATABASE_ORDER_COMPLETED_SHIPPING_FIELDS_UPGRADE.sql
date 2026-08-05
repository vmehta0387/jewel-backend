-- Required shipping/completion fields for completed orders

ALTER TABLE orders ADD COLUMN ship_date DATE NULL;
ALTER TABLE orders ADD COLUMN ship_via VARCHAR(50) NULL;
ALTER TABLE orders ADD COLUMN tracking_no VARCHAR(120) NULL;
ALTER TABLE orders ADD COLUMN invoice_no VARCHAR(120) NULL;
