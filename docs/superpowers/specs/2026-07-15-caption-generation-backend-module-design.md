# Caption Generation Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the Caption Generation workflow from the 579-line Next.js Route Handler into a deep backend module. Preserve the existing `/api/captions/generate` JSON and Server-Sent Events contracts while concentrating article resolution, content-configuration selection, Gemini streaming, platform validation, and caption persistence behind one interface.

The migration includes one approved behavior correction: when a caller supplies a `promptId` that does not resolve to an active Prompt Library record, preparation fails with `404` instead of continuing to Gemini without that requested prompt.

## Scope

### Included

- `POST /api/captions/generate`
- Request validation and platform normalization
- Resolving a stored article or crawling and persisting a URL
- Platform Preset selection
- Brand Style configuration selection
- Prompt Library, custom prompt, and Threads default-prompt selection
- Best-effort regeneration comparison logging
- Gemini key rotation, retry, and streamed text parsing
- Threads and Instagram length validation
- Draft caption persistence and variant metadata
- SSE event adaptation
- Focused corrections to the existing generate tests

### Excluded

- `/api/generate-missing`
- Prompt generation routes
- Prompt Config AI routes
- Speech-to-text routes
- Changes to `AiCreatorView`
- Database schema, migrations, constraints, or RLS policies
- Model-selection policy changes
- Prompt-copy redesign
- Moving Caption Generation to a standalone deployment
- Changing the endpoint URL or transport away from SSE

## Domain Language

`CONTEXT.md` defines **Caption Generation** as the workflow that turns one stored or crawled article into a valid persisted draft social caption. The workflow includes content-configuration resolution and Gemini streaming, but its interface does not include HTTP or SSE syntax.

## Selected Architecture

Create a sibling backend module:

```text
backend/modules/caption-generation/
  caption-generation-module.ts
  caption-generation-repository.ts
  caption-generation-schemas.ts
  caption-generation-types.ts
  caption-prompt-builder.ts
  gemini-caption-adapter.ts
  article-crawler-adapter.ts
  default-prompt-adapter.ts
  errors.ts

app/api/captions/generate/
  _adapter.ts
  route.ts
```

The module exposes one primary interface:

```ts
generate(actor, input): Promise<CaptionGenerationSession>
```

Preparation completes before the session is returned, allowing the Route Handler to map validation, lookup, crawler, database, and Gemini-startup failures to JSON status responses. A session exposes typed generation events without SSE formatting.

Rejected alternatives:

- Extract several helpers while leaving orchestration in the Route Handler. This keeps the interface shallow and leaves ordering knowledge spread across the HTTP adapter.
- Move the existing handler body into one backend function that returns `Response`. The deletion test shows no leverage: deleting that function simply moves the same HTTP-aware implementation back into the route.
- Include all AI routes in one migration. Caption Generation already contains enough independent behavior for one verifiable change, while prompt generation, missing-caption generation, and speech-to-text have different inputs and persistence rules.

## Interfaces and Responsibilities

### Route Handler

The Route Handler owns only:

1. Authentication through `requireUserWithRole`.
2. Reading and validating JSON with the module-owned schema.
3. Building production adapters from the authenticated and service-role Supabase clients.
4. Calling `generate(actor, input)`.
5. Mapping typed preparation errors to JSON.
6. Encoding typed session events as the existing SSE frames and headers.

It contains no direct Supabase table query, crawler call, Gemini URL, retry loop, prompt construction, or platform-length rule.

### Caption Generation Module

The module owns the full workflow order:

```text
resolve article
  -> resolve content configuration
  -> build final prompt
  -> start Gemini generation
  -> stream text events
  -> validate completed text
  -> persist valid caption
  -> emit completion metadata
```

Its interface accepts an authenticated actor and validated input. It imports no Next.js request, response, or SSE types.

### Caption Generation Repository

One repository interface concentrates persistence knowledge for the workflow. Its production adapter receives both clients and preserves their current use:

- Authenticated user client: read an article by ID, find an existing article by URL, read Prompt Library and Brand Style records, read regeneration metadata, and insert captions.
- Service-role client: insert/update crawled articles and read Platform Presets as currently implemented.

Repository operations cover:

- Finding articles by ID and URL
- Inserting or refreshing a crawled article
- Finding Platform Presets by ID or platform scope
- Finding Brand Style configuration by ID
- Finding active prompts and old-caption prompt metadata
- Inserting a draft caption

The module test adapter implements the same interface in memory, avoiding chainable Supabase mocks.

### Article Crawler Adapter

The production crawler adapter wraps `crawlUrl` and `preprocessArticle`. It returns a normalized article candidate or a typed listing-page result. The module test adapter supplies deterministic article candidates and failures.

### Gemini Caption Adapter

The production Gemini adapter owns:

- `executeWithRotation`
- Gemini model URL construction
- Exponential retry for `429` and transient fetch failures
- Generation temperature
- Parsing Gemini stream chunks into text fragments

It yields text fragments rather than SSE frames. The module test adapter yields deterministic fragments or throws at configured points.

### Default Prompt Adapter

The production adapter reads `prompts/threads/system.md` and replaces article placeholders. It is used only when Threads has no explicit Prompt Library or custom instruction. Its test adapter returns deterministic template content.

### Prompt Builder

Prompt composition is an internal pure implementation detail. It combines the article summary, selected Platform Preset, Brand Style content, explicit instruction, platform label, and fixed structure rules. It preserves current truncation limits and prompt copy.

## Input Contract

The schema retains the current fields:

- `url`
- `articleId`
- `promptId`
- `customPrompt`
- `platform`
- `variantGroupId`
- `variantIndex`
- `oldCaptionId`
- `authorProfileId`
- `stylePresetId`
- `platformPresetId`

Rules remain:

- Either `url` or `articleId` is required.
- `customPrompt` requires `platform`.
- `variantIndex` defaults to `0` and must be `0`, `1`, or `2`.
- A content configuration is required unless the platform is Threads.
- Both `thread` and `threads` inputs are accepted; persisted captions use `thread`.
- `authorProfileId` remains accepted but is not persisted until the existing database migration concern is resolved.

## Data Flow

### Article Resolution

When `articleId` is present, the repository reads the article through the authenticated client. A missing article returns `404`.

When URL is present:

1. Validate it with the URL parser.
2. Crawl and preprocess fresh content.
3. Reject a listing page with `400`.
4. Find an existing article by URL through the authenticated client.
5. Refresh the existing record or insert a new record through the service-role client.

The stored record becomes the article used for generation.

### Content Configuration Resolution

Platform Preset selection preserves this order:

1. Explicit `platformPresetId`
2. Current user's default for the platform
3. Current user's first preset for the platform
4. System default for the platform
5. First system preset for the platform

Brand Style selection preserves text rules and JSON rules. JSON rules combine `general` content with the platform-specific content.

Instruction selection preserves this order:

1. Active Prompt Library record selected by `promptId`
2. `customPrompt`
3. Threads default file when no explicit instruction exists

An explicitly supplied but missing or deleted `promptId` is the approved `404` correction. Regeneration comparison remains best-effort logging and never blocks generation.

### Generation and Persistence

The prompt builder preserves article-title and content truncation, fixed structure instructions, and platform labeling. Variant `0` uses temperature `0.7`; variants `1` and `2` use `1.0`.

The Gemini adapter yields text fragments. The module accumulates the complete generated text while forwarding fragment events.

After Gemini completes:

- Threads content is validated against the existing 500-character rule.
- Instagram content is validated against the existing 2,200-character rule.
- Invalid content emits a validation-error event and is not persisted.
- Valid non-empty content is inserted as a draft caption.
- The persisted platform normalizes Threads to `thread`.
- `variant_group_id` is included only when supplied.
- `prompt_id` is the selected Prompt Library ID or null.

Caption-save failure remains best-effort for compatibility: it is logged, and completion is emitted with an empty `captionId`.

## Event and SSE Contract

The module session emits typed events:

```text
text               generated text fragment
validation-error   platform length message and done=true
completed          captionId, articleId, variantGroupId
```

The Route Handler maps them to the existing wire format:

```text
data: {"text":"..."}\n\n
data: {"error":"...","done":true}\n\n
data: {"done":true,"captionId":"...","articleId":"...","variantGroupId":null}\n\n
data: [DONE]\n\n
```

Headers remain:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

If validation fails after text fragments have streamed, the route emits the validation-error event and closes without a completion event or `[DONE]`, preserving current behavior.

## Error Handling

Typed preparation errors map as follows:

- Invalid JSON or input: `400`
- Invalid URL: `400`
- Listing page: `400`
- Missing article: `404`
- Explicit missing/deleted prompt: `404`
- Article read/write failure: `500`
- Crawler failure: `500`
- Gemini startup, key rotation, or upstream failure before streaming: `500`
- Unexpected preparation failure: `500`
- Auth failure: existing `requireUserWithRole` response

During event iteration:

- Platform validation emits a typed validation-error event and closes normally.
- Caption-save failure is logged and completion contains an empty caption ID.
- Gemini failure ends the stream with an error and does not persist partial content.

Client-facing messages remain compatible except for the approved missing-prompt correction. Internal logs retain operation context without logging service keys.

## Testing Strategy

### Module Tests

Add `__tests__/backend/caption-generation/captionGenerationModule.test.ts` covering:

- Article lookup by ID
- URL validation, crawl, listing rejection, refresh, and insert
- Platform Preset precedence
- Brand Style text and JSON rules
- Prompt Library, custom prompt, and Threads default fallback
- Explicit missing/deleted prompt returning not found
- Regeneration comparison failures as best-effort
- Variant temperature
- Text fragment events
- Threads and Instagram validation errors
- Threads persistence normalization
- Caption payload and variant metadata
- Caption-save failure compatibility
- Gemini failure without partial persistence

Module tests call the same `generate` interface used by the Route Handler and use in-memory adapters.

### Adapter Tests

Add focused tests for:

- Supabase repository client and table selection
- Gemini chunk parsing and retry behavior
- Threads default-template replacement

These tests may mock adapter dependencies, but module tests do not mock Supabase query chains.

### Route Contract Tests

Refocus the existing generate tests on:

- Auth and malformed JSON
- Input validation and HTTP status mapping
- Missing prompt returning `404`
- SSE headers and exact event encoding
- Validation-error SSE encoding
- Completion metadata and `[DONE]`

The current Threads `.or()` failure is a test-isolation defect, not a production behavior change. Moving selection behind the repository seam lets route and module tests avoid reproducing Supabase's fluent query interface.

### Verification

Run:

```text
npm test -- __tests__/api/generate.test.ts __tests__/api/generateThreads.test.ts __tests__/backend/caption-generation
npx eslint <changed files>
npx tsc -p <temporary scoped Caption Generation tsconfig>
```

Also run the full suite and full TypeScript command. Existing failures in untouched areas are reported separately.

## Migration Sequence

1. Characterize the existing JSON and SSE contract with route tests.
2. Add schemas, types, typed errors, and event definitions.
3. Add repository, crawler, default-prompt, and Gemini production adapters.
4. Implement prompt composition and configuration selection.
5. Implement the Caption Generation module and module tests.
6. Add the route `_adapter.ts` and reduce the Route Handler to HTTP/SSE adaptation.
7. Correct the explicit missing-prompt behavior and update outdated test expectations.
8. Verify no direct database, crawler, or Gemini implementation remains in the migrated route.
9. Run scoped and full verification.

## Success Criteria

- `backend/modules/caption-generation/` owns the Caption Generation workflow.
- The module presents one small interface and contains no Next.js or SSE types.
- The Route Handler contains no direct Supabase table query, crawler call, Gemini URL, retry loop, or prompt construction.
- Existing successful JSON/SSE behavior remains compatible.
- An explicit missing/deleted prompt returns `404`.
- Platform Preset precedence and Brand Style parsing are covered by module tests.
- Threads and Instagram validation prevent invalid persistence.
- Route tests no longer depend on broad chainable Supabase mocks.
- Scoped TypeScript, ESLint, and Caption Generation tests pass.
- Other AI routes, UI, database, and the user's `.gitignore` change remain untouched.
