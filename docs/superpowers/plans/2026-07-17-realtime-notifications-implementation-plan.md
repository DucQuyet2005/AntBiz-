# Implementation Plan: Real-time Notifications & Dynamic Email Digest

This document maps out the specific development steps, codebase file locations, and check-lists to implement the real-time notifications and dynamic email digest system.

---

## Phase 1: Database Setup & Migration
- [ ] **1.1. Create SQL Migration File**
  - Path: `migrations/20260717_add_notification_settings.sql`
  - Add preference columns to `public.users`: `email_on_success`, `email_on_failure`, `email_digest_enabled`, `email_digest_time`, `last_digest_sent_at`.
  - Add tracking column to `public.notifications`: `email_sent`.
  - Create index `idx_notifications_email_sent` on `notifications` table where `email_sent = FALSE`.
- [ ] **1.2. Execute Migration**
  - Run the SQL statements against the local PostgreSQL / Supabase database.
- [ ] **1.3. Update TypeScript Types**
  - Verify database type generation or update manual type declarations (e.g., `NotificationRecord` in `backend/modules/notifications/notification-types.ts`).

---

## Phase 2: Backend Module & API Core
- [ ] **2.1. Update Notification Repository & Types**
  - Update `backend/modules/notifications/notification-types.ts` to include settings fields.
  - Implement settings fetch/update methods in `backend/modules/notifications/notification-repository.ts`.
  - Add query to grab unsent notifications: `findUnsentNotifications(userId)`.
  - Add mutation to flag notifications as sent: `markEmailsAsSent(notificationIds)`.
- [ ] **2.2. Implement Settings Endpoint**
  - Create `app/api/notifications/settings/route.ts` (GET and PUT routes) calling the Backend Notification Module.
- [ ] **2.3. Modify Scheduled Post Publication Notifier**
  - File: `backend/modules/scheduled-publishing/publication-notifier-adapter.ts`
  - Update `ProductionPublicationNotifier.publication` to fetch user preferences first.
  - If digests are enabled, set notification `email_sent = false` and suppress transactional email.
  - If digests are disabled, inspect user toggles (`email_on_success` or `email_on_failure`) to determine if `logAndNotifyPublishResult` (immediate email) should be triggered.
- [ ] **2.4. Build Digest Cron / Worker**
  - Create a route or script (e.g. `app/api/cron/send-digests/route.ts` or a background runner) that:
    1. Scans for users whose daily digest hour matches the current system hour.
    2. Gathers unsent publication notifications for each user.
    3. Builds the daily HTML dashboard reporting successes and failures.
    4. Dispatches the email via SMTP/Brevo and updates `email_sent = true` and `last_digest_sent_at = NOW()`.

---

## Phase 3: Frontend Module & Real-time Integration
- [ ] **3.1. Create Notification Global Provider**
  - Path: `frontend/modules/notifications/NotificationProvider.tsx`
  - Implement a React Context provider managing state: `notifications`, `unreadCount`, `toasts`, and `isOnline`.
  - Connect to Supabase Realtime channel subscribing to the `notifications` table on `INSERT`.
- [ ] **3.2. Implement Real-time Listening Hook**
  - Hook pushes incoming payloads to Toast queue and updates unread badge counter instantly.
- [ ] **3.3. Offline & Connection Recovery Sync**
  - Observe `window.addEventListener('online')` and `offline`.
  - On `online` re-trigger, sync state by calling `GET /api/notifications?page=1&limit=5` and diffing list to render missing items.

---

## Phase 4: UI Components & Settings Page
- [ ] **4.1. Upgrade Toast System**
  - Modify `components/Toast.tsx` to handle global state-based queueing with Framer Motion slide-in animations, auto-dismiss, and hover freezes.
- [ ] **4.2. Update Header Bell Notification Dropdown**
  - Modify `components/Header.tsx` to consume list data from the new `NotificationProvider`.
  - Integrate visual success/failure indicator icons and transitions inside the dropdown menu items.
- [ ] **4.3. Update Settings View**
  - Modify `components/views/SettingsView.tsx` to display Checkboxes/Switches for `email_on_success`, `email_on_failure`, `email_digest_enabled`, and a dropdown for `email_digest_time`.

---

## Phase 5: Verification & Testing
- [ ] **5.1. Integration Test Verification**
  - Run checks to ensure that a simulated post failure fires both a Toast on screen, increases Bell unread number, and conditionally generates an immediate email.
- [ ] **5.2. Offline Recovery Test**
  - Mock connection dropout and verify network reconnection pulls intermediate database updates gracefully.
