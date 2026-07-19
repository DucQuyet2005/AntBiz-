# Resolve AngAng Merge Conflicts

## Goal

Resolve the merge conflicts in `app/api/scheduled-posts/route.ts` and
`components/views/AiCreatorView.tsx` without reverting the modular Quick
Publishing and Scheduled Publishing architecture already present on `HEAD`.

## Resolution Strategy

Treat the current `HEAD` implementation as the architectural source of truth.
Keep independent changes from `AngAng` only when they do not duplicate existing
module behavior, expand the public contract, or move business workflows back
into presentation and HTTP adapter files.

## Scheduled Posts Route

Keep the Route Handler as a thin transport adapter. Authentication, input
handling, scheduling rules, persistence, supporting notification effects, and
immediate-publication orchestration remain behind the public Scheduled
Publishing module interface exposed through `app/api/scheduled-posts/_adapter`.
Do not restore the legacy inline database queries, notification creation, or
scheduler invocation from `AngAng`.

## AI Creator View

Keep the three-step Quick Publishing flow and the `useQuickPublishing` module
interface from `HEAD`. Do not restore the legacy five-step workflow or direct
caption-generation, draft-persistence, and scheduling requests that duplicate
the frontend module.

Retain an `AngAng` validation or presentation-only change only if inspection
shows that the modular workflow does not already provide equivalent behavior
and the change can be added without introducing a second scheduling path.

## Compatibility and Scope

- Preserve the existing public HTTP response shape and module interfaces.
- Do not refactor unrelated legacy code or modify other files involved in the
  merge.
- Preserve unrelated user changes already present in the working tree.
- Do not move code between architectural layers as part of conflict resolution.

## Verification

1. Confirm both conflicted files contain no merge markers and Git no longer
   reports them as unmerged.
2. Run focused tests for Scheduled Publishing and Quick Publishing when
   available.
3. Run TypeScript checking and the project build in proportion to the available
   environment.
4. Inspect the final diff to ensure only conflict resolution and any necessary
   compatibility adjustment were introduced.
