---
name: write-changelog
description: "Hướng dẫn và quy chuẩn ghi nhận lịch sử thay đổi (Changelog) cho dự án AntBiz. Hỗ trợ cập nhật chính xác các tính năng mới, lỗi đã sửa và cải tiến cấu trúc."
---

# Quy trình và Tiêu chuẩn Viết Changelog cho AntBiz

Bộ kỹ năng này hướng dẫn cách ghi nhận lịch sử thay đổi (Changelog) một cách khoa học, chuyên nghiệp, tuân thủ tiêu chuẩn [Keep a Changelog](https://keepachangelog.com/) nhằm giúp cả lập trình viên và người dùng dễ dàng theo dõi tiến độ dự án.

---

## 1. Nguyên tắc cốt lõi khi viết Changelog
- **Dành cho con người đọc:** Viết mô tả dễ hiểu, tập trung vào giá trị/tính năng thay vì liệt kê mã băm commit (commit hash) hay mô tả quá sâu vào kỹ thuật không cần thiết.
- **Phân loại rõ ràng:** Luôn phân nhóm các thay đổi vào các mục tiêu chuẩn.
- **Thứ tự thời gian đảo ngược:** Phiên bản mới nhất luôn nằm ở trên cùng.
- **Định dạng ngày chuẩn:** Sử dụng định dạng `YYYY-MM-DD` (Ví dụ: `2026-06-16`).

---

## 2. Các nhóm phân loại thay đổi (Categories)
Mỗi phiên bản/lần cập nhật cần phân chia các thay đổi vào các mục sau:

- **`Added` (Thêm mới):** Dành cho các tính năng mới được triển khai.
- **`Changed` (Thay đổi):** Cập nhật, tối ưu hóa các tính năng hoặc cấu trúc có sẵn.
- **`Deprecated` (Khuyến cáo loại bỏ):** Các tính năng cũ sắp bị xóa trong tương lai.
- **`Removed` (Xóa bỏ):** Các tính năng hoặc mã nguồn đã bị gỡ bỏ hoàn toàn.
- **`Fixed` (Sửa lỗi):** Dành cho các bản sửa lỗi (bug fixes).
- **`Security` (Bảo mật):** Sửa các lỗ hổng bảo mật hoặc nâng cấp chứng chỉ bảo mật.

---

## 3. Cấu trúc định dạng Markdown chuẩn

```markdown
## [Phiên bản hoặc Tên Nhánh] - YYYY-MM-DD

### Added
- Thêm tính năng đăng nhập bằng tài khoản Google (Google OAuth).
- Bổ sung trang giao diện Overview hiển thị thống kê tổng quan của AntBiz.

### Changed
- Cấu hình lại cơ chế Middleware sang tệp `proxy.ts` để tương thích với Next.js 16.
- Cập nhật thư viện Tailwind CSS lên phiên bản v4.

### Fixed
- Sửa lỗi không tìm thấy font chữ `Geist` trên môi trường Windows.
- Sửa lỗi cảnh báo thiếu thuộc tính `sizes` trong thẻ `<Image />` tại trang đăng nhập.
```

---

## 4. Quy trình ghi chép Changelog tự động (Dành cho AI)
Mỗi khi bạn (AI) hoàn thành một loạt các tác vụ hoặc chuẩn bị commit, hãy tuân thủ quy tắc sau:

1. **Đánh giá mức độ quan trọng của thay đổi (Tự động lọc):**
   - **Thay đổi quan trọng (BẮT BUỘC ghi Changelog):** Thêm tính năng mới, sửa lỗi nghiêm trọng (crash, bảo mật, UI vỡ), thay đổi luồng nghiệp vụ lớn, tái cấu trúc hệ thống, hoặc thêm màn hình/chức năng mới.
   - **Thay đổi nhỏ (BỎ QUA, không ghi Changelog):** Sửa lỗi typo, thay đổi màu sắc nhỏ, refactor code không ảnh hưởng logic, cập nhật thư viện (trừ khi có breaking change).
2. **Thu thập thông tin thay đổi**: Chạy lệnh `git status` hoặc `git diff` để kiểm tra các file đã chỉnh sửa.
3. **Xác định loại tác vụ**: Phân chia các file đã chỉnh sửa vào các nhóm tương ứng (`Added`, `Changed`, `Fixed`...).
4. **Cập nhật tài liệu tự động**:
   - Mở tệp Changelog mục tiêu (`docs/CHANGELOG.md`).
   - Thêm phần ghi chép mới dưới ngày hiện tại (`YYYY-MM-DD`) ở phía trên cùng của tài liệu. Nếu ngày hiện tại chưa có, hãy tạo một section ngày mới.
5. **Viết nội dung rõ ràng**: Sử dụng tiếng Việt ngắn gọn, súc tích, tập trung vào giá trị mang lại cho người dùng/dự án.
