# Brand Style (Văn phong thương hiệu) Markdown Rules Design

## Overview
This specification outlines the redesign of the "Văn phong thương hiệu" (Brand Style) feature, shifting from a complex hybrid parameter form to a unified, rich Markdown text area. This aligns the brand style configuration with the highly successful "Platform Presets" approach, providing more flexibility for users and cleaner context for the Gemini AI.

## Architecture & Database Migration
We will upgrade the existing `prompt_configs` table without creating a new one to preserve foreign keys in the `captions` table.
- **SQL Migration**: Add a `rules` TEXT column to `prompt_configs`.
- **Data Migration**: Migrate existing parameters (`tone`, `length`, `custom_rules`/`emphasis`) into the new `rules` Markdown structure for backwards compatibility.
- **Param Retention**: Keep `params.variant_count` to control the number of variants generated.

## UI/UX Redesign
1. **Prompts View (`PromptsView.tsx`)**:
   - Remove Tone, Length, and Emphasis dropdowns/inputs in the Config Modal.
   - Introduce a large, glassmorphic `Textarea` for Markdown Brand Guidelines.
   - **Template Prefill**: When creating a new configuration, automatically inject a professional Markdown template (Persona, Xưng hô, Từ khuyên dùng, Từ cấm dùng).
   - In the Config Card grid, display a truncated preview of the `rules` column instead of the fragmented parameter chips.

2. **AI Creator View (`AiCreatorView.tsx`)**:
   - Update the "Manage" brand style modal to use the same unified Markdown Textarea.
   - When a Brand Style is selected, display a rich line-clamped preview of the rules.

## API & Prompt Engineering
1. **API Endpoints (`app/api/prompt-configs`)**:
   - Update `POST` and `PUT` handlers to accept and save the `rules` string.
2. **Generator Engine (`app/api/captions/generate/route.ts`)**:
   - Retrieve `rules` from the `prompt_configs` record.
   - Inject the rules directly into the `**Văn phong:**` section of the system prompt for Gemini.
3. **Frontend Preview (`compilePromptPreview` in `AiCreatorView.tsx`)**:
   - Update the client-side compilation logic to match the backend exactly, fetching `selectedStyle.rules` and displaying it in the prompt preview modal.
