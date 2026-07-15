# Speech Processing Backend Module Design

## Context

`POST /api/stt` currently owns authentication, multipart parsing, file validation, Groq Whisper transcription, Gemini correction, metadata generation, partial-failure behavior, provider configuration, logging, and HTTP response mapping in one Route Handler. This makes the workflow difficult to test without mocking transport details and exposes provider errors too close to the public API boundary.

The endpoint is used by the AI Creator workflow for both uploaded audio and bullets-only input. Its public response contract must remain compatible:

```json
{
  "transcript": "...",
  "rewritten_post": "...",
  "generated_title": "...",
  "generated_category": "...",
  "generated_tags": "..."
}
```

## Goals

- Move speech-processing behavior out of the Next.js Route Handler and into a focused backend module.
- Keep the current authenticated roles, endpoint, request format, response fields, 25 MB limit, supported media formats, and 120-second route duration.
- Preserve graceful partial success after a usable transcript exists.
- Isolate Groq Whisper and Gemini behind testable interfaces.
- Prevent provider responses, secrets, prompts, and transcript contents from leaking through public errors or operational logs.
- Correct configuration and input-validation behavior where the current route is unnecessarily coupled.

## Non-goals

- Adding persistence, queues, background processing, streaming responses, or usage accounting.
- Generalizing the work into a media-processing framework.
- Changing AI Creator UI behavior or the `/api/stt` wire contract.
- Replacing Groq Whisper, Gemini, or the existing Gemini key-rotation mechanism.
- Adding new transcription languages or changing the Vietnamese language hint.

## Chosen Approach

Create a `backend/modules/speech-processing/` workflow with separate provider adapters, pure input validation, typed domain errors, and a thin HTTP adapter. This provides explicit boundaries without introducing a generic abstraction that the current product does not need.

A minimal single-file service extraction was rejected because it would only relocate the existing coupling. A generalized media pipeline was rejected because there is no demonstrated requirement for multiple media workflows and its extension points would be speculative.

## Architecture

### SpeechProcessingModule

`SpeechProcessingModule.process(input)` owns the application flow. It depends only on a transcription gateway and an enrichment gateway. It does not import Next.js, provider SDKs, environment variables, or database clients.

The module:

1. Normalizes and validates the submitted file and bullets.
2. Uses Groq transcription only when a non-empty file is present.
3. Uses normalized bullets as the transcript when no file is present.
4. Rejects an empty transcript.
5. Runs correction and metadata generation concurrently.
6. Applies partial-success fallbacks independently.
7. Returns the transport-neutral result represented by the existing response fields.

### Validation and Schemas

`speech-processing-schemas.ts` contains pure normalization and validation:

- Trim bullets and treat empty strings as absent.
- Treat a zero-byte file as absent.
- Require at least one usable input.
- Accept `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/webm`, `audio/ogg`,
  `audio/x-m4a`, `video/mp4`, `video/webm`, and `video/quicktime`. MIME values
  beginning with the existing audio variants remain compatible when they carry
  codec parameters.
- Reject files larger than 25 MB.
- Produce typed validation errors rather than HTTP responses.

Multipart parsing remains at the HTTP edge because `request.formData()` is a transport concern. A malformed multipart body maps to a stable `400` response.

### GroqWhisperAdapter

The Groq adapter implements a `SpeechTranscriber` port. It owns:

- `GROQ_API_KEY` resolution when transcription is invoked.
- Construction of the multipart request.
- The `whisper-large-v3-turbo` model, Vietnamese language hint, and text response format.
- Trimming the transcription result.
- Converting configuration and provider failures into typed internal errors.

The module never invokes this adapter for bullets-only input, so a missing Groq key does not block that workflow. The adapter may read a failed provider response to classify it, but retains only sanitized status and operation context. Raw provider response bodies are not placed in error causes, logs, or client messages.

### GeminiSpeechEnrichmentAdapter

The Gemini adapter implements a `SpeechEnricher` port with two independent operations:

- `correct(transcript)` corrects spelling, punctuation, and filler words without changing meaning or adding content.
- `generateMetadata(content)` proposes title, category, and tags.

Both operations continue to use `executeWithRotation` and the official Gemini SDK. The correction temperature remains `0.2`; metadata temperature remains `0.7`.

Metadata parsing removes optional Markdown code fences, requires a JSON object, accepts only string values, and normalizes surrounding whitespace. Invalid output returns empty metadata rather than failing the completed transcription.

### Errors and HTTP Adapter

`speech-processing-errors.ts` defines errors with a stable code, HTTP status, safe client message, optional cause, and non-sensitive diagnostic context.

`app/api/stt/_adapter.ts` constructs the module and maps known errors to `NextResponse`. Unexpected errors are logged server-side and return a generic message. The Route Handler retains `maxDuration = 120`, authenticates the existing roles, parses `FormData`, calls the module, and returns JSON.

## Data Flow

### Audio input

1. Authenticate the user.
2. Parse multipart form data.
3. Validate file MIME and size.
4. Transcribe the file through Groq Whisper.
5. If the trimmed transcript is empty, return `422`.
6. Run correction on the transcript and metadata generation on the transcript plus optional bullets.
7. Return the compatible response.

### Bullets-only input

1. Authenticate the user.
2. Parse and normalize bullets.
3. Skip Groq entirely, including Groq configuration checks.
4. Use bullets as the transcript.
5. Run correction and metadata generation concurrently.
6. Pass bullets to metadata only once rather than concatenating the same content twice.
7. Return the compatible response.

### Mixed audio and bullets input

The audio transcription remains the only correction input so correction cannot synthesize content from notes. Metadata generation receives the transcript and the separate bullets as additional context.

## Partial-success Policy

Once a usable transcript exists, enrichment failures do not fail the request:

- Correction failure uses the original transcript as `rewritten_post`.
- Metadata failure returns empty `generated_title`, `generated_category`, and `generated_tags`.
- Either enrichment operation may succeed independently of the other.

Transcription failure is not recoverable when no bullets-only fallback is being used. The module does not silently substitute bullets when an explicitly submitted audio file fails, preserving the current processing semantics.

## Error and Security Policy

- `400 Bad Request`: malformed multipart input, no usable file or bullets, unsupported MIME type, or file larger than 25 MB.
- `422 Unprocessable Entity`: transcription completes without meaningful text.
- `500 Internal Server Error`: required Groq configuration is unavailable or transcription cannot complete.
- Enrichment errors after transcription follow the partial-success policy and do not change the successful status.

Public errors never include raw Groq response bodies, Gemini/key-rotation errors, stack traces, API keys, or provider configuration details beyond the stable product message. Logs identify the failed operation and may include provider status, MIME type, and file size, but exclude file contents, full filenames, audio data, transcript text, user bullets, prompts, and secrets.

Authentication remains in the Route Handler through `requireUserWithRole` for `admin`, `marketer_full`, and `marketer_content`. The module has no privileged database client and performs no persistence.

## Testing Strategy

### Validation tests

- Reject missing file and bullets.
- Reject unsupported MIME types.
- Reject files over 25 MB.
- Treat a zero-byte file as absent.
- Accept each currently supported media MIME family.
- Normalize bullets consistently.

### Module tests

- Bullets-only processing never calls the transcriber.
- Audio processing calls the transcriber exactly once.
- Empty transcription produces `422`.
- Correction and metadata receive their intended inputs.
- Bullets-only metadata input is not duplicated.
- Correction and metadata failures fall back independently.
- A successful result matches the existing response structure.

### Adapter tests

- Groq requests use the expected endpoint, model, language, response format, and authorization header.
- Missing Groq configuration is detected only when transcription is invoked.
- Groq provider bodies are not exposed as client messages.
- Gemini calls use key rotation, prompts, and temperatures appropriate to each operation.
- Metadata parsing accepts valid fenced or unfenced JSON and safely rejects malformed output.

### Route tests

- Preserve authentication and role checks.
- Map malformed multipart bodies to `400`.
- Map typed module errors to their stable status and message.
- Preserve the response field names and successful JSON shape.
- Avoid tests that depend on incidental global-fetch ordering across both providers.

## Completion Criteria

- The Route Handler is a thin Next.js adapter and retains `maxDuration = 120`.
- Provider and orchestration behavior lives under `backend/modules/speech-processing/`.
- The old route-level provider helpers are removed.
- Focused tests and direct ESLint pass.
- Typecheck and full-suite verification introduce no failures beyond documented repository baselines.
- `CONTEXT.md` and `docs/CHANGELOG.md` describe the new domain boundary and safety improvements during implementation.
