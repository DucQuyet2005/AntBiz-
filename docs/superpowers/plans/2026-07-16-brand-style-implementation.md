# Kế hoạch Triển khai: Kiến tạo Văn phong Thương hiệu Tương tác AI (Brand Style Wizard)

Tài liệu này vạch ra kế hoạch triển khai từng bước cho tính năng Quản lý & Kiến tạo Văn phong Thương hiệu tích hợp AI sinh câu hỏi động, lưu trữ đồng bộ bảng `prompt_configs`.

---

## Phân rã Các giai đoạn Triển khai (Phases)

### Giai đoạn 1: Kiểm tra Cơ sở dữ liệu & Cấu hình AI
*   **Mục tiêu:** Xác nhận bảng `prompt_configs` đã sẵn sàng và thiết lập kết nối AI Gemini 2.5 Flash hoạt động tốt.
*   **Các bước thực hiện:**
    1.  Kiểm tra file schema Prisma (nếu có) hoặc truy vấn trực tiếp cấu trúc bảng `prompt_configs` qua Supabase Client để chắc chắn có các cột `id`, `user_id`, `name`, `rules`, `params`, `is_default`.
    2.  Kiểm tra xem biến môi trường `GEMINI_API_KEY` đã được thiết lập đúng trong file `.env` chưa.

### Giai đoạn 2: Phát triển API Backend
*   **Mục tiêu:** Cung cấp các API CRUD cho Văn phong thương hiệu và API sinh câu hỏi động qua AI.
*   **Các bước thực hiện:**
    1.  **Xây dựng Endpoint `POST /api/presets/generate-questions`:**
        *   Nhận `objective` (Mục tiêu) từ client.
        *   Truy vấn lịch sử các văn phong cũ của user để lấy dữ liệu làm gợi ý.
        *   Tạo prompt gửi tới Gemini 2.5 Flash yêu cầu sinh danh sách câu hỏi động (từ 3 đến 6 câu hỏi, định dạng JSON gồm câu hỏi, key và 4 options).
        *   Trả về JSON lộ trình câu hỏi cho Client.
    2.  **Cập nhật Endpoint `GET /api/presets`:**
        *   Lấy toàn bộ danh sách Văn phong của user hiện tại từ `prompt_configs` xếp theo thời gian tạo mới nhất.
    3.  **Cập nhật Endpoint `POST /api/presets`:**
        *   Nhận thông tin và lưu vào `prompt_configs`.
        *   Trước khi lưu, chạy hàm biên dịch `compileBrandStyleRules` chuyển đổi các câu trả lời thành chuỗi JSON rules gửi AI viết bài.
    4.  **Cập nhật Endpoint `PUT /api/presets/[id]` & `DELETE /api/presets/[id]`:**
        *   Thực hiện sửa thông tin / xóa bản ghi trực tiếp trong `prompt_configs`.

### Giai đoạn 3: Phát triển Giao diện (Frontend)
*   **Mục tiêu:** Cập nhật màn hình quản lý Văn phong thương hiệu và modal tạo/sửa tương tác không độ trễ.
*   **Các bước thực hiện:**
    1.  **Refactor `PresetsView.tsx`:**
        *   Thay đổi giao diện hiển thị danh sách dạng thẻ tối giản (Tên, Tag tóm tắt, Trạng thái mặc định).
        *   Tích hợp nút Sửa, Nhân bản, Xóa gọi đúng API tương ứng.
    2.  **Xây dựng Giao diện Modal tạo mới tương tác:**
        *   *Bước 1:* Chọn mục tiêu (Bán hàng, Tuyển dụng...).
        *   *Bước chuyển tiếp:* Hiển thị màn hình chờ tải (Loading State) trong lúc gọi API sinh lộ trình câu hỏi động.
        *   *Các bước động:* Duyệt qua mảng `steps` câu hỏi nhận từ API. Mỗi câu hiển thị 4 lựa chọn lớn + 1 lựa chọn "Khác" (hiển thị input để gõ tay nếu click chọn). Tự động chuyển trang khi người dùng click chọn phương án gợi ý sẵn.
        *   *Bước xác nhận:* Nhập tên văn phong, ô textarea cho phép nhập cấu hình mềm "Lưu ý & Nguyên tắc bổ sung", xem trước prompt và bấm Lưu.

### Giai đoạn 4: Tích hợp vào Luồng Đăng nhanh (AI Creator Flow)
*   **Mục tiêu:** Cho phép người dùng chọn và áp dụng các Văn phong thương hiệu thật khi sinh bài viết.
*   **Các bước thực hiện:**
    1.  Cập nhật cấu phần chọn Preset ở Bước 3 của AI Creator flow (`Step3Presets.tsx` hoặc file tương đương) để fetch dữ liệu thực tế từ `/api/presets`.
    2.  Gửi `prompt_config_id` đã chọn xuống backend khi tạo bài viết để backend áp dụng đúng quy tắc `rules`.

---

## Kế hoạch Kiểm thử & Đánh giá (Testing & Verification)

1.  **Kiểm thử luồng sinh câu hỏi động:** Chọn các mục tiêu khác nhau (Bán hàng vs Tuyển dụng) để kiểm chứng xem AI có sinh đúng số lượng câu hỏi phù hợp (3 đến 6 câu) và có định dạng JSON chuẩn không.
2.  **Kiểm thử CRUD:** Tạo mới -> Xem danh sách -> Sửa (thay đổi đáp án & gõ thêm luật bổ sung) -> Xóa để đảm bảo dữ liệu ghi đúng vào cột `params` và `rules` của bảng `prompt_configs`.
3.  **Kiểm thử độ trễ:** Đảm bảo khi người dùng thao tác qua các câu hỏi động từ câu 2 trở đi, giao diện chuyển động tức thì không có bất kỳ hiện tượng giật lag hay xoay vòng tải dữ liệu.
