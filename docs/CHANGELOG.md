# Lịch sử thay đổi (Changelog) - AntBiz

Tất cả các thay đổi đáng chú ý đối với dự án AntBiz sẽ được ghi nhận tại đây.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-06-17

### Added
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
