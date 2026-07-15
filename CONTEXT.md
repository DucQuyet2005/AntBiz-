# Domain Context

## Caption Generation

Caption Generation is the workflow that turns one stored or crawled article into a draft social caption. It resolves Platform Presets, Brand Style configuration, and an optional Prompt Library instruction; streams generated text from Gemini; enforces platform limits; and persists a valid caption with variant metadata.

The public HTTP transport for Caption Generation is currently Server-Sent Events (SSE), but SSE formatting is not part of the domain workflow.
