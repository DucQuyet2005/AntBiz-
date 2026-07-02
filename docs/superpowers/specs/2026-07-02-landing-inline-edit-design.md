# Design Spec: Landing Page Inline Preview Editor (WordPress-style) with Auto-Save

## 1. Introduction & Requirements
As a Marketer, I want to edit landing page content directly on the preview layout. Clicking on any text element should allow me to type and edit it in-place, mirroring the experience of WordPress Gutenberg, instead of opening forms in sidebars.

### High-level Requirements:
1. **`InlineEditText` Component**: Create an element wrapper that toggles between static display and editable state using `contentEditable`.
2. **Hover Styles & Focus Indicator**: Hovering over editable text displays a dashed primary border (`border-[1.5px] border-dashed border-primary/45 bg-primary/5`) and a subtle cursor indicator.
3. **Strip Clipboard Formatting**: Intercept the paste event (`onPaste`) to strip rich formatting and preserve plain text.
4. **Global Undo/Redo Stack**: Implement a keydown listener for `Ctrl+Z` (Undo) and `Ctrl+Y` (Redo) in the parent `LandingEditor` workspace, holding up to 10 snapshots in a state-based history stack.
5. **Real-time Auto-Save**: Save modified text to database automatically on blur. To optimize performance, we'll write a debounce hook to batch and execute API writes.
6. **UI Validation & Constraints**: Apply character limits (`maxLength`) per field type and alert users with dynamic warnings if a required field is empty.

---

## 2. Component Design: `InlineEditText`

To guarantee that text elements inherit 100% of their surrounding typography, alignment, and sizing without disrupting layout flow, we will build a `InlineEditText` component utilizing `contentEditable` rather than input fields.

### Component Props:
```typescript
interface InlineEditTextProps {
  value: string;
  onChange: (newValue: string) => void;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
  isEditor?: boolean;
  required?: boolean;
  fieldName?: string;
}
```

### Key Interaction Details:
- **Interactive State**: Render as `contentEditable={isEditor}`.
- **Visual Cues**: When `isEditor` is true, add a dashed border when hovered and a subtle ring style when active (`outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 rounded-sm`).
- **Sanitized Pasting**:
  ```typescript
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };
  ```
- **Text Length Gate & Validation**:
  Listen to `onInput` and truncate the inner text if it exceeds `maxLength`. Show a light red border and tooltip warning if `required` and length is 0.

---

## 3. State & History Architecture: `LandingEditor`

We will integrate global Undo/Redo logic inside `/app/(dashboard)/admin/landing-editor/page.tsx` to handle state reversion across all editable sections.

### Undo/Redo State Structure:
```typescript
const [config, setConfig] = useState(DEFAULT_CONFIG_VI);
const [undoStack, setUndoStack] = useState<any[]>([]);
const [redoStack, setRedoStack] = useState<any[]>([]);
```

- **Push History**: Every time an inline change is committed (on blur), push the *current* config state into `undoStack` (cap length at 10) and clear `redoStack`.
- **Keyboard Listener**: Listen globally on window:
  - `Ctrl + Z`: Pop state from `undoStack`, push current state to `redoStack`, and call `setConfig(poppedState)`.
  - `Ctrl + Y` or `Ctrl + Shift + Z`: Pop state from `redoStack`, push current state to `undoStack`, and call `setConfig(poppedState)`.

---

## 4. Auto-save & API Batch updates

Whenever a text element changes and blurs:
1. Update local client config state (`setConfig`).
2. Run database sync:
   - For performance, instead of immediate API hits, we'll write a debounced background sync.
   - The sync automatically updates `landing_page_config` table records.
   - Display a floating status indicator in the top header or toolbar: `Đang lưu...` -> `Đã tự động lưu nháp lúc HH:mm` or `Lưu lỗi`.

---

## 5. Verification Plan

### Automated Verification
- **Unit Tests**: Test `InlineEditText` components render successfully with both plain-text value and sanitized formatting on paste.
- **Integration Tests**: Verify Undo/Redo commands successfully navigate the history stack and trigger correct state changes.

### Manual Verification
- Test hover borders and focused outline behavior.
- Verify copy-paste from Microsoft Word and web browser retains only plain text.
- Verify editing text and blurring automatically invokes the draft save API.
