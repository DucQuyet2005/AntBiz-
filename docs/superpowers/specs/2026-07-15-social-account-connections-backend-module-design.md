# Social Account Connections Backend Module Design

## Context

Social account connection behavior is currently spread across several Next.js Route Handlers and `lib/threads.ts`:

- `GET /api/auth/facebook` builds a Facebook authorization URL.
- `GET /api/auth/instagram` redirects into the Facebook flow with an Instagram intent.
- `GET /api/auth/facebook/callback` exchanges tokens, discovers Facebook Pages and Instagram Business accounts, writes `linked_accounts`, and maps failures to Settings redirects.
- `GET /api/auth/threads` and its callback perform the Threads equivalent.
- `GET` and `DELETE /api/linked-accounts` list and disconnect accounts.
- `lib/threads.ts` mixes OAuth token exchange with Threads publication behavior.

Provider protocol details, access tokens, database writes, partial-failure behavior, logging, OAuth state, redirects, and public response mapping currently cross the same transport seam. The callbacks log raw provider data and use `state` only as an unsigned platform label, leaving the connection flow without effective OAuth CSRF protection.

`CONTEXT.md` defines **Social Account Connections** as the authenticated lifecycle that links, lists, and disconnects provider accounts. Scheduled Publishing consumes stored credentials but continues to own publication, deletion, and post-status behavior.

## Goals

- Move connection behavior behind a focused backend module with a narrow transport-neutral interface.
- Preserve Facebook Page, Instagram Business, and Threads connection capabilities.
- Preserve automatic discovery of all accounts available through the provider authorization.
- Preserve the existing `linked_accounts` schema, RLS model, Settings flow, endpoint paths, and success response shapes.
- Add signed, expiring, user-bound OAuth state with a one-time nonce cookie.
- Define explicit partial-success behavior for multi-account Facebook discovery.
- Prevent authorization codes, tokens, provider response bodies, account data, permission data, and app secrets from reaching redirects or operational logs.
- Keep provider protocols and Supabase persistence behind testable seams.

## Non-goals

- Moving social publication, deletion, media polling, or post-status behavior out of Scheduled Publishing.
- Changing how users select accounts or adding a Page/account picker.
- Changing database tables, constraints, RLS policies, or token encryption at rest.
- Adding token refresh jobs, credential revocation at the provider, or proactive expiry notifications.
- Adding providers beyond Facebook Pages, Instagram Business, and Threads.
- Redesigning Settings layout or connection controls.
- Changing the compatibility database value `thread` to `threads`.

## Chosen Approach

Create `backend/modules/social-account-connections/` with one workflow module, Facebook and Threads provider adapters, a linked-account repository adapter, typed validation and errors, and an OAuth-state protector. Route Handlers retain authentication, cookie reads/writes, redirects, query parsing, and JSON response formatting.

A minimal helper extraction was rejected because it would leave partial-success rules, provider error mapping, secret handling, and persistence ordering distributed across Route Handlers. A broad social-platform module was rejected because combining connection lifecycle with publication would weaken locality in the existing Scheduled Publishing module and produce an unnecessarily wide interface.

## Architecture

### SocialAccountConnectionsModule

The module owns these workflows:

- Begin a Facebook, Instagram, or Threads connection for an authenticated user.
- Complete a Facebook/Instagram callback after state verification.
- Complete a Threads callback after state verification.
- List the authenticated user's public linked-account projection.
- Disconnect all of the user's accounts for one validated platform.

It depends on a Facebook connection provider, a Threads connection provider, a linked-account repository, and an OAuth-state protector. It does not import Next.js, `NextRequest`, `NextResponse`, cookies, Supabase clients, environment variables, or provider SDK/HTTP details.

The module uses the product intent values `facebook`, `instagram`, and `threads`. The repository adapter alone translates `threads` to the compatibility database value `thread`.

### OAuth State Protector

The state protector creates and verifies versioned, base64url-encoded state using HMAC-SHA256:

- Facebook and Instagram state is signed with `FB_APP_SECRET`.
- Threads state is signed with `THREADS_APP_SECRET`.
- The signed payload contains the connection intent, authenticated user ID, a cryptographically random 32-byte nonce, issued-at time, and expiry.
- State expires after ten minutes.
- Signature comparison is constant-time.
- Unknown versions, unsupported intents, malformed payloads, invalid signatures, expired state, user mismatches, and nonce mismatches are rejected as `invalid_state`.

No additional deployment secret is introduced. Missing provider secrets are configuration errors and prevent starting the affected flow.

The HTTP adapter stores the nonce in an intent-specific cookie so simultaneous provider flows do not overwrite one another. The cookie is `HttpOnly`, `SameSite=Lax`, path-scoped to the relevant callback, ten minutes old at most, and `Secure` in production. The callback compares the cookie nonce with the verified state and clears the cookie after success or failure.

### FacebookConnectionAdapter

The Facebook adapter owns:

- Validating `FB_APP_ID`, `FB_APP_SECRET`, and the Facebook redirect URI.
- Building the authorization URL with the existing Page and Instagram scopes plus signed state.
- Exchanging the authorization code for a short-lived user token.
- Exchanging that token for a long-lived user token.
- Listing every Facebook Page available to the user.
- Discovering the Instagram Business account linked to each Page.
- Resolving Instagram usernames when available.
- Returning normalized account candidates with the Page credential required by Scheduled Publishing.

The adapter stops when token exchange or Page listing fails. Failure to inspect one Page for Instagram is represented as a sanitized per-account discovery failure and does not discard other candidates.

Provider calls may inspect failed response bodies to classify errors, but raw bodies and provider messages are not retained in thrown errors, redirects, or logs. Tokens are sent only where the provider protocol requires them and are never included in diagnostic context.

### ThreadsConnectionAdapter

The Threads adapter owns:

- Validating `THREADS_APP_ID`, `THREADS_APP_SECRET`, and `THREADS_REDIRECT_URI`.
- Building the authorization URL with the current `threads_basic` and `threads_content_publish` scopes plus signed state.
- Exchanging the authorization code for a short-lived token.
- Exchanging it for a long-lived token.
- Fetching the authenticated Threads profile.
- Returning one normalized account candidate.

OAuth helpers move out of `lib/threads.ts`. Publication, container polling, deletion, and status helpers remain available to Scheduled Publishing and are outside this module.

### LinkedAccountRepository

The request-scoped Supabase adapter owns:

- Listing the current user's accounts with only `id`, `platform`, `account_id`, `account_name`, `expires_at`, `created_at`, and `updated_at`.
- Upserting one normalized account candidate using `(user_id, platform, account_id)` compatibility semantics.
- Returning a success or sanitized failure outcome for each upsert so the module can enforce partial-success policy.
- Disconnecting every account owned by the user for one validated platform.

The repository never returns `access_token` or `refresh_token` from list operations. Request-scoped RLS remains the final data-access control. The module does not use a privileged Supabase client.

## Data Flow

### Begin connection

1. Authenticate the user with the existing allowed roles: `admin`, `marketer_full`, and `marketer_content`.
2. Validate the provider configuration.
3. Create signed state and an intent-specific nonce.
4. Build the provider authorization URL.
5. Set the nonce cookie and redirect to the provider.

`/api/auth/instagram` starts the Facebook provider flow directly with the `instagram` intent instead of relying on an unsigned internal redirect. `/api/auth/facebook` accepts only the `facebook` intent; callers cannot inject an arbitrary state value.

### Complete Facebook or Instagram connection

1. Authenticate the callback user.
2. Require an authorization code, signed state, and matching nonce cookie.
3. Verify state signature, expiry, intent, user binding, and nonce.
4. Exchange the code and discover all Page and Instagram candidates.
5. Upsert each candidate independently.
6. Evaluate completion against the signed intent.
7. Clear the nonce cookie and redirect to Settings with stable success or error parameters.

### Complete Threads connection

1. Authenticate and verify the signed Threads state and nonce.
2. Exchange the code, fetch the Threads profile, and normalize one candidate.
3. Upsert the candidate using compatibility platform `thread` in storage.
4. Clear the nonce cookie and redirect to Settings.

### List and disconnect

Listing returns the existing `{ data }` JSON shape with a token-free projection. Disconnect accepts only `facebook`, `instagram`, `thread`, or `threads`; normalizes the platform; deletes only rows belonging to the authenticated user; and preserves the existing success JSON shape.

## Partial-Success Policy

Facebook discovery and persistence are best-effort at the individual account level:

- Facebook intent succeeds when at least one Facebook Page is persisted.
- Instagram intent succeeds when at least one Instagram Business account is persisted.
- A successful Page remains stored when another Page or its Instagram discovery fails.
- Accounts of the non-requested type discovered during the same Facebook authorization may still be stored, preserving current behavior.
- If candidates exist but none of the requested type can be persisted, the flow fails with `persistence_failed`.
- If discovery returns no candidates of the requested type, the flow fails with `no_accounts`.

Logs may include the requested intent and aggregate candidate/success/failure counts. They exclude account IDs, account names, Page names, usernames, tokens, authorization codes, permissions, and provider bodies.

## Error and Redirect Policy

Typed module errors map to stable public codes:

- `invalid_state`: malformed, tampered, expired, replayed, user-mismatched, or nonce-mismatched OAuth state.
- `configuration_error`: required provider configuration is missing.
- `provider_denied`: the user or provider denied authorization before a usable code was returned.
- `provider_unavailable`: token exchange, discovery, or profile lookup cannot complete.
- `no_accounts`: no account of the requested type is available.
- `persistence_failed`: no account of the requested type can be stored.
- `invalid_platform`: a list/disconnect platform value is unsupported.
- `connection_failed`: unexpected internal failure.

Callbacks redirect only to a trusted Settings origin. Production uses `NEXT_PUBLIC_SITE_URL`; request origin fallback is allowed only outside production. Provider error descriptions and request host headers never determine the redirect destination.

Redirect query parameters contain only `connected`, normalized `platform`, and a stable error code. `SettingsView` maps those codes to friendly Vietnamese and English messages and never displays arbitrary provider text. It keeps the current popup and URL-cleanup behavior.

Operational logs may contain the stable error code, provider, intent, provider HTTP status, and aggregate counts. They never contain app secrets, authorization codes, access/refresh tokens, provider URLs containing credentials, provider response bodies, account identifiers, account names, permissions, cookie nonces, or signed state.

## Testing Strategy

### OAuth-state tests

- Create and verify valid Facebook, Instagram, and Threads state.
- Reject malformed payloads, unknown versions, unsupported intents, tampering, expiry, future-issued state, user mismatch, and nonce mismatch.
- Use deterministic clock, nonce, and secret providers in tests.
- Confirm constant-time signature comparison is reached only for equal-length signatures.

### Module tests

- Begin each intent with the correct provider adapter and state policy.
- Facebook intent succeeds with at least one persisted Page despite unrelated failures.
- Instagram intent succeeds with at least one persisted Instagram account.
- Requested-type discovery and persistence failures map to `no_accounts` and `persistence_failed` correctly.
- Threads completion persists exactly one normalized account.
- Listing returns the repository's public projection.
- Disconnect validates platform aliases and never accepts arbitrary filter values.

### Provider-adapter tests

- Preserve authorization scopes, redirect URIs, token-exchange order, and Graph endpoints.
- Discover every Page and linked Instagram Business account.
- Preserve a fallback Instagram display name when profile lookup fails.
- Threads uses the expected short-token, long-token, and profile calls.
- Missing configuration is detected before a provider request.
- Provider bodies, codes, tokens, and secrets are absent from errors and logs.

### Repository tests

- List filters by authenticated user and selects no credential columns.
- Upsert uses the expected uniqueness columns and platform compatibility mapping.
- Disconnect filters by both user and validated platform.
- Individual persistence failures return sanitized outcomes for partial-success evaluation.

### Route and Settings tests

- All OAuth initiation and callback routes authenticate before provider work.
- Initiation sets the correct nonce cookie and redirect.
- Callback rejects missing/invalid state before token exchange.
- Callback clears the nonce cookie on every terminal redirect.
- Stable errors map to trusted Settings redirects without raw provider text.
- `GET` and `DELETE /api/linked-accounts` preserve their JSON contracts.
- Settings maps every stable error code to Vietnamese and English messages.

## Documentation

Implementation updates `docs/CHANGELOG.md` to record the new backend module, signed OAuth state, sanitized provider failures, token-free public projection, and preserved multi-account partial-success behavior.

## Completion Criteria

- OAuth initiation, callback, listing, and disconnect Route Handlers are thin HTTP adapters.
- Social Account Connections behavior lives under `backend/modules/social-account-connections/`.
- Facebook and Threads protocols and Supabase persistence live in focused adapters.
- OAuth helpers are removed from `lib/threads.ts`; publication helpers remain unchanged.
- Signed state is expiring, user-bound, nonce-bound, and verified before provider exchange.
- Public list responses contain no credentials.
- Redirects and logs contain no raw provider or account data.
- Settings displays friendly localized messages for stable error codes.
- Focused tests and direct ESLint pass.
- Typecheck and full-suite verification introduce no failures beyond documented repository baselines.
- No database migration or new deployment secret is required.
