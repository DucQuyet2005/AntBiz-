# Step 2 Layout Options Interactive Preview Design

## Overview
This specification details the creation of an interactive showcase page (`/ai-creator/preview`) to evaluate and select the best layout structure for Step 2 ("Tạo nội dung AI" / AI Content Generation) of the `AiCreatorView`. The showcase allows the user and design team to test, edit, and compare 5 distinct layout options using simulated multi-platform data (Facebook, Threads, Instagram) in real time.

---

## The 5 Layout Models to Showcase

### Mẫu 1: Bố cục Dạng Cột Song Song (Side-by-Side Columns)
- **Structure:**
  - Column 1 (Left - 25% width): Global controls ("Tùy chỉnh mục hiển thị", "Cấu hình AI", "Bài viết gốc").
  - Column 2 (Middle Left - 25% width): Facebook Editor & Preview mockup.
  - Column 3 (Middle Right - 25% width): Threads Editor & Preview mockup.
  - Column 4 (Right - 25% width): Instagram Editor & Preview mockup.
- **UX Intent:** Zero-click visual comparison across all platforms. Designed for large desktop screens.

### Mẫu 2: Bố cục Xếp Chồng Theo Chiều Dọc (Vertical Feed View)
- **Structure:**
  - Left Column (Fixed Sidebar - 25% width): Global controls.
  - Right Area (Scrollable - 75% width): Platform-specific previews stacked vertically:
    - Block 1: Facebook Editor & Preview mockup.
    - Block 2: Threads Editor & Preview mockup.
    - Block 3: Instagram Editor & Preview mockup.
- **UX Intent:** Familiar feed scrolling experience. Maximizes horizontal space for large images and long text.

### Mẫu 3: Bố cục Khung Accordion (Thu gọn / Mở rộng)
- **Structure:**
  - Left Column (25% width): Global controls.
  - Right Area (75% width): 3 expandable/collapsible accordion panels.
    - Header contains status indicators (e.g. `[v] Facebook (Đã tạo xong)`, `[>] Threads (Chờ chỉnh sửa)`).
    - Expanding a panel reveals its full editor and preview mockup.
- **UX Intent:** Minimizes cognitive overload, focusing on one platform at a time. Clean and structured.

### Mẫu 4: Trình Soạn Thảo Trung Tâm & Cột Preview Điện Thoại (Master-Detail Preview)
- **Structure:**
  - Left Column (20% width): Global controls.
  - Middle Column (40% width): A central rich text editor with tabs (`Facebook`, `Threads`, `Instagram`) to customize the text for each platform.
  - Right Column (40% width): Three mobile phone mockups side-by-side (or in a neat grid). Changes in the editor instantly reflect on all 3 virtual phone screens.
- **UX Intent:** High-end professional experience matching tools like Buffer or Hootsuite. Shows exactly how content looks on actual mobile viewports.

### Mẫu 5: Bố cục Dạng Lưới Linh Hoạt (Responsive Masonry Grid)
- **Structure:**
  - Top Bar: Horizontal menu containing global controls to save vertical/sidebar space.
  - Content Area: Responsive grid containing 3 cards (Facebook, Threads, Instagram).
    - Ultrawide screens: 3 columns.
    - Standard desktop/tablet: 2 columns on top, 1 centered below.
- **UX Intent:** Adapts cleanly to any viewport from 13" Macbooks to ultrawide monitors without wasted whitespace.

---

## Interactive Features & Mock Data

To make the showcase highly realistic, the preview page will implement:

1. **Top Showcase Header:**
   - A sticky toolbar with a selector for the 5 layouts.
   - Quick language toggle (VI/EN).
   - Dynamic pros/cons summary box for the currently active layout.
2. **Synchronized Mock State:**
   - A single shared React state for content (Title, Author, Description, Tags, Images).
   - Editing text in any editor (or the Master Editor in Model 4) instantly updates all platform previews.
3. **Toggles Customizer Support:**
   - The global controls will include checkboxes to show/hide Title, Author, Description, Tags, and Images. Previews must dynamically update heights and layout according to these toggles.
4. **Platform Mockup Cards:**
   - **Facebook:** Rendered with standard header (Avatar, name, timestamp), expandable text, support for link/image attachments, and bottom action bar (Like, Comment, Share).
   - **Threads:** Rendered with user avatar, name, threaded layout (left vertical timeline connector line), and supports multi-post threads if text exceeds character limits.
   - **Instagram:** Renders image block prominently on top (or below author header), with caption underneath including tags and hashtags.

---

## Styling & Design Tokens (AntBiz System)

We will adhere to `DESIGN.md` rules and color palettes:
- **Background:** Slate Tint (`#F4F5F9` / `bg-slate-50`).
- **Cards & Surfaces:** Pure Surface White (`#FFFFFF`) with thin borders (`border border-gray-100` or `border-gray-250`).
- **Typography:** Inter (main font stack). Line length for captions constrained to 65-75ch.
- **Accents:** Performance Indigo (`#5A5CDE` / `bg-primary`) used sparingly (max 10% area) for active states and CTA.
- **Accessibility:** Ensure high contrast for all labels (minimum 4.5:1 ratio). Respect `prefers-reduced-motion`.

---

## Verification Plan

### Manual Verification
1. Access `/ai-creator/preview` via the browser.
2. Switch between all 5 layouts and inspect:
   - Visual correctness on desktop and laptop sizes.
   - Correct styling of the platform mockups (Facebook, Threads, Instagram).
3. Interact with the text fields and ensure changes synchronize instantly.
4. Toggle display items ("Hiển thị tiêu đề", "Hiển thị tác giả", etc.) and verify that preview components adjust layout smoothly.
