# Author Profile Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the Author Profile lifecycle from three Route Handlers into a dedicated backend module. Concentrate ownership, per-owner name uniqueness, persistence, collection-state transitions, and Style Sample Collection behind one interface while preserving existing endpoints and successful response shapes.

Approved behavior corrections:

- Update, delete, and sample collection require the profile owner or an authenticated admin.
- Authorization uses the authenticated role rather than a nonexistent role field on the profile.
- Every source URL, including discovered child URLs, receives SSRF validation before crawling.
- Empty collection no longer inserts unrelated hard-coded samples or reports `ready`.
- `tuning_status` and `tuned_model_id` become internal lifecycle fields and cannot be changed by ordinary profile updates.

## Domain Language

`CONTEXT.md` defines an **Author Profile** as a user's reusable writing-style reference. **Style Sample Collection** safely gathers up to five distinct article texts for few-shot prompting.

The workflow does not train a model. `/train`, `tuning_status`, and `tuned_model_id` remain compatibility names in the HTTP and database transports.

## Scope

### Included

- `GET /api/author-profiles`
- `POST /api/author-profiles`
- `PUT /api/author-profiles/[id]`
- `DELETE /api/author-profiles/[id]`
- `POST /api/author-profiles/[id]/train`
- Profile schemas and normalization
- Owner/admin authorization
- Per-owner name uniqueness
- Profile persistence
- SSRF validation
- ARTICLE/LISTING source handling
- Related-link extraction, same-origin filtering, deduplication, and five-sample limit
- Collection-state transitions
- Module, repository, source-adapter, and route-contract tests

### Excluded

- Database schema or migration changes
- UI changes
- Crawler implementation changes
- Background jobs or queues
- Real Gemini fine-tuning
- Caption-generation prompt changes
- Reworking Article Ingestion's interface

## Selected Architecture

```text
backend/modules/author-profiles/
  author-profile-module.ts
  author-profile-repository.ts
  author-profile-schemas.ts
  author-profile-types.ts
  style-sample-source-adapter.ts
  errors.ts

app/api/author-profiles/
  _adapter.ts
  route.ts
  [id]/route.ts
  [id]/train/route.ts
```

The deep module exposes five operations:

```text
list(actor)
create(actor, input)
update(actor, profileId, input)
delete(actor, profileId)
collectStyleSamples(actor, profileId)
```

The actor contains the authenticated `userId` and `role`. The module, rather than a Route Handler or profile record, owns authorization decisions.

Rejected alternatives:

- Split Profile Management and Style Sample Collection into separate external modules. Both workflows share ownership, persistence, and lifecycle state; two external interfaces would repeat invariants and reduce locality.
- Extract only `/train`. CRUD authorization and uniqueness would remain spread across Route Handlers.

## Responsibilities

### Route Handlers

Route Handlers own only:

1. Authentication for `admin`, `marketer_full`, and `marketer_content`.
2. Reading JSON, query data, and asynchronous route params.
3. Applying module-owned schemas.
4. Building production adapters from the request-scoped Supabase client.
5. Calling the Author Profile module.
6. Mapping typed errors to HTTP responses.

They contain no `author_profiles` queries, ownership decisions, uniqueness rules, crawler orchestration, link extraction, or lifecycle transitions.

### Author Profile Module

The module owns:

- Listing the authenticated user's profiles.
- Trimming and normalizing name and source URL values.
- Per-owner name uniqueness for create and rename.
- Owner-or-admin authorization for update, delete, and collection.
- Protection of internal lifecycle fields from ordinary updates.
- ARTICLE/LISTING collection policy.
- Same-origin link selection, URL and content deduplication, and the five-sample limit.
- `training`, `ready`, and `failed` transitions.
- Typed domain errors.

Admin list behavior remains unchanged: listing returns only the authenticated admin's profiles. When an admin renames another user's profile, uniqueness is checked against that profile owner's names.

### Author Profile Repository

The repository owns all `author_profiles` queries:

- List by owner.
- Find by ID.
- Find a conflicting owner/name pair with optional excluded ID.
- Insert, update, and delete.
- Update collection status and samples.

The production adapter uses the authenticated, request-scoped Supabase client. Module tests use an in-memory adapter.

### Style Sample Source Adapter

The production source adapter wraps `isSafeUrl`, `crawlUrl`, and `preprocessArticle`. It preserves both the raw HTML required for related-link discovery and the preprocessed ARTICLE/LISTING result required for text selection.

This is a separate interface from Article Ingestion because the two callers need different information. Both adapters reuse the existing crawler implementation without changing it.

## Input Contracts

### Create

- `name`: required non-empty string.
- `source_url`: optional empty string or valid URL.

### Update

- `name`: optional non-empty string.
- `source_url`: optional empty string or valid URL.
- `tuning_status` and `tuned_model_id`: rejected by a strict schema and never passed to persistence. Callers receive `400` for attempting to mutate internal lifecycle fields.

Names and URLs are trimmed in the module. An empty source URL is stored as `null`.

## Data Flow

### List

```text
authenticate -> list by actor.userId -> return profiles
```

### Create

```text
authenticate -> validate -> normalize -> check owner/name conflict
  -> insert pending profile -> return profile
```

### Update

```text
authenticate -> validate -> load profile -> require owner or admin
  -> check renamed value against profile owner -> update -> return profile
```

### Delete

```text
authenticate -> load profile -> require owner or admin -> delete
  -> return { deleted: true }
```

### Style Sample Collection

```text
authenticate
  -> load profile
  -> require owner or admin
  -> require source URL
  -> validate source URL safety
  -> set training
  -> crawl and preprocess source
  -> ARTICLE: accept source text and inspect same-origin related links
  -> LISTING: inspect discovered article URLs
  -> validate every child URL before crawl
  -> collect distinct text; stop at five
  -> at least one sample: store samples, set ready, clear tuned_model_id
  -> no samples or fatal failure: best-effort set failed, return typed error
```

Child-page failures are logged and skipped. Collection succeeds when at least one distinct sample remains. A main-source failure, no usable samples, or persistence failure makes the workflow fail.

The `training` transition happens only after ownership, source presence, and source safety succeed. Failure to enter `training` stops collection. Failure to store samples or enter `ready` is fatal, followed by a best-effort transition to `failed`.

## Link and Sample Policy

- LISTING results use discovered article URLs from preprocessing.
- ARTICLE results use the article text first, then related links extracted from raw HTML.
- Related URLs must share the source origin.
- Fragment-only, invalid, duplicate, and unsafe URLs are skipped.
- Source and child content use `full_text`, then `description` as fallback.
- Duplicate text is ignored.
- Collection stops after five distinct samples.
- No hard-coded fallback content is permitted.

## Error Handling

- Existing authentication failure: existing auth response.
- Malformed JSON or schema failure: `400`.
- Duplicate profile name: `400`, preserving current behavior.
- Missing source URL: `400`.
- Unsafe source or child URL: source URL returns `400`; unsafe discovered child URLs are skipped.
- Non-owner/non-admin mutation or collection: `403`.
- Missing profile: `404`.
- Completed crawl with no usable sample: `422` and status `failed`.
- Repository, main crawler, or required state-transition failure: `500`.
- Individual child crawl failure: logged and skipped.

Existing successful response shapes and the `/train` endpoint remain compatible. Error text remains Vietnamese where the current contract defines it.

## Testing Strategy

### Module Tests

Cover:

- List and create.
- Trimming and per-owner uniqueness.
- Owner and admin update/delete authorization.
- Admin rename uniqueness against the actual owner.
- Rejection of external lifecycle-field mutation.
- Missing and unsafe source URLs.
- ARTICLE direct sample and related-link collection.
- LISTING URL collection.
- Same-origin selection, URL/text deduplication, and the five-sample limit.
- Safety checks for child URLs.
- Partial child failure with successful remaining samples.
- Empty collection to `failed` and `422`.
- Main-source, repository, and transition failures.

### Adapter Tests

Cover:

- Repository query shapes for owner, ID, conflict, insert, update, delete, status, and samples.
- Source forwarding to `isSafeUrl`, `crawlUrl`, and `preprocessArticle`.
- Preservation of raw HTML and preprocessed result.

### Route Contract Tests

Cover:

- Authentication and approved roles.
- Next.js asynchronous route params.
- Malformed JSON and schema validation.
- Typed `400`, `403`, `404`, `422`, and `500` mapping.
- Existing list, create, update, delete, and collection success responses.

Existing route-heavy tests are refocused so workflow behavior is tested through the module interface and transport behavior through Route Handler contracts.

## Verification

Run focused Author Profile tests, direct ESLint on changed files, and a temporary scoped TypeScript configuration. Then run the full test suite and full TypeScript check, reporting unrelated existing failures separately.

Verify that Route Handlers contain no crawler imports, `author_profiles` queries, ownership checks, uniqueness checks, or collection-state transitions.

## Migration Sequence

1. Add schemas, types, typed errors, and actor contract.
2. Add repository and source production adapters.
3. Implement list/create/update/delete lifecycle rules.
4. Implement safe ARTICLE/LISTING sample collection and state transitions.
5. Add module and adapter tests.
6. Add the route `_adapter.ts` and convert all three Route Handlers.
7. Refocus route tests around HTTP contracts.
8. Run scoped and full verification.

## Success Criteria

- `backend/modules/author-profiles/` owns the Author Profile lifecycle and Style Sample Collection.
- Route Handlers contain transport concerns only.
- Owner/admin authorization is correct for update, delete, and collection.
- Every crawled URL receives SSRF validation.
- Lifecycle fields cannot be changed through ordinary profile updates.
- Collection stores one to five genuine, distinct samples or fails without fabricated content.
- Existing endpoints, successful response shapes, database schema, and frontend remain compatible.
- Module, adapter, and route tests cover all lifecycle operations.
- Scoped TypeScript and ESLint pass.
- The user's `.gitignore` change remains untouched.
