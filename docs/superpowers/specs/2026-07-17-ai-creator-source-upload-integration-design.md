# AI Creator Source Upload Integration Design

## Goal

Replace the simulated source-upload behavior in AI Creator with the existing authenticated backend workflows for speech processing, document parsing, and manual article ingestion.

The completed Step 2 flow must turn a supported user source into a persisted Article before allowing the creator wizard to continue.

## Scope

This change covers four source-entry behaviors in `components/views/creator-flow/Step2Article.tsx`:

- Audio upload.
- PDF and DOCX upload.
- TXT upload.
- Manually written title and content.

Image upload is removed from this source-ingestion area. Image OCR and post-media attachment are separate workflows and are not part of this change.

The simulated news-site explorer and its packaged article cards are outside this scope. They may continue to provide URLs to the existing Article Ingestion workflow.

## Existing Backend Interfaces

The implementation reuses these existing authenticated Route Handlers:

- `POST /api/stt`: accepts multipart `file`, transcribes audio through Speech Processing, and returns `transcript`, `rewritten_post`, and generated metadata.
- `POST /api/parse-doc`: accepts multipart `file`, extracts text from PDF or DOCX through Document Parsing, and returns `text`.
- `POST /api/scrape`: accepts a manual Article JSON payload and persists it through Article Ingestion.

No new Route Handler or backend domain module is required.

## Architecture

`Step2Article` remains a presentation adapter. It owns drag state, the selected tab, local file-list presentation, preview state, and user-facing error rendering.

`frontend/modules/creator-flow` owns the browser-side workflow:

1. Validate and classify the selected file for immediate user feedback.
2. Send audio or documents to the appropriate processing endpoint.
3. Read TXT content locally.
4. Convert the processed text into a manual Article command.
5. Persist that Article through the existing Article Ingestion endpoint.
6. Project the persisted Article into Creator Flow state.

The frontend module does not import backend implementations. Backend validation and authorization remain authoritative.

## Public Frontend Interface

`CreatorFlowClient` gains small transport methods for the existing HTTP contracts:

- `processSpeech(file)` returns normalized source text and optional generated metadata.
- `parseDocument(file)` returns extracted source text.

The Creator Flow context exposes workflow operations suitable for the view:

- `uploadSourceFile(file)` processes and persists a supported file and returns presentation metadata for the uploaded-file list.
- `submitManualArticle(title, content)` validates lightweight client requirements, persists the Article, and updates Creator Flow state.

Transport response normalization and error-code mapping stay in the client/module files, not in the React view.

## Data Flows

### Audio

1. The user selects a supported audio file.
2. Creator Flow sends it as multipart data to `/api/stt`.
3. The workflow chooses non-empty `rewritten_post`, falling back to `transcript`.
4. Generated title is used when present; otherwise the filename without its extension is used.
5. The normalized text is sent to `/api/scrape` as a manual Article.
6. Only after persistence succeeds does Creator Flow set `articleId`, `articleContext`, and `crawlStatus: done`.

Audio runtime operation requires `GROQ_API_KEY`. Missing provider configuration must surface as an operation error and must not create an Article containing placeholder text.

### PDF and DOCX

1. Creator Flow sends the file as multipart data to `/api/parse-doc`.
2. The extracted non-empty text is sent to `/api/scrape` using the filename stem as the title.
3. After persistence succeeds, the document appears in the real uploaded-file list and its extracted content is available for preview.

### TXT

1. Creator Flow reads the file with the browser `File.text()` interface.
2. Empty or whitespace-only text is rejected.
3. The text is persisted through `/api/scrape` using the filename stem as the title.

TXT does not pass through Document Parsing because that backend contract intentionally supports only PDF and DOCX.

### Manual writing

1. The user enters a title and source content.
2. A visible submit action invokes `submitManualArticle`.
3. Empty title or content is rejected before transport for immediate feedback.
4. Article Ingestion performs authoritative validation and persistence.
5. Successful persistence completes Step 2.

## Supported Files

The file picker advertises only formats the workflow handles:

- Audio types accepted by Speech Processing: MP3, MP4/M4A audio, WAV, OGG, and WebM.
- Documents: PDF and DOCX.
- Plain text: TXT.

Legacy `.doc` and images are no longer accepted. The browser hint is not a security boundary; backend schemas retain final validation.

The UI processes one source file at a time because Step 2 produces one active Article for the downstream caption workflow.

## UI State and Feedback

- Remove pre-populated audio and document rows.
- Remove the artificial one-second upload delay.
- Remove fixed transcript and document text.
- Show a busy state while processing and persisting the selected source.
- Disable duplicate submission while an operation is active.
- Show the processed file only after the full workflow succeeds.
- Preserve extracted document content for preview.
- Provide a clear manual-submit button in the `Tự viết` tab.
- Keep the current wizard completion rule: Step 2 is valid only with a persisted `articleId`, an `articleContext`, and `crawlStatus: done`.

Selecting or typing another source does not silently claim success. Completion state changes only after the newest submitted source is persisted.

## Error Handling

The frontend client maps non-success responses to stable Creator Flow errors while retaining server-provided safe messages when available.

Failures include:

- Unsupported extension or media type.
- Empty TXT or manual content.
- File-size rejection by Speech Processing.
- Authentication or authorization failure.
- Missing Groq or Gemini configuration.
- Speech provider, PDF extraction, or DOCX extraction failure.
- Manual Article persistence failure.
- Malformed or empty success responses.

On failure:

- `crawlStatus` becomes `error`.
- No placeholder Article is submitted.
- No successful uploaded-file row is added.
- The user can correct the input and retry.
- The wizard cannot continue from Step 2.

## Testing

### Frontend client tests

- Audio sends multipart data to `/api/stt` and normalizes rewritten/transcript fallback behavior.
- Document sends multipart data to `/api/parse-doc` and requires non-empty text.
- Safe server errors are mapped without relying on provider response internals.

### Creator Flow tests

- Successful audio processing persists the resulting manual Article and completes Step 2.
- Successful PDF, DOCX, and TXT processing persists extracted content.
- Failed processing does not call Article Ingestion.
- Failed persistence does not complete Step 2.
- Manual writing persists the entered title and content.

### Component behavior tests

- The initial uploaded-file list is empty.
- The file picker no longer accepts images or `.doc`.
- Manual writing has an explicit submit action.
- Busy and error feedback are visible.

### Verification

- Run targeted Vitest suites for Creator Flow, Speech Processing, Document Parsing, and Article Ingestion.
- Run the project typecheck.
- Run lint for all touched files or the project lint command when practical.

Provider adapters remain covered with mocked external boundaries in automated tests. A live audio smoke test additionally requires a valid `GROQ_API_KEY`; passing unit and contract tests alone does not prove external provider availability.

## Non-goals

- Image OCR or media-library persistence.
- Multiple-file ingestion or merging multiple sources into one Article.
- Changing Speech Processing, Document Parsing, or Article Ingestion HTTP contracts.
- Persisting original uploaded binaries.
- Refactoring unrelated legacy UI or the simulated site explorer.
