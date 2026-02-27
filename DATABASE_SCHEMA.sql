-- B2B Jewelry Ring Customization Platform - MariaDB Schema

-- Users Table (Multi-role with hierarchy)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'SALES_REP') NOT NULL,
    company_id INT NULL,
    branch_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_company (company_id),
    INDEX idx_branch (branch_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Companies Table (Multi-tenant)
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    basic_multiplier DECIMAL(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branches Table
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    branch_multiplier DECIMAL(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_branch_code (company_id, code),
    INDEX idx_company (company_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ring Styles (Base Products)
CREATE TABLE ring_styles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    sku_prefix VARCHAR(50) NOT NULL,
    description TEXT,
    collection_type ENUM('ENGAGEMENT', 'ETERNITY', 'FLORAL', 'WEDDING_BANDS') NOT NULL,
    collection_multiplier DECIMAL(5,2) DEFAULT 1.00,
    base_labor_cost DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collection (collection_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuration Options (For 777 SKU combinations)
CREATE TABLE configuration_options (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ring_style_id INT NOT NULL,
    option_type ENUM('METAL_TYPE', 'METAL_COLOR', 'RING_SIZE', 'DIAMOND_QUALITY', 'SETTING_STYLE') NOT NULL,
    option_value VARCHAR(100) NOT NULL,
    weight_grams DECIMAL(8,3) NULL,
    diamond_count INT NULL,
    avg_diamond_weight_carats DECIMAL(6,3) NULL,
    additional_labor_cost DECIMAL(10,2) DEFAULT 0.00,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ring_style_id) REFERENCES ring_styles(id) ON DELETE CASCADE,
    INDEX idx_ring_style (ring_style_id),
    INDEX idx_option_type (option_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Media (Images/Videos per configuration)
CREATE TABLE product_media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ring_style_id INT NOT NULL,
    media_type ENUM('IMAGE', 'VIDEO') NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    configuration_filter JSON NULL COMMENT 'Stores which config options this media applies to',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ring_style_id) REFERENCES ring_styles(id) ON DELETE CASCADE,
    INDEX idx_ring_style (ring_style_id),
    INDEX idx_media_type (media_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gold Prices (Dynamic pricing)
CREATE TABLE gold_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metal_type VARCHAR(50) NOT NULL COMMENT 'e.g., 14K, 18K, 22K',
    price_per_gram DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metal_type (metal_type),
    INDEX idx_effective_date (effective_date),
    INDEX idx_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Diamond Prices (Dynamic pricing)
CREATE TABLE diamond_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quality_grade VARCHAR(50) NOT NULL COMMENT 'e.g., VS1, VS2, SI1',
    price_per_carat DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quality (quality_grade),
    INDEX idx_effective_date (effective_date),
    INDEX idx_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pricing Rules (Override multipliers)
CREATE TABLE pricing_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_type ENUM('COMPANY', 'BRANCH', 'COLLECTION') NOT NULL,
    entity_id INT NOT NULL COMMENT 'company_id, branch_id, or ring_style_id',
    multiplier DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_type (rule_type),
    INDEX idx_entity (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders (Quote → Approval → Production)
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    company_id INT NOT NULL,
    branch_id INT NOT NULL,
    sales_rep_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    status ENUM('QUOTE', 'PENDING_APPROVAL', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED') DEFAULT 'QUOTE',
    total_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (sales_rep_id) REFERENCES users(id),
    INDEX idx_order_number (order_number),
    INDEX idx_company (company_id),
    INDEX idx_branch (branch_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items (Configured rings)
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    ring_style_id INT NOT NULL,
    configuration JSON NOT NULL COMMENT 'Stores selected options',
    quantity INT DEFAULT 1,
    base_cost DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    applied_multiplier DECIMAL(5,2) NOT NULL,
    pricing_breakdown JSON COMMENT 'Stores calculation details',
    shareable_link VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (ring_style_id) REFERENCES ring_styles(id),
    INDEX idx_order (order_id),
    INDEX idx_ring_style (ring_style_id),
    INDEX idx_shareable_link (shareable_link)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Approvals (Workflow tracking)
CREATE TABLE order_approvals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    approver_id INT NOT NULL,
    approver_role ENUM('BRANCH_MANAGER', 'COMPANY_ADMIN') NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    comments TEXT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id),
    INDEX idx_order (order_id),
    INDEX idx_approver (approver_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Foreign Keys for Users
ALTER TABLE users
    ADD CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- Sample Data Seeds
INSERT INTO companies (name, code, email, basic_multiplier) VALUES
('Brilliant Jewelers', 'BJ001', 'admin@brilliantjewelers.com', 1.50),
('Diamond Dynasty', 'DD001', 'admin@diamonddynasty.com', 1.60);

INSERT INTO gold_prices (metal_type, price_per_gram, effective_date, is_current) VALUES
('14K', 45.00, CURDATE(), TRUE),
('18K', 58.00, CURDATE(), TRUE),
('22K', 68.00, CURDATE(), TRUE);

INSERT INTO diamond_prices (quality_grade, price_per_carat, effective_date, is_current) VALUES
('VS1', 5000.00, CURDATE(), TRUE),
('VS2', 4500.00, CURDATE(), TRUE),
('SI1', 4000.00, CURDATE(), TRUE);
