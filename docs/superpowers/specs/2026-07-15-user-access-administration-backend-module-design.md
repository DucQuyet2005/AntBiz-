# User Access Administration Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract administrator-facing user listing, role assignment, and account lock management from Next.js Route Handlers into a dedicated backend module. Preserve the existing public endpoints and successful UI contracts while centralizing validation, authorization-aware business rules, persistence, audit records, notifications, email, and Realtime broadcasts.

Approved behavior corrections:

- `page` and `limit` must be positive integers; invalid values return `400`.
- List `role` and `status` filters must use supported database values; invalid values return `400`.
- Search text and lock reasons are trimmed before use.
- Status mutations accept only `active` and `locked`; `pending` remains a signup-lifecycle and list-filter state.
- A lock reason must contain at least ten characters after trimming.
- Assigning the current role or current effective status is an idempotent success and produces no audit, notification, email, or broadcast.
- Audit, notification, email, and Realtime work is best-effort after the primary update succeeds.
- Unexpected and persistence errors return controlled messages rather than raw database details.
- Administrators cannot change their own role or lock/unlock their own account.

## Domain Language

`CONTEXT.md` defines **User Access Administration** as the administrator workflow for finding users, assigning application roles, and locking or restoring account access.

A **User Access Record** exposes the user identity fields required by the administration screen together with one supported role and one lifecycle status. A **Role Assignment** changes application authority. An **Account Lock** prevents access and records a reason, time, and administrator. Restoring an account clears the lock metadata.

Audit records, administrator Notifications, account email, and Realtime broadcasts are supporting effects. They communicate a completed primary change but do not own it.

## Scope

### Included

- `GET /api/admin/users`
- `PUT /api/admin/users/[id]/role`
- `PUT /api/admin/users/[id]/status`
- User search, role/status filtering, ordering, and pagination
- Admin authorization at the HTTP boundary
- Role assignment rules
- Account lock and restore rules
- Audit-log creation for completed mutations
- Existing administrator Notification creation
- Existing lock/unlock email delivery
- Existing user-update Realtime broadcast
- Route, module, schema, repository, and effects tests

### Excluded

- `GET /api/admin/audit-logs`, which belongs to a future Audit Reporting module
- `/api/users/me/change-password`, which belongs to Account Security
- User signup, approval, invitation, deletion, or profile editing
- Mutating a user back to `pending`
- Frontend changes
- Database schema, enum, migration, constraint, or RLS changes
- Durable queues, retries, or an outbox for supporting effects
- Changes to authentication middleware or locked-user enforcement
- Refactoring the Notification Management module, email templates, or Realtime infrastructure

## Chosen Architecture

Create one bounded context at `backend/modules/user-access-administration/`. This keeps the closely related administrator directory and access mutations together while keeping HTTP and provider details outside the application workflow.

### `user-access-administration-module.ts`

Exposes operations for:

- listing User Access Records;
- assigning a supported role;
- locking an account;
- restoring a locked account to active status.

The module coordinates schemas, self-mutation rules, current-state comparison, repository writes, and post-commit effects. It receives the authenticated administrator identity explicitly and does not import `NextRequest`, `NextResponse`, cookies, headers, or environment variables.

### `user-access-administration-repository.ts`

Defines the persistence contract and Supabase implementation for:

- listing users with count, search, filters, ordering, and range;
- retrieving the current role and status of one target user;
- updating a role;
- setting `locked`, `locked_reason`, `locked_at`, and `locked_by`;
- restoring `active` while clearing all lock metadata.

Repository responses are mapped to module types instead of exposing raw Supabase result objects. Database errors are wrapped in a controlled repository error.

### `user-access-administration-schemas.ts`

Defines request-independent parsing and validation for:

- positive integer `page` and `limit` values;
- trimmed optional search text;
- list roles: `admin`, `marketer_full`, and `marketer_content`;
- list statuses: `pending`, `active`, and `locked`;
- role mutation values using the supported role set;
- status mutation values limited to `active` and `locked`;
- trimmed lock reasons of at least ten characters when locking.

The schema layer rejects malformed input before repository access.

### `user-access-administration-types.ts`

Defines supported roles and statuses, the administrator actor, User Access Records, list inputs and results, role/status mutation inputs, and mutation results. A successful mutation result records whether a change occurred so Route Handlers can expose `unchanged: true` for no-op requests without inventing supporting events.

### `user-access-administration-errors.ts`

Defines typed validation, forbidden, not-found, and persistence errors with stable client-safe messages.

### `user-access-effects.ts`

Defines a port plus production adapter for completed access mutations. The adapter delegates to the existing audit, Notification Management, email, and Realtime facilities. The module invokes effects only after the repository update succeeds and contains failures at this boundary.

## HTTP Boundaries

The three affected Route Handlers remain responsible for:

1. authenticating the session and requiring `admin` through the shared authorization helper;
2. reading query parameters, dynamic parameters, and JSON bodies;
3. awaiting dynamic `params` as required by Next.js 16;
4. constructing the module with production repository and effects adapters;
5. invoking one application operation;
6. mapping typed errors to HTTP responses;
7. returning response shapes compatible with the existing administration UI.

Authorization is performed before application work. The actor ID passed to the module remains the source for self-mutation checks, lock attribution, audit attribution, and effect metadata.

## Workflows

### List Users

1. Authenticate and authorize the administrator.
2. Parse `search`, `role`, `status`, `page`, and `limit`.
3. Reject invalid pagination or unsupported filter values with `400`.
4. Trim search text and treat an empty result as no search restriction.
5. Query users with exact count, stable ordering, and the requested range.
6. Return the existing data and pagination metadata expected by the administration screen.

`pending` remains a valid list filter because it describes account lifecycle state even though it is not a valid target for an administrator status mutation.

### Assign Role

1. Authenticate and authorize the administrator.
2. Await and validate the target user ID and JSON body.
3. Reject attempts to change the actor's own role with `403`.
4. Load the target user's current role and email; return `404` when absent.
5. If the requested role equals the current role, return a successful no-op result.
6. Update the target role.
7. After success, best-effort:
   - write the `change_role` audit record;
   - notify administrators using the existing Notification service;
   - broadcast the new role through the existing Realtime channel.
8. Return the existing success payload, with `unchanged: true` only for a no-op.

### Lock Account

1. Authenticate and authorize the administrator.
2. Validate target ID, `status: "locked"`, and the trimmed lock reason.
3. Reject self-mutation with `403`.
4. Load the target user; return `404` when absent.
5. If the account is already locked with the same normalized reason, return a successful no-op result.
6. Set status to `locked` and record the normalized reason, current time, and administrator ID.
7. After success, best-effort:
   - write a `lock_account` audit record;
   - send the existing account-lock email;
   - notify administrators;
   - broadcast the new status and reason.
8. Return the existing success payload, with `unchanged: true` only for a no-op.

Changing the reason on an already locked account is a real mutation and emits effects because the persisted access decision changed.

### Restore Account

1. Authenticate and authorize the administrator.
2. Validate target ID and `status: "active"`.
3. Reject self-mutation with `403`.
4. Load the target user; return `404` when absent.
5. If the account is already active with cleared lock metadata, return a successful no-op result.
6. Set status to `active` and clear `locked_reason`, `locked_at`, and `locked_by`.
7. After success, best-effort:
   - write an `unlock_account` audit record;
   - send the existing account-unlock email;
   - notify administrators;
   - broadcast the active status with no lock reason.
8. Return the existing success payload, with `unchanged: true` only for a no-op.

Requests targeting `pending` return `400`; they never produce misleading unlock audit records or messages.

## Authorization Rules

- Every affected endpoint requires an authenticated user whose persisted role is `admin`.
- The module independently rejects `actor.id === targetUserId` for role and status mutations.
- User-list access is administrator-only.
- The target user's stored state, rather than client-provided previous values, determines no-op behavior and effect metadata.
- Existing database RLS remains defense in depth; the module does not rely on UI visibility as authorization.

## Effects and Consistency

The user update is the primary operation. Audit, Notification, email, and Realtime actions start only after it succeeds.

Effects are best-effort because they span persistence and external delivery mechanisms that cannot share one atomic transaction. An effect failure is logged with the effect type, actor ID, and target ID, then contained. It neither rolls back the user record nor converts the successful HTTP result to `500`.

No-op operations produce no effects. Failed validation, authorization, target lookup, and persistence operations also produce no effects.

This migration does not add retries or guaranteed delivery. If guaranteed propagation becomes a requirement, it should use a durable outbox in a separate infrastructure change.

## Error Policy

HTTP adapters map module outcomes as follows:

- validation error -> `400` for malformed bodies, unsupported filters, invalid pagination, invalid role/status, invalid IDs, or insufficient lock reasons;
- existing authentication response -> `401` for an unauthenticated request;
- authorization or self-mutation error -> `403`;
- target-not-found error -> `404`;
- repository and unexpected errors -> `500` with a controlled generic message.

Raw Supabase messages, stack traces, email details, and service credentials are logged only on the server and are not returned to clients.

Successful response bodies retain the fields consumed by the current UI. A no-op may add `unchanged: true`; changed operations omit it or return it as false according to the existing route contract implementation.

## Testing Strategy

### Schema Tests

Cover:

- default and valid pagination;
- zero, negative, fractional, non-numeric, and missing pagination values;
- trimmed search text;
- all supported and unsupported role filters;
- all supported list statuses;
- rejection of `pending` as a mutation target;
- normalized valid and invalid lock reasons;
- malformed mutation bodies.

### Module Tests

Cover:

- filtered and unfiltered list delegation;
- role assignment success, self-mutation, not found, and no-op;
- lock success, reason update, self-mutation, not found, and no-op;
- restore success, self-mutation, not found, and no-op;
- effects running only after a completed primary update;
- no effects after validation, lookup, authorization, persistence failure, or no-op;
- every effect failure being contained without changing the mutation result.

### Repository Tests

Cover:

- exact count, search expression, role/status equality filters, stable ordering, and pagination range;
- target-state lookup and not-found mapping;
- role update field mapping;
- lock metadata mapping;
- complete lock-metadata clearing during restore;
- controlled wrapping of Supabase errors.

### Route Contract Tests

Cover:

- unauthenticated and non-admin requests;
- successful list and mutation response shapes;
- invalid query parameters and JSON bodies;
- dynamic parameter awaiting;
- self-mutation, not-found, and no-op mapping;
- refusal of `pending` status mutation;
- controlled `500` responses without database-message leakage;
- unchanged compatibility with the current administration UI payloads.

### Effects Tests

Verify that changed role, lock, and restore events map to the existing audit actions, Notification content, email functions, and Realtime payloads. Verify that failures from each individual effect are logged and contained.

## Verification

Run:

1. focused schema, module, repository, effects, and Route Handler tests;
2. existing administration UI tests whose mocks depend on these endpoints;
3. the full Vitest suite;
4. `npx tsc --noEmit`;
5. the repository lint command if available.

The installed Next.js version no longer supports the configured `next lint` command, so that tooling failure is reported separately. Existing unrelated type-check and inline-edit test failures are recorded as baseline and must not be attributed to this migration.

Completion requires thin affected Route Handlers, no frontend or database changes, preserved successful contracts, tests for every approved behavior correction, and no new full-suite or type-check failures.

## Follow-up Work

- Extract Audit Reporting and its list endpoint into its own read-focused module.
- Extract password change and other self-service credentials into Account Security.
- Decide whether pending-user approval needs a dedicated workflow.
- Add a durable outbox if audit or delivery effects require guaranteed propagation.
- Consider database-level protection against last-admin demotion or lockout as a separate product rule.
