# Khôi phục Responsive Width cho Extension

## Mục tiêu

Side Panel của extension phải co giãn liên tục theo độ rộng người dùng kéo, không bị khóa ở 380px hoặc giới hạn chiều cao 600px.

## Thiết kế

- `body` dùng `width: 100%`, `min-width: 320px` và `min-height: 100vh`.
- Loại bỏ `width: 380px`, `height: auto` và `max-height: 600px`.
- `.extension-container` dùng toàn bộ chiều rộng khả dụng, giữ giới hạn tối đa 1000px để nội dung không bị kéo quá rộng.
- Ở chiều rộng hẹp, các form, nút và danh sách input tiếp tục xếp theo bố cục một cột hiện tại.
- Ở chiều rộng từ 580px, container mở rộng theo Side Panel thay vì giữ chiều rộng cố định.
- Không thay đổi workflow chọn input, crawl, tạo bài, preview, đăng hoặc lên lịch.

## Xác minh

- Không xuất hiện thanh cuộn ngang ở 320px, 380px, 480px, 580px và 800px.
- Header, footer, form đăng nhập và các state dùng hết chiều rộng panel.
- Danh sách ảnh sau crawl được cuộn ngang bên trong thay vì làm rộng toàn bộ panel.
- JavaScript extension và test liên quan vẫn đạt.

## Dropdown Văn phong

- Giữ custom dropdown hiện tại để bảo toàn tìm kiếm Văn phong.
- Trigger dùng cùng chiều rộng, chiều cao tối thiểu, padding, border, bo góc, font và màu với `#select-platform`.
- Tên Văn phong được cắt bằng ellipsis khi panel hẹp; mũi tên luôn nằm sát phải và không co lại.
- Khi focus hoặc mở, trigger dùng cùng focus ring với ô Nền tảng.
- Panel mở ngay dưới trigger, rộng bằng trigger, có z-index đủ cao và không làm thay đổi bố cục.
- Ô tìm kiếm nằm cố định đầu panel; danh sách option cuộn dọc khi dài.
- Option có trạng thái hover, selected và focus rõ ràng; thao tác chọn tiếp tục đồng bộ vào `#select-preset` ẩn.

## Mũi tên Nền tảng

- Giữ `#select-platform` là native select để không thay đổi hành vi hoặc accessibility.
- Ẩn indicator mặc định bằng `appearance: none`.
- Dùng background icon tam giác cùng hình dạng, kích thước, màu và khoảng cách mép phải với `.custom-select-arrow`.
- Chừa padding phải đủ lớn để nội dung không đè lên icon.
- Focus ring và toàn bộ kích thước select giữ nguyên.
