# Platform Preset Backend Module Design

**Date:** 2026-07-15  
**Status:** Approved for implementation planning

## Objective

Extract Platform Preset workflows and persistence from Next.js Route Handlers into a dedicated backend module. Preserve system-preset provisioning, user ownership, default selection, and public HTTP contracts while making the routes thin adapters.

The migration includes one approved behavior correction: invalid platform values and invalid request bodies return `400` instead of falling through to a catch-all `500`.

## Scope

### Included

- `GET /api/platform-presets`
- `POST /api/platform-presets`
- `PUT /api/platform-presets/[id]`
- `DELETE /api/platform-presets/[id]`
- Platform normalization from `threads` to `thread`
- User preset listing and sorting
- Automatic cloning of system presets when a user has none
- User preset upsert
- Per-platform default switching
- System-preset protection
- User ownership checks
- Platform Preset validation schemas

### Excluded

- Prompt Library
- Prompt Config CRUD/default
- Prompt Config AI routes
- Frontend changes
- Database schema, migrations, unique constraints, or RLS changes
- Moving auto-provisioning to a new endpoint
- Making best-effort system cloning transactional
- A standalone backend deployment

## Selected Architecture

Create a sibling domain module:

```text
backend/modules/platform-presets/
  platform-preset-module.ts
  platform-preset-repository.ts
  platform-preset-schemas.ts
  platform-preset-types.ts
  errors.ts

app/api/platform-presets/
  _adapter.ts
  route.ts
  [id]/route.ts
```

Rejected alternatives:

- Add Platform Presets to `prompt-configs`: the two concepts have different ownership, default scope, and system-record behavior.
- Introduce a generic `presets` module: only Platform Presets currently use `user_id = null` system templates and auto-provisioning, so a common abstraction has no demonstrated leverage.

## Responsibilities

### Route Handlers

Route Handlers own only:

1. Authentication through `requireUserWithRole`.
2. Reading JSON, query strings, and async route params.
3. Zod validation using schemas owned by the Platform Preset module.
4. Constructing the Supabase repository from the authenticated client.
5. Calling the Platform Preset module.
6. Mapping typed errors to HTTP responses.

They contain no `.from('platform_presets')` calls.

### Platform Preset Module

The module owns:

- Normalizing `threads` to `thread`.
- Listing the current user's presets for one platform.
- Provisioning user presets from system presets when the user list is empty.
- Treating system read/clone failure as best-effort and returning the existing user list.
- Sorting defaults first, then sorting by name.
- Resetting defaults within the same platform.
- Upserting by the existing database conflict key: `user_id,platform,name`.
- Rejecting update/delete of system presets where `user_id` is null.
- Rejecting update/delete by non-owners.
- Hard-deleting owned presets.

The module accepts an authenticated actor and repository. It imports no Next.js request or response types.

### Platform Preset Repository

The repository owns all `platform_presets` queries:

- List user presets by platform.
- List system presets by platform.
- Clone system presets for a user.
- Reset user defaults within a platform.
- Upsert a user preset.
- Find by ID.
- Update by ID.
- Delete by ID.

The production adapter uses the authenticated Supabase client to preserve RLS. Module tests use a repository test adapter rather than chainable Supabase mocks.

### Schemas and Types

The platform schema accepts `facebook`, `instagram`, `thread`, and `threads`, then normalizes `threads` to `thread`.

Create input preserves:

- Required platform
- Required non-empty name
- Required non-empty rules
- `is_default` defaulting to false

Update input preserves optional name, rules, and default fields. Empty update objects remain valid because the current endpoint accepts them and still writes `updated_at`.

Module-local types cover actor, preset records, repository operations, and create/update input.

## Data Flow

### Normal list

```text
Client
  -> GET Route Handler
  -> Platform Preset module
  -> list user presets
  -> sort
  -> response
```

### Auto-provision list

```text
list user presets -> empty
  -> list system presets where user_id is null
  -> clone for current user with is_default true
  -> sort inserted presets
  -> response
```

If reading or cloning system presets fails, the failure is logged and the module returns the existing empty user list. Failure of the primary user-list query remains fatal.

## Compatibility Contract

The migration preserves:

- Allowed roles: `admin`, `marketer_full`, `marketer_content`.
- `GET` requires a platform query parameter.
- `threads` is stored and queried as `thread`.
- User presets are returned only for the authenticated user and selected platform.
- Auto-provisioning still occurs during `GET` when the user has no presets.
- Cloned system presets use the system platform, name, and rules; set `user_id` to the actor; set `is_default` true; and set `updated_at`.
- System-read and clone errors remain best-effort.
- Sorting keeps defaults first and then compares names.
- Create uses upsert with `user_id,platform,name` conflict handling.
- Create and update reset defaults only within the affected platform.
- Reset-default failures remain best-effort and do not fail create/update.
- System presets cannot be updated or deleted.
- Only the owning user can update or delete a personal preset; admin receives the same ownership restriction.
- Delete remains a hard-delete and returns `{ success: true }`.
- Existing success status codes and JSON shapes remain unchanged.

Approved behavior correction:

- Invalid platform values and invalid create/update bodies return `400` with a validation message instead of catch-all `500`.

## Error Handling

Typed module errors include:

- `PRESET_NOT_FOUND`
- `PRESET_ACCESS_DENIED`
- `PRESET_VALIDATION_FAILED`
- `PRESET_PERSISTENCE_FAILED`

HTTP mapping:

- Missing platform: `400`
- Invalid platform or body: `400`
- Missing preset or fetch failure in update/delete: `404`, preserving the current combined behavior
- System-preset mutation or ownership failure: `403`
- Primary list, upsert, update, or delete failure: `500`
- Auth failure: existing `requireUserWithRole` response

Best-effort failures are logged with operation context and are not returned to the client.

## Testing Strategy

There is no dedicated Platform Preset test suite today. Add both contract and module tests.

### Route Contract Tests

Add `__tests__/api/platformPresets.test.ts` covering:

- Missing and invalid platform
- Threads normalization
- User preset list response
- Auto-provision response
- Create validation and success
- Update not found, system protection, ownership, and success
- Delete not found, system protection, ownership, and success
- Unexpected exception mapping

### Module Tests

Add `__tests__/backend/platform-presets/platformPresetModule.test.ts` covering:

- User-scoped list
- Threads normalization
- Default-first/name sorting
- Successful auto-provision
- System read failure as best-effort
- Clone failure as best-effort
- Upsert payload
- Default reset scope
- System-preset protection
- Ownership denial
- Hard-delete
- Typed persistence failures

Module tests do not construct `NextRequest` and do not mock Supabase's chainable query builder.

### Verification

Run:

```text
npm test -- __tests__/api/platformPresets.test.ts __tests__/backend/platform-presets/platformPresetModule.test.ts
npx eslint <changed files>
npx tsc -p <temporary scoped Platform Preset tsconfig>
```

Also run the full suite and full TypeScript command. Existing failures in untouched areas are reported separately.

## Migration Sequence

1. Add route contract tests for current and approved behavior.
2. Add module schemas, types, errors, and repository.
3. Add Platform Preset workflows and module tests.
4. Convert list/create Route Handlers.
5. Convert update/delete Route Handlers.
6. Verify no direct `platform_presets` query remains in migrated routes.
7. Run scoped and full verification.

## Success Criteria

- `backend/modules/platform-presets/` owns Platform Preset workflow and persistence knowledge.
- Migrated Route Handlers contain no `.from('platform_presets')` calls.
- Auto-provisioning and best-effort behavior remain compatible.
- Invalid inputs return the approved `400` response.
- Route and module tests cover the full workflow.
- Scoped TypeScript and ESLint pass.
- Prompt modules, AI routes, frontend, database, and `.gitignore` remain unchanged.

## Follow-up

After this module is stable, extract Prompt Config AI workflows (`analyze` and `from-wizard`) behind a Gemini adapter. That work needs a separate design because it involves model selection, prompt construction, JSON parsing, and fallback behavior.
