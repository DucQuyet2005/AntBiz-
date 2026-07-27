# Quick Publishing Fetch Binding Fix

## Bối cảnh

`BrowserQuickPublishingClient` nhận `fetch` qua constructor và lưu trực tiếp thành một thuộc tính. Khi gọi `this.request(...)`, JavaScript truyền instance client làm `this` cho hàm. Native `window.fetch` yêu cầu receiver hợp lệ nên trình duyệt phát sinh `TypeError: Illegal invocation` ngay khi tải Preset.

## Phạm vi

- Giữ nguyên public API của `BrowserQuickPublishingClient` và toàn bộ endpoint Quick Publishing.
- Chuẩn hóa hàm request trong constructor bằng arrow function để native `fetch` luôn được gọi qua đúng global receiver, đồng thời vẫn hỗ trợ inject fetch giả trong unit test.
- Thêm unit test hồi quy mô phỏng một hàm request từ chối receiver không hợp lệ.
- Không thay đổi UI, payload, xử lý Preset, sinh nội dung, Draft hoặc lên lịch.

## Thiết kế

Constructor nhận `request?: typeof fetch`. Nếu có request được inject, client bọc request đó trong arrow function trước khi lưu. Nếu không có, arrow function gọi `globalThis.fetch(input, init)` trực tiếp. Các method tiếp tục gọi một request adapter ổn định và không biết chi tiết receiver của native API.

## Xử lý lỗi

Không thay đổi mapping lỗi hiện hữu. Lỗi HTTP vẫn được chuyển thành `QuickPublishingError`; bản vá chỉ ngăn lỗi JavaScript xảy ra trước khi request được gửi.

## Kiểm thử

- Unit test xác nhận request được gọi mà không nhận instance client làm receiver.
- Chạy nhóm test Quick Publishing.
- Chạy TypeScript, lint phần module và `npm run build`; đối chiếu riêng các lỗi nền đã biết nếu còn tồn tại.

