<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Quy định kiến trúc bắt buộc

Tài liệu này áp dụng cho cả người phát triển và model AI. Trước khi sửa code:

1. Đọc [`ARCHITECTURE.md`](./ARCHITECTURE.md).
2. Đọc domain liên quan trong [`CONTEXT.md`](./CONTEXT.md).
3. Nếu chạm vào Next.js, đọc guide tương ứng trong `node_modules/next/dist/docs/`.

## Nơi đặt code mới

- Logic nghiệp vụ hoặc điều phối phía trình duyệt: `frontend/modules/<domain>/`.
- Logic nghiệp vụ phía server: `backend/modules/<domain>/`.
- `app/**/page.tsx`, `layout.tsx` và các file UI chỉ là presentation adapter mỏng.
- `app/api/**/route.ts` chỉ là HTTP adapter mỏng: đọc request, kiểm tra đầu vào/authentication ở lớp transport, gọi Backend module và tạo response.
- UI thuần, dùng lại ở nhiều màn hình: `components/`.
- Database schema/data migration: `migrations/`.
- Test: `__tests__/` hoặc `e2e/`, bám theo interface và hành vi của module.

Không đưa business rule hoặc workflow mới trực tiếp vào `components/`, `contexts/`, `lib/`, `utils/`, `page.tsx` hay `route.ts` chỉ vì các thư mục/file đó đã tồn tại.

## Ranh giới phụ thuộc

- Frontend không import implementation từ `backend/`.
- Backend không import React, browser API hoặc presentation code.
- View và Route Handler gọi interface công khai của module; ưu tiên import qua `index.ts` khi module có public entry point.
- Backend là nguồn quyết định cuối cùng cho validation và authorization. Frontend validation chỉ phục vụ trải nghiệm người dùng.
- Không tạo thư mục `shared/` chung chung. Chỉ chia sẻ type/schema khi nó thực sự là một interface ổn định có nhiều consumer.

## Code cũ

- Không di chuyển toàn bộ code cũ chỉ để làm đẹp cấu trúc.
- Khi sửa hoặc mở rộng business logic cũ, đặt phần logic mới vào Frontend/Backend module đúng domain và giữ file cũ làm adapter tương thích nếu cần.
- Chỉ xóa implementation cũ sau khi mọi caller đã chuyển sang module mới và test xác nhận hành vi.
- Không thay đổi public contract, schema hoặc hành vi ngoài phạm vi nếu chưa được yêu cầu.

Nếu chưa xác định được nơi đặt file, dừng và nêu rõ các lựa chọn kiến trúc thay vì tự thêm code vào một thư mục tiện tay. Cây thư mục, trách nhiệm chi tiết và ví dụ quyết định nằm trong [`ARCHITECTURE.md`](./ARCHITECTURE.md).
