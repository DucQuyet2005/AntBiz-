# Password Recovery Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Move password recovery request, recovery token confirmation, and recovery-session password reset into the existing Account Security bounded context. Preserve public endpoints and UI contracts while centralizing enumeration resistance, trusted-link construction, token restrictions, password validation, Supabase Auth integration, global session revocation, and controlled errors.

Approved behavior corrections:

- Malformed JSON and invalid email return `400`; valid emails are trimmed and lowercased.
- Every valid recovery request returns the same generic `200`, regardless of account existence, token generation, or email delivery outcome.
- Recovery links use a validated `NEXT_PUBLIC_SITE_URL` or the request URL origin, never forwarded host/protocol headers.
- Confirmation accepts only `type=recovery` and redirects successful verification only to `/reset-password`.
- Missing, invalid, or expired confirmation input redirects to login with a generic error.
- Reset authenticates the recovery session before reading or processing password input.
- Reset preserves the current UI policy: at least eight characters with uppercase, lowercase, and numeric characters.
- Password update errors do not expose raw Supabase messages.
- Global session revocation remains best-effort after an irreversible password update.
- Recovery email branding changes from Bento Studio to AntBiz.

## Domain Language

`CONTEXT.md` defines **Account Security** as the owner of workflows that protect a user's credentials and sessions.

**Password Recovery** begins with a generic Recovery Request, exchanges a one-time Recovery Token for an authenticated Recovery Session, and uses that session to set a new password. Supabase Auth owns token generation, expiry, verification, session creation, password storage, and token revocation.

Recovery tokens and passwords are transient secrets. They never become application data, log content, Notification metadata, or audit values.

## Scope

### Included

- `POST /api/auth/forgot-password`
- `GET /api/auth/confirm`
- `POST /api/auth/reset-password`
- Recovery email validation and normalization
- Generic enumeration-resistant recovery responses
- Trusted application-origin resolution
- Recovery link construction
- Supabase Admin recovery-token generation
- Recovery OTP verification
- Recovery-session authentication
- Reset password validation and update
- Global sign-out after reset
- AntBiz recovery email
- Schema, origin, module, gateway, email, and route tests

### Excluded

- Authenticated password change, which is already implemented in Account Security
- Registration and login changes
- OAuth callback routes
- Email confirmation, invite, magic-link, or email-change OTP types
- User-configurable post-confirm redirect destinations
- Rate limiting, CAPTCHA, abuse scoring, or delivery throttling
- Password policy changes in frontend forms
- MFA, passkeys, recovery codes, or session-management UI
- Database schema or RLS changes
- Custom token expiry or one-time-use implementation

## Chosen Architecture

Extend `backend/modules/account-security/` with a focused Password Recovery workflow rather than creating a second credential module.

### `password-recovery-module.ts`

Exposes operations for:

- accepting a recovery request;
- verifying a recovery token;
- resetting a password under a recovery session.

It coordinates schemas, the Recovery Gateway, email delivery, and post-update session revocation. It does not import `Request`, `NextResponse`, cookies, headers, or UI code.

### `password-recovery-schemas.ts`

Defines request-independent validation for:

- recovery request bodies and normalized email addresses;
- non-empty recovery tokens and exact `recovery` type;
- reset password and confirmation values;
- current reset password policy and matching confirmation.

Password strings are not trimmed or logged. Email is trimmed and lowercased before use.

### `password-recovery-gateway.ts`

Defines a Recovery Gateway and Supabase implementation for:

- `auth.admin.generateLink({ type: 'recovery', email })` through the admin client;
- `auth.verifyOtp({ type: 'recovery', token_hash })` through the session client;
- resolving the authenticated recovery user;
- updating that user's password;
- `signOut({ scope: 'global' })` after success.

Token-generation and verification failures become stable outcomes. Password update failures become controlled gateway errors. Global sign-out failure is reported for best-effort handling.

### `password-recovery-email.ts`

Defines a Recovery Email port and AntBiz production adapter. It constructs text and HTML messages around an already-built trusted recovery URL, escapes HTML values, checks structured email delivery results, and reports delivery failures internally.

Email delivery cannot change the public response for a valid recovery request.

### `password-recovery-origin.ts`

Resolves the trusted external application origin:

1. use `NEXT_PUBLIC_SITE_URL` when it parses as HTTP or HTTPS;
2. otherwise use the origin of `request.nextUrl`/`request.url` when valid;
3. remove path, query, hash, and trailing slash;
4. fail safely if neither source is a valid HTTP(S) origin.

Forwarded host and protocol headers are intentionally ignored because they are not established as trusted proxy input in this application.

### Shared Account Security Files

Existing Account Security errors and types may be extended with recovery-specific codes and ports. Password policy code is shared only where behavior is genuinely identical. The reset policy remains compatible with its current UI and therefore does not gain the special-character requirement used by authenticated password change.

## HTTP Boundaries

### Forgot Password Route

The route parses JSON, resolves the trusted origin, calls the recovery-request operation, maps validation/origin errors, and always returns the generic success response after a valid email enters the module.

### Confirm Route

The route reads `token_hash` and `type`, resolves the trusted origin, and invokes token confirmation. It converts the boolean result to one of two redirects:

- success -> `{origin}/reset-password`;
- failure -> `{origin}/login?error=<generic message>`.

The `next` query parameter is no longer consumed.

### Reset Password Route

The route authenticates the recovery session before parsing JSON, calls the reset operation, maps typed errors, and returns the existing success body.

All routes use the default Node.js runtime.

## Workflows

### Request Recovery

1. Parse JSON and validate the email.
2. Normalize email by trimming and lowercasing.
3. Request a recovery token from the admin gateway.
4. If token generation fails or produces no token, log only operation-level context and finish as accepted.
5. Build:

```text
{trustedOrigin}/api/auth/confirm?token_hash={encodedToken}&type=recovery
```

6. Attempt to send the AntBiz recovery email.
7. If email throws or returns `success: false`, log delivery failure without the email/token/URL.
8. Return the same accepted result in every valid-email case.

The public response remains:

```ts
{
  message: 'Nếu tài khoản tồn tại trên hệ thống, email hướng dẫn đặt lại mật khẩu đã được gửi đi.'
}
```

### Confirm Recovery Token

1. Validate a non-empty token and exact `recovery` type.
2. Invalid query input returns a failed confirmation result without a provider call.
3. Verify the token through Supabase Auth.
4. Return success only when verification completes without error.
5. The Route Handler selects the fixed redirect and never reflects a caller-controlled `next` destination.

### Reset Password

1. Authenticate the recovery session and obtain the current user.
2. Parse and validate password and confirmation.
3. Require at least eight characters, uppercase, lowercase, and number.
4. Require exact confirmation equality.
5. Update the authenticated user's password.
6. If update fails, raise a controlled gateway error and perform no sign-out.
7. After update, attempt global sign-out. Log failure without changing the completed reset result.
8. Return the existing success response:

```ts
{
  success: true,
  message: 'Đặt lại mật khẩu thành công. Tất cả các phiên đăng nhập khác đã được thu hồi.'
}
```

## Enumeration Resistance

For a syntactically valid email, account absence, disabled account behavior, token-generation error, missing token data, email provider rejection, and email transport exceptions all produce the same status and response body.

Server logs distinguish operation types for support but exclude the requested email, token, recovery URL, and provider body. This migration does not attempt constant-time responses; rate limiting and abuse protection remain follow-up infrastructure work.

## Origin and Redirect Security

- Only HTTP and HTTPS origins are accepted.
- Configured site URLs are reduced to their origin.
- Request fallback uses the parsed request URL origin.
- `Host`, `x-forwarded-host`, and `x-forwarded-proto` are not trusted inputs.
- Recovery tokens are URL-encoded.
- Confirmation ignores `next`, external URLs, protocol-relative URLs, and local alternative paths.
- Successful confirmation always targets `/reset-password`.
- Failed confirmation always targets `/login` with a generic message.

## Error Policy

### Recovery Request

- malformed JSON or invalid email -> `400`;
- valid email, regardless of internal result -> `200` generic success;
- no raw Admin Auth or email provider error is returned.

### Confirmation

- every outcome -> redirect;
- malformed input or provider failure -> generic login error redirect;
- no provider message is reflected in the URL.

### Reset

- no recovery session -> `401` using the existing authentication response;
- malformed JSON or invalid password input -> `400`;
- password update or unexpected failure -> `500` controlled message;
- global sign-out failure -> successful reset response plus server-side operational log.

## Security Rules

- Recovery tokens are accepted only for the recovery OTP type.
- Token values are passed only to Supabase verification and recovery-link construction.
- Password values are passed only to schema validation and Supabase update.
- Passwords are never logged, persisted by application code, emailed, or added to Notification/audit metadata. Recovery Tokens appear only URL-encoded inside the required recovery link and the Supabase verification call; they are not logged or persisted by application code.
- Reset authentication occurs before request-body processing.
- Account existence is not revealed by a valid recovery request response.
- Supabase retains ownership of token expiry, one-time semantics, and recovery sessions.

## Testing Strategy

### Schema Tests

Cover non-object bodies, malformed/missing email, trim/lowercase behavior, valid email, missing token, non-recovery type, reset body shape, password length/uppercase/lowercase/number, confirmation requirement, mismatch, and valid input.

### Origin Tests

Cover valid configured HTTP/HTTPS URLs, configured paths/trailing slash removal, invalid protocol fallback, request-origin fallback, invalid request URLs, and absence of all valid sources. Verify forwarded headers have no effect.

### Recovery Module Tests

Cover token success, missing token data, generate error, email success, thrown email error, structured email failure, identical accepted results, invalid input before gateway access, confirmation success/failure, invalid type before verification, reset success, update failure, and best-effort sign-out failure.

### Gateway Tests

Cover Admin `generateLink`, session `verifyOtp`, recovery user lookup, password update, global sign-out, stable outcome mapping, and controlled gateway errors.

### Email Tests

Cover AntBiz branding, encoded trusted action URL, recipient mapping, text/HTML content, HTML escaping, structured delivery failure, and thrown delivery failure.

### Route Contract Tests

Cover malformed forgot JSON, invalid email, enumeration-resistant success, trusted-origin forwarding, fixed confirmation redirects, ignored `next`, missing recovery session, authentication before reset body parsing, reset validation, controlled update failure, and existing successful response bodies.

## Verification

Run:

1. focused recovery schema, origin, module, gateway, email, and route tests;
2. existing Auth API tests updated to the new route contracts;
3. ESLint directly against affected files;
4. the full Vitest suite;
5. `npx tsc --noEmit`;
6. the repository lint command if available.

The configured `next lint` command is incompatible with the installed Next.js 16 version. Report that tooling failure separately. Existing unrelated type-check and inline-edit test failures remain baseline and must not be attributed to this migration.

Completion requires thin affected Route Handlers, no frontend/database changes, no account enumeration through response status/body, no host-header recovery link injection, no credential leakage, and no new full-suite or type-check failure.

## Follow-up Work

- Rate limiting, CAPTCHA, and abuse monitoring for recovery requests.
- A delivery queue and operational alerting for recovery email failure.
- A single product-wide password policy coordinated with frontend updates.
- MFA, passkeys, recovery codes, and user-visible session management.
- Review other application routes that construct public URLs from forwarded headers.
