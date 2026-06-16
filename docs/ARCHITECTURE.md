# Architecture - Xây như thế nào?

Kiến trúc của **AntBiz AI Content Publisher** được thiết kế theo mô hình **Next.js Fullstack** hoàn chỉnh, chạy trên nền tảng đám mây Serverless. Hệ thống tích hợp cả Frontend (Client Dashboard), Backend (API Routes & Server Actions) và Chrome Extension trong cùng một monorepo để tối đa hóa tính đồng bộ.

---

## 1. Stack Công Nghệ (Tech Stack)

### Frontend (Client-side)
* **Next.js 14+ (App Router)**: Framework React hỗ trợ Server Components (RSC) tối ưu hiệu năng và SEO, kết hợp Client Components cho các giao diện động.
* **TypeScript 5.8**: Đảm bảo an toàn kiểu dữ liệu (Type safety) từ FE đến BE.
* **Tailwind CSS**: Framework CSS tiện ích cho giao diện Dashboard hiện đại và đáp ứng (Responsive).
* **Motion (framer-motion)**: Thư viện tạo các chuyển động mượt mà và kéo-thả trực quan trên Lịch tổng hợp (Unified Calendar).
* **Recharts**: Biểu đồ hiển thị dữ liệu đo lường hiệu năng của A/B Test (Impressions, Clicks, CTR).
* **Lucide React & Radix UI**: Bộ icon chất lượng cao và các component nền móng (accessible primitives) làm nền tảng cho `shadcn/ui`.

### Backend (Server-side)
* **Next.js Route Handlers**: Xử lý các RESTful API endpoints cho Chrome Extension, Webhook tiếp nhận tương tác, và tác vụ nền.
* **Next.js Server Actions**: Giao tiếp trực tiếp giữa FE và BE bảo mật không cần REST API truyền thống cho các nghiệp vụ như Quản lý Prompt, Hẹn giờ đăng bài.
* **Vercel AI SDK**: Thư viện quản lý luồng dữ liệu (streaming) từ mô hình ngôn ngữ lớn đến giao diện người dùng.
* **Google Generative AI SDK**: Kết nối trực tiếp với **Gemini 1.5 Flash** (sinh caption nhanh, phân tích chủ đề) và **Gemini 1.5 Pro** (viết prompt chuyên sâu).
* **Firecrawl SDK**: Trích xuất nội dung bài viết gốc từ URL và định dạng lại thành Markdown sạch cho AI.
* **NextAuth.js (Auth.js v5)**: Quản lý phiên làm việc (Session) bằng JWT, hỗ trợ xác thực Credentials và Google OAuth (SSO) kèm kiểm tra domain công ty.

### Database & Infrastructures (Dữ liệu & Hạ tầng)
* **PostgreSQL (Neon / Supabase)**: Hệ quản trị cơ sở dữ liệu quan hệ lưu trữ thông tin chiến dịch, lịch đăng bài, biến thể A/B Test. Neon hỗ trợ Serverless Connection Pooling hoàn hảo.
* **Prisma ORM**: Định nghĩa schema, tạo migrations và truy vấn dữ liệu an toàn.
* **Inngest**: Engine quản lý Job/Cron/Queue chạy serverless, giải quyết timeout của Vercel cho các tác vụ: đăng bài hẹn giờ, luân phiên phân phối biến thể A/B Test, và xuất CSV dung lượng lớn.
* **Resend**: Dịch vụ gửi email kích hoạt, đặt lại mật khẩu và gửi file báo cáo CSV đính kèm.

---

## 2. Cấu Trúc Dự Án (Directory Structure)

```
AntBiz/
├── app/                         # App Router của Next.js (FE & BE)
│   ├── (auth)/                  # Nhóm router xác thực (login, register, reset-password)
│   ├── (dashboard)/             # Nhóm router Dashboard quản lý chính
│   │   ├── campaigns/           # Quản lý bài đăng
│   │   ├── prompts/             # Quản lý kho Prompt
│   │   ├── ab-testing/          # Báo cáo và cấu hình A/B Test
│   │   ├── calendar/            # Lịch đăng bài tổng hợp (Unified Calendar)
│   │   └── page.tsx             # Màn hình Dashboard tổng quan
│   ├── actions/                 # Next.js Server Actions (Prompt, Caption, Schedule)
│   ├── api/                     # API Route Handlers
│   │   ├── auth/[...nextauth]/  # Cấu hình NextAuth
│   │   ├── inngest/             # Endpoint xử lý Background Jobs của Inngest
│   │   ├── scrape/              # API phục vụ Chrome Extension cào web
│   │   └── track/               # Redirect endpoint đo lường click A/B Test
│   ├── layout.tsx               # Layout gốc (Root)
│   └── page.tsx                 # Trang Landing Page giới thiệu
├── components/                  # Các Component UI dùng chung
│   ├── ui/                      # Các Base Component (Button, Dialog, Calendar...) từ shadcn
│   ├── Editor/                  # Bộ biên tập Caption trực tiếp (Inline Editor)
│   ├── Calendar/                # Component Lịch kéo thả (Framer Motion)
│   └── Charts/                  # Component Biểu đồ A/B test (Recharts)
├── lib/                         # Cấu hình các thư viện bên thứ ba
│   ├── db.ts                    # Khởi tạo Prisma Client
│   ├── gemini.ts                # Khởi tạo Google Gemini Client
│   ├── inngest.ts               # Khởi tạo Inngest Client
│   └── utils.ts                 # Các hàm helper chung
├── prisma/                      # Quản lý database schema
│   ├── schema.prisma            # Định nghĩa toàn bộ các bảng và mối quan hệ
│   └── migrations/              # Lịch sử thay đổi cơ sở dữ liệu
├── extension/                   # Chrome Extension – AntBiz Helper (Sprint 3)
│   ├── manifest.json            # Manifest v3 cấu hình quyền & Service Worker
│   ├── background.js            # Service Worker: API calls, authentication sync
│   ├── content.js               # Content Script: cào DOM gocnhinmoi.com.vn
│   └── popup/                   # Popup UI: React + Tailwind CSS thu nhỏ
└── docs/                        # Tài liệu dự án (spec, architecture, user stories)
```

---

## 3. Quản Lý Trạng Thái & Dữ Liệu (State & Data Management)

### Luồng Truyền Dữ Liệu (Data Flow)

Dữ liệu di chuyển tuần hoàn giữa Client Dashboard, Next.js Server, và các dịch vụ AI/DB theo luồng dưới đây:

```
[React Client Component]
       │
       ├─► (Server Action) ──► [Prisma Client] ──► [PostgreSQL (Neon)]
       │
       ├─► (Vercel AI SDK) ──► [Route Handler] ──► [Gemini API (Stream)]
       │
       └─► (PostHog / Analytics) ──► [Đo lường sự kiện click trực tiếp]
```

### Cơ chế Quản lý State cục bộ & Optimistic Updates
* **React `useOptimistic`**: Khi Marketer sửa Caption trực tiếp (Inline Edit) hoặc đổi lịch đăng bài bằng kéo thả, UI sẽ cập nhật trạng thái mới ngay lập tức để người dùng có cảm giác mượt mà (0ms latency), song song đó Server Action sẽ chạy ngầm để lưu vào PostgreSQL. Nếu Server trả về lỗi, UI tự động rollback về state cũ.
* **Vercel AI SDK (`useCompletion` / `useChat`)**: Quản lý trạng thái streaming của Caption được sinh ra từ Gemini API. Dữ liệu văn bản sẽ hiển thị dần trên màn hình thay vì bắt người dùng chờ toàn bộ văn bản được sinh xong.

---

## 4. Cơ Chế Xác Thực & Phân Quyền (Authentication Flow)

```
[Đăng ký / SSO Google] ──► [NextAuth.js v5 (JWT)] ──► [Kiểm tra Email / Domain]
                                    │
                                    ├─► Kích hoạt tài khoản / Đăng nhập
                                    │
           [Viewer] ◄───────────────┼───────────────► [Marketer / Admin]
     (Chỉ xem biểu đồ, lịch)                 (Toàn quyền tạo/sửa/đăng bài/A-B test)
```

### Phân quyền người dùng (Role-Based Access Control - RBAC)
* **ADMIN**: Quản trị hệ thống, xem/phân vai trò người dùng (User Role), khóa/mở khóa tài khoản (ngay lập tức đẩy session của User đó ra thông qua middleware của NextAuth).
* **MARKETER**: Toàn quyền tương tác với nội dung (Prompt, SourcePost, Caption, A/B Test, Unified Calendar).
* **VIEWER**: Chỉ có quyền đọc (Read-only) dữ liệu biểu đồ, danh sách caption và lịch trình đăng bài, không có quyền chỉnh sửa hay đăng bài.

### Xác thực SSO Google với Ràng buộc Domain
Khi người dùng đăng nhập bằng Google OAuth, NextAuth Callback sẽ kiểm tra domain của email:
```typescript
async signIn({ account, profile }) {
  if (account.provider === "google") {
    return profile.email.endsWith("@company.com"); // Chỉ cho phép domain của công ty
  }
  return true;
}
```

---

## 5. Cấu Trúc Dữ Liệu & Models (Prisma Schema)

Dự án sử dụng cơ sở dữ liệu PostgreSQL thông qua Prisma ORM với cấu trúc schema dưới đây:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  MARKETER
  VIEWER
}

enum Platform {
  FACEBOOK
  THREADS
  INSTAGRAM
}

enum TestStatus {
  PENDING
  RUNNING
  COMPLETED
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?
  emailVerified DateTime?
  role          Role      @default(MARKETER)
  isActive      Boolean   @default(true)
  lockReason    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  prompts       Prompt[]
  captions      Caption[]
  logs          AuditLog[]
}

model Prompt {
  id          String    @id @default(uuid())
  name        String
  content     String    @db.Text
  platform    Platform
  tags        String[]
  isSystem    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  captions    Caption[]
}

model SourcePost {
  id          String    @id @default(uuid())
  title       String
  content     String    @db.Text
  url         String?
  author      String?
  category    String?   // Phân loại chủ đề tự động bằng AI
  language    String    @default("vi")
  createdAt   DateTime  @default(now())
  
  captions    Caption[]
}

model Caption {
  id            String      @id @default(uuid())
  content       String      @db.Text
  platform      Platform
  isOriginalAI  Boolean     @default(false)
  isFavorite    Boolean     @default(false)
  version       Int         @default(1)
  
  sourcePostId  String
  sourcePost    SourcePost  @relation(fields: [sourcePostId], references: [id], onDelete: Cascade)
  
  promptId      String?
  prompt        Prompt?     @relation(fields: [promptId], references: [id], onDelete: SetNull)
  
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  
  parentId      String?
  parent        Caption?    @relation("VersionHistory", fields: [parentId], references: [id])
  children      Caption[]   @relation("VersionHistory")
  
  abVariantId   String?
  abVariant     ABVariant?  @relation(fields: [abVariantId], references: [id], onDelete: Cascade)

  schedules     PublishSchedule[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model PublishSchedule {
  id            String    @id @default(uuid())
  scheduledAt   DateTime
  publishedAt   DateTime?
  status        String    @default("PENDING") // PENDING, SUCCESS, FAILED
  externalId    String?   // ID bài đăng trên MXH
  errorMessage  String?
  utmParams     Json?
  
  captionId     String
  caption       Caption   @relation(fields: [captionId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime  @default(now())
}

model ABTest {
  id            String      @id @default(uuid())
  name          String
  status        TestStatus  @default(PENDING)
  durationHours Int         @default(24)
  winnerId      String?
  createdAt     DateTime    @default(now())
  endedAt       DateTime?

  variants      ABVariant[]
}

model ABVariant {
  id            String    @id @default(uuid())
  label         String    // "A", "B", "C"
  impressions   Int       @default(0)
  clicks        Int       @default(0)
  ctr           Float     @default(0.0)
  
  testId        String
  test          ABTest    @relation(fields: [testId], references: [id], onDelete: Cascade)
  captions      Caption[]
}

model AuditLog {
  id        String   @id @default(uuid())
  action    String
  details   Json?
  createdAt DateTime @default(now())
  
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 6. Luồng Nghiệp Vụ AI & Kiểm Tra Trùng Lặp (Duplicate Check)

Để đảm bảo nội dung mới không bị lặp lại quá 70% so với 100 caption gần nhất đã đăng trên cùng kênh (Facebook/Threads/Instagram):

1. **Sinh văn bản**: Next.js Backend gửi yêu cầu đến Gemini 1.5 Flash kèm Prompt tối ưu hóa theo kênh.
2. **Trích xuất Vector / So khớp từ**:
   * Hệ thống truy vấn 100 caption gần nhất của kênh từ PostgreSQL.
   * Sử dụng **Jaccard Similarity** (dựa trên tập hợp n-grams từ) hoặc tính toán **Cosine Similarity** trên Vector Embeddings (gọi API Embedding của Gemini) để đo lường mức độ tương đồng giữa caption mới sinh và 100 caption cũ.
3. **Phản hồi**:
   * Nếu Độ tương đồng $\ge 70\%$: Trả về kết quả kèm cờ cảnh báo `warningDuplicate = true` và đề xuất prompt phụ để AI viết lại (ví dụ: *Đổi ngôi kể, tập trung vào CTA khác*).
   * Nếu Độ tương đồng $< 70\%$: Lưu caption thành công và cho phép phê duyệt.

---

## 7. Quy Trình Thử Nghiệm A/B Test & Tự Động Chọn Winner

Quá trình A/B Test diễn ra tự động thông qua Event-driven Job của Inngest:

1. **Thiết lập & Phân phối (Start Test)**:
   * Marketer tạo chiến dịch A/B Test với 2-3 biến thể caption.
   * Inngest lên lịch gửi event. Trong thời gian chạy test (ví dụ: 24 giờ), hệ thống sẽ luân phiên xuất bản các bài đăng có link được gắn tracking parameter (ví dụ: `https://antbiz.com/api/track?variantId=xxx&redirect=url`).
2. **Ghi nhận chỉ số (Metrics Tracking)**:
   * Khi người dùng nhấp vào link bài đăng, endpoint `/api/track` ghi nhận 1 click vào model `ABVariant` tương ứng và thực hiện chuyển hướng (redirect) ngay lập tức đến đích cuối.
   * Lượt hiển thị (impressions) được đồng bộ định kỳ từ Facebook Insights Webhook về DB.
3. **Đánh giá Winner**:
   * Sau khi hết thời gian chạy test (24h), Inngest tự động kích hoạt job tổng kết.
   * Tính toán tỷ lệ nhấp: $CTR = \frac{Clicks}{Impressions} \times 100$.
   * Biến thể nào có CTR cao nhất sẽ tự động được ghi nhận là Winner trong bảng `ABTest` và được hệ thống ưu tiên giữ lại làm bài đăng chính thức.

---

## 8. Lập Lịch Đăng Bài & Thuật Toán Khung Giờ Vàng (Golden Hour)

### Giải pháp Hàng đợi Lên lịch (Serverless Scheduling)
Hệ thống sử dụng **Inngest Delays** để xử lý đăng bài tự động trên môi trường Serverless:
```typescript
// Gửi event lên lịch đăng bài
await inngest.send({
  name: "post.publish",
  data: { scheduleId: "schedule-uuid-123" },
  delay: "24h" // Hoặc thời gian chênh lệch cụ thể
});
```
Đến đúng giờ hẹn, Inngest gọi lại endpoint `/api/inngest` trên Next.js Server để thực hiện gọi API các mạng xã hội (Facebook Graph API, Threads API) để đăng bài.

### Thuật toán Khung Giờ Vàng
Hệ thống thống kê số liệu lượng tương tác (Like, Share, Comment, Click) của Fanpage trong 30 ngày qua theo từng khung giờ trong ngày:
$$\text{Engagement Score} = \text{Likes} + 2 \times \text{Comments} + 3 \times \text{Shares} + 1.5 \times \text{Clicks}$$
Hệ thống gom nhóm (group) dữ liệu theo giờ (0-23) và thứ trong tuần, sau đó chọn ra 3 múi giờ có tổng số điểm cao nhất để đề xuất làm "Khung giờ vàng" cho Marketer.

---

## 9. Triển Khai Thực Tế (Deployment & Environment)

### Triển khai Web App (Vercel)
* **Build Command**: Next.js tự động tối ưu hóa bản build khi chạy lệnh `npm run build`.
* **Cấu hình API Timeout**: Do các tác vụ AI và Web Scraping có thể kéo dài, cấu hình Route Handler được tăng timeout bằng export config (đối với gói Vercel Pro):
  ```typescript
  export const maxDuration = 60; // 60 giây
  ```
* **Cấu hình CORS cho Extension**:
  Cho phép Chrome Extension kết nối trực tiếp đến Next.js Backend qua Header cấu hình tại `next.config.js`:
  ```javascript
  headers: [
    { key: "Access-Control-Allow-Origin", value: "chrome-extension://<EXTENSION_ID>" },
    { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" }
  ]
  ```

---

## 10. Kiến Trúc Chrome Extension (Manifest V3)

Chrome Extension **AntBiz Helper** tích hợp sâu với quy trình cào web trực tiếp từ `gocnhinmoi.com.vn`.

### Các Thành Phần
* **Popup UI**: Viết bằng React + Tailwind CSS đóng gói siêu nhẹ bằng Vite, hiển thị các Tab preview cho 3 nền tảng mạng xã hội và form cấu hình Prompt.
* **Content Script (`content.js`)**: Nhúng trực tiếp vào trang `gocnhinmoi.com.vn`. Khi phát hiện sự kiện tải trang, nó tự động phân tích DOM để trích xuất tiêu đề, nội dung và tag bài viết, sau đó gửi message về Popup UI.
* **Service Worker (`background.js`)**: Quản lý phiên làm việc JWT đồng bộ từ Web Dashboard, gửi request cào dữ liệu qua API Proxy nếu Content Script bị chặn bởi chính sách CORS của trình duyệt.

### Mô hình Đồng bộ Token Xác thực
```
[Web Dashboard Đăng nhập] ──► Lưu Token JWT vào Local Storage
                                     │
                             (Đồng bộ một lần)
                                     ▼
[Chrome Extension Popup]  ──► Lưu Token JWT vào chrome.storage.local
                                     │
                             (Mọi API Request)
                                     ▼
[Next.js Backend API]     ◄── Đính kèm JWT trong Header Authorization
```
