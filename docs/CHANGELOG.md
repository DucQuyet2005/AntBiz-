# Lịch sử thay đổi (Changelog) - AntBiz

Tất cả các thay đổi đáng chú ý đối với dự án AntBiz sẽ được ghi nhận tại đây.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-06-18

### Changed
- **Kéo dài vùng soạn thảo Nội dung trong AI Creator**: Tăng số lượng dòng hiển thị (`rows`) từ 3 lên 10 cho ô nhập liệu "Nội dung" (Description) tại Bước 1 của AI Creator (`AiCreatorView.tsx`), đồng thời chuyển thuộc tính từ cố định (`resize-none`) sang cho phép người dùng kéo giãn chiều cao thủ công (`resize-y`).

## [1.2.0] - 2026-06-17

### Added
- **Giao diện Lịch Kéo Thả 2D Đăng Bài (PostLab Calendar Board)**: Thiết lập bộ lịch đăng bài 2D tại Bước 3 của AI Creator (`AiCreatorView.tsx`), gồm 7 cột ngày (Thứ 2 - Chủ nhật) và 8 hàng giờ (16:00 - 23:00) mô phỏng chân thực theo thiết kế PostLab.
- **Tính năng Kéo Thả Snapping 2D**: Tích hợp Framer Motion cho các thẻ đăng bài Facebook (màu xanh) và Threads (màu đen) để kéo thả tự do theo hai chiều, tự động snap vào ô giờ/ngày và đồng bộ dữ liệu ngược lại ô điền thông tin bên trái.
- **Ràng buộc và Ngăn chặn Trùng Lịch (Collision Logic)**: Phát hiện và chặn các hành vi kéo thẻ chèn lên bài viết đã tồn tại (Grayscale existing posts) hoặc chèn chéo giữa hai kênh. Khi có va chạm, thẻ tự động giật về vị trí cũ (Snap-back via React Keys) kèm thông báo cảnh báo lỗi lịch bị cản trở.
- **Phân trang 3 tuần (activeWeek)**: Hỗ trợ chia kế hoạch thành 3 tuần (Tuần 1, Tuần 2, Tuần 3) chuyển đổi mượt mà bằng thanh tab đầu lịch và tự động chuyển tuần khi chọn ngày từ ô điền thủ công.
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
- **Bệ đế & Hiệu ứng Avatar Hoạt họa lấp lánh (Sparkly Profile Dropdown & Customization)**: Thiết lập hệ thống trang trí avatar động thời gian thực gồm:
  - 10 kiểu bệ đế avatar (Cỏ lún phún, Cát bãi cát, Sóng biển dập dềnh, Dung nham nóng chảy, Thảm hoa hồng rực rỡ, Mây bồng bềnh cuộn nhẹ, Bệ đá phong rêu gồ ghề, Băng giá vĩnh cửu nhô cao, Khói Cyberpunk mờ ảo, Bệ vàng hoàng gia lấp lánh) hiển thị sinh động ở chân avatar.
  - 10 hiệu ứng thời tiết/môi trường động (Mưa rơi tí tách, Tuyết mùa đông xoay đảo, Nắng ấm ban mai, Hoa anh đào bay chéo, Mưa sao băng, Lửa trại bập bùng, Bong bóng nổi lên, Bụi phép thuật đổi màu, Bão sét chớp nháy, Lá thu rơi rụng) tạo chuyển động bằng CSS nguyên bản, không lạm dụng làm mờ.
  - 3 Khung viền động cao cấp: Cầu vồng xoay 360° (*Rainbow Sparkle*), Vàng lấp lánh sang trọng (*Golden Shimmer*), Neon Cyberpunk nhấp nháy (*Cyberpunk Pulse*) sử dụng cơ chế ring-div phía sau tránh gây mờ/nhiễu ảnh gốc.
- **Trang Hồ sơ Cá nhân chuyên biệt (`/profile`)**: Tạo tuyến đường `/profile` (`ProfileView.tsx`) để tùy chỉnh thông tin tài khoản (Họ tên, Bộ phận, Vai trò, Ảnh đại diện, và Trang trí Avatar).
- **Upload Avatar lên Supabase Storage**: Hỗ trợ tải tệp ảnh đại diện trực tiếp lên Supabase bucket `avatars` của Supabase, và lưu public URL tương ứng vào cơ sở dữ liệu `users`.
- **Hỗ trợ GIF đại diện & Tối ưu lưu trữ**: Cho phép kéo thả ảnh động GIF làm avatar, tích hợp cơ chế lưu tạm Base64 trong `localStorage` để tránh phình dung lượng JWT cookie.
- **Quản lý Thư viện Prompt (Prompt Management - US111)**: Phát triển trang giao diện `/prompts` (`PromptsView.tsx`) hỗ trợ tìm kiếm, lọc theo tags/nền tảng, và thực hiện đầy đủ các tác vụ CRUD (Thêm, Sửa, Xóa, Nhân bản, Check usage).
- **Bộ API Prompts hoàn chỉnh**: Triển khai các API route backend đầy đủ cho Prompt: `GET/POST /api/prompts`, `GET/PUT/DELETE /api/prompts/[id]`, `POST /api/prompts/[id]/clone` và `GET /api/prompts/[id]/check-usage`.
- **Hệ thống Kiểm thử Prompt**: Thiết lập cấu hình Vitest (`vitest.config.ts`) và viết bộ unit/integration test suite tự động (`__tests__/api/prompts.test.ts`) kiểm thử toàn bộ logic và bảo mật API Prompt.
- **Tài liệu Đặc tả Thiết kế**: Bổ sung tài liệu đặc tả thiết kế hệ thống Profile động lấp lánh tại `docs/superpowers/specs/2026-06-17-sparkly-user-profile-design.md`.
- **Trình chọn Prompt từ Thư viện**: Bổ sung bộ chọn Prompt dạng Dialog trực tiếp bên dưới Bài viết Gốc, hỗ trợ tìm kiếm thời gian thực và áp dụng Prompt đã chọn vào trình tạo bài viết AI.
- **Giao diện Xem trước Instagram (Instagram Feed Mockup)**: Bổ sung giao diện xem trước bài viết Instagram chân thực với hiệu ứng thả tim, username `antbiz_official`, mô phỏng chi tiết lượng like và tương tác.
- **Lập lịch đăng bài Instagram**: Tích hợp bệ đắp lịch Instagram ở Bước 3, hỗ trợ kéo thả thẻ kéo trên biểu đồ Gantt 2D và đồng bộ ngược dữ liệu ngày/giờ.

### Changed
- **Tối ưu hóa Bố cục Hai Cột Bước 3**: Điều chỉnh tỷ lệ cột từ `4:8` thành `3:9` để mở rộng tối đa không gian hiển thị cho bảng lịch kéo thả 2D.
- **Đồng bộ Liên tục Form và Lịch**: Ràng buộc hai chiều hoàn chỉnh giữa các ô nhập date/time thủ công với vị trí của thẻ kéo thả trên lịch.
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
- **Lọc Nền tảng theo Tag của Prompt (Không tạo thừa tránh lãng phí)**: Cơ chế AI tự động phát hiện nền tảng đích của Prompt (Facebook, Threads, Instagram) qua trường `platform` hoặc thẻ tags (FB, Threads, Insta). Chỉ phát sinh nội dung cho nền tảng đó, đồng thời ẩn hoàn toàn các tab preview, khung lập lịch và thẻ kéo thả của các kênh không liên quan để tránh lãng phí tài nguyên.
- **Đổi tên Trường thông tin trong AI Creator**: Cập nhật bản dịch để đổi tên "Mô tả ngắn" thành "Nội dung" và "Xem trước bài viết" thành "Bài viết Gốc".
- **Hiệu ứng Chuyển trang Toàn cục (Global Page Transitions)**: Chuyển đổi layout chính thành Client Component và tích hợp Framer Motion để tạo hiệu ứng chuyển trang mượt mà (giống AI Creators) cho tất cả các trang con.
- **Cập nhật UI Form Xác thực**: Cấu trúc lại giao diện đăng nhập (`app/(auth)/login/page.tsx`) và đăng ký (`app/(auth)/register/page.tsx`) để hiển thị thông báo lỗi trực quan ngay dưới từng trường nhập liệu thay vì banner lỗi chung.
- **Cập nhật Server Actions**: Bổ sung xác thực phía server bằng Zod schema và xử lý tăng/xóa cookie số lần sai (`login_attempts`, `login_lockout`) trong `app/(auth)/actions.ts`.
- **Cấu hình CSS hiệu ứng Avatar (`app/globals.css`)**: Tích hợp các thuộc tính và keyframes CSS của bệ đế và hiệu ứng hạt rơi vào stylesheet toàn cục.
- **Cập nhật Cấu trúc Cơ sở Dữ liệu (`database.sql`)**: Bổ sung thiết lập bảng `prompts` và các thuộc tính/vai trò mặc định cho tài khoản đăng ký mới.

### Fixed
- **Lỗi tràn chữ (overflow) trên Lịch kế hoạch**: Sửa lỗi giao diện các thẻ lập lịch bị tràn viền bằng cách thêm thuộc tính `overflow-hidden`, căn chỉnh padding và ẩn nhãn thời gian dự kiến để giữ giao diện tối giản, sạch sẽ.
- **Khắc phục lỗi định tuyến Iframe Gocnhinmoi**: Tối ưu hóa cổng proxy giúp iframe hoạt động ổn định khi nhấn tải lại hoặc quay lui lịch sử.
- **Lỗi biên dịch TypeScript**: Khắc phục triệt để các lỗi `Cannot find name 'language'` trong `AiCreatorView` bằng cách destructure đúng biến ngôn ngữ từ hook `useLanguage`.
- **Lỗi sử dụng Client hook trên Server**: Bổ sung chỉ thị `"use client";` vào đầu tệp `components/Header.tsx` để sửa lỗi biên dịch Next.js SSR khi gọi client-hook `useLanguage()` từ Server Component.
- **Lỗi tải lại Iframe trong React**: Tách biệt thuộc tính `src` của iframe và state `explorerUrl` để giải quyết lỗi tải lại vô tận khi chuyển hướng nội bộ.
- **Hijack Next.js Client-Side Routing**: Bắt sự kiện click ở capture phase đối với liên kết anchor trên iframe để tránh Next.js nguyên bản ghi đè định tuyến.
- **Đóng ngoặc cấu trúc JSX**: Sửa lỗi cú pháp thiếu dấu ngoặc `);` và đóng hàm trong tệp `ArticleDetailView.tsx`.
- **Xác thực Client-side và Server-side**: Tích hợp kiểm tra dữ liệu đăng nhập và đăng ký sử dụng `zod` và `react-hook-form`.
- **Giới hạn số lần đăng nhập (Rate Limiting)**: Triển khai tính năng tự động khóa 3 phút sau 5 lần nhập sai liên tiếp thông qua cơ chế khóa kép: Client dùng `localStorage` để đếm ngược UI và Server dùng cookie HTTP-Only `login_lockout` để chặn các yêu cầu submit tiếp theo.
- **Sửa lỗi định hướng 404 sau khi đăng ký thành công**: Thay đổi đường dẫn chuyển hướng sau khi đăng ký thành công từ `/dashboard` sang `/` để đưa người dùng trực tiếp vào trang chủ Overview mà không gặp lỗi 404 hoặc yêu cầu đăng nhập lại.
- **Sửa lỗi phân quyền vai trò người dùng mặc định (`role`) khi đăng nhập**: Tự động gán quyền phù hợp nếu user metadata trống.

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
