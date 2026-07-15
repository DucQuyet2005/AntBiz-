# Domain Context

## Caption Generation

Caption Generation is the workflow that turns one stored or crawled article into a draft social caption. It resolves Platform Presets, Brand Style configuration, and an optional Prompt Library instruction; streams generated text from Gemini; enforces platform limits; and persists a valid caption with variant metadata.

The public HTTP transport for Caption Generation is currently Server-Sent Events (SSE), but SSE formatting is not part of the domain workflow.

## Prompt Configuration Assistance

Prompt Configuration Assistance helps a marketer configure content generation before creating a caption. It contains two workflows: Article Configuration Analysis proposes Tone, Length, and Emphasis from article content; Wizard Prompt Generation turns explicit platform and style choices into a reusable prompt template.

These workflows use Gemini today, but model SDK details and HTTP response formatting are not part of the domain concept.
