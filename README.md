# Blitz NYC Jewelry Sales Platform

Production-focused multi-tenant jewelry sales platform with:
- Admin Portal (web)
- Sales App (mobile)
- Central API (NestJS + MariaDB)

This README reflects the current implemented software state, especially Admin Portal capabilities.

## 1) Tech Stack
- Backend: NestJS, TypeORM, MariaDB/MySQL
- Admin Portal: React 18, Vite, TypeScript, Tailwind
- Mobile App: Expo React Native
- Auth: JWT + role checks + task-permission checks
- Storage: Local uploads or AWS S3 signed URLs
- AI: Together/OpenAI-compatible integration in AI module
- SPIFF Rewards: internal points engine + Giftbit testbed integration support

## 2) Current Architecture
```text
SalesPlatform/
+-- backend/                 # NestJS API
+-- frontend/                # Admin Portal (web)
+-- mobile/                  # Sales/branch/company app
+-- DATABASE_*.sql           # Incremental DB upgrades
+-- README.md
```

Backend modules:
- `auth`
- `companies`
- `branches`
- `users` (+ branch employee APIs)
- `products`
- `pricing` (+ company-admin pricing controller)
- `orders`
- `spiff`
- `ai`

## 3) Roles and Permission Model

### Roles
- `SUPER_ADMIN`
- `INTERNAL_REP`
- `COMPANY_ADMIN`
- `BRANCH_MANAGER`
- `SALES_REP`

### Task Permissions
- `COMPANY_MANAGEMENT`
- `BRANCH_MANAGEMENT`
- `USER_MANAGEMENT`
- `DESIGN_ENTRIES`
- `ORDER_ENTRIES`
- `ORDER_APPROVALS`
- `PRICING_CONFIGURATION`
- `VIEW_REPORTS`

### Platform Access Gating
Login payload supports:
- `clientPlatform: ADMIN_PORTAL`
- `clientPlatform: MOBILE_APP`

Current access rules:
- Admin Portal login allowed: `SUPER_ADMIN`, `INTERNAL_REP`, `COMPANY_ADMIN`, `BRANCH_MANAGER`
- Mobile login allowed: `SALES_REP`, `BRANCH_MANAGER`, `COMPANY_ADMIN`

## 4) Admin Portal: What Is Built

### 4.1 Authentication and Shell
- Branded Blitz theme login UI
- Role-aware route guarding
- Sidebar menu visibility by role + task permission
- Redirects:
  - Company Admin / Branch Manager -> `/orders`
  - Super Admin / Internal Rep -> `/dashboard`

### 4.2 Dashboard
- Available to: `SUPER_ADMIN`, `INTERNAL_REP`
- KPI and management dashboard modules integrated with backend summary APIs

### 4.3 Companies
- Available to: `SUPER_ADMIN`, `INTERNAL_REP` (UI route)
- Company lifecycle management
- Company pricing mode support and assignment metadata

### 4.4 Branches
- Available to: `SUPER_ADMIN`, `INTERNAL_REP`, `COMPANY_ADMIN` (with `BRANCH_MANAGEMENT`)
- Branch CRUD, status, and pricing slabs
- Company Admin scope is enforced to own company only

### 4.5 Users
- Available to: `SUPER_ADMIN`, `COMPANY_ADMIN` (with `USER_MANAGEMENT`)
- Add/Edit/Activate/Deactivate users
- Profile photo upload
- Task permission configuration
- Super Admin can fully edit role permissions
- Company Admin restrictions:
  - Can manage only `BRANCH_MANAGER` and `SALES_REP`
  - Only within own company
  - Import/Export template actions hidden in UI and protected in backend

### 4.6 Designs (Products)
- Available via `DESIGN_ENTRIES`
- Implemented:
  - Design CRUD, versioning, primary version
  - Design media gallery + STL upload/view
  - Process stages / pricing tiers / vendors / relevant design mapping
  - Stone packet management
  - Design masters management
  - Import/Export (designs, masters, packets)
  - Design history tracking

#### Version Builder (new UI prototype)
- Action button at design row level
- Single-base-design workflow (no multi-design batch)
- Multi-step UI:
  - Dimension selection
  - Image strategy (inherit/map/set-later)
  - Gemstone block strategy (inherit/override)
  - Preview
- Supports:
  - Metal-wise multi-image mapping
  - Inline new image upload in builder
  - Preview includes image summary + gemstone plan summary
- Status: UI-only mock, create API wiring pending

### 4.7 Orders
- Available via `ORDER_ENTRIES`
- Quote/order creation and updates
- Status updates and active/inactive status
- Summary/trend endpoints
- Role-based behavior is implemented for admin/company/branch contexts

### 4.8 Pricing
- Company Admin pricing API implemented (`/pricing/company-admin/*`)
- Company-wide and branch pricing update flows
- Mark-up logic integrated in order/design pricing flows

### 4.9 SPIFF Rewards
- SPIFF config, summary, leaderboard, claims, review, fulfill flows implemented
- Conversion rate support and claim lifecycle integrated
- Giftbit integration hooks present (including auto-fulfill flag support)

## 5) API Surface (High-Level)

Base path: `/api`

Main controllers:
- `/auth`
- `/companies`
- `/branches`
- `/users`
- `/branch-employees`
- `/products`
- `/orders`
- `/pricing`
- `/pricing/company-admin`
- `/spiff`
- `/ai`

Important note:
- Most admin/business endpoints are protected by JWT + role guard + task-permission guard.
- Frontend visibility and backend authorization are both enforced.

## 6) Database and Upgrade Scripts

Root contains multiple `DATABASE_*.sql` files for incremental upgrades.

Key currently used upgrades include:
- SPIFF upgrades and collation fix
- User last-seen and photo upgrades
- Design metadata and primary-version upgrades
- Embed/media-related upgrades

Backend helper scripts:
- `npm run db:upgrade` (applies known SQL upgrade sequence; skips missing files)
- `npm run db:migrate:railway-to-ec2`
- `npm run spiff:backfill`
- `npm run spiff:reset-claims`

## 7) Local Setup

### 7.1 Backend
```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

### 7.2 Admin Portal
```bash
cd frontend
npm install
# set VITE_API_URL in frontend/.env
npm run dev
```

### 7.3 Mobile
```bash
cd mobile
npm install
# set EXPO_PUBLIC_API_BASE_URL in mobile/.env
npm run start
```

## 8) Environment Notes
- Admin frontend points to `VITE_API_URL`
- Mobile points to `EXPO_PUBLIC_API_BASE_URL`
- For EAS builds, API URL must also be set in `mobile/eas.json` build profile env
- Backend supports:
  - local filesystem uploads
  - S3 uploads with signed URL resolution
  - production CORS allowlist

## 9) Known Gaps / In Progress
- Version Builder is UI-ready but not yet wired to backend batch-create endpoint
- Some legacy SQL script names referenced by upgrader may not exist in all environments
- Large frontend chunk warning remains (optimization task, not a functional blocker)

## 10) Recommended Next Build Items
1. Wire Version Builder `Create Versions` to backend batch job endpoint
2. Add backend batch status/audit logs for bulk version creation
3. Add rollback support for version-builder batch runs
4. Expand admin reporting exports for SPIFF + Orders combined
5. Add smoke test checklist for role access matrix before each release

## 11) Admin Portal Walkthrough (Client Demo Script)

Use this sequence to explain the current admin software end-to-end:

1. **Login and Access Control**
- Login is role-gated at API layer.
- `SUPER_ADMIN`, `INTERNAL_REP`, `COMPANY_ADMIN`, `BRANCH_MANAGER` can access web admin.
- Post-login landing:
  - Super Admin / Internal Rep -> dashboard
  - Company Admin / Branch Manager -> orders

2. **Dashboard (Top-Level Monitoring)**
- Super Admin and Internal Rep get global operational visibility.
- KPI widgets and summary blocks are backed by live API data.

3. **Company Management**
- Create/edit company records and base settings.
- Pricing mode and assignment metadata maintained here.
- Company-scoped controls are enforced in backend.

4. **Branch Management**
- Add/manage branch records per company.
- Branch status and branch-level pricing slab control.
- Company Admin can only manage own-company branches.

5. **User Management**
- User profile, role, photo, status, and task permissions.
- Super Admin can edit all roles and permissions.
- Company Admin can manage only own-company `BRANCH_MANAGER` and `SALES_REP`.

6. **Designs + Versions**
- Full design master with versions, media, STL, packets, vendors, stages, and pricing tiers.
- Import/export tools for design ecosystem data.
- New Version Builder UI is available for single-design bulk version planning:
  - dimension combinations
  - metal-image mapping
  - gemstone strategy
  - preview before creation
- Current status: Builder is UI-ready; backend create execution is pending.

7. **Orders**
- Create and manage quotes/orders.
- Status transitions and order detail updates supported.
- Role behavior is scoped (global/company/branch contexts).

8. **Pricing**
- Company-wide and branch pricing controls.
- Mark-up based pricing pipeline is active and used in calculations.

9. **SPIFF Rewards**
- End-to-end reward lifecycle is implemented:
  - config
  - points/leaderboard
  - claim queue
  - approval/rejection/fulfillment
- Conversion settings and Giftbit integration hooks are present.

10. **Security and Governance**
- Every major feature is protected by JWT + role guard + task-permission guard.
- UI visibility does not bypass backend authorization checks.

## 12) Role Capability Snapshot (Admin Portal)

| Capability | Super Admin | Internal Rep | Company Admin | Branch Manager |
|---|---|---|---|---|
| Global visibility across companies | Yes | Assigned scope | No | No |
| Company management | Yes | Yes (as assigned) | No | No |
| Branch management | Yes | Yes (as assigned) | Yes (own company) | No |
| User management | Yes (all roles) | Limited by permission | Yes (own company reps/managers) | No |
| Designs management | Yes | Yes (if permitted) | Yes (if permitted) | Limited/No (by permission) |
| Orders operations | Yes | Yes | Yes | Yes |
| Pricing configuration | Yes | Yes (if permitted) | Yes (own company/branch) | Scoped branch behavior |
| SPIFF management/review | Yes | Yes (if permitted) | Scoped | Scoped |

## 13) Demo Checklist Before Client Call

1. Verify backend env and API are running on expected domain.
2. Verify login for each role account.
3. Verify role-restricted screens:
- Company Admin cannot cross company boundary.
- Branch Manager cannot access unauthorized management pages.
4. Verify one full flow:
- create order -> update status -> check reporting.
5. Verify one SPIFF flow:
- claim -> approve/reject -> status update.

## 14) SPIFF End-to-End Flow (Tester Guide)

This section explains the implemented SPIFF behavior and how testers should validate it.

### 14.1 Core Config and Tables

1. Core tables:
- `spiff_point_ledger`
- `spiff_redemption_claims`
- `spiff_system_settings`

2. Core config:
- `POINTS_PER_DOLLAR` is stored in `spiff_system_settings`.
- Fallback env if setting not present: `SPIFF_POINTS_PER_DOLLAR` (default `100`).
- Minimum claim points: `SPIFF_MIN_REDEEM_POINTS` (default `500`).

3. Tier rates (defaults from env):
- Closer: `1.00`
- Sharp: `1.25`
- Elite: `1.50`
- Legend: `2.00`

### 14.2 Award Triggers and Formula

1. Quote created points:
- Trigger when order is created/transitioned as `QUOTE`.
- Base points default: `5`.
- Awarded points = `base points x current user tier rate`.

2. Order placed points:
- Trigger only when status moves from non-placed to placed status.
- Placed statuses: `PENDING_APPROVAL`, `APPROVED`, `IN_PRODUCTION`, `SHIPPED`, `COMPLETED`.
- Base points default: `50`.
- Awarded points = `50 x current user tier rate`.

3. Order value bonus:
- Base logic: `floor(orderPrice / 100) x SPIFF_ORDER_VALUE_POINTS_PER_100` (default per-100 is `1`).
- Awarded bonus points = `value bonus x current user tier rate`.

4. Fast close bonus:
- Applied when previous status was `QUOTE` and order age is within 24 hours.
- Base fast close points default: `30`.
- Awarded points = `30 x current user tier rate`.

5. Idempotency:
- Ledger entries are protected via unique `event_key`.
- Repeating same transition does not duplicate points.

### 14.3 Wallet States and Math

1. `totalEarnedPoints`:
- Sum of all positive ledger points.

2. `lockedPoints`:
- Ledger points tied to orders not yet `SHIPPED` or `COMPLETED`.

3. `unlockedPoints`:
- `totalEarnedPoints - lockedPoints`.

4. `committedPoints`:
- Sum of claim points in statuses: `PENDING_REVIEW`, `HOLD`, `APPROVED`, `FULFILLED`.

5. `availablePoints`:
- `unlockedPoints - committedPoints`.

6. `fulfilledClaimedPoints`:
- Sum of claim points in `FULFILLED`.

### 14.4 Redemption and Approval Lifecycle

1. Claim creation:
- Allowed for `SALES_REP` and `COMPANY_ADMIN`.
- One open claim max per user across statuses: `PENDING_REVIEW`, `HOLD`, `APPROVED`.
- Requested points must be `>= minRedeemPoints`.
- Requested points must be `<= availablePoints`.
- Amount calc at claim time:
- `requestedAmountCents = floor((requestedPoints * 100) / pointsPerDollar)`.

2. Claim states:
- `PENDING_REVIEW` -> `HOLD` / `APPROVED` / `REJECTED`
- `APPROVED` -> `FULFILLED` (manual or auto)
- `REJECTED` and `FULFILLED` are terminal for normal review path

3. Who can review claims:
- `SUPER_ADMIN` (all scope)
- `COMPANY_ADMIN` (own company)
- `BRANCH_MANAGER` (own branch)

4. Giftbit behavior:
- If `GIFTBIT_AUTO_FULFILL=true` and Giftbit is configured, approval attempts auto link creation.
- If reward link is received, claim auto-moves to `FULFILLED`.
- If auto-fulfill is off/fails, claim remains `APPROVED` and can be fulfilled manually.

5. Rejected claim effect:
- Rejected claims are not counted in `committedPoints`.
- This returns those points back to `availablePoints`.

### 14.5 Leaderboard Scopes

1. Global:
- Allowed for `SUPER_ADMIN` and `COMPANY_ADMIN`.

2. Company:
- Default for company-level users.

3. Branch:
- Default for branch/sales users.

4. Period options:
- `MONTHLY`, `WEEKLY`, `ALL_TIME`.

### 14.6 SPIFF QA Test Cases

1. Quote points test:
- Create quote as sales rep.
- Verify one ledger row with `QUOTE_CREATED`.
- Expected points use current tier rate multiplier.

2. Order placed test:
- Move same quote to a placed status.
- Verify single `ORDER_PLACED` row.
- Verify no duplicates on repeated same-status updates.

3. Value bonus test:
- Use known order price (example `$4,240`).
- Base bonus should be `floor(4240/100)=42` before tier rate.

4. Lock/unlock test:
- Before shipped/completed, order-linked points appear in `lockedPoints`.
- After shipped/completed, those points move out of locked.

5. Claim lifecycle test:
- Submit claim, approve/reject/hold, verify wallet math after each action.
- For auto-fulfill on, verify reward link and `FULFILLED` transition.

## 15) Company and Branch Mark-up Flow (Tester Guide)

This section documents how order selling price is derived from cost price.

### 15.1 Pricing Inputs

1. Design base cost:
- `design.totalValue` is used as `baseCost`.

2. Company mark-up:
- Company default mark-up (`defaultMultiplier`).
- Optional company slab pricing (`enableSlabPricing` + slab ranges).
- Optional collection-level override (`enableCollectionPricing` + collection override rows).

3. Branch mark-up:
- Branch default mark-up (`branchMultiplier`).
- Optional branch slab pricing (`enableSlabPricing` + slab ranges).

### 15.2 Resolution Priority

1. Company mark-up priority:
- Collection override (if enabled and match exists)
- Else company slab match (if enabled and matching cost range)
- Else company default mark-up

2. Branch mark-up priority:
- Branch slab match (if enabled and matching cost range)
- Else branch default mark-up

3. Final order price:
- `finalPrice = baseCost x companyMultiplier x branchMultiplier`
- Price is rounded to money precision.

### 15.3 Example Calculation

1. Example:
- Base cost = `$1,000`
- Company mark-up = `2.00`
- Branch mark-up = `1.50`
- Final selling price = `$1,000 x 2.00 x 1.50 = $3,000`

### 15.4 Company Admin Pricing APIs

1. Read settings:
- `GET /api/pricing/company-admin/settings`

2. Update company pricing:
- `PUT /api/pricing/company-admin/company`

3. Update branch pricing:
- `PUT /api/pricing/company-admin/branches/:branchId`

### 15.5 Validation Rules Testers Should Verify

1. Mark-up bounds:
- Mark-up must remain between `1` and `10`.

2. Slab rules:
- Slab ranges must not overlap.
- `maxCost >= minCost`.
- No negative slab values.

3. Scope rules:
- Company Admin can only update own company and own-company branches.
- Cross-company updates must be rejected by API.

4. Order preview alignment:
- Price preview endpoint and saved order price should match same inputs.

### 15.6 Mark-up QA Test Cases

1. Company default-only test:
- Disable all slabs.
- Verify order uses company default x branch default.

2. Company slab override test:
- Enable company slabs and place cost in slab band.
- Verify company slab multiplier is applied.

3. Collection override test:
- Enable collection override for matching design collection.
- Verify it overrides company default/slab.

4. Branch slab test:
- Enable branch slabs and ensure branch slab applies over branch default.

5. Boundary test:
- Test cost exactly at slab min and max values.
- Confirm inclusive range behavior.
