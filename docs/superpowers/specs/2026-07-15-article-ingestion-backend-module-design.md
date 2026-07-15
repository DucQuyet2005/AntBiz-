# Article Ingestion Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract URL crawling and manual-article creation from the 239-line `/api/scrape` Route Handler into a dedicated Article Ingestion module. Preserve ARTICLE/LISTING responses, SSRF protection, service-role persistence, exact/prefix URL matching, and crawl persistence best-effort behavior while making the route a thin HTTP adapter.

Approved behavior corrections:

- Manual POST now requires the same authenticated roles as GET.
- Malformed manual JSON returns `400` instead of catch-all `500`.
- Unexpected URL-safety failures map to a controlled `500`.

## Domain Language

`CONTEXT.md` defines **Article Ingestion** as bringing source material into AntBiz through a safe public URL or manually written content. Crawled pages are classified as an Article or Listing and normalized for reuse.

Crawled content remains usable when persistence fails. Manual content succeeds only after storage.

## Scope

### Included

- `GET /api/scrape`
- `POST /api/scrape`
- URL format and SSRF validation
- `crawlUrl` and `preprocessArticle` orchestration
- ARTICLE/LISTING branching
- Article metadata normalization
- Exact URL and prefix fallback lookup
- Article insert/update
- Manual article normalization and persistence
- Route, module, repository, and source-adapter tests

### Excluded

- Crawler implementation changes
- Caption Generation crawler adapter
- Multi-page crawling
- Firecrawl integration
- Article CRUD beyond ingestion
- UI changes
- Database schema, migration, or RLS changes
- Making crawl persistence fatal

## Selected Architecture

```text
backend/modules/article-ingestion/
  article-ingestion-module.ts
  article-ingestion-repository.ts
  article-ingestion-schemas.ts
  article-ingestion-types.ts
  article-source-adapter.ts
  errors.ts

app/api/scrape/
  _adapter.ts
  route.ts
```

The module exposes:

```ts
ingestUrl(url): Promise<ArticleIngestionResult>
createManual(input): Promise<ManualArticleResult>
```

It imports no Next.js request or response types.

Rejected alternatives:

- Add ingestion to Caption Generation. Article Ingestion also powers source exploration and manual articles, so it has a wider lifecycle than caption generation.
- Split URL and manual ingestion into separate modules. Both normalize and persist Article records; separate interfaces would duplicate storage and response policy.
- Move the Route Handler body unchanged. The deletion test shows no depth because security, crawling, normalization, persistence, and response rules would remain coupled.

## Responsibilities

### Route Handler

The Route Handler owns only:

1. Authentication for GET and POST with `admin`, `marketer_full`, and `marketer_content`.
2. Reading the URL query or JSON body.
3. Applying module-owned schemas.
4. Building production adapters.
5. Calling Article Ingestion.
6. Mapping typed errors to HTTP responses.

It contains no crawler, preprocessor, SSRF, service-role client, database query, or article-normalization implementation.

### Article Ingestion Module

The module owns:

- URL parsing and safety policy.
- ARTICLE/LISTING branching.
- Category normalization with `#`.
- Image URL and tag response formatting.
- Exact then prefix lookup order.
- Insert/update decision.
- Crawl persistence best-effort policy.
- Manual URL, description, author, category, image, body, tag, and timestamp defaults.

### Article Source Adapter

The production adapter wraps:

- `isSafeUrl`
- `crawlUrl`
- `preprocessArticle`

It returns normalized preprocessor output without HTTP formatting. Module tests use a fake source adapter.

### Article Ingestion Repository

The repository owns all `articles` queries:

- Exact URL lookup
- Prefix URL lookup ordered by latest `crawled_at`
- Update by ID
- Insert crawled article
- Insert manual article

The production adapter uses the existing service-role client with anonymous-key fallback, preserving current deployment behavior. Module tests use an in-memory repository.

## Input and Output Contracts

### URL Ingestion

Input is a required URL query string.

LISTING output remains:

```text
type, url, extractedUrls, warning
```

ARTICLE output remains:

```text
id, title, description, full_text, imageUrl, author, category,
tags, published_at, views, url, body, author_image_url
```

`imageUrl` remains newline-separated and `tags` remains comma-separated.

### Manual Ingestion

Input:

- Required non-empty `title`
- Required non-empty `full_text`
- Optional `category`
- Optional `author`
- Optional newline-separated `imageUrl`

Defaults remain:

- URL: `manual://article-<timestamp>`
- Category: `#Manual`
- Author: `AntBiz User`
- Views: `0`
- Tags: manual
- Description: full text, or first 197 characters plus `...` when longer than 200

## Data Flow

### URL

```text
authenticate
  -> validate URL format
  -> validate SSRF safety
  -> crawl and preprocess
  -> LISTING: return immediately
  -> normalize ARTICLE
  -> exact URL lookup
  -> prefix fallback when no exact record
  -> update existing or insert new (best-effort)
  -> return crawled projection
```

Lookup failure is logged and treated as no match. Write failure is logged. If update fails, the existing ID is returned; if insert fails, ID is empty.

### Manual

```text
authenticate
  -> validate JSON and required content
  -> normalize manual article
  -> insert
  -> return projection
```

Manual insert failure is fatal.

## Error Handling

- Auth failure: existing auth response.
- Missing URL: `400` with current message.
- Invalid URL format: `400` with current message.
- Unsafe URL: `400` with current SSRF message.
- URL-safety adapter failure: controlled `500`.
- Crawl/preprocess failure: `500` with existing error-message behavior.
- Listing: successful `200`, no persistence.
- Crawled lookup/write failure: logged, successful `200` response.
- Malformed manual JSON: approved `400`.
- Missing manual title/full text: `400`.
- Manual insert failure: `500` with current message.
- Unexpected manual failure: `500`.

## Testing Strategy

### Module Tests

Add `__tests__/backend/article-ingestion/articleIngestionModule.test.ts` covering:

- Invalid and unsafe URLs
- URL-safety and crawler failures
- LISTING without persistence
- ARTICLE normalization
- Exact match and prefix fallback
- Existing update and new insert
- Lookup/write failures as best-effort
- Manual defaults and description truncation
- Manual image parsing
- Manual insert failure

### Adapter Tests

Add focused tests for:

- `isSafeUrl`, `crawlUrl`, and `preprocessArticle` forwarding
- Service-role client construction inputs
- Exact and prefix query shape
- Update and insert payloads

### Route Contract Tests

Add `__tests__/api/articleIngestion.test.ts` covering:

- GET and POST auth
- Missing URL
- Malformed manual JSON
- Manual schema validation
- Typed 400/500 mapping
- ARTICLE, LISTING, and manual success response

Direct Route Handler tests move out of `inputFlows.test.tsx`. That file retains UI/fetch-flow tests only, preventing Supabase SSR initialization outside a Next.js request scope.

### Verification

Run:

```text
npm test -- __tests__/api/articleIngestion.test.ts __tests__/backend/article-ingestion __tests__/components/inputFlows.test.tsx
npx eslint <changed files>
npx tsc -p <temporary scoped Article Ingestion tsconfig>
```

Also run the full suite and full TypeScript command. Existing failures in untouched areas are reported separately.

## Migration Sequence

1. Add schemas, types, typed errors, and interfaces.
2. Add source and repository production adapters.
3. Implement URL validation, LISTING, and ARTICLE normalization.
4. Implement exact/prefix matching and best-effort persistence.
5. Implement manual ingestion and authentication correction.
6. Add module and adapter tests.
7. Add route `_adapter.ts` and convert GET/POST.
8. Refocus input-flow and route contract tests.
9. Verify no crawler, service-client, or article query remains in the route.
10. Run scoped and full verification.

## Success Criteria

- `backend/modules/article-ingestion/` owns Article Ingestion workflow and persistence knowledge.
- The Route Handler contains no crawler, SSRF, preprocessor, service-role, or `articles` query implementation.
- GET and POST both require approved roles.
- ARTICLE and LISTING response shapes remain compatible.
- Crawl persistence remains best-effort; manual persistence remains fatal.
- Malformed manual JSON returns approved `400`.
- Route tests no longer initialize Supabase SSR outside request scope.
- Module, adapter, and route tests cover both ingestion modes.
- Scoped TypeScript and ESLint pass.
- Crawler implementation, Caption Generation, UI, database, and the user's `.gitignore` change remain untouched.
