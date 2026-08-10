# Activity Tracking Implementation Status

## Goal

Build centralized, optimized mobile activity/audit tracking for meaningful user actions, then save those events on the backend so super admin can review activity by user, date-time, module, and device.

## Required Final Flow

```txt
Mobile user action/change
-> centralized mobile activity tracker
-> background batch upload
-> backend /activity-events/batch API
-> activity_events table
-> super admin activity listing/filter API
```

## Completed Work

### Backend Foundation

- Added `backend/src/modules/activity-events/`
  - `ActivityEvent` TypeORM entity for the `activity_events` table.
  - `POST /activity-events/batch` endpoint for authenticated batch ingestion.
  - `GET /activity-events` endpoint for super admin listing/filtering.
  - Batch payload validation with a max of 50 events per request.
  - Backend-side sensitive value masking for nested `changes` and `data`.
  - Bulk insert for efficient saves.
  - Authenticated backend `userId` is used as the source of truth.
  - `deviceId` is accepted from the event payload or `x-device-id` header.
  - Pagination and filters for user, date range, module, event, device id, entity type, and entity id.

- Added `DATABASE_ACTIVITY_EVENTS_UPGRADE.sql`
  - Creates `activity_events`.
  - Adds indexes for `user_id`, `created_at`, `module`, `device_id`, `entity_type`, `entity_id`, and `user_id + created_at`.

- Updated `backend/src/app.module.ts`
  - Registered `ActivityEventsModule`.

- Updated `backend/scripts/apply-sql-upgrades.js`
  - Includes `DATABASE_ACTIVITY_EVENTS_UPGRADE.sql` in the default upgrade list.

- Verified backend build:

```txt
npm run build
```

### Super Admin Frontend Foundation

- Added `frontend/src/types/activity.types.ts`
  - Shared activity event response/query types.

- Added `frontend/src/services/activityEvents.ts`
  - API client for `GET /activity-events`.

- Added `frontend/src/pages/activity/ActivityEventsPage.tsx`
  - Super admin activity listing page.
  - Filters for user, date range, module, event, device id, entity type, and entity id.
  - Pagination and page-size selection.
  - Expandable JSON display for `changes` and `data`.

- Updated `frontend/src/routes/index.tsx`
  - Added `/activity-events` route restricted to `SUPER_ADMIN`.

- Updated `frontend/src/components/layout/Sidebar.tsx`
  - Added super-admin-only Activity navigation item.

- Fixed existing frontend build blocker in `frontend/src/pages/auth/LoginPage.tsx`
  - Removed unused `Link` import.

- Verified frontend build:

```txt
npm run build
```

### Mobile Foundation

- Added `mobile/src/utils/activityTracker.ts`
  - Central event queue.
  - Background batch flushing.
  - Memory-safe max queue limit.
  - Non-blocking event tracking.
  - Silent retry on upload failure.
  - Sensitive value masking.
  - Supports `userId`, `deviceId`, `module`, `event`, `screen`, `entityType`, `entityId`, `changes`, `data`, and `createdAt`.

- Added `mobile/src/utils/changeDiff.ts`
  - Compares original and current values.
  - Returns only changed fields.
  - Masks sensitive fields like password, token, OTP, PIN, and secret.

- Added `mobile/src/api/activity.ts`
  - Central API sender for `POST /activity-events/batch`.

- Added `mobile/src/utils/activityEvents.ts`
  - Central helper functions for important module events:
    - Design list viewed.
    - Design page loaded.
    - Design filter applied.
    - Design detail viewed.
    - Design options changed.
    - Create order started from design.
    - Order list viewed.
    - Order filter applied.
    - Order detail viewed.
    - Order changed.
    - Order created.
    - Notification list viewed.
    - Notification viewed.
    - Notification action.

- Updated `mobile/src/components/Button.tsx`
  - Shared app button presses now go through the activity tracker.

- Updated `mobile/src/context/AuthContext.tsx`
  - Wired tracker auth token with `configureActivityTracker(() => token)`.
  - Wired activity context with logged-in `userId`.
  - Added stable locally stored mobile `deviceId`.
  - Flushes queued activity after normal and biometric sign-in.

- Updated `mobile/src/api/activity.ts`
  - Sends `x-device-id` header with batch uploads when available.

- Fixed `mobile/src/utils/changeDiff.ts`
  - Resolved TypeScript indexing issue while preserving diff behavior.

- Added screen-level mobile activity tracking
  - `mobile/src/screens/DesignsScreen.tsx`
    - Tracks design list viewed after successful loads.
    - Tracks design page/load-more events.
    - Tracks final applied design filters.
  - `mobile/src/screens/DesignDetailScreen.tsx`
    - Tracks design detail viewed after successful detail/configurator load.
    - Tracks resolved configurator option changes.
    - Tracks create-order-started from design detail.
  - `mobile/src/screens/OrdersScreen.tsx`
    - Tracks order list viewed after successful loads.
    - Tracks order filter applied.
    - Tracks order detail/summary opened.
    - Tracks order active-status, cancel, reject, and approve changes.
    - Tracks notification opens/actions from the orders notification path.
  - `mobile/src/screens/OrderDetailScreen.tsx`
    - Tracks order detail viewed.
    - Tracks delivery-date and manager status changes.
  - `mobile/src/screens/QuoteSummaryScreen.tsx`
    - Tracks order created from summary.
    - Tracks order changes and manager pending decisions.
  - `mobile/src/screens/QuoteBuilderScreen.tsx`
    - Tracks order created from quote builder.
    - Tracks order changes from quote builder edits.
  - `mobile/src/components/NotificationPopover.tsx`
    - Tracks notification list viewed.
    - Tracks notification opened.
    - Tracks mark-read, mark-all-read, and action-opened events.

- Verified mobile type-check:

```txt
npx tsc --noEmit
```

## Pending Work For 100% Completion

### Backend Pending

- Apply `DATABASE_ACTIVITY_EVENTS_UPGRADE.sql` to the target database.
- Optionally add automated backend tests for batch ingestion and super admin filtering.
- Optionally add user display data joins for friendlier names/emails in the super admin activity page.

### Mobile Pending

- Add app version to event context if required.
- Review generic shared button tracking.
  - Keep it only if useful.
  - Remove or reduce it if it becomes noisy.

- Confirm offline behavior.
  - Events should never block user actions.
  - Failed event upload should not break normal API calls.

## Performance Rules

- Do not send every keystroke.
- Do not send every scroll movement.
- Track final applied filters, not filter option clicks before Apply.
- Track scroll-more/page-load events, not raw scroll position.
- Track form/options changes only on Save/Create/Apply.
- Use background batch upload.
- Keep queue size capped.
- Never block user UI/action for activity logging.
- Mask sensitive fields on mobile and backend.

## Current Status

Backend foundation, mobile auth/device wiring, super admin activity UI, and primary mobile screen-level tracker calls are implemented and type-checked. Remaining work is mostly optional tests, friendlier user labels, app-version context, and noise review for generic button tracking.
