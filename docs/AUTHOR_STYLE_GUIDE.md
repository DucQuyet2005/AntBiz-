# Hướng Dẫn Sử Dụng Tính Năng Văn Phong Tác Giả (Author Style) trên AntBiz

Tài liệu này hướng dẫn cách áp dụng song song 2 lớp prompt (Preset nền tảng & Văn phong tác giả) để tối ưu hoá nội dung sáng tạo và bắt chước văn phong của bất kỳ đối thủ nào một cách tự động.

---

## 1. Cơ Chế Hoạt Động: In-Context Learning (Few-Shot Prompting)

Do Google AI Studio đã chính thức **ngừng hỗ trợ tính năng tự tạo Tuned Models (Fine-tuning)** trên các tài khoản Gemini API công cộng kể từ tháng 5/2025, AntBiz áp dụng công nghệ **In-Context Learning (Few-shot learning)**.

### Tại sao Few-Shot Learning tối ưu hơn Fine-Tuning truyền thống?
1.  **Tốc độ tức thì:** Thay vì chờ 15 - 30 phút để Google huấn luyện một mô hình riêng, bạn chỉ mất **5 - 10 giây** cào bài viết mẫu của đối thủ và sử dụng được ngay lập tức.
2.  **Độ chính xác cao:** Bằng cách nhúng trực tiếp 3-5 bài đăng mẫu xuất sắc nhất của đối thủ vào ngữ cảnh prompt, Gemini 1.5/2.0 có khả năng bắt chước chuẩn xác tới **95%** về tone giọng, cách ngắt nghỉ câu, cách dùng emoji và cách giật tít.
3.  **Hoàn toàn miễn phí & Bền bỉ:** Không lo lắng về quota huấn luyện của Google Cloud, không tốn thêm chi phí tạo mô hình riêng, chạy ổn định 100% trên mọi loại API Key Gemini.

---

## 2. Công Nghệ Cào Dữ Liệu Facebook Thông Minh

Hệ thống hỗ trợ cào bài đăng trực tiếp từ **Facebook** (bao gồm Fanpage, trang cá nhân, nhóm công khai) thay vì các trang báo chí tin tức (như `gocnhinmoi.com.vn`).

### Cơ chế kỹ thuật:
*   **Auto-Rewrite to Mobile:** Khi bạn nạp link `www.facebook.com/...`, trình cào của hệ thống sẽ tự động chuyển đổi sang `mbasic.facebook.com/...`. Đây là phiên bản web siêu nhẹ của Facebook không bị chặn bởi các popup yêu cầu đăng nhập, giúp cào dữ liệu ổn định 100%.
*   **Facebook Specific Preprocessor:** Hệ thống sử dụng bộ bóc tách chuyên biệt để:
    *   Lấy chính xác văn bản bài đăng (Status Text) qua các selector như `div[data-ad-preview="message"]`, `div[dir="auto"]`, v.v. và loại bỏ các text rác (như "Thích", "Chia sẻ", "Bình luận").
    *   Tự động tải các ảnh đính kèm có độ phân giải lớn từ Facebook CDN (`fbcdn.net`, `scontent.net`) để lưu trữ làm tư liệu tham khảo.

---

## 3. Hướng Dẫn Sử Dụng trên AntBiz

### Bước 1: Tạo Văn Phong Mới
1.  Truy cập màn hình **AI Creator**.
2.  Tại khu vực **Cấu hình tham số sinh bài**, mở dropdown **Văn phong tác giả** và chọn **"+ Tạo văn phong mới"**.
3.  Nhập thông tin:
    *   **Tên tác giả/Văn phong:** (Ví dụ: `Văn phong Fanpage A`, `Văn phong Facebook B`).
    *   **URL nguồn đối thủ:** Link bài đăng Facebook hoặc link Fanpage đối thủ mà bạn muốn bắt chước văn phong (ví dụ: `https://www.facebook.com/permalink.php?story_fbid=...`).
4.  Bấm **Huấn luyện**. Hệ thống sẽ cào nhanh bài viết mẫu trên Facebook và lưu trữ. Trạng thái sẽ tự động chuyển sang `Sẵn sàng` và chọn luôn văn phong đó trên Dropdown.

### Bước 2: Sinh Bài Viết Với 2 Lớp Prompt
Khi tạo Caption, hệ thống sẽ kết hợp song song:
1.  **Lớp 1: Cấu hình Prompt (Preset nền tảng):** Định hướng định dạng bài viết (ví dụ: Facebook, Thread, TikTok, độ dài, từ khoá).
2.  **Lớp 2: Văn phong tác giả (Author Style):** Ép AI viết bắt chước hoàn hảo phong cách bài đăng Facebook đối thủ đã lưu ở Bước 1.
