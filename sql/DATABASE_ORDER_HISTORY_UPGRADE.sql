-- Order history/audit log for web and mobile order actions

CREATE TABLE IF NOT EXISTS order_history (
  id INT(11) NOT NULL AUTO_INCREMENT,
  order_id INT(11) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  summary TEXT NOT NULL,
  changes JSON NULL,
  performed_by INT(11) NULL,
  performed_by_name VARCHAR(255) NULL,
  performed_by_role VARCHAR(50) NULL,
  metadata JSON NULL,
  performed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_order_history_order_id (order_id),
  KEY idx_order_history_performed_by (performed_by),
  KEY idx_order_history_performed_at (performed_at),
  CONSTRAINT fk_order_history_order_id
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_history_performed_by
    FOREIGN KEY (performed_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
