# Hợp nhất Extension từ `devTest` và `dev/Quiet`

## Mục tiêu

Giải quyết conflict của Chrome Extension mà không làm mất chức năng của hai nhánh:

- Trước khi crawl: giữ trải nghiệm chọn nguồn/input của `devTest`.
- Sau khi crawl thành công: giữ workflow xử lý nội dung của `dev/Quiet`.

## Phạm vi conflict

- `chrome-extension/popup.html`
- `chrome-extension/popup.css`
- `chrome-extension/popup.js`

Thay đổi đã stage trong `components/views/ContentCalendarView.tsx` được giữ nguyên. `debug_extension.log` không được stage hoặc đưa vào kết quả merge.

## Giao diện trước khi crawl — `devTest`

Giữ cấu trúc, hành vi và CSS của các màn hình:

- Trang chủ và navigation extension.
- Cào trang hiện tại.
- Lấy phần văn bản bôi đen.
- Nhập URL thủ công.
- Ghi âm.
- Tải file.
- Nhập ý tưởng.
- Form đăng nhập và trạng thái input đã lưu.

## Workflow sau khi crawl — `dev/Quiet`

Khi crawl/trích xuất thành công, giữ:

- Màn hình xem và sửa tiêu đề, nội dung, mô tả và ảnh đã trích xuất.
- Danh sách/preview nhiều ảnh và helper đồng bộ giá trị ảnh.
- Kiểm tra kết nối tài khoản mạng xã hội.
- Kiểm tra Instagram cần ít nhất một ảnh.
- Tải quy chuẩn nền tảng và kết hợp với Văn phong thương hiệu.
- Sinh caption, preview, chỉnh sửa, đăng ngay và lên lịch.
- Các helper và CSS chỉ phục vụ những màn hình sau khi crawl.

## Quy tắc hợp nhất JavaScript

- Hợp nhất theo hàm và workflow, không chọn toàn bộ `ours` hoặc `theirs`.
- Giữ xác thực Bearer token dùng chung.
- 401 chỉ được xóa cache session riêng của extension, không xóa cookie web.
- Retry tạo bài phải giữ `customPrompt` của Văn phong đã chọn.
- State khôi phục phải hỗ trợ cả input trước crawl và dữ liệu/ảnh sau crawl.
- Event listener chỉ được đăng ký một lần cho mỗi control.

## Quy tắc hợp nhất HTML/CSS

- ID mà JavaScript đang truy cập phải tồn tại đúng một lần.
- CSS `devTest` là nền cho màn hình chọn input.
- CSS `dev/Quiet` được ghép cho màn hình kết quả crawl và các bước tiếp theo.
- Không giữ selector trùng lặp có giá trị mâu thuẫn; mỗi selector phải có một nguồn quyết định rõ ràng.

## Xác minh

- Không còn marker `<<<<<<<`, `=======`, `>>>>>>>`.
- `popup.html` không có ID trùng.
- `popup.js` và `background.js` qua `node --check`.
- Thử các đường vào: tab hiện tại, bôi đen, URL, ý tưởng, ghi âm và tải file.
- Sau crawl: nội dung/ảnh hiển thị, chọn nền tảng/Văn phong, tạo bài, retry, preview, đăng ngay và lên lịch.
- Chạy test API/extension liên quan hiện có.
- Chỉ stage ba file extension đã giải conflict; không stage `debug_extension.log`.
