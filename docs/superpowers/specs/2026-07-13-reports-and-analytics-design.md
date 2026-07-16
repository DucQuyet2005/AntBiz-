# Đặc tả thiết kế: Báo cáo Thống kê & Xuất báo cáo Đa nền tảng (Excel/CSV)

Đặc tả thiết kế cho chức năng báo cáo hiệu suất đăng bài theo tuần/tháng, bao gồm tổng quan chung, báo cáo chi tiết theo từng nền tảng (Facebook, Instagram, Threads), biểu đồ tương tác Recharts, bảng xếp hạng các bài viết xuất sắc nhất và tính năng tải file Excel phân tách theo từng sheet nền tảng.

---

## 1. Cơ sở dữ liệu (Database Schema)

### 1.1. Bảng mới: `public.post_interactions`
Bảng này dùng để lưu trữ dữ liệu lượt tương tác của từng bài đăng thành công (posted).
```sql
CREATE TABLE IF NOT EXISTS public.post_interactions (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID            NOT NULL UNIQUE REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  likes           INTEGER         NOT NULL DEFAULT 0,
  comments        INTEGER         NOT NULL DEFAULT 0,
  shares          INTEGER         NOT NULL DEFAULT 0,
  clicks          INTEGER         NOT NULL DEFAULT 0,
  reach           INTEGER         NOT NULL DEFAULT 0,
  impressions     INTEGER         NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Chỉ mục để tối ưu hóa truy vấn JOIN
CREATE INDEX IF NOT EXISTS idx_post_interactions_post_id ON public.post_interactions(post_id);

-- Kích hoạt RLS
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;

-- Quyền đọc cho người dùng đã đăng nhập
CREATE POLICY "post_interactions: authenticated read"
  ON public.post_interactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Quyền thao tác đầy đủ cho Service Role (Backend API/Cron)
CREATE POLICY "post_interactions: service role write"
  ON public.post_interactions FOR ALL
  USING (auth.role() = 'service_role');
```

### 1.2. Migration seed dữ liệu tương tác ngẫu nhiên
Để hệ thống có sẵn dữ liệu chạy thử biểu đồ đường kẻ và bảng xếp hạng, chúng ta sẽ tạo một file migration SQL chèn dữ liệu ngẫu nhiên vào `post_interactions` cho tất cả các bản ghi có trạng thái `'posted'` trong `scheduled_posts`.

---

## 2. API Endpoints

### 2.1. API Lấy số liệu thống kê: `GET /api/reports/stats`
*   **Mô tả:** Lấy dữ liệu tổng quan, dữ liệu biểu đồ theo thời gian và bảng xếp hạng bài viết xuất sắc nhất.
*   **Tham số truy vấn (Query Params):**
    *   `timeframe`: `'week'` (7 ngày qua) hoặc `'month'` (30 ngày qua). Mặc định là `'week'`.
    *   `platform`: `'all'` | `'facebook'` | `'instagram'` | `'threads'`. Mặc định là `'all'`.
    *   `startDate` / `endDate`: Lọc ngày tùy chọn (Định dạng YYYY-MM-DD).
*   **Cấu trúc dữ liệu trả về (JSON):**
    ```json
    {
      "summary": {
        "totalPosts": 25,
        "successPosts": 23,
        "failedPosts": 2,
        "successRate": 92,
        "totalLikes": 1540,
        "totalComments": 420,
        "totalShares": 85
      },
      "chartData": [
        { "date": "2026-07-07", "dayLabel": "T3", "likes": 120, "comments": 45 },
        { "date": "2026-07-08", "dayLabel": "T4", "likes": 140, "comments": 30 }
      ],
      "topPosts": [
        {
          "id": "uuid-post-1",
          "title": "Nội dung bài viết mẫu số 1...",
          "platform": "facebook",
          "scheduled_at": "2026-07-10T08:00:00Z",
          "likes": 250,
          "comments": 80,
          "shares": 25,
          "engagement": 355
        }
      ]
    }
    ```

### 2.2. API Xuất báo cáo Excel/CSV: `GET /api/reports/export`
*   **Mô tả:** Tạo và trả về tệp tin Excel (.xlsx) đa sheet hoặc CSV.
*   **Tham số truy vấn (Query Params):**
    *   `timeframe`, `platform`, `startDate`, `endDate` (như trên).
    *   `reporterName`: Tên người lập báo cáo (hiển thị ở tiêu đề file).
*   **Hành vi:**
    *   Truy vấn danh sách bài viết từ database kèm số liệu tương tác.
    *   Tạo file Excel nhị phân thông qua thư viện `xlsx` (SheetJS).
    *   **Cấu trúc Sheet:**
        *   **Sheet 1 (Tổng quan - Overview):** Tiêu đề báo cáo, Tên người lập, Thời gian, Bảng số liệu tổng hợp của tất cả các nền tảng.
        *   **Sheet 2 (Facebook):** Danh sách bài đăng trên Facebook (Tiêu đề, Ngày đăng, Trạng thái, Likes, Comments, Shares, Tổng tương tác).
        *   **Sheet 3 (Instagram):** Danh sách bài đăng trên Instagram.
        *   **Sheet 4 (Threads):** Danh sách bài đăng trên Threads.
    *   Trả về file Excel dưới dạng Stream nhị phân để client tự động tải xuống.

---

## 3. Thiết kế giao diện người dùng (UI/UX)

Giao diện trang báo cáo thống kê sẽ được đặt tại đường dẫn `/reports` và liên kết trong thanh Sidebar.

### 3.1. Các phần tử chính trên giao diện:
1.  **Thanh bộ lọc trên cùng (Top Filter Bar):**
    *   Bộ chọn khoảng thời gian (7 ngày qua, 30 ngày qua, Tuỳ chọn ngày).
    *   Ô nhập tên người lập báo cáo (Reporter Name) - Tự động điền tên người dùng đang đăng nhập.
    *   Nút **"Xuất Excel"** nổi bật với hiệu ứng loading khi đang tải file.
2.  **Hệ thống Tabs theo Nền tảng:**
    *   Gồm 4 tab: **Tất cả (All)**, **Facebook**, **Instagram**, **Threads**.
    *   Khi nhấn chuyển tab, toàn bộ thẻ số liệu, biểu đồ và bảng xếp hạng bên dưới sẽ được lọc và hiển thị tương ứng.
3.  **Các thẻ chỉ số chính (Metric Cards):**
    *   *Tổng bài đăng*: Số lượng bài viết đã lên lịch / đã đăng trong chu kỳ.
    *   *Tỷ lệ đăng bài thành công*: Phần trăm số bài đăng thành công trên tổng số bài viết.
    *   *Tổng lượt thích*: Tổng số lượt thích tích lũy.
    *   *Tổng lượt bình luận*: Tổng số lượt bình luận tích lũy.
4.  **Biểu đồ tương tác đường kẻ (Interactive Line Chart):**
    *   Vẽ 2 đường đại diện cho Likes (đường màu xanh dương) và Comments (đường màu cam).
    *   Sử dụng Tooltip tùy biến để khi di chuột hiển thị thông tin ngày tháng, số lượng cụ thể và màu sắc tương ứng.
5.  **Bảng xếp hạng bài viết xuất sắc nhất:**
    *   Bảng liệt kê các bài viết hàng đầu kèm cột: Nội dung rút gọn, Nền tảng, Ngày đăng, Lượt Thích, Bình luận, Tổng tương tác.
    *   Cho phép người dùng nhấn vào tiêu đề các cột để sắp xếp lại (Sort) tăng/giảm dần.

---

## 4. Kế hoạch triển khai kỹ thuật (Technical Steps)

1.  **Tạo tệp migration cơ sở dữ liệu:** Tạo bảng `post_interactions`, thiết lập RLS policy và tạo dữ liệu seed giả lập cho các bài viết đã có trạng thái `'posted'`.
2.  **Cài đặt thư viện xuất Excel:** Sử dụng thư viện `xlsx` (SheetJS) bằng cách thêm vào `package.json` và chạy lệnh cài đặt.
3.  **Xây dựng Route API thống kê:** Viết file `app/api/reports/stats/route.ts` xử lý gom nhóm và truy vấn.
4.  **Xây dựng Route API xuất báo cáo Excel:** Viết file `app/api/reports/export/route.ts` xử lý tạo file đa sheet và stream dữ liệu.
5.  **Tích hợp dịch vụ cập nhật tương tác:** Thêm logic khởi tạo/cập nhật bản ghi `post_interactions` khi một bài viết đăng thành công trong `lib/scheduler/scheduler.ts`.
6.  **Tạo trang giao diện báo cáo:** Viết view component `components/views/ReportsView.tsx` và trang Next.js `app/(dashboard)/reports/page.tsx`.
7.  **Cập nhật Sidebar:** Thêm mục điều hướng **"Báo cáo thống kê"** vào Sidebar.
