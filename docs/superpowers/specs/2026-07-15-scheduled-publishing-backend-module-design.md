# Scheduled Publishing Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the complete Scheduled Publishing lifecycle from Next.js Route Handlers and `lib/scheduler/scheduler.ts` into a dedicated backend module. The module owns scheduling, rescheduling, cancellation, calendar projections and exports, due-publication execution, platform dispatch, result persistence, and supporting notifications while preserving public URLs and successful response shapes.

Approved behavior corrections:

- Single and bulk rescheduling require a future time and only update pending Scheduled Posts.
- Bulk rescheduling does not report silent success when requested posts are missing, unauthorized, no longer pending, or changed concurrently.
- A missing Threads credential produces a failed publication instead of a fake successful `mock_*` post ID.
- Token-backed iCalendar subscriptions only return Scheduled Posts created by the token owner.
- Publication and scheduling notifications remain best-effort and cannot change the primary result.

## Domain Language

`CONTEXT.md` defines **Scheduled Publishing** as the lifecycle that turns an approved Caption into a timed social publication.

A **Scheduled Post** records the creator, platform, future publication time, optional media, and lifecycle status. The **Publication Runner** claims due Scheduled Posts, resolves a linked account, invokes a platform publisher, records the result, and synchronizes the Caption status. Calendar views and exports are read projections of the same Scheduled Publishing data.

## Scope

### Included

- `GET /api/scheduled-posts`
- `POST /api/scheduled-posts`
- `PUT` and `PATCH /api/scheduled-posts/[id]`
- `POST /api/scheduled-posts/[id]/cancel`
- `PUT` and `PATCH /api/scheduled-posts/bulk-reschedule`
- `GET /api/calendar`
- `GET /api/calendar/export/csv`
- `GET /api/calendar/export/ical`
- `GET /api/cron/run-scheduler`
- `runSchedulerCycle` compatibility entry point
- Scheduling and rescheduling validation
- Caption and media eligibility checks
- Scheduled Post state transitions
- Calendar filtering and GMT+7 event projection
- CSV and iCalendar serialization
- Facebook, Instagram, and Threads publication dispatch
- Linked-account resolution
- Publication result persistence and Caption status synchronization
- Notification, email, and audit side effects
- Route contract, module, repository, projection, export, and adapter tests

### Excluded

- `GET /api/calendar/token` authentication and token-generation internals; the route remains in place
- Dashboard statistics and trending APIs
- A/B test completion
- Linked-account OAuth and account-management routes
- Platform publisher implementation rewrites in `lib/facebook.ts`, `lib/instagram.ts`, and `lib/threads.ts`
- Frontend changes
- Database schema, enum, migration, constraint, or RLS changes
- A new job queue, retry schedule, or exponential-backoff policy
- A new `processing` Scheduled Post status or worker-crash recovery mechanism
- Changing public URLs or successful response bodies

## Chosen Architecture

Create one bounded context at `backend/modules/scheduled-publishing/` with small, independently testable units. This keeps the full lifecycle together without replacing the current large Route Handlers with a single large domain file.

### `scheduled-publishing-module.ts`

Exposes application operations for:

- listing Scheduled Posts;
- creating a schedule or updating the Caption's existing pending schedule;
- rescheduling one pending post;
- rescheduling a validated set of pending posts;
- cancelling a pending post;
- running one due-publication cycle.

The module coordinates validation, repository operations, publishers, and best-effort side effects. It does not import `NextRequest`, `NextResponse`, cookies, headers, or Route Handler code.

### `scheduled-publishing-repository.ts`

Owns persistence for:

- Scheduled Post list and calendar queries;
- Caption lookup and status updates;
- existing pending schedule lookup;
- create, reschedule, bulk reschedule, cancellation, and result updates;
- due-post lookup and conditional claim;
- linked-account lookup.

The session-backed repository preserves existing RLS behavior for user operations. The runner uses the existing service-role client behavior for cron execution. Repository results use domain types rather than leaking Supabase response objects into the module.

### `scheduled-publishing-schemas.ts`

Defines request-independent schemas for schedule creation, single rescheduling, bulk rescheduling, date filters, platform filters, media URLs, and normalized platform values. It accepts the compatibility alias `threads` and normalizes it to the database value `thread`.

### `calendar-projection.ts`

Converts Scheduled Posts into the existing FullCalendar event shape. It preserves:

- GMT+7 hourly grouping;
- single-post titles and 30-minute display duration;
- multi-post grouping and one-hour display duration;
- editable flags for pending posts;
- dimmed class names for cancelled and failed posts;
- `thread` to `threads` presentation normalization;
- existing `extendedProps` shapes.

### `calendar-export.ts`

Contains pure CSV and iCalendar serializers. CSV preserves the UTF-8 BOM, current headings, platform/status labels, GMT+7 formatting, quoting, and download filename. iCalendar preserves the current calendar fields, text escaping, status descriptions, and download filename.

### `social-publisher-adapter.ts`

Defines one publisher contract that accepts a platform, text, media URLs, and resolved account credentials and returns a normalized result:

```ts
type PublicationResult =
  | { success: true; postId: string }
  | { success: false; error: string };
```

The production adapter delegates to the existing Facebook, Instagram, and Threads helpers. It contains platform selection and current retry counts, but does not expose provider-specific response objects to the module. Missing credentials never become simulated success.

### `publication-notifier-adapter.ts`

Wraps the existing in-app notification and publish-result logging/email functions. Every operation is best-effort: failure is logged and swallowed after the primary persistence or publication result has been established.

### Supporting Files

- `scheduled-publishing-types.ts` defines domain inputs, records, ports, and results.
- `errors.ts` defines typed validation, not-found, forbidden, conflict, and persistence errors.

## HTTP and Compatibility Boundaries

The affected Route Handlers remain responsible for:

1. authenticating the caller or validating the cron secret;
2. reading URL parameters, query parameters, and JSON bodies;
3. constructing the session-backed module adapter;
4. invoking one module operation;
5. mapping typed errors to the existing Vietnamese HTTP responses;
6. formatting JSON, CSV, iCalendar, or cron responses.

Dynamic route `params` remain asynchronous and are awaited as required by the local Next.js 16 documentation. These request- and database-dependent Route Handlers remain dynamic and are not opted into caching.

`lib/scheduler/scheduler.ts` remains as a compatibility wrapper. `runSchedulerCycle()` delegates to the new module. `initScheduler()` retains interval initialization compatibility but contains no publication workflow.

`GET /api/calendar/token` keeps its existing authentication and token-generation implementation. The iCalendar route validates the token as it does today and passes the verified `userId` into the module as a mandatory creator filter.

## Workflows

### List Scheduled Posts

1. The route authenticates an allowed role.
2. The module requests the ordered Scheduled Post projection from the session repository.
3. The route returns the existing `{ data }` response.

Authenticated read visibility continues to follow the existing RLS policy.

### Create or Replace a Pending Schedule

1. Parse and validate the body.
2. Require `captionId` and a valid future `scheduledAt`.
3. Load the Caption and its Article title.
4. Use edited content before AI content.
5. Reject Threads content above 500 characters.
6. Reject Instagram content above 2,200 characters.
7. Normalize `imageUrls`, falling back to the compatibility `mediaUrl` value.
8. Require a valid HTTP(S) primary image for Instagram.
9. Look for an existing pending schedule for the Caption.
10. Update the existing schedule and return `200`, or create a new schedule and return `201`.
11. Synchronize the Caption to `scheduled`.
12. Attempt the existing scheduling notification without changing the primary result if it fails.

Public success bodies remain `{ data: scheduledPost }`.

### Reschedule One Post

1. Validate a future `scheduledAt`.
2. Load the Scheduled Post.
3. Require owner or admin authorization.
4. Require status `pending`.
5. Conditionally update the matching pending post.
6. Treat a lost conditional update as a conflict rather than silent success.
7. Attempt the existing rescheduling notification.

`PUT` remains an alias of `PATCH`.

### Bulk Reschedule

1. Require a non-empty, duplicate-free ID array and a future `scheduledAt`.
2. Load the requested Scheduled Posts under the caller's access rules.
3. Verify that every requested ID exists, is authorized, and is pending.
4. Update only the verified pending IDs with a conditional status filter.
5. Require the returned updated-ID set to match the requested set; otherwise return a conflict.
6. Attempt one best-effort rescheduling notification per updated post.

`PATCH` remains an alias of `PUT`.

### Cancel a Schedule

1. Load the Scheduled Post.
2. Require the creator or an admin.
3. Require status `pending`.
4. Conditionally change it to `cancelled`.
5. Restore the associated Caption to `approved`.
6. Return the existing success body.

### Calendar Projection and Export

1. Parse optional date and platform filters.
2. Normalize `fb`, `ig`, and `threads` filter aliases.
3. Load matching Scheduled Posts ordered by publication time.
4. For `/api/calendar`, transform them with `calendar-projection.ts`.
5. For CSV and iCalendar, serialize them with `calendar-export.ts`.
6. For token-backed iCalendar, require `created_by` to equal the verified token owner.

Session-authenticated calendar reads otherwise preserve existing RLS visibility.

### Run Due Publications

1. The cron route validates `CRON_SECRET` in production and invokes the runner.
2. The runner loads all `pending` Scheduled Posts due at or before the injected current time.
3. For each post, the repository performs the existing conditional claim so only one worker proceeds.
4. Resolve Caption text, Article title, creator, normalized platform, linked account, and media URLs.
5. Invoke the platform adapter. Threads and Instagram preserve the current maximum of three immediate attempts; Facebook preserves its single attempt. A retry-policy redesign is excluded.
6. On success, persist the platform-specific external ID, `post_result`, timestamps, and final `posted` state, then set the Caption to `posted`.
7. On failure, persist `failed`, clear provisional `posted_at`, and save `failed_at`, `failure_reason`, and `post_result`.
8. Attempt publish-result logging/email and in-app notification without changing the saved result.
9. Continue processing remaining due posts after any per-post error.

The database enum has no `processing` value. The conditional claim therefore preserves the existing provisional transition through `posted`. Adding a real processing state and stale-claim recovery requires a separate schema-backed design.

## State and Authorization Rules

- Creation requires the existing allowed roles: `admin`, `marketer_full`, or `marketer_content`.
- Single reschedule and cancellation require the creator or an admin.
- Bulk reschedule applies the same per-post authorization rule.
- Reschedule and cancellation only apply to `pending` posts.
- Schedule and reschedule times must be strictly in the future at operation time.
- Publication completion transitions a Caption to `posted` only after provider success.
- Cancellation restores the Caption to `approved`.
- Existing authenticated read visibility remains governed by RLS.
- Cron execution uses the service-role repository and is protected by the existing production secret rule.

## Error Policy

The domain exposes typed errors that HTTP adapters translate as follows:

- `ValidationError` -> `400` for malformed or invalid inputs.
- `NotFoundError` -> `404` for missing Captions or Scheduled Posts.
- `ForbiddenError` -> `403` for ownership failures.
- `ConflictError` -> `409` when a post is no longer pending or a conditional/bulk update loses a race.
- `PersistenceError` and unexpected errors -> `500` without exposing Supabase details or credentials.

Existing Vietnamese error text is retained where the existing status and meaning are unchanged. Approved state and concurrency corrections receive controlled Vietnamese messages. Provider exceptions are normalized into failed publication results. A single post failure never aborts the rest of the due batch.

Notification, email, and audit errors are logged and swallowed. They cannot convert a successful schedule or publication into failure and cannot convert a failed publication into success.

## Testing Strategy

### Module Tests

Cover:

- creating a new schedule and replacing an existing pending schedule;
- invalid JSON-equivalent inputs, invalid dates, and non-future dates;
- Threads and Instagram length validation;
- Instagram media validation;
- single and bulk pending-only rescheduling;
- duplicate, missing, unauthorized, and concurrently changed bulk IDs;
- cancellation ownership and state rules;
- Caption status synchronization;
- best-effort notification behavior.

### Publication Runner Tests

Cover:

- selecting only due pending posts;
- conditional claim and duplicate-worker avoidance;
- platform normalization and publisher selection;
- linked-account credential delivery;
- missing Threads credentials producing failure rather than fake success;
- success result and platform-specific external-ID persistence;
- failed result persistence;
- Caption transition only after successful publication;
- one failed post not stopping later posts;
- notification, email, and audit failures not changing results;
- deterministic time and retry behavior through injected dependencies.

### Repository and Adapter Tests

Use focused contract-style tests for Supabase query shapes, conditional status filters, creator filters, linked-account lookup, result mapping, and platform-helper argument mapping. Do not duplicate third-party helper internals.

### Projection and Export Tests

Cover:

- date and platform aliases;
- GMT+7 grouping;
- single and grouped FullCalendar event shapes;
- platform presentation normalization;
- CSV BOM, headings, labels, escaping, and GMT+7 date formatting;
- iCalendar fields and escaping;
- token-owner filtering.

### Route Contract Tests

Preserve and focus tests for:

- authentication and role failures;
- malformed JSON;
- dynamic parameter awaiting;
- typed error-to-status mapping;
- existing successful JSON and file responses;
- `PUT`/`PATCH` aliases;
- production cron-secret behavior.

Existing route-heavy mocks should be reduced in favor of module and repository tests, following the already migrated backend modules.

## Verification

Run:

1. focused Scheduled Publishing, calendar, export, and cron tests;
2. the full Vitest suite;
3. `npx tsc --noEmit`;
4. the repository lint command if available.

The project currently declares `next lint`, which may be incompatible with Next.js 16. If so, report that tooling failure separately rather than changing lint configuration within this migration.

Completion requires thin affected Route Handlers, no frontend or database changes, preserved successful contracts, all approved corrections covered by tests, and no regression in the full test and type-check results.

## Follow-up Work

The following concerns need separate designs because they change persistence or operational policy:

- add a real `processing` state and stale-claim recovery;
- move publication to a durable queue;
- define exponential backoff and delayed retry policy across all platforms;
- add database constraints for one pending schedule per Caption;
- make Caption/Scheduled Post state changes transactional;
- review organization-wide versus creator-only read visibility in RLS.
