# Design Spec: Inline Preview Editor (WordPress-style) with Auto-Save

## 1. Introduction & Requirements
As a Marketer, I want to edit variant caption content directly within the social media preview mockups in Step 2. Instead of clicking to open a separate editor modal or form, I should be able to click on any text block on the screen, have it transform into an active editing field (similar to the WordPress Gutenberg block editor), and type directly on the screen.

### High-level Requirements:
1. **Component Inline Rich-Text Editor**: Click on the caption content within the mockup (Facebook, Threads, Instagram) to toggle editing mode inline.
2. **Formatting & Actions Toolbar**: An inline/floating toolbar providing formatting tools:
   - **Bold** (Unicode Bold translation for social media)
   - **Italic** (Unicode Italic translation for social media)
   - **Emoji Picker** (dropdown panel with popular emojis)
   - **Lưu nháp** (Manual save draft CTA)
   - **Lưu thay bản gốc** (Overwrite the AI base content)
3. **API Auto-Save**: Auto-save user edits to the database with a 2-second debounce.
   - If the caption has not yet been saved to the database, a `POST /api/captions` request is sent to create the caption record and obtain a `captionId`.
   - Subsequent changes call `PUT /api/captions/[id]`.
4. **UI Status Indicator**: Small real-time tag showing: `Đang lưu...`, `Đã lưu nháp`, `Đã lưu bản gốc`, `Lỗi lưu`, or `Bài viết đã đăng - Khóa chỉnh sửa`.
5. **Editing Lock**: Disable editing on both the frontend and backend if the caption status is `'scheduled'` or `'posted'`.
6. **Testing**: Unit tests for auto-save logic and integration tests for inline edit interaction.

---

## 2. API Changes

### `PUT /api/captions/[id]/route.ts`
We will update the payload schema and processing logic:
- **Schema Validation**:
  ```typescript
  const updateCaptionSchema = z.object({
    edited_content: z.string().min(1).optional().nullable(),
    status: z.enum(['draft', 'edited', 'approved', 'scheduled', 'posted']).optional(),
    save_as_original: z.boolean().optional(),
    ai_content: z.string().optional()
  });
  ```
- **Edit Lock Guard**:
  ```typescript
  // Before processing the update
  if (existing.status === 'scheduled' || existing.status === 'posted') {
    return NextResponse.json(
      { error: 'Không thể chỉnh sửa bài viết đã được lên lịch hoặc đã đăng' },
      { status: 400 }
    );
  }
  ```
- **Save as Original Processing**:
  If `save_as_original === true`:
  - Update `ai_content` using the provided content.
  - Set `edited_content = null`.
  - Set `status = 'draft'` (as it matches the new AI content).
  - Update `updated_at` timestamp.

---

## 3. Component Architecture: `InlineRichTextEditor`

We will create a new component [InlineRichTextEditor.tsx](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/components/InlineRichTextEditor.tsx) or enhance the internal `EditableText` in [AiCreatorView.tsx](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/components/views/AiCreatorView.tsx).

Given the existing structure of `EditableText` in [AiCreatorView.tsx](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/components/views/AiCreatorView.tsx), enhancing it is highly unified and maintains context integrity. We will upgrade `EditableText` to:
- Be activated inline.
- Support toolbar formatting (Bold, Italic, Emoji).
- Control auto-save transitions by invoking either `POST /api/captions` (first save) or `PUT /api/captions/[id]` (subsequent updates).
- Disable interaction if the status is `'scheduled'` or `'posted'`.

### Mockup-specific Styles (Impeccable Reform)
- Hovering over editable fields in step 2 previews will show a dashed indigo outline: `border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 cursor-pointer`.
- Active editing fields will use an border-free, transparent auto-resizing `<textarea>` that matches the mockup's text size, line-height, and padding.
- Floating toolbar: A premium layout positioned directly above the block with glassmorphism backdrop-blur, rounded-xl corner style, and small action buttons.

---

## 4. Test Specifications

### Unit Tests (`__tests__/api/captions.test.ts`)
- `PUT /api/captions/[id]` -> successful auto-save of draft edits.
- `PUT /api/captions/[id]` -> "Lưu thay bản gốc" successfully overwrites `ai_content` and resets `edited_content`.
- `PUT /api/captions/[id]` -> locks updates and returns `400` if the caption is already `scheduled` or `posted`.

### Integration Tests (`__tests__/components/inlineEdit.test.tsx`)
- Clicking on a variant text block triggers the edit state.
- Entering input updates local state and fires debounced save requests.
- Renders the "locked" status correctly if caption status is `'scheduled'` or `'posted'`.

---

## 5. Spec Self-Review
1. **Placeholders**: None.
2. **Consistency**: The API status mapping correctly matches the database column constraints and enum validation.
3. **Scope**: Safely bounded within caption edit blocks and API endpoints. No database migrations needed.
