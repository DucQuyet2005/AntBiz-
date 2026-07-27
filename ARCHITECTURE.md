# Kiến trúc dự án AntBiz

Tài liệu này giúp người phát triển và model AI hiểu nơi đặt code, hướng phụ thuộc và vai trò của các thư mục hiện tại. Đây là bản đồ kiến trúc, không phải yêu cầu di chuyển toàn bộ code cũ ngay lập tức.

## Đọc nhanh trước khi code

Mỗi thay đổi nên được phân loại trước:

| Loại thay đổi | Nơi đặt chính |
| --- | --- |
| Page, layout hoặc file convention của Next.js | `app/` |
| UI thuần, dùng lại được | `components/` |
| Workflow hoặc điều phối phía trình duyệt | `frontend/modules/<domain>/` |
| Route HTTP | `app/api/**/route.ts` |
| Business rule và workflow phía server | `backend/modules/<domain>/` |
| Supabase client hoặc tiện ích hạ tầng hiện hữu | `utils/`, đôi khi `lib/` |
| Schema/data migration | `migrations/` |
| Test module hoặc Route Handler | `__tests__/` |
| Test hành vi trên trình duyệt | `e2e/` |
| Tài nguyên tĩnh | `public/` |

Nguyên tắc quan trọng: `app/` là nơi framework tìm entry point, không phải nơi mặc định chứa implementation nghiệp vụ.

## Cây thư mục hiện tại

Cây dưới đây tập trung vào source code và tài liệu có ý nghĩa. Các artifact như `.next/`, `node_modules/`, `coverage/` và output tạm thời không được liệt kê.

```text
AntBiz-/
├── app/                              # Next.js App Router và HTTP adapters
│   ├── (auth)/                       # Các trang đăng nhập/khôi phục tài khoản
│   ├── (dashboard)/                  # Các trang ứng dụng sau đăng nhập
│   │   ├── admin/
│   │   ├── ai-creator/
│   │   ├── archive/
│   │   ├── content-calendar/
│   │   ├── notifications/
│   │   ├── prompts/
│   │   ├── search/
│   │   └── settings/
│   ├── api/                          # Route Handlers; phải giữ mỏng
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── frontend/
│   └── modules/
│       └── quick-publishing/         # Workflow Đăng nhanh phía client
│           ├── index.ts              # Public interface
│           ├── quick-publishing-client.ts
│           ├── quick-publishing-errors.ts
│           ├── quick-publishing-events.ts
│           ├── quick-publishing-module.ts
│           ├── quick-publishing-types.ts
│           └── use-quick-publishing.ts
├── backend/
│   └── modules/                      # Business modules phía server
│       ├── account-security/
│       ├── article-ingestion/
│       ├── audit-reporting/
│       ├── author-profiles/
│       ├── caption-export/
│       ├── caption-generation/
│       ├── caption-management/
│       ├── document-parsing/
│       ├── gemini-capacity/
│       ├── global-search/
│       ├── landing-configuration/
│       ├── notifications/
│       ├── platform-presets/
│       ├── prompt-configs/
│       ├── prompts/
│       ├── scheduled-publishing/
│       ├── social-account-connections/
│       ├── speech-processing/
│       └── user-access-administration/
├── components/                       # Presentation và UI dùng lại hiện hữu
│   └── views/                        # View cấp màn hình; presentation adapters
├── contexts/                         # React contexts cấp ứng dụng
├── lib/                              # Compatibility và hạ tầng dùng chung hiện hữu
├── utils/
│   └── supabase/                     # Supabase client/server/admin adapters
├── prompts/                          # Prompt tĩnh dùng phía server
├── migrations/                       # Database migrations
├── public/                           # Static assets
├── scripts/                          # Entry point cho tác vụ vận hành
├── __tests__/
│   ├── api/                          # Test HTTP adapters và contract
│   ├── backend/                      # Test qua interface Backend module
│   ├── integration/
│   ├── lib/
│   └── validations/
├── e2e/                              # End-to-end browser tests
├── docs/
│   ├── CHANGELOG.md
│   └── superpowers/specs/            # Đặc tả thiết kế đã duyệt
├── AGENTS.md                         # Quy định bắt buộc cho người và AI
├── ARCHITECTURE.md                   # Tài liệu hiện tại
├── CONTEXT.md                        # Ngôn ngữ và trách nhiệm các domain
├── PRODUCT.md                        # Bối cảnh sản phẩm
├── DESIGN.md                         # Quy chuẩn thiết kế hiện hữu
├── database.sql                      # Database reference hiện hữu
├── worker.ts                         # Entry point background worker hiện hữu
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Frontend: `frontend/modules/`

Frontend module sở hữu workflow chạy phía trình duyệt: thứ tự gọi nhiều endpoint, tích lũy stream, quản lý một phiên thao tác, ánh xạ event và phối hợp nhiều bước trước khi trả kết quả cho view.

Ví dụ hiện tại là Quick Publishing. Module này điều phối Preset, Caption Generation, draft và Scheduled Publishing, trong khi `components/views/AiCreatorView.tsx` chịu trách nhiệm hiển thị và chiếu event thành React state.

### Frontend module nên chứa gì?

- Interface công khai mà view/hook sử dụng.
- Types và event của workflow.
- Error có kiểu rõ ràng để presentation ánh xạ thành thông báo.
- Client adapter gọi Route Handler.
- Module implementation che giấu thứ tự gọi, xử lý stream và quy tắc điều phối.
- React hook mỏng khi cần nối module với lifecycle của React.

### Frontend module không nên chứa gì?

- JSX, màu sắc, spacing, animation hoặc nội dung dịch dành riêng cho một view.
- Secret, admin credential hoặc truy cập database trực tiếp.
- Business rule về authorization hay tính hợp lệ cuối cùng của dữ liệu.
- Import implementation từ `backend/`.

### Cây mẫu Frontend module

Không bắt buộc module nào cũng có tất cả file sau. Chỉ tạo file khi nó làm interface nhỏ hơn hoặc tăng locality.

```text
frontend/modules/<domain>/
├── index.ts                  # Public exports; interface của module
├── <domain>-types.ts         # Command/result types ổn định
├── <domain>-events.ts        # Event mà presentation cần chiếu
├── <domain>-errors.ts        # Lỗi có kiểu cho caller
├── <domain>-client.ts        # Adapter gọi HTTP interface
├── <domain>-module.ts        # Workflow implementation
└── use-<domain>.ts           # React adapter, nếu thực sự cần
```

View nên gọi module theo luồng:

```text
page.tsx
  -> components/views/*
      -> frontend/modules/<domain>/index.ts
          -> client adapter
              -> app/api/**/route.ts
```

## Backend: `backend/modules/`

Backend module sở hữu business rule, authorization decision, validation đáng tin cậy, workflow server, persistence và phối hợp provider. Một module tốt cung cấp nhiều hành vi sau một interface nhỏ và giữ thay đổi của cùng domain tại một nơi.

Tên module nên dùng ngôn ngữ domain trong `CONTEXT.md`, ví dụ Caption Generation, Scheduled Publishing hoặc Account Security. Không tạo module theo tên kỹ thuật mơ hồ như `helpers`, `common-service` hay `misc`.

### Backend module nên chứa gì?

- Module implementation và interface mà Route Handler gọi.
- Input/output types và schemas.
- Domain errors ổn định.
- Repository adapter cho database.
- Provider adapter cho Gemini, email, social platform hoặc external system.
- Factory để ghép dependency thực khi việc khởi tạo đủ phức tạp.
- Pure policy/projection/serializer thuộc riêng domain đó.

### Backend module không nên chứa gì?

- React component, browser state hoặc Web API chỉ có ở client.
- JSX, translation dành cho view hoặc presentation formatting không thuộc contract.
- `NextRequest`/`NextResponse` xuyên suốt implementation. Chúng nên dừng tại Route Handler.
- Một lớp pass-through chỉ đổi tên hàm mà không che giấu complexity.

### Cây mẫu Backend module

Đây là vocabulary định hướng; module nhỏ không cần tạo đủ mọi file.

```text
backend/modules/<domain>/
├── index.ts                    # Public exports, nếu có nhiều caller
├── <domain>-module.ts          # Business workflow implementation
├── <domain>-types.ts           # Input/output và interface types
├── <domain>-schemas.ts         # Runtime validation
├── <domain>-errors.ts          # Domain errors
├── <domain>-repository.ts      # Persistence adapter
├── <provider>-adapter.ts       # External provider adapter
└── <domain>-factory.ts         # Composition root của module, nếu cần
```

Route Handler mong muốn:

```text
app/api/<resource>/route.ts
  -> đọc HTTP request và authentication context
  -> gọi backend/modules/<domain> qua public interface
  -> ánh xạ result/domain error thành HTTP response
```

Route Handler không nên tự chứa query dài, provider fallback, workflow nhiều bước hoặc business condition có thể được kiểm thử qua interface của Backend module.

## Các thư mục và file dùng chung

### `app/`

`app/` thuộc cả hai phía ở vai trò adapter của framework:

- Page/layout nối routing của Next.js với presentation.
- Route Handler nối HTTP transport với Backend module.
- Metadata, loading, error và not-found tuân theo convention Next.js.

Không di chuyển các file convention ra khỏi `app/`. Trước khi tạo hoặc sửa chúng, phải đọc guide tương ứng trong `node_modules/next/dist/docs/` vì phiên bản Next.js của dự án có breaking changes.

### `components/`

Chứa UI thuần và các view hiện hữu. Component được phép quản lý state hiển thị cục bộ như modal mở/đóng, tab đang chọn hoặc animation. Workflow nghiệp vụ, request ordering và persistence mới phải chuyển vào Frontend module.

`components/views/` hiện còn nhiều code cũ. Áp dụng chiến lược strangler: khi sửa đúng một workflow, tách workflow đó ra module rồi giữ view làm presentation adapter; không refactor toàn bộ view ngoài phạm vi.

### `contexts/`

Chứa cross-cutting React state như ngôn ngữ hoặc session presentation. Context không phải nơi thay thế Frontend module và không nên sở hữu business workflow.

### `lib/`

`lib/` chứa nhiều compatibility code, hook, type, validation và integration cũ. Không mặc định đặt code mới ở đây. Trước khi thêm file, kiểm tra:

1. Nó có thuộc một domain trong `CONTEXT.md` không?
2. Nó chạy ở Frontend hay Backend?
3. Nó có thể nằm trong module tương ứng để tăng locality không?

Chỉ giữ tại `lib/` khi đây thực sự là infrastructure/compatibility dùng bởi nhiều domain hoặc việc di chuyển nằm ngoài phạm vi thay đổi.

### `utils/supabase/`

Chứa adapter khởi tạo Supabase theo môi trường client, server hoặc admin. Business rule và query đặc thù domain không được thêm vào đây; chúng thuộc repository adapter của Backend module.

### `prompts/`

Chứa prompt tĩnh. Nếu prompt chỉ phục vụ một Backend module và cần thay đổi cùng implementation của module, ưu tiên đặt gần module. Giữ `prompts/` cho prompt thực sự dùng chung hoặc đã có contract vận hành riêng.

### `migrations/` và `database.sql`

`migrations/` là lịch sử thay đổi schema/data có thứ tự. `database.sql` là reference hiện hữu, không thay thế migration mới. Không sửa database chỉ để phù hợp một refactor code nếu thay đổi schema chưa được yêu cầu.

### `worker.ts` và `scripts/`

Đây là entry point vận hành. Chúng được phép đọc config và khởi chạy tác vụ, nhưng phải gọi Backend module thay vì sao chép workflow từ Route Handler hoặc module.

### `__tests__/` và `e2e/`

- `__tests__/backend/<domain>/`: kiểm thử business behavior qua interface của module và các adapter quan trọng.
- `__tests__/api/`: kiểm thử HTTP contract, authentication mapping, status và response shape.
- `__tests__/integration/`: kiểm thử sự phối hợp giữa nhiều seam thực.
- `e2e/`: kiểm thử hành trình người dùng trong trình duyệt.

Interface là test surface. Nếu test phải xuyên qua nhiều implementation detail để kiểm tra một business rule, xem lại độ sâu của module trước khi thêm mock.

## Hướng phụ thuộc

```text
Browser
  -> app page/layout
      -> presentation adapter (components/views)
          -> Frontend module
              -> HTTP interface (app/api)
                  -> Backend module
                      -> repository/provider adapter
                          -> database/external system
```

Quy tắc:

1. Frontend không import implementation từ `backend/`.
2. Backend không import presentation code hoặc browser-only code.
3. View và Route Handler gọi public interface; không biết chi tiết repository/provider nếu không cần.
4. Adapter phụ thuộc vào module interface, không để module phụ thuộc ngược vào Next.js transport.
5. Chỉ tạo seam khi có nhu cầu thay đổi hoặc kiểm thử thật. Một adapter duy nhất không tự động cần thêm interface/class trừu tượng.

## Shared types và validation

Không tạo `shared/` như một ngăn chứa mặc định.

- Backend validation và authorization là nguồn quyết định cuối cùng.
- Frontend có thể lặp lại validation nhẹ để phản hồi tức thời, nhưng không được coi đó là bảo vệ server.
- Type mô tả HTTP contract có thể chia sẻ khi contract ổn định và có nhiều consumer. Nơi đặt phải có tên theo contract/domain, không đặt trong `utils`.
- Không import database row type hoặc provider response thô vào presentation. Backend module nên chiếu chúng thành result type ổn định.

## Cách thêm một tính năng mới

1. Tìm domain tương ứng trong `CONTEXT.md`.
2. Kiểm tra module hiện hữu trong `frontend/modules/` hoặc `backend/modules/`.
3. Xác định interface mà caller thực sự cần biết.
4. Đặt implementation sau interface đó; tránh làm caller biết thứ tự request, schema database hoặc provider detail.
5. Giữ page, view và Route Handler mỏng.
6. Kiểm thử business behavior qua interface module; chỉ dùng test transport cho HTTP contract.
7. Nếu tạo domain mới, cập nhật `CONTEXT.md` trước hoặc cùng thay đổi.

Ví dụ:

- Thêm quy tắc kiểm tra lịch đăng: `backend/modules/scheduled-publishing/`.
- Thêm điều phối sinh nhiều caption đồng thời ở client: `frontend/modules/quick-publishing/`.
- Thêm modal xem trước thuần UI: `components/`.
- Thêm endpoint cho workflow có sẵn: Route Handler trong `app/api/`, gọi Backend module hiện hữu.
- Thêm cột database: migration mới trong `migrations/`, sau đó cập nhật repository adapter liên quan.

## Cách xử lý code cũ

Áp dụng quy định theo hướng tăng dần:

1. Không di chuyển code ngoài phạm vi chỉ để đạt cây thư mục lý tưởng.
2. Khi sửa business logic cũ, tách phần đang thay đổi vào module đúng domain.
3. Giữ adapter tương thích để public URL, response shape và caller hiện tại tiếp tục hoạt động.
4. Chuyển từng caller sang interface mới.
5. Chạy test liên quan, type-check và mức xác minh tương xứng với rủi ro.
6. Chỉ xóa implementation cũ khi không còn caller và hành vi đã được test bảo vệ.

Mục tiêu là tăng locality và leverage của module theo từng thay đổi, không thực hiện một cuộc di chuyển hàng loạt gây rủi ro.

## Checklist trước khi hoàn thành thay đổi

- [ ] Đã đọc `AGENTS.md`, tài liệu này và domain liên quan trong `CONTEXT.md`.
- [ ] Đã đọc Next.js guide cục bộ nếu chạm file/convention của Next.js.
- [ ] Business logic mới nằm trong Frontend hoặc Backend module đúng domain.
- [ ] Page, view và Route Handler vẫn là adapter mỏng.
- [ ] Không có import Frontend-to-Backend implementation hoặc Backend-to-presentation.
- [ ] Không nhân đôi authorization/business validation ở client như nguồn quyết định.
- [ ] Test kiểm tra qua interface phù hợp.
- [ ] Code cũ chỉ bị xóa sau khi caller đã chuyển và test đã qua.
- [ ] `CONTEXT.md`, tài liệu kiến trúc hoặc changelog đã được cập nhật khi phạm vi yêu cầu.
