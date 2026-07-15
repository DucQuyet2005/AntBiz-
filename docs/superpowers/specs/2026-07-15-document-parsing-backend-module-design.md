# Document Parsing Backend Module Design

## Context

`POST /api/parse-doc` currently owns authentication, multipart parsing, file-format validation, DOCX extraction through Mammoth, PDF extraction through Gemini, model fallback, logging, and HTTP error mapping in one Route Handler. The endpoint is used by the AI Creator workflow to turn an uploaded document into editable source text.

The public success contract must remain compatible:

```json
{
  "text": "..."
}
```

The current implementation also accepts the legacy `.doc` extension even though Mammoth reliably extracts DOCX files rather than the older binary DOC format. The HTTP error text already describes `.pdf` and `.docx` as the supported formats. The new module makes that effective contract explicit and rejects `.doc`.

## Goals

- Move document-parsing behavior out of the Next.js Route Handler and into a focused backend module.
- Keep the current authenticated roles, endpoint, multipart field, success response, and 60-second route duration.
- Support PDF and DOCX inputs with explicit format validation.
- Isolate Mammoth and Gemini behind testable interfaces.
- Preserve Gemini model fallback for retryable quota and rate-limit failures.
- Return stable public errors without exposing provider responses, prompts, API keys, stack traces, or document contents.

## Non-goals

- Supporting legacy `.doc`, TXT, ODT, spreadsheets, presentations, or additional formats.
- Adding document persistence, queues, background processing, streaming, or usage accounting.
- Replacing Mammoth or Gemini with another extraction provider.
- Changing the AI Creator UI or the `/api/parse-doc` wire contract.
- Building a generic plugin registry for hypothetical future extractors.

## Chosen Approach

Create a `backend/modules/document-parsing/` workflow with a small `DocumentParsingModule.parse(input)` interface, pure validation, typed errors, and separate DOCX and PDF extractor adapters. Keep authentication, `request.formData()`, and `NextResponse` mapping in a thin HTTP adapter beside the Route Handler.

A single-file relocation was rejected because it would preserve the existing coupling between validation, provider behavior, orchestration, and HTTP concerns. A generalized extractor registry was rejected because only two formats are required and speculative extension points would make the interface shallower.

## Architecture

### DocumentParsingModule

`DocumentParsingModule.parse(input)` owns the transport-neutral workflow. It depends on one DOCX extractor and one PDF extractor and does not import Next.js, Mammoth, environment variables, or provider-specific HTTP details.

The module:

1. Normalizes and validates the uploaded document.
2. Selects the extractor from the normalized filename extension.
3. Reads the uploaded bytes once.
4. Calls the selected extractor exactly once.
5. Trims the extracted text.
6. Rejects a result without meaningful text.
7. Returns the text in a transport-neutral result.

The module interface stays deliberately narrow. Callers do not choose Gemini models, configure retry behavior, or know how either document format is parsed.

### Validation and Input

`document-parsing-schemas.ts` contains pure input normalization and validation:

- Require the multipart `file` field to contain a file-like value.
- Require a non-empty filename.
- Match extensions case-insensitively.
- Accept only `.pdf` and `.docx`.
- Reject `.doc` and every other extension with `400 Bad Request`.
- Reject an empty upload with `400 Bad Request` before invoking an extractor.

Extension is the compatibility discriminator because the existing endpoint uses it and browser-provided MIME values are not consistently reliable. MIME may be retained as non-sensitive diagnostic context, but it does not expand the accepted format set.

Multipart parsing remains at the HTTP edge because `request.formData()` is a transport concern. A malformed multipart body maps to a stable `400` response.

### MammothDocxExtractor

The Mammoth adapter implements the DOCX extraction interface. It owns:

- Passing the uploaded bytes to `mammoth.extractRawText`.
- Normalizing Mammoth's result into plain text.
- Recording only the count of non-fatal Mammoth messages when diagnostics are useful.
- Converting extraction failures into a typed internal error.

Logs exclude filenames, document bytes, extracted text, and Mammoth message bodies because these may contain user content or document details.

### GeminiPdfExtractor

The Gemini adapter implements the PDF extraction interface. It owns:

- Resolving `GEMINI_API_KEY` only when a PDF is parsed.
- Base64 encoding the PDF for Gemini's inline document input.
- Sending the existing extraction instruction with temperature `0.1`.
- Trying the configured `GEMINI_MODEL` first and then the current fallback model list, with duplicates removed.
- Continuing to the next model only for retryable quota or rate-limit failures.
- Stopping immediately for non-retryable provider failures.
- Parsing and trimming text from the provider response.
- Converting configuration, malformed-response, and provider failures into typed internal errors.

The adapter may inspect a failed provider response to classify it, but raw response bodies are not retained in thrown errors, operational logs, or public messages. The model name and HTTP status are sufficient non-sensitive diagnostic context.

### Errors and HTTP Adapter

`document-parsing-errors.ts` defines errors with a stable code, HTTP status, safe client message, optional cause, and non-sensitive diagnostic context.

`app/api/parse-doc/_adapter.ts` constructs the module, maps known errors to `NextResponse`, and converts the module result to `{ text }`. Unexpected errors are logged without user content and return a generic message.

The Route Handler retains `maxDuration = 60`, authenticates the existing roles (`admin`, `marketer_full`, and `marketer_content`), parses `FormData`, calls the module, and returns JSON. It remains on the default Node.js runtime because Mammoth and `Buffer` require Node-compatible behavior.

## Data Flow

### DOCX input

1. Authenticate the user.
2. Parse the multipart body.
3. Validate the file and `.docx` extension.
4. Read the uploaded bytes once.
5. Extract raw text through Mammoth.
6. Trim the result and reject empty text with `422`.
7. Return `{ text }`.

### PDF input

1. Authenticate the user.
2. Parse the multipart body.
3. Validate the file and `.pdf` extension.
4. Read the uploaded bytes once.
5. Resolve Gemini configuration and submit the PDF.
6. On quota or rate limiting, try the next unique configured fallback model.
7. Trim the result and reject empty text with `422`.
8. Return `{ text }`.

## Error and Security Policy

- `400 Bad Request`: malformed multipart input, missing file, empty upload, missing filename, or unsupported extension.
- `422 Unprocessable Entity`: an accepted document is processed but produces no meaningful text.
- `500 Internal Server Error`: required Gemini configuration is missing or an extractor cannot complete.

Authentication failures retain the existing behavior from `requireUserWithRole`. Public errors never include Gemini response bodies, provider URLs containing keys, prompts, stack traces, uploaded bytes, extracted text, or filenames.

Operational logs may include the stable error code, extractor kind, model name, HTTP status, MIME type, and byte count. They exclude document contents, full filenames, provider response bodies, prompts, and secrets.

DOCX parsing does not require Gemini configuration. A missing `GEMINI_API_KEY` therefore affects PDF input only.

## Testing Strategy

### Validation tests

- Reject a missing multipart file value.
- Reject a value that is not file-like.
- Reject empty uploads and filenames.
- Accept `.pdf` and `.docx` case-insensitively.
- Reject `.doc` and unsupported extensions.
- Do not accept a format solely because its MIME type looks supported.

### Module tests

- DOCX input calls only the DOCX extractor.
- PDF input calls only the PDF extractor.
- Uploaded bytes are read once and passed intact to the selected extractor.
- Extracted text is trimmed.
- Empty extracted text produces `422`.
- Extractor failures retain typed error behavior without leaking content.

### Adapter tests

- Mammoth receives the expected buffer and returns its raw text result.
- Mammoth diagnostic logging excludes message bodies and document identity.
- Gemini receives the expected inline PDF payload, extraction instruction, and temperature.
- The configured model is attempted first and duplicate fallback models are removed.
- Quota and rate-limit failures advance to the next model.
- Non-retryable failures stop fallback immediately.
- Missing Gemini configuration is detected only for PDF extraction.
- Provider bodies and API keys are absent from public errors and logs.

### Route tests

- Preserve authentication and role checks.
- Map malformed multipart bodies to `400`.
- Preserve `maxDuration = 60` and the `{ text }` success shape.
- Map typed errors to their stable statuses and messages.
- Keep provider and Mammoth details out of Route Handler tests by testing through the module interface.

## Documentation

Implementation adds **Document Parsing** to `CONTEXT.md` as the workflow that turns an authenticated user's PDF or DOCX upload into plain source text for content creation. Provider SDKs, file decoding, multipart parsing, and HTTP response formatting remain adapters around that workflow.

The implementation entry in `docs/CHANGELOG.md` will record the new backend module, explicit `.pdf`/`.docx` support, and sanitized extraction errors.

## Completion Criteria

- The Route Handler is a thin Next.js adapter and retains `maxDuration = 60`.
- Document validation and orchestration live under `backend/modules/document-parsing/`.
- Mammoth and Gemini behavior live in focused adapters behind module interfaces.
- The old route-level Gemini helper and parsing branches are removed.
- `.doc` is rejected consistently with the documented supported formats.
- Focused tests, direct ESLint, and typecheck pass.
- Full-suite verification introduces no failures beyond documented repository baselines.
- `CONTEXT.md` and `docs/CHANGELOG.md` describe the new domain module and compatibility decision.
