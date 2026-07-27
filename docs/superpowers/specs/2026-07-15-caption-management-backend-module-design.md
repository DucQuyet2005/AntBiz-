# Caption Management Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract Caption Management and version-history workflows from three Next.js Route Handlers into a dedicated backend module. Preserve RLS, ownership, admin override, status locks, response shapes, and best-effort history behavior while making the HTTP routes thin adapters.

The migration includes one approved behavior correction: explicit `page` and `limit` query values that are not positive integers return `400` instead of producing an invalid database range.

## Domain Language

`CONTEXT.md` defines **Caption Management** as the lifecycle of an existing caption: creation outside the generation stream, listing, retrieval, human editing, status transitions, restore-as-original, favorite-template state, and version history.

Caption Generation remains a separate workflow. It may create the initial draft, but it does not own later management behavior.

## Scope

### Included

- `POST /api/captions`
- `GET /api/captions`
- `GET /api/captions/[id]`
- `PUT /api/captions/[id]`
- `POST /api/captions/versions`
- Caption and version validation schemas
- `threads` to `thread` normalization
- List filtering, search, ordering, and pagination
- Ownership and admin-edit rules
- Scheduled/posted edit lock
- `save_as_original`
- Favorite-template state
- Automatic version history during edits
- Explicit version creation
- Best-effort draft-version linking and update history

### Excluded

- Caption Generation and SSE
- Caption export/download
- Scheduled Post creation or publishing
- Delete behavior
- UI changes
- Database schema, migrations, RLS, or transactions
- Making version history mandatory for caption saves

## Selected Architecture

Create a sibling backend module:

```text
backend/modules/caption-management/
  caption-management-module.ts
  caption-management-repository.ts
  caption-management-schemas.ts
  caption-management-types.ts
  errors.ts

app/api/captions/
  _management-adapter.ts
  route.ts
  [id]/route.ts
  versions/route.ts
```

The module exposes five operations:

```ts
create(actor, input)
list(actor, filters)
get(actor, id)
update(actor, id, input)
createVersion(actor, input)
```

The module imports no Next.js request or response types.

Rejected alternatives:

- Add management behavior to `caption-generation`. That would combine AI/SSE generation with the lifecycle of already-created records and enlarge the interface without shared workflow order.
- Split captions and versions into separate modules. Caption update would still need to coordinate both interfaces and expose version-ordering knowledge to the caller.
- Move each Route Handler body into a separate function. The deletion test shows no depth: validation, policy, persistence order, and error modes would remain spread across HTTP callers.

## Responsibilities

### Route Handlers

Route Handlers own only:

1. Authentication through `requireUserWithRole`.
2. Reading JSON, query values, and async route params.
3. Applying module-owned schemas.
4. Building the Supabase repository from the authenticated client.
5. Calling the Caption Management module.
6. Mapping typed module errors to HTTP responses.

They contain no direct `captions` or `caption_versions` queries and no status, ownership, payload, or version-number policy.

### Caption Management Module

The module owns:

- Platform normalization.
- Caption create payload and initial status.
- Linking unbound draft versions after caption creation.
- List filter normalization and pagination metadata.
- Edit locks for scheduled and posted captions.
- Owner/admin mutation checks.
- Normal edit status behavior.
- `save_as_original` precedence and reset to draft.
- Version-history decision and numbering.
- Best-effort version side effects.

### Caption Management Repository

The repository owns all persistence operations:

- Insert caption.
- Link unbound versions by article/platform.
- List captions with article and prompt joins, filters, ordering, range, and exact count.
- Find caption by ID.
- Find the mutation projection by ID.
- Update caption.
- Read the latest caption version number.
- Insert a caption version.
- Read the latest article/platform version number.

The production adapter uses the authenticated Supabase client, preserving RLS. Module tests use an in-memory adapter rather than chainable Supabase mocks.

## Schemas and Inputs

### Create Caption

- `article_id`: required UUID
- `platform`: `facebook`, `instagram`, `thread`, or `threads`
- `ai_content`: required non-empty string
- `edited_content`: optional string or null
- `prompt_id`: optional UUID
- `utm_config_id`: optional UUID

`threads` normalizes to `thread`. `edited_content` preserves current truthy behavior: a non-empty value produces `edited` status; null or an empty string is stored as null and produces `draft`.

### List Captions

- `platform`: defaults to `all`; `All Platforms` is also treated as all
- `search`: defaults to empty
- `page`: defaults to 1
- `limit`: defaults to 10

Explicit page and limit values must be positive integers. Platform matching remains case-insensitive and normalizes Threads.

### Update Caption

- `edited_content`: optional non-empty string or null
- `status`: optional `draft`, `edited`, `approved`, `scheduled`, or `posted`
- `is_favorite_template`: optional boolean
- `save_as_original`: optional boolean
- `ai_content`: optional string

At least one field is required.

### Create Version

- `article_id`: required UUID
- `platform`: supported platform with Threads normalization
- `content`: required non-empty string
- `source`: `ai` or `human`
- `caption_id`: optional UUID or null

## Data Flow

### Create

```text
validate
  -> insert caption with created_by
  -> link unbound versions for article/platform (best-effort)
  -> return { data } with 201
```

Optional prompt and UTM IDs are omitted when absent. Status is `edited` only when edited content is truthy; otherwise it is `draft`.

### List

```text
normalize filters
  -> select caption/article/prompt projection with exact count
  -> optional platform filter
  -> optional content/article-title search
  -> newest first
  -> page range
  -> response metadata
```

Response shape remains:

```text
data, total, page, limit, totalPages
```

### Get

The repository reads by ID through RLS. A query failure is `500`; no visible record is `404`.

### Update

Workflow order remains:

1. Load mutation projection.
2. Treat fetch failure or missing record as `404`.
3. Reject `scheduled` or `posted` with `400`.
4. Reject a non-owner unless role is admin with `403`.
5. Build and persist the update payload.
6. If human edited content changed and `save_as_original` is false, update history best-effort.

For `save_as_original`, new `ai_content` precedence remains:

```text
input ai_content
  -> input edited_content
  -> existing edited_content
  -> existing ai_content
```

It clears `edited_content` and resets status to `draft`.

For a normal edit, explicit status wins. Otherwise, supplying `edited_content`, including null, sets status to `edited`, preserving current behavior.

### Automatic Version History

When edited content changed:

- No prior version: attempt AI original as version 1, then human edit as version 2.
- Existing version: insert human edit at latest number plus 1.
- Read or insert failures are logged and do not fail the completed caption update.

### Explicit Version Creation

Read the latest version number for article/platform, choose 1 or latest plus 1, insert the version, and return `{ data }` with `201`. Unlike update history, explicit version read/insert failures are fatal.

## Error Handling

Typed module errors map to:

- Invalid JSON or schema: `400` in Route Handler
- Invalid explicit page/limit: `400`
- Caption not found or mutation fetch failure: `404` for update compatibility
- Caption get query failure: `500`
- Scheduled/posted edit lock: `400`
- Ownership denial: `403`
- Caption create/list/update persistence failure: `500`
- Explicit version read/insert failure: `500`
- Auth failure: existing `requireUserWithRole` response

Best-effort failures:

- Linking unbound versions after create
- Reading automatic edit history
- Inserting automatic AI/human edit versions

These failures include operation context in logs and are never returned to the caller.

## Testing Strategy

### Module Tests

Add `__tests__/backend/caption-management/captionManagementModule.test.ts` covering:

- Create payload and status
- Threads normalization
- Draft-version linking
- Link failure as best-effort
- List filters, search, pagination, and metadata
- Invalid pagination
- Get success and not found
- Scheduled/posted lock
- Owner, non-owner, and admin update
- Normal edit payload and status
- `save_as_original` precedence
- First AI/human history pair
- Incrementing existing history
- History read/insert failures as best-effort
- Explicit version numbering and persistence failures

### Repository Adapter Tests

Add focused tests for table selection, filters, exact count, ordering, ranges, and authenticated-client usage.

### Route Contract Tests

Refocus `captionUpdate.test.ts` on HTTP concerns and add create/list/version contracts covering:

- Auth responses
- Malformed JSON
- Schema details response
- Async ID params
- Invalid pagination `400`
- Typed error status mapping
- Success status and response shape

The route tests mock the module interface rather than Supabase's fluent query interface.

### Verification

Run:

```text
npm test -- __tests__/api/captionUpdate.test.ts __tests__/api/captionManagement.test.ts __tests__/backend/caption-management
npx eslint <changed files>
npx tsc -p <temporary scoped Caption Management tsconfig>
```

Also run the full suite and full TypeScript command. Existing failures in untouched areas are reported separately.

## Migration Sequence

1. Add schemas, types, typed errors, and repository interface.
2. Add production repository adapter.
3. Implement create/list/get flows with module tests.
4. Implement update policy and automatic history tests.
5. Implement explicit version creation.
6. Add `_management-adapter.ts` and HTTP error mapping.
7. Convert collection and detail routes.
8. Convert versions route.
9. Refocus route tests away from Supabase chain mocks.
10. Verify no direct caption/version query remains in migrated routes.
11. Run scoped and full verification.

## Success Criteria

- `backend/modules/caption-management/` owns Caption Management workflow and persistence knowledge.
- The module imports no Next.js types.
- Migrated routes contain no direct `captions` or `caption_versions` queries.
- Caption Generation and export routes remain unchanged.
- Ownership, admin override, edit lock, restore-as-original, and response shapes remain compatible.
- Version side effects remain best-effort where approved.
- Explicit invalid pagination returns `400`.
- Module, repository, and route contract tests cover the migrated behavior.
- Scoped TypeScript and ESLint pass.
- UI, database, and the user's `.gitignore` change remain untouched.
