# Tài liệu Thiết kế: Hệ thống Thư viện Quy chuẩn Nền tảng Đa cấu hình (Multi-Preset Platform Rules)

Tài liệu này mô tả chi tiết giải pháp kỹ thuật nâng cấp Lớp 1 (Quy chuẩn kênh đăng) từ dạng đơn bản ghi tĩnh sang dạng **Thư viện cấu hình cá nhân hóa đa dạng**, áp dụng cho Facebook, Instagram và Threads.

---

## 1. Kiến trúc Cơ sở dữ liệu (Database Schema)

Chúng ta nâng cấp bảng `platform_presets` bằng cách thêm các cột mới mà không xóa bất kỳ cột hay dữ liệu cũ nào hiện có. Dữ liệu cũ của hệ thống sẽ tự động trở thành các Quy chuẩn Mặc định hệ thống.

```sql
-- 1. Xóa ràng buộc UNIQUE cũ trên cột platform (chỉ xóa ràng buộc, không ảnh hưởng đến dữ liệu)
ALTER TABLE public.platform_presets DROP CONSTRAINT IF EXISTS platform_presets_platform_key;

-- 2. Thêm các cột phục vụ quản lý thư viện quy chuẩn (Đặt giá trị mặc định cho cột mới)
ALTER TABLE public.platform_presets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Mặc định',
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Cập nhật các dữ liệu cũ hiện có để đặt cờ is_default = TRUE (Quy chuẩn hệ thống gốc)
UPDATE public.platform_presets 
SET is_default = TRUE 
WHERE user_id IS NULL AND is_default = FALSE;

-- 4. Tạo chỉ mục UNIQUE: Đảm bảo tên quy chuẩn là duy nhất cho mỗi nền tảng của từng user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform_preset_name 
ON public.platform_presets (user_id, platform, name) 
WHERE user_id IS NOT NULL;

-- 5. Tạo chỉ mục UNIQUE cho quy chuẩn hệ thống (không trùng lặp kênh hệ thống)
CREATE UNIQUE INDEX IF NOT EXISTS unique_system_platform_preset_name 
ON public.platform_presets (platform, name) 
WHERE user_id IS NULL;

-- 6. Ràng buộc: Mỗi người dùng chỉ có tối đa một quy chuẩn mặc định (is_default = TRUE) cho mỗi platform
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_default_platform_preset 
ON public.platform_presets (user_id, platform) 
WHERE (is_default = TRUE AND user_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS unique_system_default_platform_preset 
ON public.platform_presets (platform) 
WHERE (is_default = TRUE AND user_id IS NULL);
```

---

## 2. Đặc tả API (Backend API Specifications)

### 2.1. Lấy danh sách quy chuẩn kênh: `GET /api/platform-presets`
*   **Tham số truy vấn:** `platform` (facebook, instagram, thread)
*   **Logic:**
    1. Lấy `user_id` từ session đăng nhập.
    2. Truy vấn DB:
       ```sql
       SELECT * FROM platform_presets 
       WHERE (user_id = :user_id OR user_id IS NULL) AND platform = :platform
       ORDER BY user_id NULLS LAST, name ASC;
       ```
    3. Phản hồi JSON chứa mảng danh sách quy chuẩn, đánh dấu bản ghi nào là của hệ thống (`user_id IS NULL`) để UI hiển thị nhãn tương ứng.

### 2.2. Lưu mới hoặc Cập nhật quy chuẩn cá nhân: `POST /api/platform-presets`
*   **Body JSON:**
    ```json
    {
      "platform": "instagram",
      "name": "Instagram Reels",
      "rules": "Quy tắc viết cho Reels...",
      "is_default": true
    }
    ```
*   **Logic:**
    1. Nếu `is_default` là `true`, tiến hành reset cờ `is_default = false` của toàn bộ các quy chuẩn cùng platform của user này.
    2. Sử dụng UPSERT để chèn mới hoặc cập nhật bản ghi dựa trên bộ khóa `(user_id, platform, name)`.

### 2.3. Xóa quy chuẩn cá nhân: `DELETE /api/platform-presets/[id]`
*   **Logic:**
    1. Kiểm tra quyền sở hữu (`user_id` của bản ghi phải trùng với người dùng hiện tại).
    2. Không cho phép xóa bản ghi mặc định của hệ thống (`user_id IS NULL`).
    3. Thực hiện xóa bản ghi. Nếu bản ghi bị xóa đang là mặc định (`is_default = true`), tự động set bản ghi hệ thống làm mặc định thay thế.

---

## 3. Thiết kế Giao diện (UI/UX)

### 3.1. Tại màn hình AI Creator View - Bước 1 (Playground Layout)
Tái cấu trúc giao diện Bước 1 của AI Creator để phân tách rõ ràng phần "Nội dung đầu vào" và "Động cơ cấu hình prompt":
*   **Cột bên trái (Left Column - 8/12):** Quản lý toàn bộ thông tin bài viết gốc.
    *   Khung nhập URL Importer để cào bài viết.
    *   Form chỉnh sửa thủ công thông tin bài viết gốc (Tiêu đề, Tóm tắt/Nội dung full text, Tác giả, Ngày đăng, Hình ảnh, Tags...).
*   **Cột bên phải (Right Column - 4/12):** Trở thành Bảng điều khiển AI (AI Engine Control Panel).
    *   **Bộ chọn kênh đăng (Platform Selection Tabs):** Hỗ trợ chuyển đổi nhanh: Facebook, Threads, Instagram.
    *   **Bộ chọn Quy chuẩn Nền tảng (Platform Preset - Lớp 1):**
        *   Dropdown hiển thị danh sách quy chuẩn nền tảng (gồm mặc định hệ thống và quy chuẩn cá nhân của user).
        *   Khung xem trước Quy chuẩn định dạng (Read-only, nét đứt, nền xám nhạt).
    *   **Bộ chọn Văn phong Thương hiệu (Brand Style - Lớp 2):**
        *   Dropdown hiển thị danh sách style cá nhân hóa (`savedConfigs`).
        *   Tóm tắt nhanh về Tone (giọng điệu) và Length (độ dài) đã thiết lập cho style đó.
        *   Nút quản lý style để mở Modal quản lý nhanh.
    *   **Bộ chọn Hồ sơ tác giả (Author Profile):**
        *   Dropdown chọn hồ sơ tác giả cần bắt chước văn phong (Few-shot/Tuned Model).
        *   Nút huấn luyện để mở nhanh Modal tạo mới & huấn luyện.
    *   **Ô nhập Yêu cầu tùy chỉnh (Custom Instructions - Lớp 3):**
        *   Textarea rộng rãi để người dùng nhập yêu cầu bổ sung riêng cho bài đăng hiện tại.
    *   **Hộp xem trước Prompt hoàn chỉnh (Final Prompt Live Preview):**
        *   Thiết kế dạng Accordion (Collapsible Box) tiêu đề `🔍 Xem trước Prompt gửi đi`.
        *   Khi mở rộng, hiển thị nội dung prompt hoàn chỉnh được ghép tự động theo thời gian thực ở chế độ Read-only.
    *   **Nút Tiến hành sinh bài viết (Proceed to A/B Test):** Nút Primary to nằm dưới cùng của cột phải để chạy luồng sinh.

### 3.2. Tại trang Cài đặt (Settings View)
*   Thêm tab **"Quy chuẩn Nền tảng"** (nằm cạnh tab quản lý Văn phong).
*   Giao diện gồm:
    *   Bộ lọc chọn kênh (Facebook, Instagram, Threads).
    *   Danh sách các quy chuẩn đã tạo của kênh đó.
    *   Nút "Thêm quy chuẩn" mở Modal nhập: Tên quy chuẩn, Nội dung quy tắc, Đặt làm mặc định.
    *   Mỗi dòng quy chuẩn hiển thị nút **Chỉnh sửa** và **Xóa** (chỉ hiển thị với quy chuẩn do chính user tạo).

---

## 4. Quy trình Trộn Prompt (Prompt Merging)

Cả Frontend (dành cho ô Live Preview) và Backend (dành cho API `/api/captions/generate`) đều áp dụng chung một công thức trộn prompt động thống nhất theo cấu trúc template hoàn chỉnh dưới đây:

```markdown
Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội ({Platform} post) dựa trên thông tin sau:

**Nền tảng:** {Platform}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "{Tiêu đề bài viết}"
*   **Nội dung tóm tắt:** "{Nội dung tóm tắt/full_text}"

**Hướng dẫn khai thác nội dung:**
*   {Nội dung quy tắc từ Platform Preset}
{Yêu cầu tùy chỉnh bổ sung từ ô Yêu cầu thêm, nếu có}

**Văn phong:**
*   Tone giọng yêu cầu: {Tone từ Brand Style}
{Nội dung quy tắc bổ sung về văn phong/chữ từ Brand Style, nếu có}

**Cấu trúc bài viết:**
1.  Hook (Móc câu): Tạo điểm nhấn gây tò mò từ đoạn tóm tắt bài báo.
2.  Body (Nội dung chính): Phát triển câu chuyện ngắn gọn, súc tích.
3.  Call to Action (CTA): Gợi mở tương tác, đặt câu hỏi cho độc giả.
4.  Hashtag: Đề xuất 3-5 hashtag liên quan.

TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Dưới đây là...", không "Ok". Trả về TRỰC TIẾP bài đăng hoàn chỉnh.
```

Ở backend, API sinh caption sẽ:
1. Đọc `platformPresetId`, `stylePresetId`, `customPrompt` từ request body.
2. Điền đầy đủ các thông tin bài viết gốc.
3. Tạo ra chuỗi `promptText` theo đúng định dạng trên và gửi trực tiếp tới Gemini API.

## 5. Thiết kế Bộ Dịch Văn Phong Thương Hiệu Tĩnh (Static Style Dictionary)

Nhằm tối ưu hóa chất lượng sinh của AI ở Lớp 2 (Văn phong thương hiệu) mà không làm phát sinh chi phí gọi API sinh prompt trung gian, Backend sẽ định nghĩa một cấu trúc từ điển tĩnh (`lib/api/styleDictionary.ts`) để ánh xạ các thông số thô sang chỉ dẫn chuyên sâu:

1. **Bộ Ánh Xạ (Mapping Dictionary):**
   - **Giọng văn (Tone):** Tự động mở rộng từ khóa (ví dụ: `Hài hước` -> *"Sử dụng lối ví von hóm hỉnh, các câu đùa nhẹ nhàng, duyên dáng và bắt trend khéo léo..."*).
   - **Độ dài (Length):** Tự động mở rộng từ khóa (ví dụ: `Ngắn` -> *"Bài viết tối giản, cô đọng, giới hạn dưới 150 từ, sử dụng danh sách liệt kê..."*).
2. **Quy trình gộp Prompt tại API `/api/captions/generate`:**
   - Trích xuất `tone` và `length_pref` từ `prompt_configs`.
   - Chạy qua hàm `getRichStyleContent` để biên dịch thành chỉ dẫn chi tiết.
   - Ghép chỉ dẫn chi tiết này vào Lớp 2 thay vì các từ khóa thô cũ.

