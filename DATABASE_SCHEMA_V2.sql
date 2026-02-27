-- Updated Company Management Schema

-- Drop existing companies table to recreate with new structure
DROP TABLE IF EXISTS order_approvals;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS pricing_rules;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS company_pricing_slabs;
DROP TABLE IF EXISTS companies;

-- Companies Table (Updated with new fields)
CREATE TABLE companies (
    id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    account_manager_id VARCHAR(36) NULL,
    company_address TEXT,
    country VARCHAR(100),
    default_ship_to_address TEXT,
    ship_to_type ENUM('MAIN_ADDRESS', 'MAIN_BRANCH', 'CUSTOM') DEFAULT 'MAIN_ADDRESS',
    pricing_type ENUM('SIMPLE', 'SLAB_BASED') DEFAULT 'SIMPLE',
    default_multiplier DECIMAL(5,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_code (company_code),
    INDEX idx_active (is_active)
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

-- Users Table (Updated)
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
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    branch_multiplier DECIMAL(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_branch_code (company_id, code),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Foreign Keys
ALTER TABLE users
    ADD CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE companies
    ADD CONSTRAINT fk_company_account_manager FOREIGN KEY (account_manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Sample Data
-- Default password for seeded users: Admin@123
INSERT INTO users (id, email, password_hash, first_name, last_name, role, task_permissions) VALUES
('super-admin-001', 'admin@platform.com', '$2b$10$lHCTuwiNo4xJya9sxg3e5OllxDKHqvLiNthsccHpwXzGqllTB9jcG', 'Super', 'Admin', 'SUPER_ADMIN', '["COMPANY_MANAGEMENT","BRANCH_MANAGEMENT","USER_MANAGEMENT","DESIGN_ENTRIES","ORDER_ENTRIES","ORDER_APPROVALS","PRICING_CONFIGURATION","VIEW_REPORTS"]'),
('rep-001', 'rep1@platform.com', '$2b$10$lHCTuwiNo4xJya9sxg3e5OllxDKHqvLiNthsccHpwXzGqllTB9jcG', 'John', 'Smith', 'INTERNAL_REP', '["COMPANY_MANAGEMENT","VIEW_REPORTS"]'),
('rep-002', 'rep2@platform.com', '$2b$10$lHCTuwiNo4xJya9sxg3e5OllxDKHqvLiNthsccHpwXzGqllTB9jcG', 'Sarah', 'Johnson', 'INTERNAL_REP', '["COMPANY_MANAGEMENT","VIEW_REPORTS"]');

INSERT INTO companies (id, company_name, company_code, account_manager_id, company_address, country, pricing_type, default_multiplier) VALUES
('comp-001', 'Brilliant Jewelers', 'BRILLIANTJEW', 'rep-001', '123 Diamond St, New York', 'USA', 'SIMPLE', 1.50),
('comp-002', 'Diamond Dynasty', 'DIAMONDDYN', 'rep-002', '456 Gold Ave, Los Angeles', 'USA', 'SLAB_BASED', NULL);

-- Sample Pricing Slabs for Diamond Dynasty
INSERT INTO company_pricing_slabs (id, company_id, min_cost, max_cost, multiplier) VALUES
('slab-001', 'comp-002', 0.00, 500.00, 4.00),
('slab-002', 'comp-002', 500.01, 2999.00, 3.00),
('slab-003', 'comp-002', 2999.01, 999999.00, 2.50);
