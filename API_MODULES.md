# API Module Breakdown

## 1. Auth Module
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

## 2. Users Module
- GET /api/users
- GET /api/users/:id
- POST /api/users
- PATCH /api/users/:id
- DELETE /api/users/:id

## 3. Companies Module
- GET /api/companies
- GET /api/companies/:id
- POST /api/companies
- PATCH /api/companies/:id
- DELETE /api/companies/:id

## 4. Branches Module
- GET /api/branches
- GET /api/branches/:id
- POST /api/branches
- PATCH /api/branches/:id
- DELETE /api/branches/:id

## 5. Products Module
- GET /api/ring-styles
- GET /api/ring-styles/:id
- POST /api/ring-styles
- PATCH /api/ring-styles/:id
- GET /api/ring-styles/:id/options
- POST /api/ring-styles/:id/configure
- GET /api/configurations/:shareableLink

## 6. Pricing Module
- POST /api/pricing/calculate
- GET /api/pricing/gold-prices
- POST /api/pricing/gold-prices
- GET /api/pricing/diamond-prices
- POST /api/pricing/diamond-prices
- GET /api/pricing/rules
- POST /api/pricing/rules

## 7. Orders Module
- GET /api/orders
- GET /api/orders/:id
- POST /api/orders
- PATCH /api/orders/:id
- POST /api/orders/:id/approve
- POST /api/orders/:id/reject

## 8. Media Module
- POST /api/media/upload
- DELETE /api/media/:id
