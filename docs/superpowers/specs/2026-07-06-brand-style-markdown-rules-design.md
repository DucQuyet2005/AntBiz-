# Brand Style (Văn phong thương hiệu) Tabbed Markdown Rules Design

## Overview
This specification outlines the redesign of the "Văn phong thương hiệu" (Brand Style) feature, shifting from a platform-strict, fragmented parameter form to a unified **Tabbed Markdown/JSON** structure. This allows users to create a single Brand Style that applies to all platforms (`platform = 'all'`), while maintaining the ability to define platform-specific overrides (Facebook, Threads, Instagram) safely without token bloat.

## Architecture & Database Migration
- **SQL Migration**: 
  - Add `'all'` to the `platform_type` ENUM to allow platform-agnostic brand styles.
  - (Previously completed) Added a `rules` TEXT column to `prompt_configs`.
- **Data Structure**: The `rules` column will store a stringified JSON object:
  ```json
  {
    "general": "Core identity, personas, words to avoid",
    "facebook": "Facebook specific overrides",
    "threads": "Threads specific overrides",
    "instagram": "Instagram specific overrides"
  }
  ```
- **Backward Compatibility**: If `rules` contains plain Markdown (not starting with `{`), the system treats it as the `general` property.

## UI/UX Redesign
1. **Prompts View (`PromptsView.tsx`)**:
   - Platform Dropdown now includes a "Tất cả nền tảng (All Platforms)" option (`all`).
   - The single `Textarea` for `rules` is replaced with a **Tabbed Editor**:
     - Tabs: `Quy tắc chung`, `Facebook`, `Threads`, `Instagram`.
     - State is managed as a JSON object and stringified on save.
   - Config Card preview elegantly parses the JSON and displays the `general` section as a preview.

2. **AI Creator View (`AiCreatorView.tsx`)**:
   - The Config selector filters and displays styles where `platform === currentPlatform` OR `platform === 'all'`.
   - The client-side preview `compilePromptPreview` parses the JSON and slices only the `general` + `currentPlatform` rules to show the user exactly what the AI will see.
   - **Contextual Inline Actions**: The old generic "Manage" button is replaced with contextual actions next to the Brand Style select dropdown:
     - If NO style is selected: Shows a `+ Tạo mới` (Create New) button.
     - If a style IS selected: Shows `Sửa` (Edit), `Xóa` (Delete), and `+` (Create New) buttons.
     - Clicking Edit or Create opens the Tabbed Editor Modal directly within the AI Creator view, allowing seamless CRUD without leaving the page.

## API & Prompt Engineering
1. **API Endpoints (`app/api/prompt-configs`)**:
   - Update Zod schemas to accept `'all'` in the `platform` enum.
2. **Generator Engine (`app/api/captions/generate/route.ts`)**:
   - When generating a caption for a specific `platformKey` (e.g. `facebook`), the backend fetches the Brand Style config by ID.
   - It parses the `rules` column (JSON).
   - It concatenates `rules.general` + `rules[platformKey]`.
   - It discards rules for other platforms, ensuring maximum **Token Efficiency** and **Instruction Focus**.
   - Injects the concatenated markdown into the `**Văn phong:**` section of the system prompt.
