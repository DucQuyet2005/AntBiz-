# Caption Export Backend Module Design

## Goal

Move the synchronous Caption Export workflow out of three Next.js Route Handlers and `lib/api/services/exportService.ts` into a dedicated backend bounded context. Preserve the current URLs, HTTP methods, immediate CSV download, user-specific history, compatibility storage, and UI contracts while separating request-scoped caption access from privileged export-job persistence.

## Scope

This change covers:

- `GET /api/captions/export`
- `GET /api/captions/export/download`
- `GET /api/export-jobs`
- Caption filtering and counting
- CSV generation
- Export-job creation, completion, failure recording, retrieval, and history projection
- Ownership checks for regenerated downloads
- Focused module, repository, serializer, and Route Handler tests

This change does not modify the UI, route URLs, HTTP methods, database schema, RLS policies, export row limits, or public success response shapes.

## Compatibility Decisions

Although the repository contains a migration for an `export_jobs` table, the deployed runtime currently stores export requests as Audit Log records whose action is `export_csv_job`. Existing UI history and download links use that representation. This migration therefore keeps `audit_logs` as a compatibility store. Moving records to `export_jobs` is a separate data migration.

The workflow remains synchronous. It creates a job record, generates the CSV during the same request, marks the record completed, and returns the file immediately. It does not introduce a queue or background worker.

## Architecture

Create `backend/modules/caption-export/` with four primary units:

- `CaptionExportModule` orchestrates create-and-download, regenerated download, and history-listing use cases.
- `CaptionExportRepository` counts and reads Captions through the authenticated request-scoped Supabase client, preserving RLS as the final caption data-access boundary.
- `ExportJobStore` performs the privileged compatibility operations against `audit_logs` through an admin Supabase client.
- `CaptionCsvSerializer` converts typed caption projections into the established CSV format and applies spreadsheet safety rules.

Supporting files provide schemas, types, typed errors, a factory, and public exports.

```text
backend/modules/caption-export/
├── caption-export-module.ts
├── caption-export-repository.ts
├── export-job-store.ts
├── caption-csv-serializer.ts
├── caption-export-schemas.ts
├── caption-export-types.ts
├── caption-export-errors.ts
├── caption-export-factory.ts
└── index.ts
```

The old `lib/api/services/exportService.ts` and its service-level tests are removed only after all runtime callers and behaviors are covered by the new module tests.

## Authorization and Client Boundaries

All three routes retain the allowed roles `admin`, `marketer_full`, and `marketer_content`.

The factory receives two clients with distinct responsibilities:

- The request-scoped user client is supplied to `CaptionExportRepository`. All Caption counts and reads therefore follow the caller's RLS visibility.
- The admin client is supplied only to `ExportJobStore`, because `audit_logs` is administrator-restricted and is being used as a temporary compatibility job store.

The module receives an authenticated actor containing the user ID and role. It never reads cookies or sessions. A regenerated download is allowed only when the actor is an administrator or the job's `actor_id` matches the actor ID.

## Filter Contract

The public filter parameters remain:

```ts
{
  platform?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
```

Normalization and validation rules:

- Trim all string values and convert empty strings to `undefined`.
- Treat `All Platforms` as no platform filter.
- Limit platform text to 50 characters without hard-coding the enum because the current UI and historical schema use different Threads spellings.
- Limit search text to 200 characters.
- Accept ISO date-only values and ISO timestamps.
- Normalize valid dates to ISO timestamps, using the start and end of day for date-only boundaries.
- Reject a range in which `startDate` occurs after `endDate`.
- Require download `jobId` to be a UUID.

The normalized filters are used for the initial count, Caption fetch, and stored job representation so create and regenerated-download semantics remain aligned.

## Safe PostgREST Filtering

Caption search matches `ai_content` or `edited_content` with contains semantics.

- Escape user-supplied `%` and `_` so they are literal text rather than caller-controlled LIKE wildcards.
- Escape backslashes.
- Quote values embedded in `.or(...)` so commas and parentheses cannot restructure the PostgREST logical filter.
- Normalize literal double quotes to spaces before pattern construction because a double quote cannot be represented reliably inside PostgREST logical-filter grammar.
- Collapse whitespace introduced by normalization and trim the result.

If quote normalization leaves the search empty, the search filter is omitted. The exact normalized filter set is stored with the export job and reused during regenerated downloads.

## Create Export Flow

`CaptionExportModule.create` performs:

1. Parse and normalize the raw filters.
2. Count visible Captions through `CaptionExportRepository` and the user client.
3. Create a pending `export_csv_job` record through `ExportJobStore`.
4. Fetch visible Caption projections with the same normalized filters. Preserve the existing fallback limit of 1000 when the initial count is zero; otherwise use the count. No new row cap is introduced.
5. Serialize the rows to CSV.
6. Build a same-origin relative download path:

   ```text
   /api/captions/export/download?jobId=<uuid>
   ```

7. Mark the job completed with the relative download path and actual exported row count.
8. Return the CSV, job ID, and filename metadata to the Route Handler.

If a failure occurs after job creation, the module attempts to mark that job failed with a safe operation-level message. Failure recording is best-effort and never replaces the original error. A count failure before job creation creates no job.

## Regenerated Download Flow

`CaptionExportModule.download` performs:

1. Validate `jobId`.
2. Load an Audit Log record constrained by both `id` and `action = export_csv_job`.
3. Return not found when no matching export job exists.
4. Require administrator role or matching job owner.
5. Parse the stored filters and stored row count defensively.
6. Re-fetch current visible Captions through the request-scoped repository.
7. Serialize and return the CSV with the established filename convention.

The system does not persist file contents. A download is a regeneration from current data using the stored normalized filters and row count. This preserves existing behavior rather than introducing snapshot storage.

No 24-hour expiry is introduced because the current runtime does not enforce one. Expiry requires a separate product and persistence decision.

## Export History Flow

`CaptionExportModule.list` requests compatibility jobs for the actor's user ID and projects them to:

```ts
{
  id: string;
  created_by: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  error_message?: string;
  filters?: CaptionExportFilters;
  row_count?: number;
  created_at: string;
}
```

The Route Handler continues returning `{ data: jobs }`. Administrators continue seeing only their own export history because this is the current endpoint behavior.

## CSV Contract and Spreadsheet Safety

The serializer preserves:

- UTF-8 BOM for Excel compatibility
- The established 12-column order
- Quoted values
- Doubled double quotes inside values
- Commas and newlines inside quoted cells
- Empty-string fallbacks for missing optional relations

The columns remain:

```text
ID, Article URL, Article Title, Category, Platform, Prompt Name,
Prompt Content, AI Content, Edited Content, Status, Created By, Created At
```

Before CSV quoting, a text cell whose first character is `=`, `+`, `-`, `@`, tab, or carriage return receives a leading apostrophe. This prevents Excel and compatible spreadsheet applications from executing exported content as a formula while keeping the visible source text readable.

## Errors and HTTP Mapping

Typed module errors map as follows:

- Invalid filters or job ID: HTTP 400
- Missing export job or wrong Audit Log action: HTTP 404
- Non-owner, non-administrator download: HTTP 403
- Caption repository, job store, or serialization failure: HTTP 500

Authentication remains HTTP 401 and unsupported roles remain HTTP 403 through the existing auth adapter.

Public errors do not expose Supabase or Postgres messages. Server logs contain only a safe operation name and, where useful, a validated job ID. They do not include search text, Caption content, raw database errors, or job metadata.

## Route Handler Responsibilities

After migration, each Route Handler only:

1. Authorizes the supported roles.
2. Reads URL parameters.
3. Creates the Caption Export module with the user and admin clients.
4. Calls one use case.
5. Maps typed errors to HTTP responses.
6. Constructs the JSON or CSV response and established download headers.

No Route Handler constructs database queries, creates job payloads, performs ownership checks, or serializes CSV rows.

## Email and Background Processing

Email notification code is not moved into the new module. The current production route calls completion without an email address, and repository search confirms no runtime caller uses the notification function. Removing this dead path makes the explicit product behavior match the UI: immediate download plus saved history, without email.

Introducing notifications, durable files, queues, or workers requires a separate design.

## Verification

### Schema and Module Tests

- Normalize platform, search, and ISO date boundaries.
- Reject overlong input, invalid dates, reversed ranges, and invalid UUIDs.
- Verify create ordering: count, pending job, fetch, serialize, completed job.
- Verify post-creation failures trigger best-effort failed status.
- Verify failed-status errors do not mask the original failure.
- Verify download action constraint and owner/administrator authorization.
- Verify stored filters and row count are parsed before reuse.
- Verify history lists only the current actor's jobs.

### Repository and Job Store Tests

- Apply identical normalized filters to count and fetch.
- Treat reserved PostgREST characters as data rather than filter grammar.
- Use the request-scoped client for Caption access.
- Require `action = export_csv_job` when loading a job.
- Map compatibility Audit Log records to the established history shape.
- Convert every data-source failure to an operation-specific typed error.

### Serializer Tests

- Preserve BOM, headers, column order, quote escaping, commas, newlines, and empty fields.
- Neutralize formula prefixes `=`, `+`, `-`, `@`, tab, and carriage return.
- Preserve ordinary text unchanged.

### Route Tests

- Preserve auth 401 and role 403 behavior.
- Map validation, missing-job, ownership, and internal errors to 400, 404, 403, and 500.
- Preserve CSV body, content type, cache control, and filename headers.
- Preserve `{ data: jobs }` for export history.
- Confirm routes contain no direct database or serializer logic.

### Project Checks

- Run focused Caption Export module and Route Handler tests.
- Run ESLint directly on changed files.
- Run `npx tsc --noEmit` and distinguish new failures from established baseline failures.
- Run the complete Vitest suite and report the established `inlineEdit` failure separately if it remains.
- Run `git diff --check`.
- Keep the user's existing `.gitignore` change outside both design and implementation commits.

## Acceptance Criteria

- Existing Archive UI export and history flows require no changes.
- All three public endpoints and their successful response contracts remain stable.
- Caption reads never use the admin client.
- Privileged job-store access is isolated behind `ExportJobStore`.
- Stored and replayed filters use the same validated representation.
- Download lookup cannot treat an unrelated Audit Log as an export job.
- Failed exports no longer remain pending indefinitely when failure recording succeeds.
- Generated CSV cannot execute user-controlled spreadsheet formulas.
- The old export service is removed with no remaining runtime imports.
