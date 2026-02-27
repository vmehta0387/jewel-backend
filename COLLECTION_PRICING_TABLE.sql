-- Add after company_pricing_slabs table

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
