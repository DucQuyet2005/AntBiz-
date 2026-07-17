# Creator Flow Backend Design

## Scope

Implement backend support for sprint tasks T-3.01-05 through T-3.01-07:

- Build generation prompts from a stored Article, a target social platform, and
  an optional Platform Preset.
- Regenerate a complete Caption or a selected portion of one Caption, then
  persist the result.
- Publish a Caption immediately and synchronously, while preserving the
  existing scheduled-publication API.

This work does not modify UI components, React contexts, frontend modules, or
the temporary creator service mocks.

## Architectural Boundaries

The implementation extends existing domain modules instead of creating a
cross-domain Creator Flow backend module:

- `backend/modules/caption-generation/` owns prompt construction and AI text
  generation, including full and partial regeneration.
- `backend/modules/caption-management/` remains the authority for editing an
  existing Caption, authorization, lock-state rules, and version history.
- `backend/modules/scheduled-publishing/` owns synchronous immediate
  publication and the existing future scheduling lifecycle.
- `app/api/**/route.ts` files authenticate, parse transport input, call public
  module interfaces, and map domain results or errors to HTTP responses.

Backend code does not depend on React, browser APIs, frontend implementation,
or Next.js request/response types.

## Prompt-Based Caption Generation

The existing `POST /api/captions/generate` SSE endpoint remains the generation
transport. The creator flow calls it with:

- `articleId`: the required stored Article identifier for this flow.
- `platform`: `facebook`, `threads`, or `instagram`.
- `presetMode`: `selected`, `none`, or `auto`.
- `platformPresetId`: required only when `presetMode` is `selected`.
- Existing optional prompt, style, variant, and regeneration compatibility
  fields remain supported.

The module loads the Article from Article Ingestion persistence, normalizes the
platform, and resolves Preset behavior explicitly. `selected` loads the given
Preset, which must be a system Preset or belong to the actor and must apply to
the target platform. `none` contributes no Preset section to the final prompt.
`auto` preserves the existing default-Preset selection behavior. For backward
compatibility, an omitted `presetMode` is interpreted as `auto`.

The prompt builder combines the Article title and content, normalized target
platform, optional Preset rules, optional Prompt Library/custom instruction,
and optional style rules. It continues to enforce platform content limits and
persist a draft Caption before emitting the final SSE completion event.

Existing URL-based generation remains available for backward compatibility;
the new creator flow contract uses `articleId`.

## Caption Regeneration

Add `POST /api/captions/[id]/regenerate`. The authenticated actor supplies one
of these commands:

```json
{
  "mode": "full",
  "instruction": "optional additional direction",
  "presetMode": "none",
  "platformPresetId": "optional UUID"
}
```

```json
{
  "mode": "partial",
  "selectionStart": 10,
  "selectionEnd": 42,
  "selectedText": "exact selected content",
  "instruction": "required rewrite direction",
  "presetMode": "selected",
  "platformPresetId": "optional UUID"
}
```

Selection offsets use JavaScript UTF-16 string indices so browser selection
offsets and server slicing have identical semantics.
Regeneration uses the same `selected | none | auto` Preset semantics as initial
generation.

The regeneration workflow:

1. Loads the Caption and its source Article.
2. Requires ownership unless the actor is an administrator.
3. Rejects Captions in `scheduled` or `posted` states.
4. Uses `edited_content` when present, otherwise `ai_content`, as current text.
5. For partial mode, validates the range and verifies that slicing current text
   produces `selectedText`. A mismatch is a stale-edit conflict.
6. Builds a regeneration prompt containing the Article context, platform,
   current Caption, requested scope, optional Preset, and instruction.
7. Collects the AI output, applies full replacement or exact range replacement,
   and validates the final platform length.
8. Persists the new text as `edited_content` with status `edited`.
9. Records Caption version history as a supporting effect. Consistent with the
   Caption Management domain, a version-write failure is logged but does not
   roll back an otherwise successful Caption update.

The JSON response contains the updated Caption, regeneration mode, generated
text, and replacement range for partial regeneration.

## Immediate Publication

Add `POST /api/scheduled-posts/publish-now` with:

```json
{
  "captionId": "caption UUID",
  "imageUrls": ["https://example.com/image.jpg"]
}
```

The Scheduled Publishing module performs the same Caption, platform length,
Instagram media, ownership, and linked-account validation used by scheduled
publication. It creates a Scheduled Post representing the publication attempt,
claims it, and calls the existing Social Publisher in the request lifecycle.

On provider success, the module marks the Scheduled Post and Caption `posted`
and returns the persisted post, external post identifier, platform, and
publication timestamp. On provider failure, it marks the Scheduled Post
`failed` and throws a typed publication error so the HTTP response cannot imply
success. Notification failures remain best-effort supporting effects.

The existing `POST /api/scheduled-posts` contract continues to require a future
`scheduledAt` value and is not changed into a dual-mode endpoint.

## Validation and HTTP Errors

- Malformed commands and invalid platform/media/content constraints: `400`.
- Missing Article, Caption, Preset, or required linked account: `404`.
- Authenticated actor without resource access: `403`.
- Stale partial-selection text or an incompatible Caption state: `409`.
- Provider/repository failures: typed `5xx` responses without leaking secrets
  or raw provider payloads.
- Unauthenticated requests continue to use the existing authentication helper
  response.

## Persistence and Compatibility

No database migration is planned. Existing Caption, Caption Version, Scheduled
Post, and linked-account storage are reused. If repository inspection during
implementation proves that a required result cannot be represented, work stops
for explicit approval before adding a migration.

Public response shapes and behavior outside the new endpoints and optional
Preset handling remain unchanged. Existing URL generation and future schedule
callers continue to work.

## Testing

Backend module tests cover:

- Prompt composition with and without an explicit Preset.
- Preset ownership and platform compatibility.
- Full and partial regeneration, UTF-16 range replacement, stale selection,
  authorization, locked states, platform limits, persistence, and version
  history degradation.
- Immediate publication success for supported platforms, ownership, linked
  account requirements, Instagram media, platform limits, provider failure,
  and persisted `posted`/`failed` states.

API tests cover authentication, schema errors, domain-to-HTTP mappings, SSE
compatibility, and the response contracts for both new endpoints.

Verification includes focused tests, TypeScript checking, and a production
Next.js build.
