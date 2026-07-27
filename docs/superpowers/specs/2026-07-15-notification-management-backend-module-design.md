# Notification Management Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the Notification inbox lifecycle and notification creation service into a dedicated backend module. Preserve existing public endpoints, successful response shapes, category behavior, Realtime database events, and producer imports while concentrating authorization, validation, filtering, persistence, and read-state transitions behind one interface.

Approved behavior corrections:

- `page` and `limit` must be positive integers; invalid values return `400`.
- Malformed JSON and unsupported notification types return `400`.
- Admin authorization is read directly from persistence and never creates a side-effect notification during the permission check.
- An authenticated non-admin may create a Notification only for themselves.
- An administrator or valid service-role caller may create a Notification for another user.
- Marking a missing or foreign Notification as read returns `404` instead of a generic persistence `500`.
- Unexpected and persistence errors no longer expose raw database messages to clients.

## Domain Language

`CONTEXT.md` defines **Notification Management** as the owner of a user's persistent in-app inbox.

A **Notification** has one recipient, a supported type, a title, a message, optional metadata, read state, and creation time. A Notification may be created by an internal system producer, an administrator, or a user notifying themselves. The inbox lists role-aware category projections and records read state.

Supabase Realtime is a presentation mechanism that observes persisted Notification changes. It is not part of the Notification Management workflow.

## Scope

### Included

- `GET /api/notifications`
- `POST /api/notifications`
- `PUT /api/notifications/[id]/read`
- `PUT /api/notifications/read-all`
- `lib/services/notificationService.ts`
- Single and bulk internal Notification creation
- API creation authorization for self, admin, and service-role callers
- Pagination and category parsing
- Recipient and role filtering
- Existing `all`, `bai-dang`, `prompt`, `lich`, and `he-thong` category behavior
- Single and bulk read-state transitions
- Compatibility exports for current Notification producers
- Route, module, repository, filter, schema, and compatibility tests

### Excluded

- Frontend Notification components and pages
- Header queries and unread-count state
- Supabase Realtime subscriptions or publication configuration
- Push, SMS, email, or browser Notification delivery
- Notification deletion or retention policy
- User notification preferences
- A durable queue or retry policy
- Changes to Notification types in the database enum
- Database schema, migration, index, or RLS changes
- Refactoring every existing Notification producer

## Chosen Architecture

Create one bounded context at `backend/modules/notifications/`. The module owns inbox behavior and persistence-backed creation. Existing producers retain their current service imports through a compatibility wrapper.

### `notification-module.ts`

Exposes operations for:

- listing a recipient's inbox;
- creating one Notification under an explicit actor policy;
- creating one internal Notification;
- creating multiple internal Notifications;
- marking one owned Notification as read;
- marking all unread Notifications for a recipient as read.

The module coordinates schemas, authorization, filter selection, and repository operations. It does not import `NextRequest`, `NextResponse`, cookies, headers, environment variables, or Route Handler code.

### `notification-repository.ts`

Defines the persistence contract and a Supabase implementation for:

- retrieving the user's role;
- listing Notifications with count, ordering, range, and category filters;
- inserting one Notification;
- inserting multiple Notifications;
- updating one owned Notification to read;
- updating all unread Notifications owned by a user.

Session-backed repositories preserve RLS for inbox reads and mutations. Internal creation uses an admin-backed repository, matching the current service behavior. Repository results are mapped to domain types rather than exposing Supabase response objects.

### `notification-schemas.ts`

Defines request-independent validation for:

- supported types: `post_success`, `post_failed`, `ab_test_complete`, and `info`;
- non-empty `userId`, `title`, and `message`;
- optional metadata;
- positive integer `page` and `limit` values;
- category parsing with the existing `type` query fallback.

Unknown category values continue to mean `all` for compatibility.

### `notification-filters.ts`

Defines the existing category taxonomy independently from HTTP and Supabase execution:

- `bai-dang`: `post_success` and `post_failed` for non-admin users; empty for admins.
- `prompt`: `info` Notifications whose title or message contains `prompt`.
- `lich`: schedule keywords for admins; schedule keywords plus `ab_test_complete` for non-admin users.
- `he-thong`: `info` Notifications excluding prompt and schedule keywords.
- `all`: no category restriction beyond recipient and role rules.

The filter unit produces a typed filter description. The Supabase repository translates that description to PostgREST query operations.

### `notification-types.ts`

Defines Notification records, supported types, categories, list inputs/results, creation inputs, and actors:

- authenticated user actor with user ID and resolved role;
- internal system actor for trusted service creation.

### `errors.ts`

Defines typed validation, not-found, forbidden, and persistence errors with controlled client messages.

## Compatibility Boundary

`lib/services/notificationService.ts` remains at its current path and continues to export:

- `NotificationType`;
- `CreateNotificationInput`;
- `createNotification`;
- `createNotifications`.

The implementation becomes a thin compatibility wrapper that creates an admin-backed Notification module and delegates to internal create operations. Existing Scheduled Publishing, Prompt, A/B Test, profile, landing configuration, password, and administration producers do not need import changes in this migration.

The empty bulk-input behavior remains `[]` without a database call.

## HTTP Boundaries

The affected Route Handlers remain responsible for:

1. authenticating the session or validating the service-role bearer token;
2. reading URL parameters, query parameters, and JSON bodies;
3. awaiting dynamic `params` as required by Next.js 16;
4. constructing the appropriate session-backed or admin-backed module;
5. invoking one module operation;
6. mapping typed errors to HTTP responses;
7. returning the existing successful response shapes.

The service-role secret and `Authorization` header are transport concerns. They are never passed into the domain module.

## Workflows

### List Inbox

1. Authenticate the current user.
2. Parse `page`, `limit`, and `category`, falling back from `category` to the compatibility `type` query parameter.
3. Reject page or limit values that are not positive integers.
4. Resolve the user's persisted role.
5. Build the category filter description.
6. Query Notifications for the authenticated `user_id`, ordered by `created_at` descending and ranged by pagination.
7. Return:

```ts
{
  data: NotificationRecord[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Admins retain the current inbox restriction to `info` Notifications. Admin `bai-dang` requests return an empty result without querying the Notification list.

### Create Through the API

1. Compare the bearer token with the configured service-role secret in the Route Handler.
2. If the service token is valid, use an internal system actor and admin repository.
3. Otherwise authenticate the session and use the session repository to resolve the caller's role.
4. Parse and validate the JSON body and Notification type.
5. Permit creation when:
   - the authenticated recipient is the caller;
   - the caller's persisted role is `admin`; or
   - the caller is the validated internal system actor.
6. Reject cross-user creation by a non-admin with `403`.
7. Insert the Notification through the appropriate repository.
8. Return `{ success: true, data }` with status `201`.

Authorization performs no writes. In particular, the current synthetic `Bảo mật / Kiểm tra quyền hạn` Notification is removed.

### Internal Single and Bulk Creation

1. A compatibility service creates an admin-backed module.
2. Validate every creation input.
3. Map camel-case domain inputs to database fields in the repository.
4. Insert one or many records.
5. Return the persisted record or record array.

An empty bulk input returns `[]` immediately. Invalid entries fail the bulk call before persistence rather than partially inserting a valid prefix.

### Mark One Notification Read

1. Authenticate the current user.
2. Await and validate the Notification ID.
3. Update `is_read = true` using both `id` and `user_id` filters.
4. Use a zero-or-one result rather than a throwing single-row query.
5. If no record is returned, raise a not-found error.
6. Return `{ success: true, data }`.

The same response applies when the owned Notification was already read; the operation is idempotent.

### Mark All Notifications Read

1. Authenticate the current user.
2. Update only records matching `user_id` and `is_read = false`.
3. Return the number of changed records as `{ success: true, count }`.

Calling the operation with no unread Notifications succeeds with count `0`.

## Authorization Rules

- Inbox list, mark-one, and mark-all always act on the authenticated user's recipient ID.
- RLS remains defense in depth, but owner filters are explicit in repository operations.
- Authenticated non-admin users may create Notifications only for their own user ID.
- The persisted `users.role` value determines admin authorization.
- A valid service-role bearer token authorizes internal API creation for any recipient.
- Internal compatibility-service creation uses the admin repository and does not simulate an HTTP caller.
- An invalid or absent service token does not grant system access and falls back to normal session authentication.

## Error Policy

HTTP adapters map domain errors as follows:

- `ValidationError` -> `400` for malformed JSON-equivalent input, missing fields, invalid type, invalid ID, or invalid pagination.
- `NotFoundError` -> `404` when mark-one cannot find an owned Notification.
- `ForbiddenError` -> `403` for unauthorized cross-user creation.
- Existing authentication response -> `401` when neither a valid session nor valid service token is present.
- `NotificationRepositoryError` and unexpected errors -> `500` with a controlled generic message.

Raw Supabase messages, stack traces, and service credentials are logged only on the server and are not returned to clients.

Successful contracts remain:

- create: `{ success: true, data }`, status `201`;
- mark one: `{ success: true, data }`;
- mark all: `{ success: true, count }`;
- list: existing pagination shape.

## Realtime and Presentation

Frontend Header and Notifications page subscriptions remain unchanged. They continue to observe inserts and updates on the `notifications` table filtered by `user_id`. The migration does not add a broadcast layer or change unread-count behavior.

Category labels, icons, translation, relative times, navigation, and client-side rendering remain presentation concerns outside the backend module.

## Testing Strategy

### Module Tests

Cover:

- list pagination and total-page calculation;
- admin and non-admin list behavior;
- every category filter selection;
- unknown category fallback;
- self creation;
- admin cross-user creation;
- system creation;
- forbidden non-admin cross-user creation;
- internal single and bulk creation;
- validation of every supported and unsupported type;
- empty bulk input;
- mark-one success, idempotence, and not-found behavior;
- mark-all count and zero-count behavior.

### Filter Tests

Cover typed descriptions for:

- `bai-dang` type inclusion;
- `prompt` keyword matching;
- `lich` admin and non-admin differences;
- `he-thong` keyword exclusions;
- admin `info` restriction;
- `all` and unknown-category behavior.

### Repository Tests

Use focused contract-style tests for:

- recipient ownership filters;
- role lookup;
- exact count, descending order, and range calculation;
- translation of each filter description to Supabase query operations;
- zero-or-one owned mark-read update;
- unread-only mark-all update;
- admin single and bulk insert mapping;
- persistence error wrapping.

### Route Contract Tests

Preserve and extend tests for:

- session authentication;
- valid and invalid service-role authorization;
- malformed JSON;
- missing fields and invalid Notification types;
- invalid page and limit values;
- admin and self creation;
- forbidden cross-user creation without side effects;
- dynamic parameter awaiting;
- typed error mapping;
- existing successful response shapes.

### Compatibility Tests

Verify that `lib/services/notificationService.ts` keeps its public type and function exports, delegates to an admin-backed module, returns `[]` for empty bulk input, and does not require producer changes.

## Verification

Run:

1. focused Notification module, repository, filter, route, and compatibility tests;
2. tests for important existing Notification producers when their mocks depend on the compatibility service;
3. the full Vitest suite;
4. `npx tsc --noEmit`;
5. the repository lint command if available.

The project declares `next lint`, which is incompatible with the installed Next.js 16 version. Report that tooling failure separately rather than changing lint configuration within this migration.

Completion requires thin affected Route Handlers, preserved producer imports, no frontend or database changes, all approved corrections covered by tests, and no new failures in full-suite or type-check verification.

## Follow-up Work

The following concerns require separate product or infrastructure decisions:

- durable notification delivery and retry;
- notification preferences and channel routing;
- deletion, retention, and archival;
- additional Notification types and database enum changes;
- consolidating Header direct queries behind an API or shared client data layer;
- replacing keyword-derived categories with explicit persisted category data.
