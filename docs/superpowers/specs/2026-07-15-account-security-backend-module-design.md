# Account Security Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the authenticated password-change workflow from its Next.js Route Handler into a dedicated Account Security backend module. Preserve the public endpoint and successful UI contract while centralizing server-side password policy, current-credential verification, password update, global session revocation, security notifications, email, and controlled errors.

Approved behavior corrections:

- Malformed JSON and structurally invalid input return `400`.
- The server enforces the same password policy as the current UI: at least eight characters with uppercase, lowercase, numeric, and special characters.
- Password values are not trimmed because whitespace may be intentional credential data.
- A new password identical to the supplied current password returns `400` with the existing UI-compatible message.
- Current-password verification failures use a generic controlled response.
- Password update failures do not expose raw Supabase messages.
- Global session revocation, Notification creation, and email are post-update best-effort tasks because a completed password update cannot be rolled back.
- Email delivery results with `success: false` are treated as effect failures and logged.
- User email is escaped before insertion into security email HTML.

## Domain Language

`CONTEXT.md` defines **Account Security** as authenticated workflows that protect a user's own account credentials and sessions.

A **Password Change** verifies the current credential before replacing it with a policy-compliant new credential. **Global Session Revocation** invalidates refresh tokens after a successful credential change. A **Security Notice** informs the account owner that the change occurred.

Passwords are transient secrets. They are never stored by the module, logged, placed in Notification metadata, included in email, or exposed through errors.

## Scope

### Included

- `POST /api/users/me/change-password`
- Current-session authentication
- Request body and password-policy validation
- Current-password verification through Supabase Auth
- Authenticated password update
- Global session revocation after update
- Existing in-app Notification
- Existing confirmation/security email
- Controlled provider error mapping
- Route, schema, module, gateway, and effects tests

### Excluded

- Forgot-password and recovery-link generation
- `POST /api/auth/reset-password`
- Registration and login policy migration
- MFA, passkeys, security questions, or recovery codes
- A user-facing session list or selective session revocation
- Password history, expiry, breach databases, or rate limiting
- Frontend changes
- Database schema, migration, or RLS changes
- Audit records containing credential data
- Changes to Supabase Auth configuration

## Chosen Architecture

Create one bounded context at `backend/modules/account-security/`. The workflow depends on an explicit Auth Gateway and Effects port so credential rules can be tested without Supabase, email, or Notification infrastructure.

### `account-security-module.ts`

Exposes one `changePassword` operation. It validates the input, verifies the current credential, updates the credential, and then coordinates post-update tasks.

The module receives the authenticated actor explicitly. It does not import `Request`, `NextResponse`, cookies, headers, environment variables, or UI code.

### `account-security-gateway.ts`

Defines the Auth Gateway contract and Supabase implementation for:

- verifying an email/password pair with `signInWithPassword`;
- updating the authenticated user with `updateUser`;
- revoking sessions with `signOut({ scope: 'global' })`.

Invalid current credentials return a stable verification result rather than a provider error. Update failures become a controlled Account Security gateway error. Session-revocation failures are reported to the module for best-effort handling.

### `account-security-schemas.ts`

Validates request-independent password-change input:

- input must be a non-array object;
- `currentPassword` and `newPassword` must be non-empty strings;
- the new password must have at least eight characters;
- the new password must contain uppercase, lowercase, numeric, and special characters;
- the new password must not exactly equal the current password.

No transformation trims, normalizes, logs, or serializes either credential.

### `account-security-effects.ts`

Defines an effects port and production adapter for:

- creating the existing `info` Notification for the user;
- sending a security email to the authenticated email address.

The adapter checks the structured email delivery result, escapes dynamic HTML, and reports individual failures without throwing them back into the completed password update.

### `account-security-types.ts`

Defines the authenticated actor, validated input, gateway interface, effects interface, and change result.

### `account-security-errors.ts`

Defines typed validation, invalid-credential, and update errors with stable status codes and client-safe messages.

### `account-security-factory.ts`

Builds the module using the session-backed Supabase Auth Gateway and production effects. A clock dependency is injectable for deterministic timestamps.

## HTTP Boundary

The Route Handler remains responsible for:

1. authenticating the current session with `requireUser()`;
2. requiring an authenticated email for this email/password workflow;
3. parsing JSON and returning `400` for malformed bodies;
4. constructing the Account Security module with the authenticated Supabase client;
5. passing only user ID, email, and the parsed body to the module;
6. mapping typed errors to controlled HTTP responses;
7. returning the existing success response.

The route uses the default Node.js runtime and remains dynamic because it reads authentication cookies and invokes Supabase Auth.

## Password Change Workflow

1. Authenticate the request and resolve user ID and email.
2. Parse JSON and validate the password-change input.
3. If the new password exactly equals the current password, return `400` with:

```text
New password should be different from the old password.
```

4. Verify the supplied current password against the authenticated email.
5. If verification fails, return a generic `400` invalid-current-password message.
6. Update the authenticated user's password.
7. If update fails, return a controlled `500`; do not start post-update tasks.
8. After update success, attempt the following independently:
   - revoke all sessions;
   - create the password-changed Notification;
   - send the security email with a clock-derived timestamp.
9. Await every task before returning so work is not abandoned by the serverless runtime. Log failures with task type and user ID, without credentials.
10. Return:

```ts
{
  success: true,
  message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
}
```

The frontend continues to clear fields, show success, sign out locally, and redirect to login.

## Consistency and Side Effects

The password update is the primary irreversible operation. Session revocation and Security Notices start only after it succeeds.

Those post-update tasks cannot participate in one transaction with Supabase Auth. Their failures therefore cannot safely convert the already-completed change into a rollback. The module returns success while logging any failed task.

This design preserves current global sign-out behavior. A failed revocation is a security-relevant operational error and is logged distinctly, but adding durable retry or administrator alerting is outside this migration.

Notification and email payloads contain the user ID or email only as required by their delivery channels. They never contain either password.

## Error Policy

HTTP adapters map outcomes as follows:

- validation error -> `400` for malformed shape, missing values, weak new password, or identical passwords;
- invalid current credential -> `400` with a stable generic message;
- existing authentication response -> `401` for a missing or expired session;
- missing authenticated email -> `400` with a controlled account-compatibility message;
- update/gateway or unexpected error -> `500` with a controlled generic message.

Supabase Auth errors, stack traces, provider response bodies, and credential values are never returned to clients. Logs identify operation and user ID but exclude request bodies and passwords.

## Security Rules

- Authentication occurs before parsing or processing credential data.
- Only the authenticated user's session can be updated.
- The actor email comes from the authenticated Supabase user, never from the request body.
- Current-password failure produces no update, revocation, Notification, or email.
- Validation failure produces no Auth call.
- Update failure produces no post-update work.
- Password strings are not trimmed or copied into errors, logs, metadata, or notices.
- HTML dynamic values are escaped.
- Global sign-out is explicitly requested after successful password update.

## Testing Strategy

### Schema Tests

Cover non-object and array bodies, missing fields, non-string fields, empty strings, each password-policy requirement, intentional whitespace handling, identical passwords, and valid strong passwords.

### Module Tests

Cover successful verify/update ordering, invalid current password, update failure, absence of later calls after a failed step, global revocation after success, post-update task completion, and containment of each best-effort failure.

### Gateway Tests

Cover email/password mapping to `signInWithPassword`, invalid verification result, password mapping to `updateUser`, global scope mapping to `signOut`, and controlled provider-error wrapping without secret leakage.

### Effects Tests

Cover Notification recipient/type/content, email recipient/subject/text/HTML, deterministic timestamp, HTML escaping, thrown provider errors, and structured `{ success: false }` email failures.

### Route Contract Tests

Cover authentication before body parsing, missing email, malformed JSON, typed validation and credential errors, controlled update errors, unchanged success response, and absence of raw Supabase messages.

### UI Compatibility

Verify the exact identical-password message used by `ChangePasswordView` and the existing successful response consumed before local sign-out and redirect.

## Verification

Run:

1. focused schema, module, gateway, effects, and route tests;
2. the existing `changePassword` API tests or their updated contract equivalent;
3. ESLint directly against affected files;
4. the full Vitest suite;
5. `npx tsc --noEmit`;
6. the repository lint command if available.

The configured `next lint` command is incompatible with the installed Next.js 16 version. Report that tooling failure separately. Existing unrelated type-check and inline-edit test failures remain baseline and must not be attributed to this migration.

Completion requires a thin Route Handler, no frontend or database changes, no credential leakage, coverage of every approved behavior correction, and no new full-suite or type-check failure.

## Follow-up Work

- Extract password recovery and reset into the Account Security context as a separate workflow.
- Unify password policy across registration, recovery, and authenticated changes.
- Add rate limiting or step-up authentication for sensitive credential operations.
- Add a durable operational alert or retry mechanism for failed global revocation.
- Add MFA, passkeys, recovery codes, and user-visible session management if required.
