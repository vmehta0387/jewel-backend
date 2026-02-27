-- Professional Company Management Schema with Structured Addresses

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_approvals;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS pricing_rules;
DROP TABLE IF EXISTS collection_pricing_overrides;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS company_pricing_slabs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;

SET FOREIGN_KEY_CHECKS = 1;

-- Companies Table (Professional Structure)
CREATE TABLE companies (
    id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    account_manager_id VARCHAR(36) NULL,
    
    -- Structured Address Fields
    street_address VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Contact Information
    primary_email VARCHAR(255),
    primary_phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Shipping Configuration
    ship_to_type ENUM('MAIN_ADDRESS', 'MAIN_BRANCH', 'CUSTOM') DEFAULT 'MAIN_ADDRESS',
    ship_street_address VARCHAR(255),
    ship_city VARCHAR(100),
    ship_state_province VARCHAR(100),
    ship_postal_code VARCHAR(20),
    ship_country VARCHAR(100),
    
    -- Pricing Configuration
    default_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    enable_slab_pricing BOOLEAN DEFAULT FALSE,
    enable_collection_pricing BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_company_code (company_code),
    INDEX idx_active (is_active),
    INDEX idx_city (city),
    INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Company Pricing Slabs Table
CREATE TABLE company_pricing_slabs (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    min_cost DECIMAL(10,2) NOT NULL,
    max_cost DECIMAL(10,2) NOT NULL,
    multiplier DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_company (company_id),
    INDEX idx_cost_range (min_cost, max_cost)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'SALES_REP', 'INTERNAL_REP') NOT NULL,
    company_id VARCHAR(36) NULL,
    branch_id VARCHAR(36) NULL,
    task_permissions JSON NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branches Table
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    
    -- Structured Address
    street_address VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(50),
    
    branch_multiplier DECIMAL(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_branch_code (company_id, code),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foreign Keys
ALTER TABLE users
    ADD CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE companies
    ADD CONSTRAINT fk_company_account_manager FOREIGN KEY (account_manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Sample Data
-- Default password for seeded users: Admin@123
INSERT INTO users (id, email, password_hash, first_name, last_name, role, task_permissions, phone) VALUES
('super-admin-001', 'admin@jewelryplatform.com', '$2b$10$lHCTuwiNo4xJya9sxg3e5OllxDKHqvLiNthsccHpwXzGqllTB9jcG', 'Admin', 'User', 'SUPER_ADMIN', '["COMPANY_MANAGEMENT","BRANCH_MANAGEMENT","USER_MANAGEMENT","DESIGN_ENTRIES","ORDER_ENTRIES","ORDER_APPROVALS","PRICING_CONFIGURATION","VIEW_REPORTS"]', '+1-555-0100'),
('rep-001', 'john.smith@jewelryplatform.com', '$2b$10$lHCTuwiNo4xJya9sxg3e5OllxDKHqvLiNthsccHpwXzGqllTB9jcG', 'John', 'Smith', 'INTERNAL_REP', '["COMPANY_MANAGEMENT","VIEW_REPORTS"]', '+1-555-0101'),
('rep-002', 'sarah.johnson@jewelryplatform.com', '$2b$10$lHCTuwiNo4xJya9sxg3e5OllxDKHqvLiNthsccHpwXzGqllTB9jcG', 'Sarah', 'Johnson', 'INTERNAL_REP', '["COMPANY_MANAGEMENT","VIEW_REPORTS"]', '+1-555-0102');

INSERT INTO companies (
    id, company_name, company_code, account_manager_id, 
    street_address, city, state_province, postal_code, country,
    primary_email, primary_phone, website,
    default_multiplier, enable_slab_pricing, enable_collection_pricing
) VALUES
(
    'comp-001', 'Brilliant Jewelers Inc.', 'BRILLIANTJEW', 'rep-001',
    '123 Diamond Street', 'New York', 'NY', '10001', 'USA',
    'contact@brilliantjewelers.com', '+1-212-555-0100', 'www.brilliantjewelers.com',
    1.50, FALSE, FALSE
),
(
    'comp-002', 'Diamond Dynasty LLC', 'DIAMONDDYN', 'rep-002',
    '456 Gold Avenue', 'Los Angeles', 'CA', '90001', 'USA',
    'info@diamonddynasty.com', '+1-310-555-0200', 'www.diamonddynasty.com',
    2.00, TRUE, TRUE
);

-- Sample Pricing Slabs
INSERT INTO company_pricing_slabs (id, company_id, min_cost, max_cost, multiplier) VALUES
('slab-001', 'comp-002', 0.00, 500.00, 4.00),
('slab-002', 'comp-002', 500.01, 2999.00, 3.00),
('slab-003', 'comp-002', 2999.01, 999999.00, 2.50);

-- Collection Pricing Overrides Table
CREATE TABLE collection_pricing_overrides (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    collection_type ENUM('ENGAGEMENT', 'ETERNITY', 'FLORAL', 'WEDDING_BANDS') NOT NULL,
    multiplier DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_collection (company_id, collection_type),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Collection Pricing Overrides for Diamond Dynasty
INSERT INTO collection_pricing_overrides (id, company_id, collection_type, multiplier) VALUES
('coll-001', 'comp-002', 'ENGAGEMENT', 3.50),
('coll-002', 'comp-002', 'ETERNITY', 3.00);
