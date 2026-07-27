# Real-time Notifications and Dynamic Email Digest Design

**Date:** 2026-07-17  
**Status:** Under Review  

---

## 1. Objective

Provide a seamless, non-interruptive feedback loop for marketers on AntBiz. Instead of checking email boxes to verify if a social media post succeeded or failed, users will receive immediate real-time in-app feedback via **Toast Notifications** and an updated **Unread Badge** on the notification bell.

Additionally, to prevent mailbox clutter while maintaining critical alerts, we will implement **Dynamic Email Preferences**. This allows users to choose between immediate emails (for successes, failures, or both), periodic daily digest emails at a user-specified hour, or muting emails entirely in favor of in-app notifications.

---

## 2. Scope

### Included
- **Database Schema Updates:** Add configuration columns to the `users` table and tracking columns to the `notifications` table.
- **Frontend Notification Provider:** Introduce a global `NotificationProvider` at the root layout to manage real-time subscriptions, Toast state, and unread counts.
- **Enhanced Toast UI:** Create a premium glassmorphic Toast component with automatic dismissal, clear indicators for success/failure, and action links.
- **Real-time Engine:** Abstract Supabase Postgres Changes subscription into the global provider to instantly update the UI.
- **Notification Bell Dropdown Update:** Ensure the dropdown in `Header.tsx` reflects real-time list updates and badge count changes instantly.
- **Dynamic Email Routing:** Update the scheduled publishing notifier to check user email preferences before sending immediate emails.
- **Background Digest Worker:** Implement a cron-like background runner to aggregate daily notifications into a unified HTML dashboard email at each user's chosen hour.
- **Resilience Mechanisms:** Handle connection drops, online/offline transitions, and synchronize missed notifications upon reconnection.

### Excluded
- Changing existing notification categories (`all`, `bai-dang`, `prompt`, `lich`, `he-thong`).
- Push notifications (Web Push) or SMS/Slack integration.
- Custom styling settings for the Toast layout (spacing, colors) from the user profile.

---

## 3. Architecture & Domain Boundaries

Following the project architecture rules in `AGENTS.md` and `ARCHITECTURE.md`:
- **Frontend Module:** Introduce `frontend/modules/notifications/` to encapsulate client-side polling, real-time hooks, toast triggers, and network status observers.
- **Backend Module:** Extend `backend/modules/notifications/` to include repository methods for updating user preferences, collecting unsent notifications, and sending digests.
- **Presentation Layer:** Keep `Header.tsx` and `app/(dashboard)/notifications/page.tsx` as thin presentation layers querying the unified provider state.

```
+------------------------------------------------------------+
|                         Browser                            |
|  +--------------------+             +-------------------+  |
|  | Header Bell Icon   |<===========>| Global Toast UI   |  |
|  +--------------------+             +-------------------+  |
|            ^                                  ^            |
|            |                                  |            |
|            v                                  v            |
|      +----------------------------------------------+      |
|      |        NotificationProvider (Context)        |      |
|      |  - useRealtimeNotifications (Supabase WS)    |      |
|      |  - Network Status Observer (Online/Offline)  |      |
|      +----------------------------------------------+      |
+------------------------------|-----------------------------+
                               |
                   Postgres Realtime Channel
                               |
                               v
+------------------------------------------------------------+
|                         Backend                            |
|             +---------------------------------+            |
|             |      Database (PostgreSQL)      |            |
|             |  - users (email preferences)    |            |
|             |  - notifications (email_sent)   |            |
|             +---------------------------------+            |
|                              ^                             |
|                              | DB Queries                  |
|                              v                             |
|             +---------------------------------+            |
|             |       NotificationModule        |            |
|             |  - insert/list/markRead         |            |
|             |  - check & send immediate email |            |
|             +---------------------------------+            |
|                              ^                             |
|                              | Call                        |
|                              v                             |
|             +---------------------------------+            |
|             |      Background Digest Cron     |            |
|             |  - Runs every 15-30 minutes     |            |
|             |  - Sends Daily HTML digests     |            |
|             +---------------------------------+            |
+------------------------------------------------------------+
```

---

## 4. Data Schema & Migrations

A new migration `migrations/20260717_add_notification_settings.sql` will be created to add fields to the existing schemas:

### 4.1. Table `public.users` (Modifications)
Add the following columns to store dynamic notification settings:
- `email_on_success` (BOOLEAN, default `TRUE`): Send immediate email when a post succeeds.
- `email_on_failure` (BOOLEAN, default `TRUE`): Send immediate email when a post fails.
- `email_digest_enabled` (BOOLEAN, default `FALSE`): Toggle daily consolidated emails.
- `email_digest_time` (VARCHAR(5), default `'18:00'`): Hour & minute to send the daily digest (HH:MM format).
- `last_digest_sent_at` (TIMESTAMPTZ, default `NULL`): Timestamp of the last sent digest to prevent duplicates.

### 4.2. Table `public.notifications` (Modifications)
Add tracking field to support digest aggregation:
- `email_sent` (BOOLEAN, default `FALSE`): Indicates whether this notification was already sent via email (immediate or digest).

### 4.3. SQL Migration Draft
```sql
-- Add email notification preferences to public.users
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS email_on_success BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_digest_time VARCHAR(5) NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add email delivery status tracking to public.notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index to speed up unsent notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_email_sent 
  ON public.notifications(user_id, email_sent) 
  WHERE email_sent = FALSE;
```

---

## 5. Detailed Workflows

### 5.1. The Real-time In-App Notification Flow
When a publication completes (success or failure):
1. The **Scheduled Publishing Runner** invokes `ProductionPublicationNotifier.publication(...)`.
2. The notifier inserts a record into the `notifications` table:
   - Type is either `post_success` or `post_failed`.
   - Title and Message contain localized details.
3. Supabase fires a Postgres Write-Ahead Log (WAL) event.
4. The client-side `NotificationProvider` (subscribed to the `user-notifications-[uid]` channel) receives the payload.
5. **Toast Trigger:** The provider inserts the notification payload into its active Toast queue. A glassmorphic Toast slides into the bottom-right corner.
6. **Bell Update:** The provider increments `unreadCount` by 1 and prepends the new item to the active dropdown state.
7. **Auto-Dismiss:** After 5 seconds (configurable), the Toast component transitions out using Framer Motion exit animations.

### 5.2. Post Completion & Email Routing Flow
Upon post completion, immediate emails are sent *only if* the user has not enabled digests, and has opted in for that specific status.

```
                      +-----------------------------+
                      |   Post Publication Result   |
                      +-----------------------------+
                                     |
                                     v
                       [ Insert In-App Notification ]
                                     |
                                     v
                       [ Fetch User Email Settings ]
                                     |
                      +--------------+--------------+
                      |                             |
         email_digest_enabled = true   email_digest_enabled = false
                      |                             |
                      v                             v
           [ Set email_sent = false ]     +---------+---------+
           [ Do not send email now  ]     |                   |
                                    Success result      Failure result
                                          |                   |
                                          v                   v
                               email_on_success=true   email_on_failure=true
                                     |  |                |  |
                                    Yes No              Yes No
                                     |  |                |  |
                                     v  +-------+--------+  v
                             [Send Email]       |      [Set email_sent = false]
                       [Set email_sent = true]  |
                                                v
                                      [Do not send email]
```

### 5.3. Background Digest Email Engine
A cron job runs every 15 minutes (or via a serverless worker route) to process daily digests:
1. Query all users where `email_digest_enabled = true` and `last_digest_sent_at` is either NULL or not within the current calendar day, and the current server time is equal to or greater than the user's `email_digest_time`.
2. For each eligible user:
   - Query all records in the `notifications` table where `user_id = user.id`, `email_sent = false`, and `type` is either `post_success` or `post_failed`.
   - If no unsent notifications are found, update `last_digest_sent_at` to the current time to mark the day as skipped, avoiding unnecessary processing.
   - If notifications exist, aggregate them:
     - Group by platform (Facebook, Threads, Instagram).
     - Split into "Successful Posts" and "Failed Posts".
   - Construct a rich HTML Dashboard email template:
     - *Header:* Brand header and date of the digest.
     - *Summary section:* Circular progress / total stats (e.g., "5/6 Posts Published Successfully today").
     - *Success items:* List with links to published posts.
     - *Failure items:* List with red warning badges and explicit error messages (e.g., "Expired Access Token").
   - Send the consolidated email via Brevo / SMTP.
   - Update those notifications: Set `email_sent = true`.
   - Update the user: Set `last_digest_sent_at = NOW()`.

### 5.4. Network Disconnection & Reconnection Flow (Resilience)
If the browser loses internet connection:
1. `window.addEventListener('offline')` triggers, setting `isOnline = false` in `NotificationProvider`.
2. A subtle offline indicator banner appears at the bottom of the Notification Dropdown (e.g., *"Offline - Real-time updates paused"*).
3. The Supabase socket connection will transition to disconnected state.
4. When `window.addEventListener('online')` triggers:
   - Set `isOnline = true`.
   - Re-establish/subscribe the Supabase Realtime channel.
   - Fetch the latest notifications via `GET /api/notifications?page=1&limit=5`.
   - Diff the fetched list with the current client-side state. If new, un-rendered notifications are found:
     - Prepend them to the list.
     - Update the unread badge count.
     - Trigger a summary toast: *"Back online. Synced [N] new notifications."*

---

## 6. UI & Components Specifications

### 6.1. Glassmorphic Toast Component (`components/Toast.tsx` Upgraded)
- **Position:** Fixed at the bottom-right corner (`fixed bottom-6 right-6 z-[100]`).
- **Styling:**
  - Glassmorphic backdrop blur: `backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border border-slate-200/50 dark:border-zinc-800/50 shadow-2xl`.
  - Rounded corners: `rounded-2xl`.
  - Icon indicators:
    - Success: `CheckCircle2` with emerald-500 fill/glow.
    - Failure: `XCircle` with rose-500 fill/glow.
- **Interactions:**
  - Auto-dismiss: Closes after 5 seconds.
  - Hover freeze: Progress bar/timer pauses when user hovers cursor over the toast.
  - CTA Link: "Xem bài viết" (View post) opens external link in a new tab, or "Kiểm tra lịch đăng" (Check calendar) navigates to content calendar.

### 6.2. Settings View Update (`components/views/SettingsView.tsx`)
Add a new collapsible or nested card section named "Cấu hình nhận thông báo qua Email" (Email Notification Preferences):
- **Immediate Toggle Group:**
  - Switch/Checkbox: "Gửi email khi bài đăng thành công" (binds to `email_on_success`).
  - Switch/Checkbox: "Gửi email khi bài đăng thất bại" (binds to `email_on_failure`).
- **Digest Toggle:**
  - Switch: "Gửi email tổng hợp báo cáo hàng ngày" (binds to `email_digest_enabled`).
  - *(Enabling this automatically disables the immediate inputs in the UI with a helper text explaining that emails will be consolidated).*
- **Digest Time Picker:**
  - Time Dropdown/Input: "Khung giờ nhận email tổng hợp" (binds to `email_digest_time`, options hourly e.g. `17:00`, `18:00`, `19:00`, etc.).

---

## 7. Error Handling Policy

- **Email Send Failure:** If Brevo/SMTP fails during the background digest or immediate send, log the failure to `audit_logs` and do NOT mark `email_sent = true` in the DB. The message will retry on the next execution loop.
- **Realtime Connection Failure:** Gracefully fall back to 30-second polling (existing logic in `Header.tsx`) if the Supabase Realtime channel fails to subscribe or connect after 3 attempts.
- **Timezone Safety:** Server execution of digests must check the user's timezone or assume UTC offset based on target location (e.g. `GMT+7` for Vietnam). `email_digest_time` string is evaluated against user local time.

---

## 8. Testing Strategy

### 8.1. Unit & Module Tests
- **Notification Settings Parser:** Verify validation schemas reject invalid time formats (e.g., "25:00", "18-00") and enforce booleans.
- **Email Digest Generator:** Mock the database and assert that HTML templates include correct numbers of success/failure items and appropriate links.
- **Routing Engine Test:** Ensure correct execution path is chosen when `email_digest_enabled` is true/false.

### 8.2. Integration & Resilience Tests
- **Offline / Reconnection Mocking:** Simulate network state changes in frontend tests and verify that the sync API is queried on the `online` event.
- **Real-time Broadcast Test:** Trigger postgres insertion and verify the global `NotificationProvider` state captures the event and populates the Toast state.
- **Worker Cron Test:** Mock current server time and verify users only receive digests exactly once at their preferred hour.

---

## 9. Next Steps (Implementation Phases)

1. **Phase 1: DB Migration** - Deploy table schema changes to Supabase.
2. **Phase 2: Backend Module Extensions** - Implement settings update API, update publication email routing, and build the background digest cron script.
3. **Phase 3: Frontend State & Realtime Hook** - Refactor Header realtime code into the new global `NotificationProvider` and update the unread count state.
4. **Phase 4: UI Updates** - Upgrade the `Toast` component and integrate the preferences UI inside `SettingsView.tsx`.
5. **Phase 5: Offline Resilience & Sync** - Write and verify offline state handler and sync routines.
