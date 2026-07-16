# Frontend and Backend Placement Rules

## Mục tiêu

Tạo bộ tài liệu kiến trúc bằng Markdown để cả người phát triển và model AI xác định đúng nơi đặt code trước khi sửa dự án. Tài liệu phải ngăn logic nghiệp vụ mới tiếp tục phát triển tùy ý trong các thư mục cũ, nhưng vẫn tôn trọng các file convention bắt buộc của Next.js 16.

## Phương án đã chọn

Dùng hai file ở root:

- `AGENTS.md` là tập quy định ngắn, bắt buộc. File này yêu cầu đọc tài liệu kiến trúc, chỉ rõ nơi đặt logic mới và giữ nguyên cảnh báo phải đọc tài liệu Next.js cục bộ trước khi viết code.
- `ARCHITECTURE.md` là tài liệu giải thích dành cho cả người và AI. File này chứa cây thư mục hiện tại ở mức hữu ích, mô tả trách nhiệm của Frontend, Backend và các thư mục dùng chung, cùng quy trình quyết định nơi đặt file mới.

Hai file dùng tiếng Việt, giữ nguyên tên kỹ thuật và đường dẫn bằng tiếng Anh để khớp với codebase.

## Quy tắc kiến trúc bắt buộc

### Frontend

Logic nghiệp vụ hoặc logic điều phối phía trình duyệt mới phải nằm tại:

```text
frontend/modules/<domain>/
```

Mỗi module Frontend phải có interface rõ ràng và che giấu implementation khỏi view. Module có thể chứa types, schemas, errors, client adapter, hook và module điều phối khi những phần đó thuộc cùng một domain.

`components/`, `contexts/` và các `page.tsx` không được trở thành nơi chứa logic nghiệp vụ mới. Chúng là presentation adapter: nhận input, gọi interface của module và chiếu kết quả ra UI. UI thuần dùng chung vẫn có thể nằm trong `components/`.

### Backend

Logic nghiệp vụ phía máy chủ mới phải nằm tại:

```text
backend/modules/<domain>/
```

Một module Backend có thể chứa module implementation, types, schemas, domain errors, repository, factory và provider adapter. Route Handler chỉ xử lý HTTP concerns như đọc request, authentication entry point, gọi module, rồi ánh xạ kết quả hoặc lỗi thành response.

`app/api/**/route.ts` không được chứa thêm quy tắc nghiệp vụ, truy vấn dữ liệu phức tạp hoặc điều phối provider mới nếu logic đó có thể nằm sau interface của Backend module.

### Ngoại lệ bắt buộc của framework

Không ép mọi file vật lý vào `frontend/` hoặc `backend/`. Các file convention của Next.js vẫn ở `app/`, gồm `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` và `route.ts`. Trước khi sửa các file này, agent phải đọc hướng dẫn liên quan trong `node_modules/next/dist/docs/` theo quy định hiện có.

Các ngoại lệ khác phải có mục đích rõ ràng:

- `components/`: presentation dùng lại; không sở hữu workflow nghiệp vụ.
- `contexts/`: React context cấp ứng dụng; không thay thế domain module.
- `lib/`: compatibility hoặc hạ tầng dùng chung hiện hữu; code nghiệp vụ mới không được mặc định đưa vào đây.
- `utils/`: adapter tiện ích hạ tầng cấp ứng dụng, ví dụ Supabase client; không chứa quy tắc nghiệp vụ.
- `prompts/`: prompt tĩnh do server sử dụng.
- `migrations/`: thay đổi schema hoặc dữ liệu database.
- `scripts/` và `worker.ts`: entry point vận hành; phải gọi Backend module thay vì sao chép nghiệp vụ.
- `__tests__/` và `e2e/`: test theo đúng seam của module hoặc hành vi đầu-cuối.
- `public/`: tài nguyên tĩnh.

## Cây thư mục cần trình bày

`ARCHITECTURE.md` sẽ có cây thư mục được tuyển chọn, không liệt kê `.next`, `node_modules`, `coverage` hoặc mọi file sinh tự động. Cây phải cho thấy:

- các route group và vai trò adapter của `app/`;
- module Quick Publishing hiện có dưới `frontend/modules/`;
- danh sách domain module hiện có dưới `backend/modules/`;
- các thư mục presentation, shared infrastructure, dữ liệu, test và tài liệu;
- các file cấu hình root quan trọng.

Sau cây tổng quan, tài liệu cung cấp cây mẫu cho một Frontend module và một Backend module. Đây là mẫu định hướng, không phải yêu cầu tạo file rỗng hoặc buộc mọi module phải có mọi loại file.

## Quy tắc phụ thuộc

Luồng phụ thuộc mong muốn:

```text
app page/layout -> presentation adapter -> frontend/modules
app/api route -> backend/modules
frontend/modules -> HTTP interface exposed by app/api
backend/modules -> repository/provider adapters -> external systems
```

- Frontend không import implementation từ `backend/`.
- Backend không import React, browser API hoặc presentation code.
- Route và view gọi interface công khai của module; tránh import file implementation nội bộ khi module có `index.ts`.
- Shared types chỉ được dùng chung khi chúng thực sự mô tả một interface ổn định. Không tạo thư mục `shared/` chung chung như nơi chứa code chưa phân loại.
- Không nhân đôi schema hoặc business rule giữa Frontend và Backend. Backend vẫn là nguồn quyết định cuối cùng cho validation và authorization; Frontend validation chỉ hỗ trợ trải nghiệm người dùng.

## Chính sách với code cũ

Quy định áp dụng cho code mới và code đang được sửa. Không yêu cầu di chuyển toàn bộ code cũ trong một lần.

Khi sửa một luồng cũ:

1. Xác định domain trong `CONTEXT.md`.
2. Nếu thay đổi thêm hoặc sửa logic nghiệp vụ, đặt logic mới vào module tương ứng.
3. Giữ adapter tương thích để tránh thay đổi public contract ngoài phạm vi.
4. Chỉ xóa implementation cũ sau khi mọi caller đã chuyển và test xác nhận hành vi.
5. Không thực hiện refactor không liên quan chỉ để làm đẹp cây thư mục.

## Quy trình cho người và AI trước khi code

1. Đọc `AGENTS.md`, `ARCHITECTURE.md` và phần domain liên quan trong `CONTEXT.md`.
2. Nếu chạm Next.js, đọc guide tương ứng trong `node_modules/next/dist/docs/`.
3. Phân loại thay đổi là presentation, Frontend workflow, Backend business logic, infrastructure, migration hay test.
4. Chọn module hiện hữu trước khi tạo module mới.
5. Nếu chưa xác định được nơi đặt, dừng và nêu rõ hai lựa chọn kiến trúc thay vì tự đưa code vào `lib/`, `components/` hoặc Route Handler.
6. Thêm hoặc cập nhật test tại seam của module.

## Phạm vi triển khai

- Mở rộng `AGENTS.md`; không xóa block quy tắc Next.js hiện có.
- Tạo `ARCHITECTURE.md` ở root.
- Không di chuyển hoặc sửa implementation hiện tại.
- Không thay đổi public interface, database, dependency hoặc runtime behavior.
- Không chỉnh sửa thay đổi `.gitignore` hiện có của người dùng.

## Xác minh

- Kiểm tra mọi đường dẫn và tên module trong cây tồn tại tại thời điểm viết.
- Kiểm tra `AGENTS.md` liên kết đúng tới `ARCHITECTURE.md` và `CONTEXT.md`.
- Tìm các câu mâu thuẫn với Next.js convention hoặc chính sách giữ tương thích code cũ.
- Chạy `git diff --check` để phát hiện lỗi whitespace.
- Vì chỉ thay đổi tài liệu, không bắt buộc chạy build hoặc test ứng dụng.

## Tiêu chí hoàn thành

- Người mới có thể xác định nơi đặt một page, component hiển thị, Frontend workflow, Route Handler, Backend rule, migration và test.
- Model AI được chỉ thị rõ phải đọc tài liệu nào và không được tự ý thêm business logic vào code cũ.
- Cây thư mục phản ánh dự án hiện tại nhưng không bị nhiễu bởi artifact sinh tự động.
- Các quy tắc đủ chặt để bảo vệ kiến trúc nhưng không cản trở convention bắt buộc của framework.
