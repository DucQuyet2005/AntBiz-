# Lịch sử thay đổi (Changelog) - AntBiz

Tất cả các thay đổi đáng chú ý đối với dự án AntBiz sẽ được ghi nhận tại đây.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-06-17

### Added
- **Hỗ trợ Đa ngôn ngữ (Vietnamese / English)**: Xây dựng hệ thống đa ngôn ngữ tùy chỉnh sử dụng React Context (`LanguageContext.tsx`) với Tiếng Việt là mặc định, hỗ trợ lưu lựa chọn vào `localStorage` và đồng bộ tức thì qua Custom Window Event.
- **Từ điển Dịch thuật toàn cục**: Tạo tệp `translations.ts` với đầy đủ khóa dịch cho toàn bộ giao diện (Overview, AI Creator, Lịch nội dung, Lưu trữ, FAQ, Settings, Header, Footer).
- **Bộ chuyển đổi Ngôn ngữ**: Tích hợp widget chọn ngôn ngữ đẹp mắt trong `Sidebar` và đồng bộ với menu cài đặt trong `Settings`.
- **Trình duyệt trực tiếp & Bộ cào dữ liệu Gocnhinmoi (Live Website Proxy & Scraper)**:
  - Tạo API route `/api/proxy` làm cổng reverse proxy cho `gocnhinmoi.com.vn`, tự động tải mã nguồn HTML, viết lại tài nguyên tương đối (relative links/assets) và đồng bộ tọa độ URL.
  - Tạo API endpoint `/api/scrape` sử dụng Cheerio để trích xuất thẻ Open Graph và siêu dữ liệu (title, description, author, category, images) từ URL bài viết bất kỳ.
  - Tích hợp cửa sổ Live Explorer (iframe) trong `AiCreatorView` cho phép duyệt trang trực tiếp, hỗ trợ điều hướng quay lại (history back), làm mới (refresh) và nhập liệu trực tiếp bằng nút bấm.
- **Xem trước Mockup & Checkpoint Revert trên ArticleDetailView**:
  - Truy xuất động dữ liệu bài viết bằng UUID và kết nối trực tiếp với bảng `articles`, `ab_tests`, `captions` và `caption_versions` trong Supabase.
  - Tích hợp bộ chuyển đổi xem trước Mockup chất lượng cao mô phỏng chuẩn giao diện bài đăng của Facebook và Threads.
  - Xây dựng thanh thời gian (sidebar timeline) hiển thị danh sách checkpoints lưu lịch sử chỉnh sửa bản ghi bài đăng kèm tính năng khôi phục (revert/rollback) dữ liệu trực tiếp về Supabase.

### Changed
- **Bản địa hóa toàn bộ các View**:
  - `OverviewView`, `ChartPlaceholder`, `ActivityList`: Chuyển ngữ toàn bộ tiêu đề, nhãn biểu đồ và danh sách hoạt động.
  - `ArchiveView`: Bản địa hóa bộ lọc, thanh tìm kiếm và các chỉ số thống kê tiếp cận.
  - `ArticleDetailView`: Chuyển ngữ breadcrumbs, metadata tags và các thông số hiệu suất.
  - `FaqView`: Việt hóa bộ câu hỏi thường gặp và mẹo nâng cao.
  - `SettingsView`: Đồng bộ cài đặt ngôn ngữ hệ thống với state toàn cục và bản địa hóa form chỉnh sửa.
  - `ContentCalendarView`: Chuyển ngữ chế độ xem lịch và danh sách chiến dịch đa kênh.
  - `AiCreatorView`: Bản địa hóa toàn bộ giao diện nạp bài viết, chỉnh sửa thủ công, mô phỏng Threads, mô phỏng Facebook và thanh điều khiển của Trình duyệt trực tiếp Gocnhinmoi.
- **Đồng bộ hóa Footer**: Nâng cấp `Footer.tsx` sử dụng trực tiếp `LanguageContext` để cập nhật ngôn ngữ đồng thời với Sidebar và Settings mà không bị trễ.
- **Tái cấu trúc giao diện AI Creator**: Chuyển đổi `/ai-creator` thành giao diện lưới hai cột trực quan, gồm các bảng nạp dữ liệu (Source Ingest), điều khiển thuộc tính hiển thị (Display Customizer) và các khung xem trước biến thể A/B (Facebook / Threads).

### Fixed
- **Lỗi biên dịch TypeScript**: Khắc phục triệt để các lỗi `Cannot find name 'language'` trong `AiCreatorView` bằng cách destructure đúng biến ngôn ngữ từ hook `useLanguage`.
- **Lỗi sử dụng Client hook trên Server**: Bổ sung chỉ thị `"use client";` vào đầu tệp `components/Header.tsx` để sửa lỗi biên dịch Next.js SSR khi gọi client-hook `useLanguage()` từ Server Component.
- **Lỗi tải lại Iframe trong React**: Tách biệt thuộc tính `src` của iframe và state `explorerUrl` để giải quyết lỗi tải lại vô tận khi chuyển hướng nội bộ.
- **Hijack Next.js Client-Side Routing**: Bắt sự kiện click ở capture phase đối với liên kết anchor trên iframe để tránh Next.js nguyên bản ghi đè định tuyến.
- **Đóng ngoặc cấu trúc JSX**: Sửa lỗi cú pháp thiếu dấu ngoặc `);` và đóng hàm trong tệp `ArticleDetailView.tsx`.
- **Xác thực Client-side và Server-side**: Tích hợp kiểm tra dữ liệu đăng nhập và đăng ký sử dụng `zod` và `react-hook-form`.
- **Giới hạn số lần đăng nhập (Rate Limiting)**: Triển khai tính năng tự động khóa 3 phút sau 5 lần nhập sai liên tiếp thông qua cơ chế khóa kép: Client dùng `localStorage` để đếm ngược UI và Server dùng cookie HTTP-Only `login_lockout` để chặn các yêu cầu submit tiếp theo.
- **Thư viện mới**: Cài đặt các package `zod`, `react-hook-form`, và `@hookform/resolvers`.

### Changed
- **Cập nhật UI Form**: Cấu trúc lại giao diện đăng nhập (`app/(auth)/login/page.tsx`) và đăng ký (`app/(auth)/register/page.tsx`) để hiển thị thông báo lỗi trực quan ngay dưới từng trường nhập liệu thay vì banner lỗi chung.
- **Cập nhật Server Actions**: Bổ sung xác thực phía server bằng Zod schema và xử lý tăng/xóa cookie số lần sai (`login_attempts`, `login_lockout`) trong `app/(auth)/actions.ts`.

### Fixed
- **Sửa lỗi định hướng 404 sau khi đăng ký thành công**: Thay đổi đường dẫn chuyển hướng sau khi đăng ký thành công từ `/dashboard` sang `/` để đưa người dùng trực tiếp vào trang chủ Overview mà không gặp lỗi 404 hoặc yêu cầu đăng nhập lại.

## [1.1.0] - 2026-06-16

### Added
- **Đăng nhập Google OAuth**: Tích hợp hoàn chỉnh tính năng đăng nhập bằng tài khoản Google thông qua Supabase.
- **Đăng ký và Tự động đăng nhập**: Tự động đăng nhập người dùng và chuyển hướng vào thẳng trang chủ quản trị sau khi đăng ký thành công (khi tắt cấu hình *Confirm Email* trên Supabase).
- **Cấu hình động Redirect URL**: Tự động phân tích protocol và host từ `headers` của Next.js để tạo Redirect URL động cho OAuth (tự động hoạt động chính xác khi chạy cổng `3000`, `3001` hoặc trên Production).
- **Skill Viết Changelog**: Thêm thư mục hướng dẫn và tiêu chuẩn ghi nhận lịch sử thay đổi của tác vụ Agent tại `.agents/skills/write-changelog/SKILL.md`.

### Changed
- **Nâng cấp Cơ sở Hạ tầng**: Đồng bộ hóa toàn bộ môi trường Next.js 16 và React 19 bằng việc dọn dẹp cài đặt sạch sẽ lại `node_modules` cục bộ (giải quyết triệt để lỗi biên dịch SWC trên Windows).
- **Tối ưu hóa Điều hướng**: Thay đổi đường dẫn điều hướng mặc định sau đăng nhập thành công từ tuyến đường cũ `/dashboard` sang trang chủ `/` (Overview).
- **Cấu hình Next.js 16 Proxy**: Sử dụng cơ chế `proxy.ts` (cơ chế thay thế mới cho `middleware.ts` trong Next.js 16) để kiểm tra phiên đăng nhập Supabase và bảo vệ các tuyến đường nội bộ của dự án.

### Fixed
- **Tối ưu hóa tải ảnh**: Sửa lỗi cảnh báo tối ưu hóa hiệu năng của Next.js do thiếu thuộc tính `sizes` trong thẻ `<Image />` tại hai trang Đăng nhập (`login`) và Đăng ký (`register`).

### Removed
- **Xóa trang dư thừa**: Xóa bỏ hoàn toàn thư mục `/dashboard` tạm thời cũ (`app/(dashboard)/dashboard/`) để chuyển sang cấu trúc phẳng gọn gàng và tránh xung đột định tuyến 404.
