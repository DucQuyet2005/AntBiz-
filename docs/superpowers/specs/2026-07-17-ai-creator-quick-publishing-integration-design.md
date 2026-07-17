# AI Creator Quick Publishing Integration Design

**Date:** 2026-07-17
**Status:** Approved for specification

## Objective

Complete T-3.01-05, T-3.01-06, and T-3.01-07 end to end by connecting the current `AiCreatorView` workflow to the existing backend domain interfaces. Preserve the current visible interaction model: the existing **Tạo lại bài đăng** action regenerates the complete Caption, while selecting text opens the existing partial-edit popover.

The integration replaces creator-flow generation and publishing mocks with real Caption Generation, Caption Management, and Scheduled Publishing calls. It does not redesign the wizard.

## Architectural Decision

Keep `frontend/modules/creator-flow/` as the React and presentation-state adapter. It continues to own step navigation, active platform, editor selection, modal state, and user-facing projection.

Use `frontend/modules/quick-publishing/` as the deep browser workflow module. Extend its interface to own:

- Caption Generation SSE orchestration;
- Caption identifier association;
- inline Caption persistence;
- complete and partial Caption regeneration;
- draft preparation;
- immediate publication;
- future scheduling;
- per-platform outcomes and safe typed failures.

The dependency direction is:

```text
AiCreatorView and creator-flow step views
  -> Creator Flow React adapter
    -> Quick Publishing public interface
      -> browser HTTP adapter
        -> app/api Route Handlers
          -> backend domain modules
```

`components/views/**` remains presentation-only. `CreatorFlow` does not construct HTTP payloads, parse SSE frames, or implement publishing rules. Quick Publishing does not import JSX, translation content, DOM events, or step numbers.

## Rejected Alternatives

### Replace Creator Flow completely

Moving all view state directly to `useQuickPublishing` would reduce one adapter but require broad changes to navigation, editor state, platform tabs, and scheduling presentation. The regression risk is disproportionate to the three task contracts.

### Convert creator mock modules into HTTP clients

Making `lib/services/creator/post.service.ts` and `schedule.service.ts` call real endpoints would be quick, but would leave two overlapping workflow interfaces and keep new business orchestration in a location prohibited by `ARCHITECTURE.md`.

## Scope

### Included

- Real Preset loading or explicit no-Preset behavior.
- Real generation for every selected platform using the stored Article identifier or compatible URL source.
- SSE accumulation and persisted Caption ID projection.
- Local editor updates followed by real Caption persistence.
- Complete Caption regeneration from the existing button.
- Partial Caption regeneration from the selected-text popover.
- Immediate publication for each selected platform.
- Future scheduling for each selected platform.
- Accurate complete, partial-success, and failure states.
- Focused replacement of creator-flow mock calls involved in these tasks.
- Tests through the Quick Publishing interface, HTTP adapter, Creator Flow adapter, and focused UI interactions.

### Excluded

- Wizard layout or visual redesign.
- Replacing the existing full-regeneration button with a mode-selection dialog.
- New database schema or migrations.
- New generation models, Prompt wording, Preset precedence, or platform limits.
- Transactional rollback across platforms.
- Unrelated Article Ingestion, chat assistant, reporting, notification, or calendar redesign.
- Deleting compatibility mock modules while unrelated callers or tests still depend on them.

## Public Interface Changes

Extend the Quick Publishing client and module interfaces with transport-neutral commands for:

```ts
saveCaptionEdit(input)
regenerateCaption(input)
publishNow(input)
```

`regenerateCaption` accepts a discriminated command matching the backend contract:

```ts
type RegenerateCaptionCommand =
  | {
      captionId: string;
      mode: 'full';
      instruction?: string;
      presetMode: 'auto' | 'selected' | 'none';
      platformPresetId?: string;
    }
  | {
      captionId: string;
      mode: 'partial';
      selectionStart: number;
      selectionEnd: number;
      selectedText: string;
      instruction: string;
      presetMode: 'auto' | 'selected' | 'none';
      platformPresetId?: string;
    };
```

Selection offsets use JavaScript UTF-16 indices, matching the backend regeneration contract.

Immediate publication accepts a persisted Caption ID plus current media URLs. Scheduling continues to accept a persisted Caption ID, future ISO timestamp, and media URLs.

## Source Handoff

Caption Generation requires a stable source identifier. The Creator Flow adapter passes:

- `articleId` when Article Ingestion has persisted the source; or
- the existing compatible URL for URL-based generation.

Manual source entry must complete the existing Article Ingestion persistence flow before generation. A local-only article context is not considered sufficient for successful generation, draft persistence, regeneration, or publishing. If source persistence fails, the workflow reports a source error and does not fabricate a post identifier.

## Initial Generation Flow

1. The current view supplies selected platforms, source identity, active Preset selection, and current configuration.
2. Creator Flow creates an immutable Quick Publishing generation command.
3. For a selected Preset, the command uses `presetMode: 'selected'` and its `platformPresetId`; skipped Preset uses `presetMode: 'none'` without an ID.
4. Quick Publishing starts one generation session per selected platform and consumes the existing SSE interface.
5. Text fragments are projected into the corresponding platform draft.
6. Completion associates the real Caption ID and Article ID with that draft.
7. A failed platform remains failed without clearing successful sibling drafts.

Hard-coded generated content and random pseudo post identifiers are no longer used by this workflow.

## Inline Editing Flow

The content-editable surface continues to update local presentation state immediately. The platform draft tracks generated original content and current edited content separately.

Before regeneration, immediate publication, or scheduling, Quick Publishing ensures the current draft is persisted:

- update the existing Caption when a Caption ID is present;
- create a Caption only through the existing compatibility path when the generation response has not already produced one;
- stop the affected platform when source identity or Caption persistence is unavailable.

The backend remains authoritative for ownership, locked states, validation, and persistence. A Caption in `scheduled` or `posted` state cannot be edited even if the browser state is stale.

## Complete Regeneration Flow

1. The existing **Tạo lại bài đăng** button targets the active platform draft.
2. Quick Publishing first persists any current inline edit required by the command ordering.
3. It calls `POST /api/captions/[id]/regenerate` with `mode: 'full'` and current Preset semantics.
4. The returned persisted Caption content replaces the active editor content.
5. Other platform drafts remain unchanged.

The legacy generation endpoint and `oldCaptionId` flow are not used for T-3.01-06 regeneration.

## Partial Regeneration Flow

1. The editor records `selectionStart`, `selectionEnd`, and exact `selectedText` from the current Caption content.
2. The existing popover collects the required instruction.
3. Quick Publishing persists preceding inline edits, preserving the same content snapshot used for the selection.
4. It sends the partial regeneration command to the backend.
5. The backend verifies the range and selected text, performs the replacement, persists the Caption, and returns the result.
6. Creator Flow projects the returned complete Caption content and clears the selection state.

The browser does not use `String.replace()` to decide which occurrence changes. A `409` stale-selection response leaves the editor unchanged and asks the user to select the segment again.

## Immediate Publication Flow

1. Creator Flow collects all selected platform drafts.
2. Quick Publishing ensures every affected draft has current persisted Caption content.
3. It calls `POST /api/scheduled-posts/publish-now` separately for each platform Caption.
4. Per-platform success and failure events update the UI.
5. The workflow reports complete success only when every requested platform succeeds.

The backend derives the platform from the Caption and remains authoritative for ownership, linked accounts, media requirements, platform limits, provider publication, and final status.

## Future Scheduling Flow

1. Creator Flow supplies the selected local date and time.
2. The adapter converts it to an unambiguous ISO timestamp before calling Quick Publishing.
3. Quick Publishing validates the command shape and ensures the current Caption draft.
4. It calls `POST /api/scheduled-posts` for each selected platform.
5. Per-platform and aggregate outcomes are projected to the view.

Backend validation remains authoritative for future-time requirements and resource access.

## Multi-Platform Outcome Policy

Generation, publication, and scheduling isolate failures by platform. Successful operations are not rolled back when a sibling fails.

- Complete success: every requested platform succeeds.
- Partial success: at least one succeeds and at least one fails.
- Complete failure: no requested platform succeeds.

The view redirects to the content calendar only after complete publication or scheduling success. Partial success remains on the current screen and identifies failed platforms so the user can retry deliberately.

Missing drafts or Caption IDs count as failures. They are never silently skipped and can never produce a success toast.

## Error Policy

Quick Publishing exposes stable safe error codes and limited context such as operation, platform, variant ID, and HTTP status. It never stores raw provider payloads, source content, Prompt text, credentials, or Supabase errors in browser state.

Required behavior:

- generation failure preserves successful sibling results;
- stale partial selection preserves the current editor and clears no content;
- locked Caption conflicts prevent edit and regeneration;
- source or Caption persistence failure prevents publication for that platform;
- immediate publication and scheduling distinguish partial success from complete success;
- redirect and global success toast occur only for complete success;
- abort is not presented as a provider failure.

## Testing Strategy

### Quick Publishing module tests

- selected and skipped Preset generation commands;
- SSE content and real Caption ID association;
- inline update before downstream actions;
- complete regeneration;
- UTF-16 partial regeneration command and result projection;
- stale-selection conflict preservation;
- immediate publication success and failure;
- future scheduling success and failure;
- missing Caption ID as a failure;
- multi-platform partial-success aggregation.

### Browser HTTP adapter tests

- endpoint, HTTP method, and JSON body for edit, regeneration, publish-now, and schedule;
- existing generation SSE parsing and abort forwarding;
- successful response normalization;
- typed safe error mapping for `400`, `403`, `404`, `409`, and `5xx` responses.

### Creator Flow adapter tests

- source and Preset snapshots passed to Quick Publishing;
- generated content and Caption ID stored under the correct platform;
- inline editor state retained until persistence succeeds;
- full and partial regeneration update only the active draft;
- selection offsets and selected text remain consistent;
- complete, partial, and failed publication/scheduling states;
- no redirect or complete-success result for skipped or failed platforms.

### Focused UI tests

- existing complete-regeneration button behavior;
- selected-text popover partial regeneration;
- inline edit projection;
- immediate publication action;
- future date/time scheduling action;
- partial-success and stale-selection feedback.

### Verification

- focused frontend module and UI tests;
- Caption Generation, Caption Management, Platform Preset, and Scheduled Publishing contract tests;
- TypeScript checking;
- lint for changed files and repository lint when feasible;
- production Next.js build;
- full test suite, separating any documented pre-existing baseline failures.

## Migration Sequence

1. Add characterization tests for the current Creator Flow interactions.
2. Extend Quick Publishing types, events, errors, client interface, and in-memory test adapter.
3. Implement Caption edit and regeneration adapters and module operations.
4. Implement immediate publication and aggregate publish outcomes.
5. Add Creator Flow state required for real Article and Caption identifiers plus UTF-16 selection ranges.
6. Replace generation mock calls with Quick Publishing generation and SSE projection.
7. Replace inline edit and regeneration mock calls.
8. Replace immediate publication and scheduling mock calls.
9. Remove silent-skip success paths.
10. Verify focused contracts, typecheck, lint, build, and full tests.

Each slice must leave unrelated presentation behavior intact. Compatibility mock implementations are removed only after confirming that no remaining caller depends on them.

## Success Criteria

- T-3.01-05 generates real, persisted platform Captions using the selected or explicitly skipped Preset and Step 2 source.
- T-3.01-06 persists inline edits and supports real complete and selected-range regeneration through the current UI interactions.
- T-3.01-07 publishes immediately or schedules through the existing backend interfaces using real Caption IDs.
- `AiCreatorView` and its step views contain no HTTP payload construction, SSE parsing, provider logic, or publishing workflow rules.
- Creator Flow no longer calls generation, regeneration, or publishing mocks for these tasks.
- Missing drafts cannot yield a success result.
- Multi-platform partial outcomes are represented accurately.
- Existing backend contracts and database schema remain unchanged.
- Focused tests, typecheck, lint, and production build pass apart from explicitly documented pre-existing failures.
