# Gemini Capacity Backend Module Design

## Context

Shared Gemini credential and model-selection behavior is currently concentrated in one large utility and duplicated around its edges:

- `lib/services/geminiRotationManager.ts` evaluates workload complexity, selects a model, fetches raw credentials through handcrafted PostgREST calls, orders keys, invokes callers, classifies errors, changes key health, falls back to an environment key, and formats terminal errors.
- `GET` and `POST /api/admin/gemini-keys` list and create keys directly.
- `PATCH` and `DELETE /api/admin/gemini-keys/[id]` mutate status, cooldown, label, and deletion directly.
- The admin page receives every raw `key_value` and masks it only after it reaches the browser.
- Caption Generation, Speech Processing, Generate Missing Fields, Prompt Generation, and Smart Prompt Generation call `executeWithRotation`.

The current implementation does not enforce its documented invariants. Its PostgREST query excludes every `invalid` key before the claimed self-healing branch, so that branch cannot run. A key with a future `rate_limited_until` is sorted last but may still be retried immediately. Concurrent requests can read the same `last_used_at` and select the same key. Unknown errors eventually mark keys invalid even when the failure is not credential-specific, while final errors include raw provider messages.

The database currently grants all authenticated users a SELECT policy over `gemini_api_keys`. The admin endpoint selects `*`, so raw credentials cross the server/browser seam even though the UI displays a mask.

`CONTEXT.md` defines **Gemini Capacity** as the shared credential pool, model tiers, claim policy, cooldown behavior, provider-failure classification, key health, and environment fallback used by rotation-enabled workflows. A **Capacity Key** is a write-only server secret whose public administrative projection is masked.

## Goals

- Move shared Gemini capacity behavior behind one deep backend module.
- Preserve model-tier thresholds and the results expected by current rotation-enabled callers.
- Give administrators a validated lifecycle for adding, listing, activating, disabling, relabeling, and deleting Capacity Keys.
- Prevent raw Capacity Keys from being selected by ordinary authenticated clients or returned through HTTP responses.
- Make key selection concurrency-aware through an atomic database claim.
- Never select Invalid keys automatically; reactivation is administrator-owned.
- Respect active rate-limit cooldowns and automatically make expired cooldown keys eligible.
- Classify credential, quota, model-configuration, and transient failures without exposing provider details.
- Use `GEMINI_API_KEY` once as the final availability fallback when database capacity cannot serve the workload.
- Keep key-health persistence best-effort after a successful Gemini result.
- Keep Route Handlers and Gemini workflow adapters thin and testable through the same Interface used in production.

## Non-goals

- Encrypting existing database credentials at the application layer or introducing an encryption-key rotation system.
- Moving Document Parsing or Prompt Configuration Assistance from their separately designed single-key policies to rotation.
- Changing prompts, generation parameters, streaming formats, or response parsing in consuming workflows.
- Redesigning the Gemini Keys administration page.
- Adding per-user, per-team, per-feature, or billing-aware quotas.
- Fetching live quota balances from Google.
- Automatically reactivating Invalid keys.
- Introducing new Gemini model names or changing the existing complexity thresholds.

## Chosen Approach

Create `backend/modules/gemini-capacity/` with one `GeminiCapacityModule`, workload and administration validation, deterministic model selection, a provider-error classifier, typed errors, a repository Interface, a Supabase Adapter, and an environment-credential Adapter.

The module presents one Interface for both runtime execution and administrator key lifecycle because both rely on the same status, cooldown, masking, and health invariants. Internally, runtime claim behavior and administrator persistence remain focused implementations. Route Handlers retain authentication and HTTP formatting. Gemini workflow adapters retain provider-specific request construction and result parsing.

A rotation-only extraction was rejected because admin routes could continue writing states that violate runtime assumptions. Separate administration and rotation modules were rejected because both would expose the same status state machine, reducing locality and allowing their Interfaces to drift.

## Architecture

### GeminiCapacityModule

The module owns these workflows:

- Execute one rotation-enabled Gemini workload.
- List masked Capacity Key summaries.
- Add one write-only Capacity Key.
- Relabel a Capacity Key.
- Activate or disable a Capacity Key.
- Delete a Capacity Key.

Runtime callers provide workload metrics and a runner with this conceptual shape:

```ts
execute<T>(
  workload: { title: string; content: string; layout?: string },
  runner: (apiKey: string, model: string) => Promise<T>
): Promise<T>
```

The raw credential exists only during the internal call to `runner`. It is never returned, placed in an error, passed to a logger, or retained in a result object.

The module depends on a `GeminiCapacityRepository`, an optional `EnvironmentCredentialAdapter`, a clock, and an internal provider-error classifier. It does not import Next.js requests or responses, UI code, prompts, the Google SDK, or a specific generation-result type.

### GeminiCapacityRepository

The repository Interface supports:

- Atomically claiming one eligible database key while excluding IDs already tried by the current execution.
- Recording success, cooldown, invalidation, and transient failure outcomes.
- Listing non-secret administrative summaries.
- Creating a key from a write-only secret and label.
- Relabeling, activating, disabling, and deleting a key.

The Supabase Adapter has two construction modes:

- Runtime construction uses the existing service-role client and may call the secret-returning claim RPC.
- Administration construction uses the authenticated request-scoped client and can manage keys only through the existing administrator RLS policy and column grants.

Neither mode uses handwritten PostgREST URLs or falls back from a missing service-role secret to the public anon key.

### EnvironmentCredentialAdapter

The environment Adapter resolves `GEMINI_API_KEY` lazily. It has no status, cooldown, health record, or administrative projection.

The environment credential is tried at most once per execution, after database capacity is unavailable, has no eligible key, or has been exhausted. If its value duplicates a database key already attempted during the same execution, it is not tried twice. `GEMINI_MODEL` participates in normal model selection and does not override the selected tier merely because the environment credential is used.

### Capacity Key Projection

Administrative reads return:

- `id`
- `label`
- `status`
- `rate_limited_until`
- `error_count`
- `last_used_at`
- `created_at`
- `updated_at`
- `masked_value`

They never return `key_value`. Creation and update responses use the same projection. The admin UI renders `masked_value` directly instead of receiving and masking a secret.

The database provides a stored generated `key_hint` derived from the secret. Authenticated clients receive column-level SELECT permission only for non-secret administrative columns, including `key_hint`; `key_value` remains selectable only by service role. RLS still restricts those summary rows to administrators.

## Status and Health Invariants

The compatibility statuses remain `active`, `rate_limited`, and `invalid`:

- `active`: eligible for atomic claim.
- `rate_limited`: eligible only when `rate_limited_until` is not in the future.
- `invalid`: never eligible; only an administrator can reactivate it.

`rate_limited` is runtime-owned. Administrator mutation accepts only `active` and `invalid`:

- Activating a key resets `error_count` to zero and clears `rate_limited_until`.
- Disabling a key sets `status = invalid` and clears `rate_limited_until`.
- Relabeling does not change health.
- A successful provider call sets `status = active`, resets `error_count`, and clears cooldown.
- A quota failure increments `error_count`, sets `status = rate_limited`, and creates a two-minute cooldown.
- A credential-authentication failure increments `error_count`, sets `status = invalid`, and clears cooldown.
- A transient or unknown failure increments `error_count` but never automatically changes the key to Invalid.
- A model-configuration failure does not change key health because another credential cannot correct it.

No threshold automatically invalidates a key. `last_used_at` records claim time, including failed attempts, so it represents capacity use rather than only successful requests.

## Model Selection

The module preserves the current deterministic tiers:

- High: layout is `dmagazine`, `megastory`, or `tamdiem`; or combined content exceeds 3,000 characters; or exceeds 500 words.
- Low: combined content is below 800 characters and below 120 words.
- Medium: every other workload.

Model configuration remains:

- Base default: `GEMINI_MODEL`, falling back to `gemini-3.5-flash`.
- High: `GEMINI_HIGH_MODEL`, falling back to the base default.
- Medium: `GEMINI_MEDIUM_MODEL`, falling back to the base default.
- Low: `GEMINI_LOW_MODEL`, falling back to `gemini-3.1-flash-lite`.

The model is selected once before any credential is claimed and remains constant across retries and environment fallback.

## Atomic Claim Migration

Add a dated migration under `migrations/` that:

1. Drops the broad `gemini_api_keys: authenticated read` policy.
2. Preserves administrator-only RLS management.
3. Revokes table-wide SELECT from `authenticated` and grants SELECT only on the non-secret summary columns.
4. Adds a stored generated `key_hint` that masks short secrets completely and exposes only a limited prefix/suffix for longer secrets.
5. Adds CHECK constraints for the three supported statuses and non-negative `error_count` after normalizing any incompatible existing data.
6. Creates a service-role-only `claim_gemini_capacity_key(p_excluded_ids uuid[])` function.
7. Revokes claim execution from `PUBLIC`, `anon`, and `authenticated`, granting it only to `service_role`.

The claim function uses a fixed `search_path`, service-role-compatible RLS behavior, and one transaction-scoped query that:

- filters out excluded and Invalid IDs;
- accepts Active keys and Rate Limited keys whose cooldown has expired;
- orders null/oldest `last_used_at` first with a deterministic ID tie-breaker;
- selects one row with `FOR UPDATE SKIP LOCKED`;
- updates `last_used_at` to database time;
- returns that key, including its secret, only to the service-role caller.

The function returns no row when all remaining keys are invalid, cooling down, excluded, or absent. It does not mutate statuses merely because cooldown elapsed; a successful execution restores Active health.

## Runtime Data Flow

1. Parse workload metrics and select one model tier.
2. Ask the runtime repository to claim a key, excluding IDs already attempted.
3. If claim fails because database capacity is unavailable, record a sanitized capacity event and proceed to environment fallback.
4. If no row is returned, proceed to environment fallback.
5. Invoke the caller's runner with the claimed secret and selected model.
6. On success, attempt to record healthy status; return the successful result even if that health update fails.
7. On credential or quota failure, attempt the corresponding health transition and claim another key.
8. On transient/unknown failure, increment health best-effort and claim another key.
9. On model-configuration failure, stop without claiming another key or changing health.
10. After database exhaustion, try the non-duplicate environment credential once when configured.
11. Return a sanitized typed error if execution still cannot complete.

Database health-write failure never changes the classification or causes a successful provider result to fail. Claim failure is different because no database secret can be safely selected without a claim; it triggers environment fallback rather than an uncoordinated database read.

## Provider Error Classification

Classification inspects provider status, structured error codes when available, and a narrowly-scoped normalized message internally:

- Credential: explicit invalid-key/authentication codes or key-specific 400/403 messages.
- Quota: HTTP 429 or explicit quota/rate-limit codes.
- Model configuration: model-specific 404/not-found/not-available responses.
- Transient: network errors, provider 5xx, timeouts, and unclassified failures.

Raw messages may be inspected for classification but never cross the module Interface, enter logs, or appear in the terminal error. A generic 404 without model evidence is Transient rather than Model Configuration.

## Administration Data Flow

### List

1. Authenticate and authorize an administrator in the Route Handler.
2. Read only summary columns through the request-scoped repository.
3. Map `key_hint` to `masked_value`.
4. Preserve the existing `{ data }` response envelope.

### Add

1. Validate and trim a non-empty label and secret.
2. Insert the secret once; the database derives `key_hint`.
3. Return only the non-secret projection.
4. Map the existing uniqueness violation to the compatible 400 duplicate-key response.

### Update

1. Validate the UUID and a non-empty mutation.
2. Accept label and administrator status `active` or `invalid` only.
3. Apply the corresponding health-reset invariant inside the module.
4. Return the non-secret projection or a typed not-found error.

Caller-supplied `rate_limited_until`, `error_count`, `last_used_at`, and `key_value` are rejected rather than written through.

### Delete

Validate the UUID, delete one key, distinguish not-found from persistence failure, and preserve the existing `{ success: true }` response.

## Error Policy

Administrative module errors map to:

- `invalid_input`: 400.
- `duplicate_key`: 400 for compatibility.
- `key_not_found`: 404.
- `persistence_failed`: 500.

Runtime errors are transport-neutral:

- `capacity_unavailable`: neither database capacity nor a usable environment credential can be accessed.
- `capacity_exhausted`: every eligible database credential and the optional environment credential failed.
- `model_configuration_error`: the selected model is unavailable or invalid.

Their client messages are stable and contain no last provider error. Existing caller routes may continue returning 500, but their bodies receive only the sanitized module message.

Operational logs may include operation, selected model, complexity tier, classification, attempt number, aggregate eligible count, and internal key ID. They exclude credential values and hints, labels, prompts, article/transcript content, request/response bodies, provider URLs, provider messages, and environment configuration values.

## Caller Migration

Update current rotation consumers to import the new runtime factory or Interface:

- Caption Generation Gemini Adapter.
- Speech Processing Gemini Enrichment Adapter.
- Generate Missing Fields Route Handler.
- Prompt Generation Route Handler.
- Smart Prompt Generation Route Handler.
- The rotation smoke-test script.

`lib/services/geminiRotationManager.ts` is removed after all imports are migrated. Caption and Speech adapters retain injectable execution seams for focused tests. Direct-key Gemini workflows remain untouched.

## Testing Strategy

### Model and classifier tests

- Preserve every complexity threshold, complex layout, and environment model override.
- Select the model once across retries and fallback.
- Classify structured and message-based auth, quota, model, 5xx, network, and unknown failures.
- Treat a generic non-model 404 as Transient.
- Confirm raw provider messages never appear in typed errors or logs.

### Runtime module tests

- Claim Active keys and expired cooldown keys only.
- Exclude attempted IDs on every subsequent claim.
- Retry after Auth, Quota, and Transient failures with the correct best-effort health transition.
- Never retry Invalid keys or an active cooldown key.
- Stop immediately on Model Configuration failure without a health mutation.
- Return a successful result when success-health persistence fails.
- Use environment fallback after database failure, no eligible row, and database exhaustion.
- Avoid trying an environment credential that duplicates an attempted database secret.
- Produce stable `capacity_unavailable` and `capacity_exhausted` errors.

### Administration module and repository tests

- Validate UUID, label, secret, allowed status, and non-empty update inputs.
- List/create/update projections contain `masked_value` and never `key_value`.
- Activate and disable transitions reset the correct fields.
- Duplicate insert, missing update, missing delete, and persistence errors map correctly.
- Runtime factory requires service-role configuration and never substitutes the anon key.

### Route and UI tests

- Every admin route requires the administrator role.
- Endpoint paths and successful response envelopes remain compatible.
- Malformed JSON and forbidden mutation fields return 400.
- The admin page renders `masked_value` and never receives a raw credential after creation.
- Caption Generation, Speech Processing, Generate Missing Fields, Prompt Generation, and Smart Prompt Generation preserve their workflow results through the new Interface.

### Migration verification

- Authenticated non-admin users cannot read any key rows.
- Authenticated administrators can read summary columns but cannot select or return `key_value`.
- Only service role can execute the claim function.
- Invalid and active-cooldown keys are never claimed.
- Expired cooldown keys are eligible.
- Concurrent claims prefer different unlocked least-recently-used keys.
- Excluded IDs are not returned.
- Claim updates `last_used_at` atomically.

If the repository has no automated Supabase migration harness, concurrency and privilege behavior are verified by static SQL review plus documented manual SQL assertions rather than being claimed as unit-test coverage.

## Documentation

Implementation updates `docs/CHANGELOG.md` with the Gemini Capacity module, atomic rotation claim, corrected cooldown/Invalid semantics, sanitized failures, and removal of raw credential exposure to authenticated clients and browser responses.

## Deployment Order

Apply the database migration before deploying the application code. The new runtime requires the claim function and `key_hint`, while the new administration Adapter selects only the restricted summary columns.

The deployment environment must provide `SUPABASE_SERVICE_ROLE_KEY` for database-backed rotation. `GEMINI_API_KEY` remains an optional final fallback, not a replacement for the service-role credential.

## Completion Criteria

- Gemini Capacity behavior lives under `backend/modules/gemini-capacity/`.
- Every current rotation consumer uses the new Interface and the legacy rotation utility is removed.
- Runtime database selection uses the atomic service-role claim function.
- Invalid and cooling-down keys are never retried automatically.
- Concurrent requests do not independently select the same stale least-recently-used row.
- Unknown failures never automatically invalidate a credential.
- Environment fallback is attempted at most once and does not change the selected model.
- Admin list/create/update responses contain no raw credential.
- Authenticated clients lack column permission to select `key_value`.
- Document Parsing and Prompt Configuration Assistance retain their existing direct-key behavior.
- Focused tests and direct ESLint pass.
- Typecheck and full-suite verification introduce no failures beyond documented repository baselines.
