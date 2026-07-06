# Tài liệu Thiết kế: Mẫu Quy chuẩn Nền tảng Tự động Điền (Prefilled Platform Presets Spec)

Tài liệu này đặc tả thiết kế kỹ thuật cho việc nâng cấp bộ quy chuẩn nền tảng (Platform Presets) thành giao diện một ô nhập duy nhất (Single Textarea) nhưng được tự động điền sẵn mẫu định dạng (Prefilled Markdown Template) tối ưu cho từng nền tảng, giúp người dùng dễ dàng chỉnh sửa hoặc bổ sung.

---

## 1. Mục tiêu & Yêu cầu thiết kế
*   **Trải nghiệm tinh gọn (Clean UX):** Sử dụng một ô nhập văn bản lớn duy nhất (`textarea`) thay vì chia thành các ô nhỏ để giao diện thoáng, người dùng dễ theo dõi toàn bộ bố cục quy tắc.
*   **Tự động điền mẫu (Template Prefilling):** Khi tạo mới quy chuẩn, hệ thống tự động điền sẵn một bản mẫu Markdown hoàn chỉnh chứa các quy tắc mẫu (Bố cục & Độ dài, Đường dẫn & Hashtags, Lời kêu gọi CTA) tối ưu riêng cho nền tảng đó.
*   **Dễ dàng tùy biến:** Người dùng có thể xóa, sửa đổi, bổ sung thêm bất kỳ dòng hay quy tắc nào trực tiếp trong ô nhập văn bản.
*   **Lưu trữ đơn giản:** Lưu trực tiếp chuỗi văn bản trong ô nhập vào cột `rules` của bảng `platform_presets` mà không cần xử lý tuần tự hóa phức tạp.

---

## 2. Thiết kế Mẫu Quy chuẩn theo Nền tảng

Hệ thống định nghĩa các mẫu quy chuẩn mặc định thông qua hàm `getDefaultTemplateForPlatform(platform)` tại `lib/utils/presetParser.ts`:

### 2.1. Facebook Template
```markdown
- **Bố cục & Độ dài:** Độ dài từ 150-300 từ. Chia nội dung thành 2-3 đoạn ngắn dễ đọc (mỗi đoạn không quá 3 câu). Có tiêu đề thu hút người đọc (in hoa hoặc viết kèm emoji). Sử dụng các gạch đầu dòng để liệt kê thông tin rõ ràng.
- **Đường dẫn & Hashtags:** Chèn link URL trực tiếp ở cuối bài viết. Sử dụng 3-5 hashtag liên quan ở cuối cùng, bao gồm hashtag thương hiệu và chủ đề bài viết.
- **Kêu gọi hành động (CTA):** Đặt một câu hỏi mở ở cuối để kích thích thảo luận, mời mọi người bình luận chia sẻ ý kiến hoặc tag bạn bè cùng đọc.
```

### 2.2. Instagram Template
```markdown
- **Bố cục & Độ dài:** Ngắn gọn từ 80-150 từ. Dòng đầu tiên (Hook) phải cực kỳ hấp dẫn để kích thích người dùng bấm "xem thêm". Phân tách các đoạn bằng dòng trống rõ ràng để giao diện trực quan.
- **Đường dẫn & Hashtags:** Tuyệt đối không chèn link URL trực tiếp vào caption. Hãy dùng câu điều hướng: "Chi tiết xem tại link ở phần Bio nhé!". Chèn từ 5-15 hashtag ngách liên quan ở cuối bài viết.
- **Kêu gọi hành động (CTA):** Kêu gọi lưu lại bài viết (Save) để xem sau, chia sẻ lên tin (story), hoặc bình luận một từ khóa cụ thể để nhận tài liệu qua tin nhắn (DM).
```

### 2.3. Threads Template
```markdown
- **Bố cục & Độ dài:** Độ dài ngắn gọn dưới 280 ký tự. Viết theo giọng văn chia sẻ cá nhân, tự sự tự nhiên. Không dùng tiêu đề in hoa, không dùng các ký hiệu gạch đầu dòng trang trọng.
- **Đường dẫn & Hashtags:** Chèn link URL trực tiếp vào bài viết. Hạn chế sử dụng hashtag (chỉ dùng tối đa 1 hashtag chủ đề nếu thực sự cần thiết).
- **Kêu gọi hành động (CTA):** Kết thúc bằng một câu hỏi gợi mở, mang tính thảo luận cao để khuyến khích mọi người phản hồi (reply) chia sẻ quan điểm cá nhân.
```

---

## 3. Quy trình Hoạt động & Giao diện (UI/UX)

### 3.1. Kịch bản Tạo mới Quy chuẩn
1. Người dùng bấm nút **"Thêm quy chuẩn"** tại tab Threads.
2. Modal mở lên với ô nhập **Nội dung quy tắc** đã được điền sẵn toàn bộ nội dung mẫu của Threads (như phần 2.3).
3. Người dùng chỉnh sửa văn bản này trực tiếp, ví dụ: thay đổi độ dài mong muốn, thêm dòng `- **Quy tắc Emoji:** Dùng tối đa 2 emoji.`.
4. Người dùng bấm **"Lưu quy chuẩn"**, toàn bộ chuỗi ký tự được gửi lên API lưu vào database.

### 3.2. Kịch bản Chỉnh sửa Quy chuẩn
1. Người dùng bấm nút sửa quy chuẩn hiện có.
2. Modal mở lên hiển thị đúng chuỗi văn bản đang lưu trong database vào ô nhập `textarea`.
3. Người dùng điều chỉnh và lưu lại.

---

## 4. Tích hợp AI Engine (`app/api/captions/generate/route.ts`)

AI Engine sẽ đọc trực tiếp chuỗi văn bản lưu trong cột `rules` của preset được áp dụng và tiêm thẳng vào Prompt mẫu gửi lên Gemini:

```markdown
Hãy tuân thủ nghiêm ngặt các quy chuẩn kỹ thuật của kênh đăng sau:
${presetRulesStr}
```
Điều này đảm bảo mọi chỉnh sửa tự do của người dùng đều được AI tiếp nhận một cách chính xác nhất.
