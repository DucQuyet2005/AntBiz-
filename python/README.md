# Auto Post Pipeline

Pipeline tự động hóa quy trình: **Crawl bài viết → Tiền xử lý dữ liệu → Dùng Gemini viết lại content → Đăng lên Facebook Page** (kèm ảnh và hashtag gốc).

## Luồng xử lý

```
URL bài viết
   │
   ▼
[1] Crawl (Playwright)        → Lấy HTML bài viết (headless Chromium)
   │
   ▼
[2] Preprocess (BeautifulSoup) → Tách title, mô tả, tác giả, ngày đăng,
   │                              category, hashtag, ảnh, nội dung từng đoạn
   ▼
[3] Gemini viết content        → Viết lại thành bài Facebook hấp dẫn,
   │                              giữ nguyên hashtag gốc
   ▼
[4] Upload ảnh lên Facebook     → Upload tối đa 4 ảnh (chế độ unpublished)
   │
   ▼
[5] Đăng bài lên Facebook Page  → Đăng kèm ảnh + link nguồn
```

## Yêu cầu

- Python 3.9+
- Tài khoản Google AI Studio (Gemini API Key)
- Facebook Page + Page Access Token có quyền `pages_manage_posts`, `pages_read_engagement`

### Thư viện Python

```bash
pip install requests beautifulsoup4 playwright google-genai python-dotenv
playwright install chromium
```

## Cấu hình

Tạo file `.env` ở thư mục gốc với nội dung:

```env
# Bắt buộc
GEMINI_API_KEY= điền key của api gemini vào đây
GEMINI_MODEL=gemini-2.5-flash
FB_PAGE_ID= điền id của page facebook vào đây
FB_PAGE_ACCESS_TOKEN= điền access token của page facebook vào đây

tạo file .env cùng cấp với file README.md

```

Script sẽ dừng và báo lỗi nếu thiếu `GEMINI_API_KEY`, `FB_PAGE_ID` hoặc `FB_PAGE_ACCESS_TOKEN`.

## Cách sử dụng

```bash
# Chạy pipeline đầy đủ (crawl → viết content → đăng Facebook)
python auto_post_pipeline.py --url "https://example.com/bai-viet"

# Dry run: chỉ xem trước nội dung, KHÔNG đăng lên Facebook
python auto_post_pipeline.py --url "https://example.com/bai-viet" --dry-run

# Không lưu file JSON dữ liệu đã crawl
python auto_post_pipeline.py --url "https://example.com/bai-viet" --no-save
```

### Tham số

| Tham số     | Bắt buộc | Mô tả                                              |
| ----------- | -------- | -------------------------------------------------- |
| `--url`     | ✅       | URL bài viết cần crawl và đăng lại                 |
| `--dry-run` | ❌       | Chỉ xem trước nội dung, bỏ qua bước đăng Facebook  |
| `--no-save` | ❌       | Không lưu dữ liệu đã crawl/preprocess ra file JSON |

## Output

Khi không dùng `--no-save`, dữ liệu sau khi preprocess được lưu tại:

```
pipeline_output/<slug-bai-viet>.json
```

File JSON chứa: `url`, `title`, `category`, `description`, `author`, `published_at`, `views`, `tags`, `images`, `body` (danh sách đoạn văn/heading/ảnh theo thứ tự gốc), `full_text`.

## Lưu ý quan trọng

- **Selector phụ thuộc cấu trúc trang nguồn**: script được viết riêng cho một layout trang tin cụ thể (`#html_content`, các block `data-content-type`, hashtag dạng `a[href^="/hashtag/"]`, tag dạng `a.rounded-full[href*="/tag/"]`...). Nếu đổi sang nguồn khác có cấu trúc HTML khác, cần cập nhật lại các selector trong hàm `preprocess()`.
- **Tránh nhầm dữ liệu sidebar**: hàm `find_article_scope()` xác định vùng HTML thuộc về bài viết (dựa trên `<h1>` và `#html_content`) để không lấy nhầm category/tác giả/ngày đăng từ các widget "Gợi ý theo dõi", "Spotlight", "Hashtag nổi bật" ở sidebar.
- **Ảnh đại diện dự phòng**: nếu không tìm thấy ảnh nào trong nội dung bài viết, script sẽ tự động lấy ảnh từ thẻ `og:image` của trang.
- **Giới hạn ảnh đăng Facebook**: tối đa 4 ảnh đầu tiên, ảnh được tải tạm về máy rồi upload lên Facebook ở trạng thái `unpublished` trước khi gắn vào bài đăng.
- **Hashtag giữ nguyên 100%**: prompt gửi Gemini yêu cầu bắt buộc sử dụng đúng hashtag gốc, không tự thêm hashtag mới.
- **Facebook Graph API**: sử dụng version `v19.0`. Page Access Token cần còn hạn và đủ quyền; token hết hạn/sai quyền sẽ khiến bước đăng bài thất bại (lỗi trả về từ Graph API sẽ được in ra terminal).
- **Nội dung dài**: nếu bài viết gốc quá 8000 ký tự, script chỉ gửi 8000 ký tự đầu cho Gemini để tránh vượt giới hạn token.

## Xử lý lỗi thường gặp

| Lỗi                                      | Nguyên nhân khả năng cao                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `❌ Thiếu biến môi trường trong .env`    | Chưa tạo `.env` hoặc thiếu key bắt buộc                                                           |
| `❌ Không crawl được nội dung từ: <url>` | Trang chặn bot, selector không khớp, hoặc trang load chậm hơn timeout 30s                         |
| `⚠️ Upload ảnh thất bại`                 | URL ảnh không truy cập được, hoặc token Facebook hết hạn/thiếu quyền                              |
| `❌ Đăng thất bại`                       | Page Access Token sai/hết hạn, `FB_PAGE_ID` không đúng, hoặc nội dung vi phạm chính sách Facebook |