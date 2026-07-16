# Sprint 3 Quality Gates

## Mục tiêu

Đưa nhánh `us_301` về trạng thái có thể dùng làm baseline cho Sprint 3 bằng cách sửa các lỗi TypeScript và test đang chặn, thay lệnh lint đã bị Next.js 16 loại bỏ, và thiết lập ESLint baseline để lỗi legacy không che mất lỗi mới.

Thay đổi phải giữ nguyên hành vi sản phẩm, không sửa hoặc commit `.gitignore` cá nhân của người dùng, và kết thúc với bốn quality gate chạy thành công: type-check, test, lint và production build.

## Bối cảnh đã xác minh

- `npm run build` thành công nhưng `next.config.mjs` đang đặt `typescript.ignoreBuildErrors: true`, nên build không thay thế type-check độc lập.
- `npx tsc --noEmit` báo sáu lỗi source vì `showCategory` và `categoryClean` được dùng ngoài lexical scope trong preview bước 3 của `AiCreatorView`.
- TypeScript còn đọc một validator cũ trong `.next/dev/types`, là artifact của dev server chứ không phải source hoặc production route types.
- Bộ test có 699/700 test đạt. Test còn lại vẫn đòi toolbar rich-text dù toolbar đó đã được chủ động xóa khỏi editor.
- `npm run lint` dùng `next lint`, lệnh đã bị loại bỏ từ Next.js 16. Tài liệu cục bộ tại `node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md` yêu cầu dùng ESLint CLI.
- ESLint 9.39.4 hỗ trợ suppression baseline bằng `--suppress-all`, `--prune-suppressions` và file suppression riêng.

## Thiết kế

### 1. Sửa scope của preview bước 3

Trong IIFE dựng Selected Variant Preview của bước 3, sau khi tìm được variant, tính:

- `categoryClean` từ `postData.category`;
- `showCategory` theo cùng điều kiện đã dùng ở preview bước 2.

Ba nhánh Threads, Instagram và Facebook tiếp tục dùng cùng hai giá trị này. Không thay đổi markup, dữ liệu, text hoặc hành vi hiển thị.

### 2. Đồng bộ test Inline Edit với hành vi hiện tại

Đổi tên test editing-state để mô tả textarea editor thay vì rich-text toolbar. Test sẽ xác nhận:

- wrapper editing tồn tại và chiếm toàn chiều rộng;
- textarea là editor đầu tiên trong wrapper;
- textarea nhận đúng value;
- textarea giữ class `resize-none`.

Không thêm toolbar trở lại vì lịch sử commit xác nhận toolbar bold/italic đã bị loại bỏ do giới hạn định dạng nền tảng.

### 3. Type-check ổn định ngoài build

Thêm script `typecheck` chạy `next typegen` trước TypeScript, đúng hướng dẫn Next.js 16, để route types được sinh mà không cần full build.

Dùng `tsconfig.typecheck.json` chuyên cho quality gate. Config này kế thừa compiler options hiện tại nhưng chỉ include source/test/config cần kiểm tra và production route types tại `.next/types`; nó không include `.next/dev/types`. Cách này tránh việc artifact dev cũ làm hỏng CI nhưng vẫn kiểm tra App Router route types do `next typegen` sinh.

Không bật lại type-check bên trong `next build` trong phạm vi này vì cấu hình bỏ qua đang phục vụ giới hạn RAM của VPS. `npm run typecheck` là quality gate bắt buộc riêng trước khi push.

### 4. Chuyển lint sang ESLint CLI và tạo baseline

Đổi script:

```text
lint -> eslint . --max-warnings 0
```

Mở rộng `globalIgnores` để bỏ qua source không thuộc ứng dụng và artifact sinh tự động, gồm `.agents`, `.gemini`, `.superpowers`, `coverage`, `pipeline_output`, `scratch`, `.next`, `out`, `build` và `next-env.d.ts`.

Sau khi ignore đúng phạm vi, chạy ESLint với `--suppress-all` để tạo `eslint-suppressions.json` cho mọi violation legacy còn tồn tại. File này được commit để:

- lỗi/warning legacy hiện hữu không chặn Sprint 3;
- violation mới chưa có trong baseline làm `npm run lint` thất bại;
- khi sửa được legacy violation, suppression thừa được loại bằng script `lint:prune` chạy ESLint với `--prune-suppressions`.

Baseline không tắt rule trong `eslint.config.mjs`, vì tắt rule sẽ làm ESLint bỏ qua cả lỗi mới. Suppression gắn debt hiện hữu với file/rule cụ thể và có thể giảm dần.

### 5. Scripts chất lượng

`package.json` sẽ cung cấp:

- `typecheck`: sinh production route types rồi chạy TypeScript qua config quality gate;
- `lint`: chạy ESLint CLI và không chấp nhận warning mới;
- `lint:prune`: xóa suppression không còn cần thiết;
- giữ nguyên `test`, `build` và các script runtime khác.

## Phạm vi file

Các file dự kiến thay đổi hoặc tạo:

- `components/views/AiCreatorView.tsx`
- `__tests__/components/inlineEdit.test.tsx`
- `package.json`
- `eslint.config.mjs`
- `eslint-suppressions.json`
- `tsconfig.typecheck.json`
- `docs/CHANGELOG.md`

Không thay đổi `.gitignore`, public HTTP contract, database, dependency hoặc module architecture.

## Xác minh

Chạy tuần tự:

1. `npm run typecheck`
2. `npm test`
3. `npm run lint`
4. `npm run build`
5. `git diff --check`
6. `git status --short` để xác nhận `.gitignore` vẫn là thay đổi cá nhân duy nhất ngoài các file đang chuẩn bị commit.

Không sửa test chỉ để che lỗi implementation: test Inline Edit được đổi vì expectation đã mâu thuẫn với hành vi sản phẩm được chủ động thay đổi trước đó. TypeScript source errors được sửa trong implementation trước khi chạy lại gate.

## Tiêu chí hoàn thành

- Sáu lỗi scope trong `AiCreatorView` không còn.
- Artifact `.next/dev/types` không tham gia quality type-check.
- 700 test hiện tại đều đạt.
- `npm run lint` dùng ESLint CLI, baseline legacy được áp dụng và command trả exit code 0.
- `npm run build` tiếp tục thành công.
- `.gitignore` không được stage hoặc commit.
- Commit implementation chỉ chứa các thay đổi quality gate trong phạm vi thiết kế này.
