# Prompt Config AI Backend Module Design

**Date:** 2026-07-15
**Status:** Approved for implementation planning

## Objective

Extract the two Prompt Configuration Assistance workflows from Next.js Route Handlers into the existing Prompt Config backend area. Preserve Article Configuration Analysis fail-soft behavior and Wizard Prompt Generation output while concentrating prompt construction, Gemini invocation, parsing, defaults, and error policy behind a small interface.

The migration includes one approved behavior correction: a malformed JSON body sent to `from-wizard` returns `400` instead of falling through to a catch-all `500`.

## Domain Language

`CONTEXT.md` defines **Prompt Configuration Assistance** as two related workflows:

- **Article Configuration Analysis** proposes Tone, Length, and Emphasis from article title and content.
- **Wizard Prompt Generation** converts explicit platform, Tone, Length, Emphasis, and variant choices into a reusable prompt template.

Gemini and HTTP are implementation details, not part of these domain concepts.

## Scope

### Included

- `POST /api/prompt-configs/analyze`
- `POST /api/prompt-configs/from-wizard`
- Analyze and Wizard validation schemas
- Existing prompt text and system instructions
- Gemini model selection from `GEMINI_MODEL`
- Direct API key selection from `GEMINI_API_KEY`
- Analyze JSON parsing and defaults
- Wizard text trimming
- Route contract and module tests

### Excluded

- Prompt Config CRUD/default routes
- Prompt Library routes
- Caption Generation
- Gemini key rotation
- Model-selection policy changes
- Prompt wording redesign
- Frontend changes
- Database changes or migrations
- A generic project-wide Gemini abstraction

## Selected Architecture

Extend the existing Prompt Config backend area:

```text
backend/modules/prompt-configs/
  prompt-config-ai-module.ts
  prompt-config-ai-schemas.ts
  prompt-config-ai-types.ts
  prompt-config-ai-prompts.ts
  prompt-config-ai-errors.ts
  gemini-prompt-config-adapter.ts

app/api/prompt-configs/
  _ai-adapter.ts
  analyze/route.ts
  from-wizard/route.ts
```

The module exposes two operations:

```ts
analyzeArticle(input): Promise<AnalyzedPromptConfig>
generateWizardPrompt(input): Promise<string>
```

The module imports no Next.js types and does not read environment variables. Production construction happens in `_ai-adapter.ts`.

Rejected alternatives:

- Create separate top-level modules for analysis and Wizard generation. Each would repeat Gemini configuration and offer little depth.
- Create a generic Gemini module whose callers supply arbitrary prompts and parsing rules. That interface would mirror the SDK, remain shallow, and leak implementation knowledge into Route Handlers.
- Add AI methods to the existing CRUD `PromptConfigModule`. The workflows share domain locality with Prompt Configs but have different dependencies and failure policies, so a sibling module keeps the CRUD interface small.

## Responsibilities

### Route Handlers

Both Route Handlers own only:

1. Authentication through `requireUserWithRole`.
2. Checking that `GEMINI_API_KEY` exists before reading the request body, preserving current precedence.
3. Reading JSON.
4. Applying module-owned schemas with the workflow-specific error policy.
5. Calling `PromptConfigAiModule`.
6. Mapping typed errors to HTTP responses.

They contain no `GoogleGenerativeAI` construction, model configuration, prompt copy, JSON parsing of model output, or default configuration values.

### Prompt Config AI Module

The module owns:

- Article Configuration Analysis prompt construction.
- Wizard Prompt Generation prompt construction.
- Analyze JSON parsing.
- Analyze field-level defaults.
- Analyze fail-soft fallback.
- Wizard output trimming.
- Converting Wizard Gemini failures into typed errors.

### Gemini Prompt Config Adapter

The production adapter wraps `@google/generative-ai`. It receives the API key and model name during construction and exposes one internal interface for generating text with:

- A system instruction
- A user instruction
- Optional JSON response mode

JSON mode maps to `generationConfig.responseMimeType = application/json`. Module tests use a fake adapter; adapter tests mock the SDK.

The adapter continues to use one `GEMINI_API_KEY`. Moving this workflow to key rotation requires a separate behavioral design.

### Prompt Definitions

System instructions and user-instruction builders live in `prompt-config-ai-prompts.ts`. Wording, allowed Tone values, Length choices, placeholders, strict-output instructions, and variant guidance remain unchanged.

## Input and Output Contracts

### Article Configuration Analysis

Input:

```text
title: string
content: string
```

Successful or fallback output:

```text
tone: string
length: string
emphasis: string
```

Defaults remain:

- Tone: `Chuyên nghiệp`
- Length: `Vừa (200-500 từ)`
- Emphasis: empty string

### Wizard Prompt Generation

Input:

- Platform: `facebook`, `instagram`, `thread`, or `threads`
- Tone: string
- Length: string
- Emphasis: string
- Variant count: integer from 2 through 3

Output remains `{ prompt: string }`. The module trims model output but does not normalize `thread` and `threads`; the selected value remains visible in the generated instruction.

## Data Flow

### Analyze

```text
authenticate
  -> require API key
  -> read and validate input
  -> build analysis instruction
  -> Gemini JSON mode
  -> parse JSON
  -> apply field defaults
  -> response
```

Any failure after the API-key check returns the complete default configuration with status `200`.

### From Wizard

```text
authenticate
  -> require API key
  -> read and validate input
  -> build Wizard instruction
  -> Gemini text mode
  -> trim output
  -> response
```

Validation and generation errors remain visible to the caller according to the mapping below.

## Error Handling

### Shared

- Auth failure: existing `requireUserWithRole` response.
- Missing `GEMINI_API_KEY`: `500` with the existing message.
- The API-key check occurs before body parsing, preserving the current precedence.

### Analyze

- Malformed JSON: `200` with defaults.
- Invalid title/content types: `200` with defaults.
- Gemini failure: `200` with defaults.
- Invalid Gemini JSON: `200` with defaults.
- Missing output fields: field-level defaults.

Failures are logged with workflow context before fallback.

### From Wizard

- Malformed JSON: approved correction to `400`.
- Invalid platform, missing fields, or variant count outside 2–3: `400`.
- Gemini or unexpected module failure: `500` with the existing error-message behavior.

## Testing Strategy

### Module Tests

Add `__tests__/backend/prompt-configs/promptConfigAiModule.test.ts` covering:

- Analyze success
- Analyze missing-field defaults
- Analyze invalid JSON fallback
- Analyze Gemini failure fallback
- Wizard prompt inputs and system instruction
- Wizard output trimming
- Wizard Gemini failure as a typed error
- `thread` and `threads` preservation

### Adapter Tests

Add focused tests for:

- Configured model name
- Default `gemini-2.5-flash` model name
- System instruction forwarding
- JSON response mode for Analyze
- Text response mode for Wizard

### Route Contract Tests

Add or refocus tests for:

- Auth response
- Missing API key
- Analyze malformed body fallback
- Analyze success response
- Wizard malformed body `400`
- Wizard schema validation `400`
- Wizard success response
- Typed and unexpected error mapping

`promptWizard.test.ts` will no longer simulate Prompt Config CRUD through a broad Supabase mock. CRUD behavior is covered by the existing Prompt Config module tests, while Wizard tests exercise the same AI module interface used by the Route Handler.

### Verification

Run:

```text
npm test -- __tests__/api/promptWizard.test.ts __tests__/api/promptConfigAnalyze.test.ts __tests__/backend/prompt-configs
npx eslint <changed files>
npx tsc -p <temporary scoped Prompt Config AI tsconfig>
```

Also run the full test suite and full TypeScript command. Existing failures in untouched areas are reported separately.

## Migration Sequence

1. Add schemas, types, typed errors, and defaults.
2. Move prompt definitions into pure builders.
3. Add the Gemini production adapter and adapter tests.
4. Implement the Prompt Config AI module with fake-adapter tests.
5. Add `_ai-adapter.ts` for environment-based construction and HTTP error mapping.
6. Convert Analyze while preserving fail-soft behavior.
7. Convert From Wizard and apply the malformed-JSON `400` correction.
8. Refocus route tests away from Supabase CRUD mocks.
9. Verify no Gemini SDK or prompt construction remains in the migrated routes.
10. Run scoped and full verification.

## Success Criteria

- `backend/modules/prompt-configs/` owns both Prompt Configuration Assistance workflows.
- The AI module has two small domain operations and imports no Next.js types.
- Both Route Handlers contain no Gemini SDK construction, prompt text, model-output parsing, or defaults.
- Analyze retains fail-soft `200` behavior after the API-key check.
- From Wizard returns the approved `400` for malformed JSON.
- Existing API-key and success response contracts remain compatible.
- Module, adapter, and Route Handler tests cover both workflows.
- Scoped TypeScript and ESLint pass.
- Prompt Config CRUD, Caption Generation, UI, database, and the user's `.gitignore` change remain untouched.
