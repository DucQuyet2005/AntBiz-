# Hướng Dẫn Chi Tiết Deploy Dự Án AntBiz Lên Vercel (Nhánh Custom)

Tài liệu này hướng dẫn chi tiết các bước để deploy dự án **AntBiz** lên **Vercel** bằng một nhánh git tùy chọn (ví dụ: `feature/deploy-test`) thay vì nhánh `main`.

---

## 📋 Mục Lục
1. [Chuẩn Bị Trước Khi Deploy](#1-chuẩn-bị-trước-khi-deploy)
2. [Các Bước Deploy Nhánh Custom Lên Vercel](#2-các-bước-deploy-nhánh-custom-lên-vercel)
3. [Cấu Hình Biến Môi Trường (Environment Variables)](#3-cấu-hình-biến-môi-trường-environment-variables)
4. [Kích Hoạt Và Kiểm Tra Vercel Cron Jobs (Scheduler)](#4-kích-hoạt-và-kiểm-tra-vercel-cron-jobs-scheduler)
5. [Kiểm Tra & Vận Hành](#5-kiểm-tra--vận-hành)

---

## 1. Chuẩn Bị Trước Khi Deploy

Đảm bảo bạn đã:
1. **Đăng ký tài khoản Firecrawl** tại [firecrawl.dev](https://firecrawl.dev/) và lấy **API Key**.
2. **Push toàn bộ code của nhánh mong muốn lên GitHub**. Hiện tại, bạn đã push nhánh `feature/deploy-test` lên GitHub thành công.
3. Chuẩn bị sẵn file `.env.local` ở máy local để copy biến môi trường.

---

## 2. Các Bước Deploy Nhánh Custom Lên Vercel

Có 2 cách để deploy một nhánh không phải `main` lên Vercel:

### Cách A: Cấu hình nhánh đó làm nhánh Production chính (Khuyên Dùng)
Nếu bạn muốn nhánh `feature/deploy-test` đóng vai trò là trang web chính thức (Production):

1. Truy cập **[vercel.com](https://vercel.com/)** và đăng nhập bằng tài khoản GitHub.
2. Chọn **"Add New"** -> **"Project"**.
3. Tìm repository `AntBiz` của bạn và click **"Import"**.
4. Tại màn hình cấu hình trước khi deploy, ở mục **Configure Project**:
   * Kéo xuống phần **Environment Variables** để cấu hình biến môi trường (xem mục 3 bên dưới).
   * **Lưu ý:** Vercel mặc định chọn nhánh mặc định của GitHub (`main`) làm Production. Bạn cứ nhấn **Deploy** lần đầu tiên trước.
5. Sau khi quá trình Deploy lần đầu hoàn tất:
   * Vào **Settings** (Cài đặt dự án trên Vercel) -> chọn tab **Git**.
   * Tại mục **Production Branch**, thay đổi từ `main` thành tên nhánh bạn muốn (ví dụ: `feature/deploy-test`).
   * Bấm **Save**. Từ lúc này, mọi lượt push code lên nhánh `feature/deploy-test` sẽ tự động trigger bản build chính thức (Production).

---

### Cách B: Deploy dưới dạng nhánh thử nghiệm (Preview Deployment)
Nếu bạn vẫn muốn giữ `main` làm Production, nhưng muốn xem thử và chạy thử nhánh `feature/deploy-test` trên Vercel:

1. Thực hiện import dự án và Deploy nhánh `main` như bình thường.
2. Vercel sẽ tự động theo dõi toàn bộ các nhánh khác trong repo của bạn. 
3. Khi bạn push code lên nhánh `feature/deploy-test`, Vercel sẽ tự động tạo một bản build riêng biệt gọi là **Preview Deployment** kèm theo một đường link chạy thử độc lập (ví dụ: `https://antbiz-git-feature-deploy-test.vercel.app`).
4. Bạn chỉ cần vào tab **Deployments** trên Vercel Dashboard, tìm đúng bản build của nhánh `feature/deploy-test` và nhấp vào để sử dụng.

---

## 3. Cấu Hình Biến Môi Trường (Environment Variables)

Vercel cho phép bạn import nhanh toàn bộ biến môi trường mà không cần gõ từng biến một:

1. Mở file `.env.local` trên máy của bạn và **Copy toàn bộ nội dung** của file này.
2. Tại màn hình cấu hình dự án của Vercel (phần **Environment Variables**):
   * Chỉ cần click chuột vào ô **Key** đầu tiên và nhấn **Paste (Ctrl + V)**.
   * Vercel sẽ tự động phân tích và tạo ra danh sách 14 biến môi trường tương ứng cực kỳ nhanh chóng.
3. Đảm bảo các biến sau đã được điền đầy đủ và chính xác:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `GEMINI_API_KEY`
   * `GEMINI_MODEL`
   * `FB_PAGE_ID`
   * `FB_PAGE_ACCESS_TOKEN`
   * `SMTP_HOST`
   * `SMTP_PORT`
   * `SMTP_USER`
   * `SMTP_PASSWORD`
   * `SMTP_FROM`
   * `FIRECRAWL_API_KEY` (Mã bắt đầu bằng `fc-...` bạn đã lấy từ Firecrawl)
   * `CRON_SECRET` (Mã bảo mật bạn tự đặt, ví dụ: `antbiz_cron_secret_abc123`)

---

## 4. Kích Hoạt Và Kiểm Tra Vercel Cron Jobs (Scheduler)

Hệ thống sử dụng file `vercel.json` để tự động lên lịch chạy tác vụ kiểm tra và đăng bài viết mỗi 10 phút.

1. **Vercel tự động nhận diện**: Khi bạn deploy nhánh có chứa file `vercel.json` lên Production, Vercel sẽ tự động đăng ký Cron Job này.
2. **Kiểm tra trạng thái Cron**:
   * Truy cập vào Dashboard dự án trên Vercel.
   * Chọn tab **Settings** -> chọn **Cron Jobs**.
   * Bạn sẽ thấy một tiến trình có đường dẫn `/api/cron/run-scheduler` được đăng ký chạy mỗi 10 phút.
3. **Bảo mật**: Vercel sẽ tự động gửi kèm mã `CRON_SECRET` trong Header khi gọi API này, đảm bảo không ai bên ngoài có thể tự ý ping vào API của bạn để kích hoạt đăng bài bừa bãi.

---

## 5. Kiểm Tra & Vận Hành

Sau khi deploy hoàn tất thành công:
1. **Kiểm tra Giao diện**: Mở đường dẫn trang web được Vercel cung cấp để kiểm tra đăng nhập/đăng ký qua Supabase.
2. **Kiểm tra cào web**: Thử dán một đường link bài báo (ví dụ từ `gocnhinmoi.com.vn`) để xem hệ thống có cào và chuyển đổi nội dung bằng Firecrawl API thành công hay không.
3. **Kiểm tra Nhật ký (Logs)**: 
   * Bạn có thể xem log trực tiếp của serverless functions bằng cách vào tab **Logs** trên Vercel Dashboard để theo dõi các hoạt động cào bài viết và lỗi (nếu có).
