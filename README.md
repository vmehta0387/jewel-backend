# B2B Jewelry Ring Customization Platform

## Architecture Overview

Multi-tenant SaaS platform for jewelry companies with dynamic ring configuration and pricing.

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Query
- **Backend**: NestJS + TypeORM
- **Database**: MariaDB
- **Auth**: JWT + RBAC

### User Hierarchy
```
Super Admin → Company Admin → Branch Manager → Sales Rep
```

### Core Features (Phase 1)
1. Multi-role authentication with JWT
2. Company & Branch management
3. Dynamic ring configurator (777 SKU combinations)
4. Intelligent pricing engine with multiplier hierarchy
5. Order workflow (Quote → Approval → Production)
6. Media management per configuration

### Pricing Logic
```
Base Cost = (Gold price/gram × weight) + (Diamond count × avg weight × price/carat) + labor
Final Price = Base Cost × Multiplier

Multiplier Hierarchy:
Collection Multiplier > Branch Multiplier > Company Basic Multiplier
```

### Database Schema
- 11 core tables with proper relationships
- Supports 777 SKU combinations via configuration options
- JSON fields for flexible configuration storage
- Shareable configuration links

### Project Structure
```
SalesPlatform/
├── backend/          # NestJS API
├── frontend/         # React SPA
├── DATABASE_SCHEMA.sql
├── API_MODULES.md
└── BOOTSTRAP.md
```

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p
CREATE DATABASE jewelry_platform;
USE jewelry_platform;
SOURCE DATABASE_SCHEMA_PROFESSIONAL.sql;
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run start:dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 4. Super Admin Login
Use the seeded super admin account:

- Email: `admin@jewelryplatform.com`
- Password: `Admin@123`

If you already have an existing database from older builds, run:
```bash
mysql -u root -p jewelry_platform < DATABASE_USER_MANAGEMENT_UPGRADE.sql
mysql -u root -p jewelry_platform < DATABASE_PRODUCTS_MODULE_UPGRADE.sql
```

## Client Review Deployment

Use the deployment runbook:

- [DEPLOYMENT_CLIENT_REVIEW.md](DEPLOYMENT_CLIENT_REVIEW.md)

Recommended stack for review:

- Frontend: Vercel
- Backend: Railway (Docker)
- Database: Railway MySQL

## API Endpoints

### Auth
- POST /api/auth/login
- GET /api/auth/me

`/api/companies`, `/api/branches`, and `/api/users` are protected with JWT + RBAC and currently require `SUPER_ADMIN`.

### Companies
- GET /api/companies
- POST /api/companies
- PATCH /api/companies/:id

### Branches
- GET /api/branches
- GET /api/branches/:id
- POST /api/branches
- PUT /api/branches/:id
- PATCH /api/branches/:id/status

### Users
- GET /api/users
- GET /api/users/:id
- POST /api/users
- PUT /api/users/:id
- PATCH /api/users/:id/status

### Products (Design Management)
- GET /api/products
- GET /api/products/packets
- POST /api/products
- GET /api/products/:id
- PUT /api/products/:id
- PATCH /api/products/:id/status
- DELETE /api/products/:id
- GET /api/products/:id/history
- POST /api/products/:id/relevant-designs
- POST /api/products/:id/process-stages
- POST /api/products/:id/pricing-tiers
- POST /api/products/:id/vendors
- POST /api/products/:id/stl-files

### Pricing
- POST /api/pricing/calculate
- GET /api/pricing/gold-prices
- GET /api/pricing/diamond-prices

### Orders
- GET /api/orders
- POST /api/orders
- POST /api/orders/:id/approve

## Key Entities

### User
- Multi-role support (Super Admin, Company Admin, Branch Manager, Sales Rep)
- Company and Branch association
- Task-level permissions (example: `DESIGN_ENTRIES` only access)

### Company
- Basic multiplier for pricing
- Multi-tenant isolation

### Branch
- Branch-specific multiplier
- Belongs to company

### RingStyle
- Base product template
- Collection type with multiplier
- SKU prefix for combinations

### Order
- Status workflow tracking
- Approval system
- Customer information

### PricingRule
- Flexible multiplier overrides
- Hierarchy enforcement

## Development Notes

- Use TypeORM migrations for schema changes
- Follow NestJS module pattern for scalability
- React Query for server state management
- Tailwind for consistent UI styling
- JWT tokens stored in localStorage
- RBAC guards on all protected routes

## Next Steps

1. Complete super admin branch CRUD and user management
2. Add dashboard KPIs and audit trail for admin actions
3. Expand products configurator APIs and UI
4. Build order workflow and approvals
5. Add media upload functionality
6. Prepare mobile-facing APIs for company and sales users
