# Spec: Platform Mockup Previews and Checkpoint Revert History in ArticleDetailView

This document details the design and specification for implementing platform-specific mockups and historical version checkpoints in [ArticleDetailView](file:///c:/Users/ADMIN/AntBiz/AntBiz-/components/views/ArticleDetailView.tsx), integrating direct Supabase fetching with high-fidelity client-side interactive fallback.

---

## 1. Goal Description

Enhance the article details view (`/archive/[id]`) so that:
1. Users see how the article's copy looks as a post on the platform it was published to (Facebook or Threads).
2. Users can browse past versions/checkpoints of the caption copies.
3. Users can preview older versions in the mockup and click a **"Revert to this checkpoint"** button to restore that version's text to the database (or client state).

---

## 2. Database Integration Details

When the URL parameter `id` is a valid UUID, the component connects to Supabase using `createBrowserClient` from `@/utils/supabase/client`:

### Queries
1. **Article Details**:
   ```sql
   SELECT * FROM articles WHERE id = :id LIMIT 1;
   ```
2. **Nguồn nền tảng (Platform Identification)**:
   We look up the related A/B tests to find which platform this article was posted to:
   ```sql
   SELECT platform FROM ab_tests WHERE article_id = :id;
   ```
3. **Bài sao chép & Checkpoints (Captions & Versions)**:
   - Load active captions:
     ```sql
     SELECT * FROM captions WHERE article_id = :id;
     ```
   - Load history checkpoints of these captions:
     ```sql
     SELECT * FROM caption_versions WHERE caption_id = :caption_id ORDER BY created_at DESC;
     ```

### Revert Transaction
When the user clicks "Khôi phục bản này" (Revert to this checkpoint) on version `vX`, the component performs an update:
```sql
UPDATE captions SET content = :checkpoint_content, updated_at = NOW() WHERE id = :caption_id;
```
After a successful update, the component re-fetches the captions to refresh the preview.

---

## 3. Hybrid Client Fallback (Fallback Mock Data)

If `id` is not a valid UUID (e.g. `/archive/80861` mock page) or if Supabase queries return empty results, the component falls back to the following mock structure:

### Mock Article Metadata
- Reuses the existing `articleData` object (category, title, author, date, views, images).

### Mock Captions
- **Facebook**: `"Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.\n\nSau 10 năm tích cóp mua vàng, hai vợ chồng cuối cùng cũng chạm tay vào ước mơ sở hữu căn hộ riêng tại Hà Nội. Đọc chi tiết hành trình đầy cảm hứng này tại AntBiz!"`
- **Threads**: `"10 năm mua vàng mua nhà: Hành trình thoát cảnh đi thuê trọ của vợ chồng trẻ. 🏠\n\nTừ hai bàn tay trắng, tích lũy từng chỉ vàng mỗi tháng làm quỹ mua nhà. Sau một thập kỷ kiên trì, giấc mơ an cư đã thành hiện thực. Bạn có đang tích lũy vàng để mua nhà không?"`

### Mock Checkpoint History
- **Checkpoint 3 (v3 - Bản hiện tại)**:
  - Timestamp: `17/06/2026 10:00`
  - Text copies matching the active versions.
- **Checkpoint 2 (v2 - Bản sửa đổi)**:
  - Timestamp: `16/06/2026 14:30`
  - Facebook text: `"Bật mí hành trình 10 năm mua vàng của cặp vợ chồng Nghệ An để thoát cảnh trọ tại Hà Nội. Tài khoản gần như cạn kiệt nhưng lòng nhẹ nhõm đến lạ. Hãy chia sẻ câu chuyện của bạn cùng AntBiz."`
  - Threads text: `"Cặp vợ chồng 9x Nghệ An mua vàng tích lũy trong 10 năm để sở hữu căn hộ chung cư 2 phòng ngủ đầu tiên. Hành trình kiên trì đáng khâm phục!"`
- **Checkpoint 1 (v1 - Bản gốc nạp dữ liệu)**:
  - Timestamp: `15/06/2026 09:00`
  - Facebook text: `"10 năm mua vàng và hành trình thoát cảnh ở trọ của anh Phạm Quang H. Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, tài khoản ngân hàng thì cạn kiệt nhưng lòng thấy nhẹ nhõm."`
  - Threads text: `"10 năm mua vàng và hành trình thoát cảnh ở trọ. Câu chuyện thực tế của một gia đình trẻ."`

---

## 4. UI/UX Component Specifications

The component layout of `ArticleDetailView.tsx` will be restructured:

```
+-------------------------------------------------------------+
| [Back to List] / Archive / Title                           |
+------------------------------+------------------------------+
| LEFT COLUMN (Main Details)   | RIGHT COLUMN (Sidebar)       |
|                              |                              |
| +--------------------------+ | +--------------------------+ |
| | Article Title & Author   | | | Performance Metrics      | |
| +--------------------------+ | +--------------------------+ |
| |                            | +--------------------------+ |
| | +----------------------+   | | Checkpoint History       | |
| | | Platform Mockup View |   | | - Checkpoint 3 (Current) | |
| | | [FB] [Threads]       |   | | - Checkpoint 2 (Old)     | |
| | |                      |   | | - Checkpoint 1 (Old)     | |
| | | +------------------+ |   | |                            | |
| | | | Facebook or      | |   | +--------------------------+ |
| | | | Threads preview  | |   |                              | |
| | | +------------------+ |   | +--------------------------+ |
| | |                      |   | | Metadata Tags            | |
| | | [⚠️ Viewing Old check] | | +--------------------------+ |
| | | [Revert to this]     |   |                              | |
| | +----------------------+   |                              | |
| +--------------------------+ |                              | |
|                              |                              | |
| +--------------------------+ |                              | |
| | Summary & Images         | |                              | |
| +--------------------------+ |                              | |
+------------------------------+------------------------------+
```

### Layout Elements
1. **Mockup View Card**:
   - Header with active tabs (Facebook with blue icon, Threads with black icon).
   - Display a verified account header: "AntBiz Official ✓".
   - Shows the caption text, which updates when the user switches platforms or selects a checkpoint.
   - Shows the article image as the main post image.
   - Interactive comment, like, share mockup controls.
2. **Revert Status Banner**:
   - Only visible when the user selects an older checkpoint.
   - Banner text: `⚠️ Bạn đang xem bản lưu cũ (vX) được tạo lúc [Thời gian]`.
   - CTA button: `Khôi phục bản này` (triggers save & toast notification).
3. **Checkpoint History Card**:
   - Vertical timeline list of versions.
   - Each item shows the version label, edit time, and active text snippet.
   - Selected version gets a border highlight and an active check badge.

---

## 5. Verification Plan

### Manual Verification
- Go to `/archive/80861` and verify:
  1. Default mockup loads matching the platform.
  2. Clicking "Facebook" or "Threads" tabs toggles mockup structures properly.
  3. Clicking a historical checkpoint in the sidebar updates the mockup content.
  4. Clicking an older checkpoint displays the yellow warning status banner.
  5. Clicking "Khôi phục" displays a success notification, clears the warning banner, and updates the active caption state to match.
