# Design Spec: Audio Player, Drag & Drop Audio Upload, and AI Auto-fill Missing Components

## 1. Goal Description
Improve the speech-to-text integration and manual entry flows inside `AiCreatorView.tsx` by adding a custom premium audio player, drag-and-drop file support for audio, and automatic AI-generation of missing fields (Title, Content, Category, Tags) before variant generation begins.

---

## 2. Custom Audio Player Design
- Instead of using the native browser `<audio>` controller, we will build a modern visual component that integrates with the workspace design.
- **State variables**:
  - `isPlaying` (boolean): current play status.
  - `currentTime` (number): current playback time in seconds.
  - `duration` (number): total duration of the audio in seconds.
- **Controls**:
  - Circular orange (primary) button with `Play` or `Pause` icon.
  - Custom progress slider (styled `<input type="range" min="0" max={duration} value={currentTime} />`).
  - Timer display in `MM:SS / MM:SS` format.
- **MIME & Revoking**:
  - The player receives a reference to the `voiceFile` File object.
  - Converts it into an object URL on change, and revokes it on unmount or file reset to prevent memory leaks.

---

## 3. Drag & Drop Audio Upload Design
- Attach `onDragOver`, `onDragLeave`, and `onDrop` event listeners to the Upload Audio File container in Step 1.
- Introduce `isAudioDragging` state.
- **Visual Feedback**:
  - Highlights the box with dashed primary color border, a subtle orange background tint (`bg-primary/10`), a scale hover effect (`scale-[1.02]`), and sets the `UploadCloud` icon to bounce (`animate-bounce`).
- **File Validation**:
  - Inspects file type. Only accepts audio files (`audio/*`) or audio extensions like `.mp3`, `.wav`, `.m4a`, `.webm`.

---

## 4. AI Auto-fill Missing Components Design
- **API Endpoint**: `POST /api/generate-missing`
  - Accepts: `title` (optional), `full_text` (optional), `category` (optional), `tags` (optional).
  - Uses `gemini-2.5-flash` to populate missing fields:
    - If `full_text` is empty: writes detailed, engaging content based on `title`.
    - If `title` is empty: drafts a catchy title based on `full_text`.
    - If `category` is empty: classifies into a suitable business category.
    - If `tags` are empty: generates relevant keywords as hashtags.
- **Luồng xử lý tự động (Transition Flow)**:
  - When clicking "TIẾP TỤC & TẠO NỘI DUNG AI" in manual mode:
    - Checks if `voiceFile` is present but `full_text` is empty -> runs STT API to transcribe first.
    - Checks if either `title` or `full_text` is empty -> calls `/api/generate-missing` to fill all gaps.
    - Merges the completed fields back into `postData` and updates UI fields so the marketer has full visibility.
    - Proceeds to generate A/B variant captions.

---

## 5. Verification Plan
- **Unit Tests**:
  - Create tests in `__tests__/components/audioHelper.test.tsx` verifying component render states for drag-and-drop and custom audio player.
- **Integration Tests**:
  - Add backend tests verifying endpoint `/api/generate-missing` behavior.
