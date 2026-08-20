CREATE TABLE IF NOT EXISTS activity_events (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  device_id VARCHAR(120) NULL,
  module VARCHAR(80) NOT NULL,
  event VARCHAR(120) NOT NULL,
  screen VARCHAR(120) NULL,
  entity_type VARCHAR(80) NULL,
  entity_id VARCHAR(120) NULL,
  changes JSON NULL,
  data JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT fk_activity_events_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON activity_events (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON activity_events (created_at);
CREATE INDEX IF NOT EXISTS idx_activity_events_module ON activity_events (module);
CREATE INDEX IF NOT EXISTS idx_activity_events_device_id ON activity_events (device_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity_type ON activity_events (entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity_id ON activity_events (entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_created_at ON activity_events (user_id, created_at);
