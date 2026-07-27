# Landing Configuration Backend Module Design

## Context

Landing-page configuration behavior is currently distributed across several Next.js Route Handlers, the landing editor, and the public page:

- `GET`, `PUT`, and `DELETE /api/admin/landing-config` read and mutate live configuration rows.
- `POST /api/admin/landing-config/publish` builds a snapshot, conditionally writes history, revalidates the landing page, and notifies administrators.
- `GET`, `PATCH`, and `DELETE /api/admin/landing-config/history` list checkpoints, edit notes, and delete checkpoints.
- `POST /api/admin/landing-config/rollback` deletes all live rows and then inserts a selected snapshot.
- `GET /api/landing-config` and `app/page.tsx` independently read and project the same public data.

The Route Handlers repeat administrator authentication and database error handling. Snapshot projection and comparison are transport-owned, while rollback is a non-transactional delete-then-insert sequence that can leave the landing page without configuration when insertion fails. The table also lacks a uniqueness constraint for the logical `(section, key)` identity used by updates.

`CONTEXT.md` defines **Landing Configuration** as the live landing-page values, their public projection, and their History Checkpoints. Under the existing product behavior, saving a value changes live configuration immediately. Publishing records a checkpoint, invalidates the page cache, and sends notifications; it is not a draft activation step.

## Goals

- Move Landing Configuration behavior behind a focused backend module.
- Preserve the existing endpoint paths, successful response shapes, editor behavior, and live-on-save semantics.
- Give each configuration entry a database-enforced unique `(section, key)` identity.
- Share one deterministic public projection between the public API and server-rendered landing page.
- Create a History Checkpoint only when live configuration differs from the latest checkpoint.
- Make replacement of live configuration during rollback atomic.
- Keep cache invalidation and administrator notifications at explicit application boundaries.
- Validate mutation inputs and expose stable, transport-neutral errors.
- Keep Route Handlers thin and independently testable.

## Non-goals

- Introducing separate draft and published configurations.
- Redesigning the landing editor or public landing page.
- Changing the shape or meaning of stored configuration values.
- Moving `/api/translate` into Landing Configuration.
- Adding scheduled publication, checkpoint diff visualization, or checkpoint restoration previews.
- Changing the current administrator-only write model or public read access.
- Making notification delivery determine whether a successful publish is retained.

## Chosen Approach

Create `backend/modules/landing-configuration/` with domain types and validation, deterministic projection and snapshot helpers, a workflow module, typed errors, and a request-scoped Supabase repository adapter. Route Handlers retain HTTP authentication, query/body parsing, response formatting, cache invalidation, and notification delivery.

A database migration adds the missing uniqueness guarantee and an atomic rollback function. The public API and `app/page.tsx` use the same repository projection rather than maintaining independent grouping logic.

A helper-only extraction was rejected because publish comparison, history policy, rollback safety, and public projection would remain distributed. A single all-purpose service was rejected because it would couple deterministic configuration behavior to Next.js caching, notification infrastructure, and transport response shapes.

## Architecture

### LandingConfigurationModule

The module owns these workflows:

- List live entries for administration.
- Set one validated Section/Key value using logical upsert semantics.
- Clear all live configuration.
- Read the public grouped projection.
- Publish the current live configuration as a History Checkpoint when it changed.
- List recent History Checkpoints.
- Update a checkpoint note.
- Delete one checkpoint.
- Atomically roll back live configuration to one checkpoint.

The module depends on a `LandingConfigurationRepository`. It does not import Next.js, Route Handler request or response types, `revalidatePath`, notification helpers, or global Supabase clients.

Publish and rollback return typed outcomes that tell the HTTP adapter whether cache invalidation and notification should run. These effects run only after the primary database workflow succeeds.

### Domain Types and Validation

A live entry contains `id`, `section`, `key`, JSON-compatible `value`, `updatedBy`, and `updatedAt`. A History Checkpoint contains `id`, a normalized snapshot, optional note, creator projection, and creation time.

Mutation validation enforces:

- `section` and `key` are trimmed, non-empty strings no longer than 255 characters.
- `value` is present and JSON-compatible; JSON `null` remains a valid value.
- checkpoint IDs are UUIDs.
- checkpoint notes are either `null` or strings no longer than 500 characters.
- publish options accept only the existing `skipHistory` boolean.

Unknown object fields are ignored at the transport boundary unless an existing endpoint contract relies on them. Invalid input maps to a stable `invalid_input` module error.

### Projection and Snapshot Policy

The public projection has the compatibility shape:

```ts
Record<string, Record<string, JsonValue>>
```

Entries are ordered by Section and Key before projection. Snapshot comparison uses a recursive canonical JSON representation that sorts every object key while preserving array order. This makes equality independent of row order and object insertion order without changing array semantics.

The database uniqueness constraint prevents two live rows from claiming the same Section and Key. The projection helper still rejects duplicate logical keys defensively when used with malformed adapter data instead of silently choosing a winner.

### LandingConfigurationRepository

The request-scoped Supabase adapter owns:

- Listing live entries in deterministic Section/Key order.
- Upserting one live entry on the `(section, key)` constraint and recording `auth.uid()` as updater.
- Clearing all live entries.
- Reading the most recent checkpoint.
- Creating, listing, annotating, and deleting History Checkpoints.
- Loading one checkpoint for rollback.
- Calling the atomic replacement RPC with a validated snapshot.

The repository receives the existing request-scoped Supabase client so RLS remains the final data-access boundary. It converts database records and errors into module-facing results and never imports Next.js.

### HTTP and Application Adapters

Administrator Route Handlers continue to authenticate the caller and require the `admin` role before creating the module. Shared route helpers may remove repeated authentication and error mapping, but authorization remains visible at the HTTP boundary.

The public API and `app/page.tsx` construct the same repository-backed public reader. They receive identical grouping and duplicate handling while preserving their current rendering and response contracts.

After a successful publish, the Route Handler revalidates `/` and attempts to notify administrators. Notification is best-effort: a notification failure is recorded with sanitized context but does not reverse a successfully created or confirmed checkpoint. After a successful rollback, the Route Handler revalidates `/`; it does not report success if atomic replacement fails.

## Database Migration

Add a dated migration under `migrations/` that:

1. Removes duplicate live rows by retaining the most recently updated row for each `(section, key)`, using `id` as a deterministic tie-breaker.
2. Adds a unique constraint on `landing_page_config(section, key)` for conflict-safe upserts.
3. Creates `replace_landing_page_config(p_snapshot jsonb)` as a transaction-scoped PostgreSQL function.
4. Requires `p_snapshot` to be a JSON object whose Section values are JSON objects.
5. Explicitly verifies that `auth.uid()` belongs to an administrator.
6. Deletes current live rows and inserts every snapshot entry with the caller as `updated_by` within the same database transaction.
7. Uses a fixed `search_path`, invoker-compatible RLS behavior, restricted execute grants, and no caller-supplied user identity.

Any validation, authorization, delete, or insert failure aborts the function call and restores the pre-call live configuration. Empty snapshots are valid and intentionally produce an empty live configuration.

## Data Flow

### Save or clear live configuration

1. Authenticate an administrator.
2. Parse and validate the request.
3. Upsert one logical Section/Key entry, or clear all live entries.
4. Return the existing successful JSON shape.

The save operation is live immediately. It does not create a History Checkpoint or send a notification.

### Read public configuration

1. Read live entries through the request-scoped repository.
2. Sort and project entries into the grouped Section/Key object.
3. Return that projection to either the public API or the server-rendered page.

### Publish

1. Authenticate an administrator and validate `skipHistory`.
2. Read and normalize the current live snapshot.
3. Read the latest History Checkpoint.
4. When history is enabled and the canonical snapshots differ, create one new checkpoint.
5. Return whether a checkpoint was created and the relevant checkpoint projection.
6. Revalidate `/` after the module succeeds.
7. Attempt to notify administrators without changing the successful publish outcome if notification fails.

When `skipHistory` is true, publish creates no checkpoint but preserves the existing cache refresh and notification behavior.

### Rollback

1. Authenticate an administrator and validate the checkpoint ID.
2. Load and validate the checkpoint snapshot.
3. Call the atomic replacement RPC.
4. Revalidate `/` only after the RPC succeeds.
5. Return the existing success response.

Rollback does not create another checkpoint automatically, preserving current behavior.

### Manage history

Listing returns the latest ten checkpoints with the current creator email projection. Annotation validates the 500-character database limit. Deletion and annotation distinguish a missing checkpoint from a database failure and retain the existing successful response shapes.

## Error Policy

Typed module errors map to stable HTTP behavior:

- `invalid_input`: malformed body, invalid UUID, empty/oversized Section or Key, invalid note, or malformed snapshot.
- `configuration_not_found`: the requested History Checkpoint does not exist.
- `duplicate_configuration`: malformed adapter data contains duplicate Section/Key entries.
- `forbidden`: the database function rejects a non-administrator caller.
- `persistence_failed`: a configuration or history database operation fails.
- `rollback_failed`: atomic replacement cannot complete.

Routes preserve the existing status behavior where clients rely on it and otherwise use `400` for invalid input, `404` for a missing checkpoint, `403` for authorization failure, and `500` for persistence or rollback failure.

Logs may contain the operation name, stable error code, authenticated actor ID, checkpoint ID, and aggregate entry count. They exclude configuration values, snapshots, arbitrary notes, database error details returned to clients, and notification payload bodies.

## Testing Strategy

### Domain tests

- Project ordered and unordered entries into the same public shape.
- Preserve JSON `null`, scalar, object, and array values.
- Canonicalize nested object keys while preserving array order.
- Detect duplicate logical Section/Key entries.
- Validate Section, Key, note, UUID, JSON value, and publish options boundaries.

### Module tests

- List and upsert through the repository contract.
- Publish creates a checkpoint when live state changed.
- Publish skips a checkpoint when canonical snapshots are equal.
- `skipHistory` never creates a checkpoint.
- Publish exposes an effect outcome only after repository success.
- Rollback rejects missing checkpoints and malformed snapshots.
- Rollback exposes cache invalidation only after the replacement RPC succeeds.
- History listing, annotation, and deletion map missing and failed records correctly.

### Repository tests

- Live reads use deterministic ordering.
- Upsert targets the `(section, key)` unique constraint and records the current user.
- History reads preserve the creator email projection and ten-record limit.
- Rollback calls the RPC with the normalized snapshot.
- Supabase failures are sanitized before crossing the adapter boundary.

### Route and consumer tests

- Every admin route authenticates and authorizes before module work.
- Invalid inputs and typed errors map to the expected statuses and compatibility JSON shapes.
- Public API and `app/page.tsx` use the shared public reader.
- Cache revalidation occurs after successful publish and rollback only.
- Notification failure does not turn a successful publish into an error.
- Existing editor save, default restore, publish, history, note, delete, and rollback flows remain compatible.

### Migration verification

- Duplicate cleanup retains the deterministic newest row.
- The unique constraint rejects duplicate `(section, key)` rows.
- Non-admin callers cannot execute a replacement successfully.
- Malformed snapshots leave live configuration unchanged.
- Insert failures roll back the preceding delete.
- Valid populated and empty snapshots replace live configuration completely.

If the repository has no automated Supabase migration harness, migration behavior is verified through static SQL review and documented manual SQL assertions rather than being represented as covered by unit tests.

## Documentation

Implementation updates `docs/CHANGELOG.md` with the new Landing Configuration module, shared public projection, database uniqueness guarantee, and atomic rollback behavior.

## Completion Criteria

- Landing Configuration workflows live under `backend/modules/landing-configuration/`.
- Admin Route Handlers are thin authenticated HTTP adapters.
- Public API and `app/page.tsx` use one shared public projection.
- Saving remains live immediately and publish remains a checkpoint/cache/notification action.
- `(section, key)` uniqueness is enforced by the database.
- Rollback is atomic and leaves the prior live state intact on failure.
- Cache invalidation runs only after successful primary workflows.
- Notification failure does not invalidate successful publish.
- Existing endpoint paths, editor behavior, and successful response shapes remain compatible.
- Focused tests and direct ESLint pass.
- Typecheck and full-suite verification introduce no failures beyond documented repository baselines.
