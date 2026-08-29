CREATE TABLE IF NOT EXISTS email_templates (
  id INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  preheader VARCHAR(255) NULL,
  html LONGTEXT NOT NULL,
  text LONGTEXT NULL,
  required_variables JSON NULL,
  optional_variables JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  version INT NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_templates_key (`key`),
  KEY idx_email_templates_category (category),
  KEY idx_email_templates_status (status)
);

CREATE TABLE IF NOT EXISTS email_template_actions (
  id INT NOT NULL AUTO_INCREMENT,
  action_type VARCHAR(100) NOT NULL,
  template_id INT NOT NULL,
  recipient_role VARCHAR(60) NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'EMAIL',
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_email_template_actions_action (action_type, channel, is_active),
  KEY idx_email_template_actions_template (template_id),
  CONSTRAINT fk_email_template_actions_template FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id INT NOT NULL AUTO_INCREMENT,
  template_id INT NOT NULL,
  version INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  preheader VARCHAR(255) NULL,
  html LONGTEXT NOT NULL,
  text LONGTEXT NULL,
  required_variables JSON NULL,
  optional_variables JSON NULL,
  status VARCHAR(20) NOT NULL,
  created_by INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_email_template_versions_template (template_id, version),
  CONSTRAINT fk_email_template_versions_template FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE CASCADE
);