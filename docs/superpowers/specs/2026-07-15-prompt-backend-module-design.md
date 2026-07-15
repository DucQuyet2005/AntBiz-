# Prompt Backend Module Design

**Date:** 2026-07-15  
**Status:** Approved for implementation planning

## Objective

Create the first domain-oriented backend module for AntBiz by moving the core Prompt Library implementation out of Next.js Route Handlers. The migration must make `app/api/prompts/**/route.ts` thin HTTP adapters without changing any public URL, HTTP method, status code, JSON response, authentication rule, RLS behavior, or frontend caller.

This is the pilot pattern for later migrations of content creation, publishing, notifications, identity/access, and administration.

## Scope

### Included

- `GET /api/prompts`
- `POST /api/prompts`
- `GET /api/prompts/[id]`
- `PUT /api/prompts/[id]`
- `PATCH /api/prompts/[id]` as the existing alias of `PUT`
- `DELETE /api/prompts/[id]`
- `POST /api/prompts/[id]/clone`
- `POST /api/prompts/[id]/use`
- `GET /api/prompts/[id]/check-usage`
- `GET /api/prompts/default`
- Prompt validation and platform normalization used by these routes
- Existing create-prompt notification behavior

### Excluded

- `/api/prompts/generate`
- `/api/prompts/generate-smart`
- `/api/prompts/suggest`
- `/api/prompt-configs/**`
- `/api/platform-presets/**`
- Frontend refactoring, including `AiCreatorView.tsx`
- Database schema or RLS policy changes
- A standalone backend process, deployment, or repository
- A general-purpose database abstraction intended to support databases other than Supabase

## Selected Approach

Use a domain module under `backend/modules/prompts/`.

```text
backend/
  modules/
    prompts/
      prompt-module.ts
      prompt-repository.ts
      prompt-schemas.ts
      prompt-types.ts
      errors.ts

app/
  api/
    prompts/
      route.ts
      [id]/
        route.ts
        clone/route.ts
        use/route.ts
        check-usage/route.ts
      default/route.ts
```

The Route Handler files remain in `app/api` because Next.js 16.2.9 uses `route.ts` as the public HTTP entrypoint. Their implementation becomes limited to HTTP concerns.

Alternatives rejected:

- Technical folders such as `backend/repositories` and `backend/use-cases`: understanding one Prompt workflow would require navigating several unrelated directory trees.
- Route-colocated implementation under `app/api/prompts/_lib`: this would not establish the requested backend area and would make reuse by non-HTTP entrypoints less clear.

## Module Responsibilities

### Route Handlers

Each Route Handler owns only:

1. Calling the existing `requireUserWithRole` authentication adapter.
2. Reading JSON, query parameters, and async Next.js route parameters.
3. Constructing the Supabase Prompt repository from the authenticated client, then passing the actor, role, repository, and notification dependency to the Prompt module.
4. Mapping known Prompt errors to the existing HTTP status and JSON body.
5. Logging unexpected failures and returning the existing `500` response.

Route Handlers do not construct Supabase queries or implement Prompt business rules.

### Prompt Module

`prompt-module.ts` owns the core workflows:

- List prompts with owner visibility for non-admin users.
- Create prompts and enforce one default per platform for the current user.
- Read, update, and soft-delete with owner/admin authorization.
- Clone a prompt with the `Copy of ` prefix, capped at 200 characters; the current user becomes owner of the clone, matching current implementation and tests.
- Increment `usage_count`.
- Count active scheduled-post references through captions.
- Resolve the user's explicit default prompt or oldest fallback prompt.
- Trigger the existing create-prompt notification as a best-effort side effect.

The module accepts an authenticated actor and dependencies supplied by the HTTP adapter. It does not import `NextRequest`, `NextResponse`, cookies, or other HTTP-only types.

### Prompt Repository

`prompt-repository.ts` owns all queries involving:

- `prompts`
- `captions` for Prompt usage lookup
- `scheduled_posts` for active usage lookup

The production implementation uses the authenticated Supabase client returned by `requireUserWithRole`, preserving RLS. A test implementation or mock is allowed as the second adapter at this seam; this seam is for deterministic module testing, not speculative database portability.

### Schemas and Types

`prompt-schemas.ts` owns:

- Create input validation
- Partial update validation
- List query validation
- `threads` to `thread` normalization
- Existing limits for names, content, and tags

During this migration, `lib/validations/prompt.ts` becomes a compatibility re-export of the domain schemas. New Prompt backend code imports from the domain module. Removing the compatibility path is separate follow-up work.

`prompt-types.ts` contains only types shared across the Prompt module files. It must not become a generic project-wide type bucket.

### Errors

`errors.ts` defines typed Prompt failures, including:

- Prompt not found
- Prompt access denied
- Prompt validation failure
- Prompt persistence failure
- Prompt usage lookup failure

Error types carry stable error codes and enough context for adapter logging. They do not contain `NextResponse` objects.

## Data Flow

```text
Client
  -> Next.js Prompt Route Handler
  -> requireUserWithRole
  -> Prompt module
  -> Prompt repository
  -> authenticated Supabase client
  -> Supabase RLS and database
```

Response flow:

```text
Supabase result or repository failure
  -> Prompt module result or typed Prompt error
  -> Route Handler status/JSON mapping
  -> unchanged client response
```

## Compatibility Contract

The migration preserves the following existing behavior, including behavior that may be reconsidered later:

- Allowed roles remain `admin`, `marketer_full`, and `marketer_content`.
- Non-admin list requests return only rows owned by the current user.
- Read, update, delete, clone, and usage-check keep their current owner/admin checks.
- Delete remains a soft-delete using `is_deleted: true`.
- `PATCH` remains an alias of `PUT`.
- Clone names use `Copy of <original name>` and the current user owns the clone.
- Creating or updating a default prompt clears other defaults for the current user and target platform.
- `threads` inputs are stored and queried as `thread` where currently normalized.
- Default lookup is user-specific and falls back to the oldest non-deleted Prompt for that platform.
- Usage checking counts scheduled posts in `pending` or `posted` state whose captions reference the Prompt.
- Incrementing usage retains the current read-then-write behavior; making this atomic is a separate change because it would alter implementation semantics and may require a database function.
- Delete does not automatically call check-usage; the existing endpoint remains advisory to the caller.
- Notification failure after successful Prompt creation is logged but does not fail the request.

No frontend fetch call or response parser changes are included.

## Error Mapping

The HTTP adapters preserve current response text and status codes. At minimum:

- Invalid JSON or invalid input/query: `400`
- Missing Prompt: `404`
- Owner/admin access denied or RLS zero-row protection: `403`
- Unauthenticated request: existing `401` from `requireUserWithRole`
- Role denied: existing `403` from `requireUserWithRole`
- Supabase or unexpected dependency failure: existing route-specific `500` body

Raw Supabase errors are logged with useful diagnostic fields but are not returned to the client, except where the current delete route includes the Supabase message. That delete response remains unchanged during this compatibility migration and should be reviewed separately as a security-hardening task.

## Testing Strategy

### Compatibility Tests

Keep the existing Route Handler tests as the HTTP contract suite:

- `__tests__/api/prompts.test.ts`
- `__tests__/api/promptsDefault.test.ts`
- `__tests__/api/promptsThreadsFlow.test.ts`

They must continue to verify request parsing, authorization responses, status codes, and response shapes. Test setup can be adapted to construct the new module dependencies, but assertions describing public behavior must remain unchanged.

### Prompt Module Tests

Add focused tests for the domain workflows using a repository test adapter or mock:

- Admin and owner list visibility
- Pagination and filters
- Create and default reset
- Read/update/delete authorization
- Soft-delete
- Clone name truncation and ownership
- Usage count increment
- Scheduled-post usage counting
- Default and oldest-fallback resolution
- Best-effort notification behavior
- Typed failure propagation

These tests call the Prompt module directly and do not construct `NextRequest` or mock chainable Supabase query builders.

### Verification

The implementation is complete only when all of the following pass:

```text
npx tsc --noEmit
npm test
npm run lint
```

If the existing lint script is incompatible with Next.js 16, that is reported separately rather than silently changing project tooling within this migration.

## Migration Sequence

1. Add Prompt module types, schemas, typed errors, and repository.
2. Add Prompt module workflows and direct module tests.
3. Convert list/create Route Handlers to thin adapters.
4. Convert read/update/delete Route Handlers.
5. Convert clone, use, check-usage, and default Route Handlers.
6. Run focused Prompt tests after each route group.
7. Run full TypeScript, test, and lint verification.
8. Confirm no frontend files, database migrations, or public contracts changed.

## Success Criteria

- `backend/modules/prompts/` is the only place containing core Prompt Library workflow and persistence knowledge.
- Core Prompt Route Handlers contain no `.from('prompts')`, `.from('captions')`, or `.from('scheduled_posts')` calls.
- Public Prompt URLs, methods, status codes, and JSON remain compatible.
- Existing Prompt route tests pass.
- New module tests exercise business behavior without HTTP or chainable Supabase mocks.
- TypeScript passes.
- No unrelated user changes, including the current `.gitignore` modification, are altered or committed.

## Follow-up Work

After this pilot is stable, use the same domain-module pattern for one scope at a time. Recommended order:

1. Prompt configs and platform presets
2. Content creation and caption generation
3. Publishing and scheduling
4. Identity/access and administration

Each follow-up requires its own scoped design because those areas have different state transitions and external adapters.
