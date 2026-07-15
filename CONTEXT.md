# Domain Context

## Caption Generation

Caption Generation is the workflow that turns one stored or crawled article into a draft social caption. It resolves Platform Presets, Brand Style configuration, and an optional Prompt Library instruction; streams generated text from Gemini; enforces platform limits; and persists a valid caption with variant metadata.

The public HTTP transport for Caption Generation is currently Server-Sent Events (SSE), but SSE formatting is not part of the domain workflow.

## Prompt Configuration Assistance

Prompt Configuration Assistance helps a marketer configure content generation before creating a caption. It contains two workflows: Article Configuration Analysis proposes Tone, Length, and Emphasis from article content; Wizard Prompt Generation turns explicit platform and style choices into a reusable prompt template.

These workflows use Gemini today, but model SDK details and HTTP response formatting are not part of the domain concept.

## Caption Management

Caption Management owns the lifecycle of an existing caption: creation outside the generation stream, listing and retrieval, human editing, status transitions, restoring edited content as the new original, favorite-template state, and version history.

Caption version history is supporting audit data. Version-write failures do not invalidate an otherwise successful caption create or update.

## Article Ingestion

Article Ingestion brings source material into AntBiz either by crawling a safe public URL or by accepting manually written content. It classifies crawled pages as an Article or Listing, normalizes article metadata, and attempts to persist reusable Article records.

Crawled content remains usable when persistence fails; manual content is considered successfully ingested only after it is stored.

## Author Profile

An Author Profile represents a user's reusable writing-style reference. It has an owner, a unique name within that owner's profiles, an optional public source URL, collected style samples, and a collection status.

Style Sample Collection safely crawls the Author Profile's source and stores up to five distinct article texts for few-shot prompting. It does not train or create a model. The existing `train` transport name and `tuning_*` database fields remain compatibility terms only.
