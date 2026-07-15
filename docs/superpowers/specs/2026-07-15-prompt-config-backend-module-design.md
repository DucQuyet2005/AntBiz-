# Prompt Config Backend Module Design

**Date:** 2026-07-15  
**Status:** Approved for implementation planning

## Objective

Extract reusable Prompt Config CRUD and default-selection behavior from Next.js Route Handlers into a sibling backend module. The migration follows the established `backend/modules/prompts` pattern while keeping Prompt Library and Prompt Config as separate domain concepts.

The migration preserves existing HTTP contracts except for one approved bug fix: `GET /api/prompt-configs?platform=...` must apply the requested platform filter, as already required by the route test and frontend behavior.

## Scope

### Included

- `GET /api/prompt-configs`
- `POST /api/prompt-configs`
- `PUT /api/prompt-configs/[id]`
- `DELETE /api/prompt-configs/[id]`
- `GET /api/prompt-configs/default`
- Prompt Config validation schemas
- Duplicate-name detection
- Default switching
- Partial `params` merge behavior
- Platform filtering on list requests

### Excluded

- `POST /api/prompt-configs/analyze`
- `POST /api/prompt-configs/from-wizard`
- `/api/platform-presets/**`
- Prompt Library changes
- Frontend changes
- Database schema, migration, or RLS changes
- Changing hard-delete to soft-delete
- Atomic database transactions for default switching
- A standalone backend deployment

## Selected Architecture

Create a sibling domain module:

```text
backend/modules/
  prompts/
  prompt-configs/
    prompt-config-module.ts
    prompt-config-repository.ts
    prompt-config-schemas.ts
    prompt-config-types.ts
    errors.ts

app/api/prompt-configs/
  _adapter.ts
  route.ts
  [id]/route.ts
  default/route.ts
  analyze/route.ts          # unchanged
  from-wizard/route.ts      # unchanged
```

Rejected alternatives:

- Add Prompt Config behavior to `backend/modules/prompts`: this would combine the Prompt Library, reusable configuration, wizard generation, and platform rules in one growing module.
- Introduce a generic `content-config` module: Prompt Config and Platform Preset do not yet share a stable interface, so this would be premature abstraction.

## Responsibilities

### Route Handlers

The migrated Route Handlers own only:

1. Authentication through `requireUserWithRole`.
2. Reading JSON, query strings, and async route params.
3. Zod parsing with schemas owned by the Prompt Config module.
4. Constructing the Supabase repository from the authenticated client.
5. Calling the Prompt Config module.
6. Mapping typed module errors to the existing status and JSON response.

They contain no `.from('prompt_configs')` calls.

### Prompt Config Module

The module owns:

- User-scoped listing and optional platform filtering.
- Name trimming before persistence.
- Duplicate-name checks per user.
- Creation and update workflows.
- Resetting the previous default before setting a new default.
- Ownership enforcement for update and delete.
- Merging partial `params` into the existing JSON value.
- Setting `updated_at` on update.
- Hard-delete behavior.
- Default lookup for the current user.

The module accepts an authenticated actor and dependencies. It does not import Next.js request or response types.

### Prompt Config Repository

The repository owns all `prompt_configs` queries:

- List by user and optional platform.
- Find by ID.
- Find duplicate name, with optional excluded ID.
- Reset current default.
- Insert.
- Update.
- Delete.
- Find current default.

The production adapter uses the authenticated Supabase client so RLS remains active. Module tests use a repository test adapter rather than chainable Supabase mocks.

### Schemas and Types

The create schema preserves:

- Required non-empty `name`.
- Platform values `facebook`, `thread`, `instagram`, and `all`.
- Optional `rules`.
- `params.variant_count` as an optional number.
- `is_default` defaulting to `false`.

The update schema keeps every field optional. Empty update objects remain accepted because the existing endpoint accepts them and still updates `updated_at`.

Module-local types cover the Prompt Config record, actor, repository interface, list filter, and create/update input. They do not become a project-wide type bucket.

## Data Flow

```text
Client
  -> Prompt Config Route Handler
  -> requireUserWithRole
  -> Prompt Config module
  -> Prompt Config repository
  -> authenticated Supabase client
  -> Supabase RLS and database
```

## Compatibility Contract

The migration preserves:

- Allowed roles: `admin`, `marketer_full`, `marketer_content`.
- Every query remains scoped to the authenticated `user.id` where currently applicable.
- Admin does not gain permission to edit or delete another user's config.
- Duplicate names are checked within one user.
- Names are trimmed before duplicate checking and persistence.
- Creating a default config clears all previous defaults for the user, regardless of platform.
- Updating a non-default config to default clears other defaults for the user.
- Updating `params` merges the provided fields with the current JSON object.
- Delete remains a hard-delete.
- Default lookup remains user-scoped and returns `{ data: null }` when absent.
- The `platform` query parameter on `/default` remains ignored because changing default semantics is outside this migration.
- Existing URLs, methods, success status codes, and response shapes remain unchanged.

Approved behavior correction:

- `GET /api/prompt-configs?platform=instagram` returns only the authenticated user's Instagram configs. The current Route Handler reads the request but omits this filter; the existing route test already specifies the intended behavior.

## Error Handling

Typed module errors include:

- `CONFIG_NOT_FOUND`
- `CONFIG_ACCESS_DENIED`
- `CONFIG_DUPLICATE_NAME`
- `CONFIG_PERSISTENCE_FAILED`
- `CONFIG_VALIDATION_FAILED`

HTTP mapping preserves the existing behavior:

- Invalid JSON or Zod input: `400`
- Duplicate name: `400`
- Missing config or current fetch failure in update/delete: `404`, preserving the current combined response
- Ownership failure: `403`
- Persistence or unexpected failure: `500`
- Authentication and role failures: existing responses from `requireUserWithRole`

Repository errors are logged at the HTTP adapter with operation context. Raw Supabase objects are not returned to clients.

## Testing Strategy

### Route Contract Tests

Keep `__tests__/api/promptConfigs.test.ts` as the HTTP contract suite. Public behavior assertions remain unchanged, including the existing platform-filter test.

### Module Tests

Add `__tests__/backend/prompt-configs/promptConfigModule.test.ts` with a repository test adapter. Cover:

- User-scoped list
- Platform filter
- Duplicate name on create
- Duplicate name on rename while excluding the current ID
- Name trimming
- Create default reset
- Update default reset
- Partial `params` merge
- Ownership denial
- Hard-delete
- Default lookup and null fallback
- Typed persistence failures

Module tests do not construct `NextRequest` and do not mock Supabase's chainable query builder.

### Verification

Run:

```text
npm test -- __tests__/api/promptConfigs.test.ts __tests__/backend/prompt-configs/promptConfigModule.test.ts
npx eslint <changed files>
npx tsc -p <temporary scoped Prompt Config tsconfig>
```

Also run the full test suite and full TypeScript command. Failures in untouched areas are reported separately and are not silently fixed within this migration.

## Migration Sequence

1. Record the focused Prompt Config test baseline, including the known platform-filter failure.
2. Add module schemas, types, errors, and repository.
3. Add Prompt Config workflows and module tests.
4. Convert list/create Route Handlers.
5. Convert update/delete Route Handlers.
6. Convert default Route Handler.
7. Verify that migrated Route Handlers contain no direct `prompt_configs` query.
8. Run scoped and full verification.

## Success Criteria

- `backend/modules/prompt-configs/` owns Prompt Config CRUD/default workflow and persistence knowledge.
- Included Route Handlers contain no `.from('prompt_configs')` calls.
- Platform filtering works and its existing test passes.
- Other public HTTP contracts remain compatible.
- Module tests run without HTTP or chainable Supabase mocks.
- Scoped TypeScript and ESLint pass.
- `analyze`, `from-wizard`, `platform-presets`, frontend, database, and `.gitignore` remain unchanged.

## Follow-up

After this module is stable:

1. Extract Platform Presets as its own module, including system-preset cloning.
2. Extract Prompt Config AI workflows (`analyze` and `from-wizard`) behind the Gemini adapter.

These are separate designs because they involve different dependencies and failure behavior.
