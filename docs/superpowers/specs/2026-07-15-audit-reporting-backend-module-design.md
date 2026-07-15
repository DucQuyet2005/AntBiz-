# Audit Reporting Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the administrator Audit Log read model from its Next.js Route Handler into a dedicated backend module. Preserve the public endpoint, successful response shape, Audit Logs page, and Admin Overview caller while centralizing filter validation, date semantics, stable pagination, persistence, relation projection, and controlled errors.

Approved behavior corrections:

- `page` and `limit` must be positive integers; `limit` cannot exceed 100.
- `action` remains an open taxonomy because `audit_logs.action` is text and producers may add values independently. It is trimmed and length-limited rather than hard-coded to the current UI list.
- `from` and `to` accept valid ISO dates or timestamps.
- A date-only `from` value means the start of that UTC day; a date-only `to` value includes the complete UTC day.
- A range whose normalized `from` is later than `to` returns `400`.
- Results use stable `created_at DESC, id DESC` ordering.
- Missing actor and target relations project to `System` and `Unknown` respectively.
- Unexpected and persistence errors return a controlled message rather than raw database details.

## Domain Language

`CONTEXT.md` defines **Audit Reporting** as the administrator-only read model for reviewing immutable records emitted by other workflows.

An **Audit Log** records an action, optional actor and target users, optional before and after JSON values, and a creation time. An **Audit Report** is a filtered, ordered, paginated projection of those records with actor and target email labels.

Audit Reporting does not own the creation of audit records. User Access Administration, publishing, export, and other source workflows retain responsibility for emitting their own records.

## Scope

### Included

- `GET /api/admin/audit-logs`
- Administrator authorization at the HTTP boundary
- Action, date-range, and pagination parsing
- Inclusive date-only filtering
- Exact-count pagination
- Stable descending ordering
- Actor and target email relation projection
- Existing response contract used by the Audit Logs page and Admin Overview
- Schema, projection, module, repository, and route contract tests

### Excluded

- Creating, editing, or deleting audit records
- Refactoring audit producers
- Audit export, retention, archival, or deletion
- Full-text search
- Frontend changes
- Database schema, migration, index, constraint, or RLS changes
- A closed enum for audit actions
- User-facing access to audit data
- Logging audit-log reads
- Changes to the export job records currently stored in `audit_logs`

## Chosen Architecture

Create one read-focused bounded context at `backend/modules/audit-reporting/`. The module has no write operation and does not import producer services.

### `audit-reporting-module.ts`

Exposes one list operation. It parses raw filter input, delegates the normalized query to the repository, projects persistence rows, and returns the existing pagination shape.

The module does not import `NextRequest`, `NextResponse`, cookies, headers, environment variables, or UI code.

### `audit-reporting-repository.ts`

Defines the persistence contract and Supabase implementation for selecting:

- audit identity, action, before/after values, and creation time;
- actor email through `audit_logs_actor_id_fkey`;
- target email through `audit_logs_target_user_id_fkey`.

It applies optional action and normalized date filters, requests an exact count, orders by `created_at` descending and then `id` descending, and applies the requested range. Supabase failures are wrapped in a controlled repository error.

### `audit-reporting-schemas.ts`

Defines request-independent validation and normalization for:

- positive integer `page`, defaulting to 1;
- positive integer `limit`, defaulting to 20 and capped at 100;
- optional trimmed `action`, where empty and `all` mean no restriction;
- action length capped at 100 characters;
- optional ISO date or timestamp boundaries;
- inclusive UTC expansion for date-only values;
- ordered normalized date ranges.

The action schema does not whitelist values. This preserves current and future producer actions such as `change_role`, `publish_post_success`, and `export_csv_job`.

### `audit-log-projection.ts`

Maps one persistence row to the existing HTTP record. Supabase relation values may be an object, a one-element array, or null. The projection extracts the first valid email and uses stable fallbacks:

- actor missing or deleted -> `System`;
- target missing or deleted -> `Unknown`.

`before_value` and `after_value` pass through unchanged.

### `audit-reporting-types.ts`

Defines raw persistence rows, relation shapes, normalized list input, projected Audit Logs, repository results, and the repository interface.

### `audit-reporting-errors.ts`

Defines typed validation and repository errors with client-safe messages.

### `audit-reporting-factory.ts`

Builds the module with a session-backed Supabase repository. The authenticated administrator session preserves existing RLS behavior.

## HTTP Boundary

The Route Handler remains responsible for:

1. authenticating the session and requiring `admin` with `requireUserWithRole(['admin'])`;
2. reading `action`, `from`, `to`, `page`, and `limit` from the request URL;
3. constructing the module through the production factory;
4. invoking the list operation;
5. mapping typed validation and repository errors to HTTP responses;
6. returning the existing successful response without frontend changes.

The route remains dynamic because it reads request URL state and queries the database. The default Node.js runtime is retained.

## List Workflow

1. Authenticate and authorize the administrator.
2. Pass raw query values into the module.
3. Trim the action. Treat missing, empty, or `all` as no action filter.
4. Parse pagination and reject invalid or oversized values.
5. Parse date boundaries:
   - `YYYY-MM-DD` from -> `T00:00:00.000Z`;
   - `YYYY-MM-DD` to -> `T23:59:59.999Z`;
   - timestamp values -> their normalized ISO instant.
6. Reject invalid dates or a reversed normalized range.
7. Query matching rows with exact count, stable ordering, and pagination range.
8. Project actor and target relations.
9. Return:

```ts
{
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

An empty result returns `200`, `data: []`, total 0, and totalPages 0.

## Compatibility

The existing response record remains:

```ts
{
  id: string;
  action: string;
  before_value: unknown;
  after_value: unknown;
  created_at: string;
  actor_email: string;
  target_email: string;
}
```

The Audit Logs page continues to use `action`, `page`, and `limit=10`. Admin Overview continues to request the five most recent records with `limit=5`. Unknown actions remain visible through the frontend's existing default label behavior.

## Authorization

- Every request requires an authenticated user whose persisted role is `admin`.
- The shared authorization helper performs the role check before any audit query.
- Existing admin-only RLS remains defense in depth.
- The module accepts no user ID and provides no owner-scoped alternative.
- Reading the report does not create another Audit Log.

## Error Policy

HTTP adapters map outcomes as follows:

- validation error -> `400` for invalid pagination, oversized limit, excessive action length, invalid date, or reversed range;
- existing authentication response -> `401` for an unauthenticated request;
- existing role response -> `403` for a non-admin request;
- repository and unexpected errors -> `500` with a controlled generic message.

There is no `404` outcome. Missing relations are valid historical states and use projection fallbacks. Raw Supabase messages and stack traces are logged only on the server and are not returned to clients.

## Testing Strategy

### Schema Tests

Cover defaults, valid pagination, zero/negative/fractional/non-numeric pagination, limit 100, limit above 100, open action values, trimmed action, `all`, excessive action length, date-only boundaries, timestamp normalization, invalid dates, and reversed ranges.

### Projection Tests

Cover object, array, empty-array, and null relation values; valid email extraction; `System` and `Unknown` fallbacks; and unchanged before/after JSON values.

### Module Tests

Cover normalized repository delegation, pagination metadata, empty results, and projection of every returned row.

### Repository Tests

Cover the selected relation query, exact count, optional action filter, `gte`/`lte` date filters, descending `created_at` and `id` ordering, pagination ranges, empty data, and controlled error wrapping.

### Route Contract Tests

Cover unauthenticated and non-admin responses, raw query forwarding, the unchanged successful response, validation mapping, generic repository failure mapping, and absence of database-detail leakage.

### Caller Compatibility

Verify that `limit=5` and `limit=10` remain accepted and that unknown action values are passed through rather than rejected.

## Verification

Run:

1. focused schema, projection, module, repository, and route tests;
2. relevant Admin Overview or Audit Logs caller tests when present;
3. ESLint directly against affected files;
4. the full Vitest suite;
5. `npx tsc --noEmit`;
6. the repository lint command if available.

The configured `next lint` command is incompatible with the installed Next.js 16 version. Report that tooling failure separately. Existing unrelated type-check and inline-edit test failures remain baseline and must not be attributed to this migration.

Completion requires a thin Route Handler, no frontend or database changes, stable response compatibility, coverage of every approved correction, and no new full-suite or type-check failure.

## Follow-up Work

- Audit export and retention policy.
- Search by actor, target, or structured metadata.
- Explicit persisted action categories if the product later needs a closed taxonomy.
- Database indexes based on observed reporting query volume.
- Moving export job state out of `audit_logs` into a dedicated job table.
