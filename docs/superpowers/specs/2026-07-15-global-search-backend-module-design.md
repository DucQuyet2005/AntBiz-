# Global Search Backend Module Design

## Goal

Move the existing `GET /api/search` workflow out of its Next.js Route Handler and into a dedicated backend bounded context while preserving the public endpoint and the response contracts consumed by `Header` and `SearchView`.

Global Search is a role-aware read model. Administrators search users and audit logs; marketers search articles, captions, and their own prompts. Both projections include FAQ matches from the packaged translations.

## Scope

This change covers:

- `GET /api/search?q=<query>&lang=<vi|en>`
- Administrator results: users, audit logs, and FAQs
- Marketer results: articles, captions, prompts, and FAQs
- Input validation and safe PostgREST filter construction
- Backend module and Route Handler tests

This change does not modify the UI, database schema, RLS policies, route URL, result limit, or public response shapes.

## Architecture

Create a `backend/modules/global-search/` bounded context. `GlobalSearchModule` owns input normalization, role-based projection selection, FAQ composition, and orchestration. A single `GlobalSearchRepository` exposes the two read projections, `searchAdmin` and `searchMarketer`. A separate in-memory FAQ provider searches the application translations.

The Route Handler remains the HTTP adapter. It authenticates the request with `requireUserWithRole`, extracts URL parameters, creates the module with the request-scoped Supabase client, invokes the use case, and maps typed module errors to HTTP responses.

Global Search does not call the existing Audit Reporting, Prompt, Caption Management, or Article Ingestion modules. Those modules own their workflows; Global Search owns the cross-domain display projection.

## Proposed File Structure

```text
backend/modules/global-search/
├── global-search-module.ts
├── global-search-repository.ts
├── global-search-faq-provider.ts
├── global-search-schemas.ts
├── global-search-types.ts
├── global-search-errors.ts
├── global-search-factory.ts
└── index.ts
```

## Input Contract

The module accepts an authenticated actor and raw search parameters:

```ts
{
  query: string;
  language: 'vi' | 'en';
  actor: {
    id: string;
    role: 'admin' | 'marketer_full' | 'marketer_content';
  };
}
```

Input rules:

- Trim the search query.
- Reject an empty query with a validation error.
- Reject a query longer than 200 characters.
- Accept `vi` and `en`; fall back to `vi` for any other language value.
- Preserve one-character searches because the dedicated search page currently allows them even though header suggestions start at two characters.

## Safe Search Pattern Construction

The repository owns a helper that converts the normalized query into a literal contains pattern for PostgREST filters.

- User-supplied `%` and `_` are escaped so they are literal characters rather than caller-controlled SQL LIKE wildcards.
- Backslashes are escaped before a value is embedded in logical-filter syntax.
- Values embedded in `.or(...)` are quoted so commas and parentheses cannot add or restructure PostgREST filters.
- Because a literal double quote cannot be represented reliably inside PostgREST logical-filter grammar, a query containing one never enters `.or(...)`. The repository instead runs parameterized `.ilike()` reads for the affected columns concurrently, merges records by ID, restores newest-first ordering, caps the projection at 20, and removes the internal ordering field before returning the existing response shape.
- The repository, rather than the Route Handler, adds the surrounding contains wildcard.

The helper and direct-filter fallback are tested with `%`, `_`, comma, parentheses, double quote, and backslash inputs.

## Role-Aware Data Flow

### Administrator Projection

The repository runs these reads concurrently:

- Users matched by email, newest first, limit 20.
- Audit logs matched by action with actor email projection, newest first, limit 20.

The module combines them with FAQ results and returns exactly:

```ts
{ users, auditLogs, faqs }
```

### Marketer Projection

The repository runs these reads concurrently:

- Articles matched by title, description, or full text, newest first, limit 20.
- Captions matched by edited or generated content with source article projection, newest first, limit 20.
- Non-deleted prompts matched by name or content, newest first, limit 20.

Prompt search always includes `created_by = actor.id` and `is_deleted = false`. Articles and captions retain the application's current authenticated-read behavior and request-scoped RLS enforcement.

The module combines the records with FAQ results and returns exactly:

```ts
{ articles, captions, prompts, faqs }
```

## FAQ Search

The FAQ provider reads only the packaged `translations` object. It searches the supported FAQ categories in their existing order and checks both question and answer text using the selected language. It produces the existing `{ key, category, question, answer }` shape and performs no database or session access.

## Error Handling and Security

- Missing authentication remains HTTP 401 and an unauthorized role remains HTTP 403 through the existing auth adapter.
- Input failures become a typed validation error mapped to HTTP 400.
- A failure in any database read becomes a typed repository error mapped to HTTP 500.
- Search remains all-or-nothing; the endpoint does not return silently partial projections.
- Public errors do not expose Supabase or Postgres details.
- Server logs identify the failed search operation without logging the raw query or returned content.
- The module receives an already authenticated actor and never reads cookies or sessions.
- The repository uses the request-scoped Supabase client so RLS remains the final data-access boundary.
- Route authorization and module role branching both prevent a non-admin actor from selecting the administrator projection.

## Route Handler Responsibilities After Migration

`app/api/search/route.ts` will only:

1. Authorize `admin`, `marketer_full`, and `marketer_content`.
2. Read `q` and `lang` from `request.nextUrl.searchParams`.
3. Create the Global Search module from the authenticated Supabase client.
4. Invoke the search use case with the authenticated actor.
5. Map typed errors to stable HTTP responses.

It will not construct database queries, search translations, or shape role-specific result sets.

## Verification

### Module Tests

- Trims valid queries and normalizes unsupported languages to Vietnamese.
- Rejects empty and over-200-character queries.
- Dispatches administrators to `searchAdmin`.
- Dispatches both marketer roles to `searchMarketer` with the actor ID.
- Searches Vietnamese and English FAQ content.
- Escapes all PostgREST filter metacharacters safely.
- Converts each source query failure into an internal repository error.

### Route and Repository Tests

- Returns 401 for an unauthenticated request.
- Returns 403 for an unsupported role.
- Returns 400 for invalid input.
- Preserves the administrator response shape.
- Preserves the marketer response shape.
- Returns 500 when a database projection fails.
- Applies prompt ownership and non-deleted filters.
- Applies the 20-record cap and newest-first ordering to every database category.

### Project Checks

- Run the focused Global Search module and Route Handler tests.
- Run ESLint directly on changed files.
- Run `npx tsc --noEmit` and distinguish new failures from established baseline failures.
- Run the full test suite and report the established `inlineEdit` failure separately if it remains.

## Acceptance Criteria

- Both existing UI consumers continue to work without changes.
- The public URL and role-specific response shapes remain unchanged.
- The Route Handler contains no direct data-source or FAQ-search logic.
- Search filter construction treats user input as literal content and cannot be restructured by reserved PostgREST characters.
- Administrator and marketer authorization and projection behavior have explicit automated coverage.
