# Quick Publishing Foundation Design

**Date:** 2026-07-16
**Status:** Approved for implementation planning

## Objective

Extract the existing generation-to-scheduling orchestration from the 7,900-line `AiCreatorView` into a deep frontend module without changing the current interface, endpoint contracts, or visible three-step workflow. The module will make the existing platform selection snapshot, Preset configuration, multi-variant Caption Generation, regeneration, Caption draft persistence, and Scheduled Publishing handoff reusable when T-3.01 is later rebuilt as a five-step flow.

This is an architecture migration, not implementation of the unfinished T-3 backlog.

## Domain Language

`CONTEXT.md` defines **Quick Publishing** as the client-side workflow that coordinates existing source, channel, Preset, Caption, and scheduling capabilities. It owns ordering and state projection across those domains, while the underlying business rules remain in their existing backend modules.

## Scope

### Included

- Existing generation-to-scheduling Quick Publishing orchestration inside `components/views/AiCreatorView.tsx`.
- Loading existing Platform Presets and selecting the compatible default.
- Building the existing per-platform generation commands.
- Generating the existing variant count for each selected platform.
- Parsing existing Caption Generation SSE frames into typed client events.
- Accumulating streamed text and associating Caption and Article IDs.
- Regenerating one complete variant while retaining the other variants.
- Cancelling in-progress generation through the existing abort behavior.
- Persisting edits through the existing Caption Management endpoints.
- Reusing or creating a Caption draft before scheduling.
- Validating the existing connected-platform and future-time conditions.
- Scheduling selected platforms concurrently through the existing Scheduled Publishing endpoint.
- Preserving partial multi-platform generation and scheduling results.
- Characterization, module, client-adapter, and React-adapter tests.

### Excluded

- Replacing the current visible three-step interface with T-3.01's five-step interface.
- Implementing immediate publication.
- Measuring workflow completion time.
- Regenerating a selected text range.
- Adding a Preset questionnaire, custom answer, usage-history reranking, or new default Presets.
- Adding stacked toast notifications, hover pause, notification details, or daily email digests.
- Adding a Scheduled Publishing list view, pagination, or new overlap visualization.
- Adding engagement collection, performance reporting, similarity detection, golden-hour suggestions, or browser-extension behavior.
- Changing prompts, Preset precedence, variant count, model choice, endpoint URLs, JSON shapes, SSE frames, or database schema.
- Refactoring unrelated `AiCreatorView` presentation code.
- Moving existing URL crawling, manual entry, speech transcription, or document parsing orchestration; the module receives the resulting source snapshot.

## Existing Architecture

The backend domains used by Quick Publishing already expose focused interfaces:

- Article Ingestion, Speech Processing, and Document Parsing resolve source material.
- Platform Presets supplies platform rules.
- Caption Generation prepares, streams, validates, and persists generated Captions.
- Caption Management owns draft creation and editing.
- Social Account Connections lists connected publication accounts.
- Scheduled Publishing owns future scheduling and the Publication Runner.
- Gemini Capacity provides credentials and model selection to rotation-enabled generation.

`AiCreatorView` currently calls those HTTP interfaces directly and also owns request construction, prompt additions for variants, SSE parsing, stream accumulation, Caption-ID association, regeneration ordering, draft preparation, scheduling validation, concurrent scheduling, and presentation state. Understanding or changing the workflow therefore requires navigating presentation and orchestration in the same file.

## Chosen Architecture

Create a frontend module:

```text
frontend/modules/quick-publishing/
  quick-publishing-module.ts
  quick-publishing-client.ts
  quick-publishing-events.ts
  quick-publishing-types.ts
  quick-publishing-errors.ts
  use-quick-publishing.ts
  index.ts
```

`AiCreatorView` remains the presentation adapter. It renders the current layout and supplies complete command snapshots to the module. The module is independent of React layout and does not refer to `step === 1`, `step === 2`, or `step === 3`.

### Rejected Alternatives

#### Extract visual sections first

Splitting JSX into smaller files would shorten `AiCreatorView` but leave request ordering, SSE parsing, draft preparation, and scheduling knowledge distributed across presentation files. The deletion test shows little depth: deleting those files would simply move the same orchestration back into the view.

#### Implement the five-step workflow during extraction

Combining architecture migration with unfinished T-3.01 behavior would make regressions difficult to distinguish from intended changes and would prematurely decide interface details assigned to later tasks.

#### Move all orchestration into one React hook

A hook containing fetch calls, protocol parsing, business ordering, and UI state would be another shallow interface tied to React. The chosen module keeps transport and React adaptation as internal seams around a framework-independent workflow implementation.

## Interfaces and Responsibilities

### Quick Publishing Module

The module accepts immutable snapshots rather than reading React state. Its operations cover:

```ts
loadPresets(input)
generate(input, signal?)
regenerate(input, signal?)
saveEdit(input)
ensureDraft(input)
schedule(input)
```

Generation and scheduling operations emit typed events so callers can project progress without learning HTTP or SSE details.

The interface uses existing domain identifiers and values: platform, Platform Preset ID, Brand Style ID, Prompt ID, Article ID, Caption ID, variant group ID, variant index, image URLs, and scheduled time. It does not accept React setters, DOM events, translated strings, modal state, or step numbers.

### Quick Publishing Client Adapter

The production client adapter owns calls to existing endpoints:

- `GET /api/platform-presets`
- `POST /api/captions/generate`
- `POST /api/captions`
- `PUT /api/captions/[id]`
- `POST /api/scheduled-posts`

It maps compatible JSON failures to typed module errors and converts Caption Generation SSE frames into transport-neutral events. It does not select Presets, construct variant instructions, update React state, or decide workflow ordering.

Tests use an in-memory adapter at the same internal seam. Production endpoint contracts are not changed.

### React Adapter

`use-quick-publishing.ts` subscribes to module events and exposes state required by `AiCreatorView`:

- generation and regeneration activity;
- accumulated text by platform and variant;
- Article and Caption identifiers;
- per-platform status and failure;
- scheduling activity and outcome.

The React adapter maps commands and events to state. It does not parse SSE, build request JSON, construct prompt additions, or call endpoints directly.

### AiCreatorView

The view continues to own:

- the current three-step navigation;
- JSX, responsive layout, platform cards, previews, editor controls, modal state, dropdowns, animation, and drag-and-drop display;
- incomplete form input and visual validation hints;
- translations and user-facing message selection;
- current presentation-only toggles and selected display tab.

The view calls the React adapter with a complete command snapshot and renders the resulting state. Future five-step work may rearrange presentation without changing the module interface.

## State Ownership

### Module execution state

- active generation and abort ownership;
- normalized platform configuration snapshot;
- variant group and per-platform Caption IDs;
- accumulated SSE content;
- generation, regeneration, draft-save, and scheduling operation results;
- typed failures containing only safe operational context.

### Presentation state

- current visible step and sub-step;
- open modal, dropdown, editor, and preview;
- drag position and calendar viewport;
- language and rendered messages;
- incomplete inputs not yet submitted as commands.

The module does not retain article text, prompt text, or generated content beyond the lifetime needed to execute and project the active command. Persisted content remains owned by the existing backend domains.

## Data Flow

### Preset Loading

1. The view supplies the selected platform and current saved Preset ID.
2. The module asks the client adapter for the existing Preset list.
3. The module preserves current selection precedence: saved selection, user default, first user Preset, system default, first system Preset.
4. The React adapter projects the selected Preset and list to the view.

No questionnaire, reranking, or new display projection is introduced.

### Multi-Variant Generation

1. The view submits source identifiers, selected platforms, current Preset/configuration values, instruction values, model compatibility value, and variant count.
2. The module creates or reuses the variant group ID.
3. It preserves the existing variant-specific instruction additions.
4. It creates one command for every selected platform and variant.
5. Commands execute concurrently through the client adapter.
6. The client adapter parses the existing SSE frames.
7. The module emits text-fragment, Caption-created, Article-resolved, completed, aborted, and failed events with platform and variant identity.
8. Failure of one command does not clear successful or in-progress results from other commands.

The module does not alter prompt copy, variant temperature, platform rules, or backend persistence.

### Regeneration

1. The view submits one existing variant and active platform snapshot.
2. The module preserves the variant group and passes the prior Caption ID as `oldCaptionId`.
3. Only the target platform/variant content and identifiers enter a regenerating state.
4. The normal generation event pipeline projects replacement text and identifiers.
5. Other variants remain unchanged.

Selected-range regeneration remains excluded.

### Edit Persistence and Draft Preparation

Before scheduling a platform, the module:

1. reuses the platform-specific Caption ID when present;
2. updates the existing Caption when the current text differs from the generated original;
3. otherwise creates a draft Caption from the existing Article, platform, original AI content, optional edited content, and Prompt ID;
4. emits the resolved Caption ID and status.

The current compatibility behavior around edited content and database platform normalization remains unchanged.

### Scheduling

1. The view submits selected and excluded platforms, connected platforms, per-platform date/time, current Caption state, and image URLs.
2. The module filters excluded platforms.
3. It preserves current validation for at least one active platform, connected accounts, and future times.
4. It ensures a draft Caption for every active platform.
5. It schedules platforms concurrently through the existing endpoint.
6. It emits platform-scheduled and platform-failed events, followed by an aggregate completion event.

The operation preserves current partial success semantics. If one platform has already scheduled successfully and another fails, the successful platform remains scheduled. The migration adds no transaction or rollback.

## Event Model

Events use a discriminated union conceptually containing:

```text
generation-started
text-fragment
article-resolved
caption-resolved
generation-completed
generation-failed
generation-aborted
edit-saved
draft-resolved
platform-scheduled
platform-schedule-failed
schedule-completed
```

Every platform-specific event includes platform. Every variant-specific event includes variant ID and index. Events contain generated text only where the presentation needs to append or replace it. They never contain API keys, raw provider errors, request headers, access tokens, or Supabase error objects.

## Error Policy

Typed module errors use stable codes:

- `SOURCE_INVALID`
- `PRESET_LOAD_FAILED`
- `GENERATION_FAILED`
- `GENERATION_ABORTED`
- `CAPTION_SAVE_FAILED`
- `PLATFORM_NOT_CONNECTED`
- `SCHEDULE_INVALID`
- `SCHEDULE_FAILED`

Error context may contain operation, platform, variant ID, HTTP status, and attempt phase. It excludes source text, generated content, prompts, Preset rules, credentials, provider messages, response bodies, and environment values.

The React adapter maps typed failures to the current Vietnamese or English presentation messages. The module does not import translations.

Behavior remains:

- generation failure is isolated to the affected platform and variant;
- abort is not displayed as a provider failure;
- successful sibling variants remain visible;
- scheduling can partially succeed;
- a failed edit or draft save prevents scheduling only for the affected platform;
- no new retry, rollback, or provider fallback is added in the frontend module.

## Testing Strategy

### Characterization Tests

Before moving orchestration, characterize:

- existing generation request fields;
- Preset and configuration mapping;
- variant instruction additions;
- variant group creation and reuse;
- regeneration `oldCaptionId` behavior;
- edit-versus-original draft payloads;
- scheduling payload and partial-success behavior;
- current abort behavior.

These tests document compatibility rather than future T-3 acceptance criteria.

### Module Tests

Test through the same module interface used by the React adapter with an in-memory client adapter:

- Preset selection precedence;
- platform × variant concurrency;
- streamed event identity and ordering per command;
- isolated generation failure;
- abort propagation;
- regeneration without clearing siblings;
- existing Caption update versus new draft creation;
- platform normalization;
- connected-platform and future-time validation;
- per-platform draft preparation;
- full and partial scheduling success.

### Client Adapter Tests

- endpoint and method selection;
- compatible request JSON;
- successful and error JSON mapping;
- current SSE frame parsing;
- text, completion, validation, and done frames;
- abort signal forwarding;
- sanitized typed failures.

### React Adapter Tests

- maps generation events to the correct platform and variant;
- retains sibling results after failure or regeneration;
- exposes generating, regenerating, and scheduling states;
- maps typed failures without transport knowledge;
- applies scheduled state only to successful platforms.

React adapter tests do not inspect detailed `AiCreatorView` JSX.

### Regression Verification

- Existing `AiCreatorView` focused tests.
- Caption Generation route and backend module tests.
- Caption Management tests.
- Platform Preset tests.
- Scheduled Publishing route and backend module tests.
- Direct ESLint for changed files.
- TypeScript verification, separating documented repository baselines.
- Full test suite, separating documented repository baselines.

No tests are added for the five-step interface, immediate publication, timing measurement, selected-range regeneration, Preset questionnaire, notification enhancements, engagement metrics, reporting, similarity, golden hours, or extension behavior.

## Migration Sequence

1. Add characterization tests for generation, regeneration, draft preparation, and scheduling orchestration.
2. Add Quick Publishing types, events, and typed errors.
3. Add the client adapter and focused request/SSE tests.
4. Add the framework-independent module and in-memory-adapter tests.
5. Add the React adapter and state-transition tests.
6. Move Preset loading and selection behind the module.
7. Move generation and regeneration orchestration behind the module.
8. Move edit persistence and draft preparation behind the module.
9. Move scheduling orchestration behind the module.
10. Remove migrated request construction and SSE parsing from `AiCreatorView`.
11. Verify the current UI, endpoints, and behavior remain compatible.

Each migration slice should leave tests passing and may be committed independently if the final implementation plan identifies a safer checkpoint.

## Deployment and Compatibility

This migration adds no database migration, environment variable, deployment dependency, new endpoint, or changed response contract. The frontend module ships with the existing Next.js application.

The user's `.gitignore` modification remains untouched.

## Success Criteria

- Quick Publishing orchestration resides under `frontend/modules/quick-publishing/`.
- The module exposes workflow actions and typed events without React layout or step-number knowledge.
- `AiCreatorView` contains no Caption Generation request construction, SSE parsing, variant-generation orchestration, draft-preparation ordering, or multi-platform scheduling orchestration.
- The current visible three-step interface and user-visible behavior remain compatible.
- Existing backend domain interfaces and endpoint contracts remain unchanged.
- Partial generation and scheduling outcomes remain compatible.
- No unfinished T-3 feature is introduced.
- Module, client-adapter, React-adapter, and existing regression tests pass apart from documented repository baselines.
