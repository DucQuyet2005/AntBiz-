# Đặc tả yêu cầu chức năng - AntBiz AI Content Publisher
**Phiên bản:** 1.0.0  
**Ngày:** 16/06/2026  
**Trạng thái:** Đang phát triển (Sprint 1-3)

---

## 1. Giới thiệu chung

### 1.1. Mục đích
Xây dựng hệ thống giúp người làm Marketing (Marketer) tự động hóa quy trình tạo nội dung và đăng bài trên các nền tảng mạng xã hội (Facebook, Threads, Instagram) từ một bài viết gốc duy nhất, thông qua sức mạnh của Trí tuệ nhân tạo (AI).

### 1.2. Phạm vi
Hệ thống bao gồm các phân hệ chính:
- Quản lý tài khoản và phân quyền sử dụng.
- Quản lý kho "câu hướng dẫn" (Prompt) cho AI.
- Sinh, chỉnh sửa và quản lý nội dung caption.
- Lên lịch thông minh và đăng bài tự động.
- Chạy thử nghiệm A/B Testing để tối ưu tỷ lệ tương tác (CTR).
- Hỗ trợ làm việc mọi lúc, mọi nơi qua Extension Chrome.

---

## 2. Đối tượng người dùng (Actors)

| Vai trò | Mô tả | Quyền hạn chính |
| :--- | :--- | :--- |
| **Admin** | Người quản trị hệ thống. | Toàn quyền quản lý người dùng, vai trò, và mọi dữ liệu. |
| **Marketer** | Người sáng tạo nội dung chính. | Được tạo, sửa, xóa nội dung, prompt và lên lịch đăng bài. |
| **Viewer** | Người xem báo cáo. | Chỉ được xem danh sách và báo cáo, không được tạo/sửa/xóa. |

---

## 3. Module 1: Xác thực và Quản lý người dùng

### 3.1. Mục tiêu
Cho phép người dùng truy cập hệ thống an toàn, và cho phép Admin kiểm soát chặt chẽ ai có quyền làm gì.

### 3.2. Chức năng cụ thể

**Đăng ký tài khoản:**
- Người dùng nhập Email, Mật khẩu và Xác nhận mật khẩu để tạo tài khoản mới.
- Hệ thống kiểm tra định dạng email hợp lệ và độ mạnh của mật khẩu.
- Hệ thống kiểm tra email chưa được đăng ký trước đó.

**Xác nhận email:**
- Sau khi đăng ký, hệ thống tự động gửi một email chứa đường link kích hoạt đến địa chỉ email của người dùng.
- Người dùng phải nhấp vào link này để kích hoạt tài khoản (hiệu lực trong 24 giờ).
- Hệ thống cho phép người dùng gửi lại email xác nhận (tối đa 3 lần/ngày).

**Đăng nhập:**
- Người dùng nhập Email và Mật khẩu để đăng nhập.
- Hệ thống xác thực thông tin, kiểm tra trạng thái tài khoản (đã kích hoạt hay chưa, có bị khóa hay không) và trả về phiên làm việc (token) cho người dùng.
- Hệ thống tự động khóa tạm thời tài khoản trong 15 phút nếu người dùng nhập sai mật khẩu quá 5 lần liên tiếp.

**Đăng xuất:**
- Người dùng nhấn nút "Đăng xuất" để kết thúc phiên làm việc.
- Hệ thống tự động đăng xuất người dùng sau 8 giờ không hoạt động (có cảnh báo trước 5 phút).

**Quên mật khẩu:**
- Người dùng nhập email để yêu cầu đặt lại mật khẩu.
- Hệ thống gửi link đặt lại mật khẩu (hiệu lực 1 giờ).
- Người dùng tạo mật khẩu mới qua link, và tất cả các phiên đăng nhập cũ sẽ bị vô hiệu hóa ngay lập tức.

**Đăng nhập bằng Google (SSO):**
- Cho phép người dùng đăng nhập bằng tài khoản Google Workspace của công ty.
- Hệ thống chỉ chấp nhận các email thuộc danh sách tên miền (domain) được phép cấu hình trước.

**Quản lý người dùng (Admin):**
- Admin xem được danh sách tất cả người dùng (Email, Vai trò, Ngày tạo, Lần đăng nhập cuối, Trạng thái).
- Admin tìm kiếm người dùng qua Email, và lọc danh sách theo Vai trò (Admin/Marketer/Viewer) hoặc Trạng thái (Hoạt động/Đã khóa).

**Phân quyền & Bảo mật (Admin):**
- Admin có thể thay đổi vai trò (Role) của bất kỳ người dùng nào (ví dụ: từ Marketer lên Admin).
- Admin có thể **Khóa** hoặc **Mở khóa** tài khoản (kèm theo lý do bắt buộc). Ngay khi bị khóa, tài khoản đó sẽ bị đẩy ra khỏi hệ thống ngay lập tức và không thể đăng nhập lại cho đến khi được mở khóa.

---

## 4. Module 2: Quản lý Prompt và Cấu hình AI

### 4.1. Mục tiêu
Cho phép Marketer tự tạo kho "công thức" (Prompt) để hướng dẫn AI sinh nội dung theo đúng phong cách mong muốn cho từng nền tảng.

### 4.2. Chức năng cụ thể

**Quản lý bộ Prompt:**
- Người dùng (Marketer/Admin) có thể **Tạo mới, Sửa, Xóa, và Nhân bản (Clone)** các Prompt.
- Mỗi Prompt bao gồm: Tên, Nội dung hướng dẫn chi tiết, Nền tảng áp dụng (Facebook / Threads / Instagram), và Thẻ phân loại (ví dụ: "Bán hàng", "Tin tức", "Giải trí").

**Phân tách theo nền tảng:**
- Hệ thống cho phép quản lý riêng biệt Prompt cho từng nền tảng vì phong cách viết khác nhau (Ví dụ: Threads yêu cầu ngắn gọn, Instagram cần nhiều hashtag, Facebook cần CTA rõ ràng).

**Tìm kiếm và lọc:**
- Người dùng có thể tìm kiếm Prompt theo tên và lọc theo Thẻ phân loại.

---

## 5. Module 3: Sinh nội dung và Chỉnh sửa (Caption)

### 5.1. Mục tiêu
Tự động sinh ra nội dung bài đăng (Caption) hoàn chỉnh từ bài viết gốc và Prompt, sau đó cho phép tinh chỉnh thủ công.

### 5.2. Chức năng cụ thể

**Sinh Caption cơ bản:**
- Người dùng chọn một **Bài viết gốc** và một **Prompt** có sẵn.
- Nhấn nút "Tạo nội dung", hệ thống gọi AI để sinh Caption phù hợp với nền tảng được chọn (có kèm CTA, hashtag, emoji hợp lý).
- Hệ thống hiển thị Caption theo dạng luồng (streaming) để người dùng không phải chờ đợi lâu.

**Sinh đa biến thể (Multi-variants):**
- Người dùng có thể yêu cầu AI sinh ra 2-3 biến thể Caption khác nhau (ví dụ: thay đổi cách mở bài, lời kêu gọi hành động hoặc hashtag). Các biến thể được hiển thị cạnh nhau để dễ so sánh và chọn lựa.

**Gợi ý Prompt thông minh:**
- Khi chọn một bài viết gốc, hệ thống tự động phân tích chủ đề của bài viết và gợi ý 3 Prompt phù hợp nhất (dựa trên thẻ phân loại) để Marketer không phải tự mò mẫm.

**Chỉnh sửa trực tiếp (Inline Edit):**
- Người dùng có thể xem trước Caption và chỉnh sửa trực tiếp (thêm, xóa, sửa chữ) ngay trên màn hình.
- Hệ thống tự động lưu nháp (Auto-save) mỗi khi người dùng dừng gõ.
- Hệ thống hiển thị bộ đếm ký tự thời gian thực, cảnh báo khi vượt quá giới hạn của từng nền tảng.

**Lưu trữ phiên bản (Version Control):**
- Hệ thống tự động lưu lại **phiên bản AI gốc** và **tất cả các phiên bản đã sửa** của Caption.
- Người dùng có thể xem lịch sử thay đổi (ai sửa, sửa lúc nào), so sánh sự khác biệt giữa 2 phiên bản, và **khôi phục** về bất kỳ phiên bản cũ nào.

**Mẫu yêu thích (Favorite Templates):**
- Người dùng có thể lưu bất kỳ Caption đã chỉnh sửa nào thành "Mẫu yêu thích" để tái sử dụng trong các chiến dịch sau mà không cần viết lại Prompt.

---

## 6. Module 4: Lên lịch thông minh và Xuất bản

### 6.1. Mục tiêu
Lên lịch đăng bài vào đúng thời điểm vàng, tự động đăng lên các nền tảng mà không cần can thiệp thủ công.

### 6.2. Chức năng cụ thể

**Gợi ý khung giờ vàng (Golden Hour):**
- Hệ thống phân tích lịch sử tương tác của Fanpage (30 ngày gần nhất) để gợi ý Top 3 khung giờ có lượng tương tác cao nhất trong ngày.
- Nếu Fanpage mới chưa có đủ dữ liệu, hệ thống sử dụng khung giờ mặc định theo ngành làm chuẩn.

**Lên lịch đăng:**
- Người dùng chọn Caption đã duyệt, chọn thời gian (ngày, giờ) và kênh đăng (Facebook, Threads, Instagram).
- Hệ thống tự động đăng bài đúng giờ đã hẹn.

**Đăng ngay:**
- Hỗ trợ nút "Đăng ngay lập tức" cho các bài viết nóng, không cần qua bước lên lịch.

**Lịch tổng hợp (Unified Calendar):**
- Tất cả các bài đã lên lịch (đa kênh) được hiển thị trên một Lịch tổng hợp (dạng tuần/tháng).
- Người dùng có thể kéo-thả (Drag & Drop) để thay đổi thời gian đăng trên lịch.
- Mỗi sự kiện được tô màu phân biệt theo kênh (Xanh cho Facebook, Hồng cho Instagram, Đen cho Threads).
- Cho phép xuất lịch dưới dạng file iCal hoặc CSV để chia sẻ.

**Gắn tham số UTM tự động:**
- Hệ thống tự động gắn tham số UTM vào tất cả các đường link trong Caption trước khi đăng để hỗ trợ đo lường hiệu quả trên Google Analytics.

---

## 7. Module 5: A/B Testing và Tối ưu hiệu suất

### 7.1. Mục tiêu
Giúp Marketer tìm ra Caption hiệu quả nhất bằng cách thử nghiệm nhiều biến thể khác nhau.

### 7.2. Chức năng cụ thể

**Tạo thử nghiệm (Test):**
- Marketer tạo 2-3 biến thể Caption (khác tiêu đề hoặc CTA) cho cùng một bài viết gốc.
- Đặt thời gian chạy thử nghiệm (ví dụ: 24 giờ).

**Tự động luân phiên đăng:**
- Hệ thống tự động đăng luân phiên các biến thể này lên nền tảng (Facebook, Threads, Instagram) theo lịch trình.

**Đo lường và chọn Winner:**
- Sau thời gian chạy, hệ thống tự động lấy dữ liệu: Số lần hiển thị (Impressions), Số click (Clicks) và tính Tỷ lệ nhấp (CTR) cho từng biến thể.
- Biến thể có CTR cao nhất sẽ tự động được đánh dấu là **Winner** (chiến thắng).

**Báo cáo trực quan:**
- Hiển thị báo cáo kết quả với bảng số liệu so sánh và biểu đồ cột, giúp Marketer dễ dàng nhận diện biến thể nào hay hơn.

---

## 8. Module 6: Extension cho trình duyệt (Trải nghiệm 1 click)

### 8.1. Mục tiêu
Cho phép Marketer bắt đầu tạo nội dung ngay trong lúc đọc bài báo, mà không cần mở tab mới hay đăng nhập lại.

### 8.2. Chức năng cụ thể

**Kích hoạt và Popup:**
- Cài Extension trên Chrome. Khi đang xem bài viết trên website `gocnhinmoi.com.vn`, click vào icon Extension sẽ mở một cửa sổ popup nhỏ.

**Nhận diện bài viết tự động:**
- Extension tự động quét DOM (cấu trúc trang web) để lấy Tiêu đề, Tác giả, Thẻ và Nội dung chính của bài viết. (Hỗ trợ nhập tay nếu không lấy được).

**Sinh nội dung đa kênh:**
- Trong popup, Marketer chọn Prompt và bấm "Tạo nội dung". Hệ thống sẽ sinh đồng thời Caption cho cả 3 kênh (Facebook, Threads, Instagram) chỉ trong một lần bấm.
- Xem trước và chỉnh sửa từng Caption ngay trong các tab nhỏ của Extension.

**Cảnh báo trùng lặp:**
- Trước khi xuất bản, hệ thống tự động kiểm tra Caption mới với 100 Caption gần nhất đã đăng trên cùng kênh. Nếu nội dung giống nhau quá 70%, hệ thống sẽ cảnh báo và đề xuất thay đổi để tránh nhàm chán.

**Lên lịch và đăng ngay trong Extension:**
- Sau khi chỉnh sửa, Marketer có thể chọn "Lên lịch" (có gợi ý giờ vàng) hoặc "Đăng ngay" trực tiếp từ popup.

**Ngôn ngữ thông minh:**
- Extension tự động nhận diện bài viết đang đọc là Tiếng Việt hay Tiếng Anh và tự động chọn Prompt tương ứng để AI không bị sai giọng văn.

**Gửi phản hồi:**
- Có nút "Gửi phản hồi" để Marketer báo lỗi hoặc đề xuất tính năng mới ngay trong Extension.

---

## 9. Module 7: Kho dữ liệu và Báo cáo

### 9.1. Mục tiêu
Lưu trữ toàn bộ dữ liệu có cấu trúc và cung cấp khả năng truy xuất, phân tích.

### 9.2. Chức năng cụ thể

**Danh sách Caption:**
- Hiển thị tất cả Caption đã tạo, cho phép tìm kiếm theo nội dung.
- Lọc danh sách theo Nền tảng, Prompt đã dùng, hoặc theo một Bài viết gốc cụ thể (có chức năng tìm kiếm bài viết bằng autocomplete).

**Xuất dữ liệu (CSV):**
- Cho phép xuất toàn bộ dữ liệu Caption (kèm prompt, bài gốc, bản sửa) ra file CSV để phân tích ngoại tuyến.
- Với số lượng lớn (hơn 1000 dòng), hệ thống xử lý ngầm và gửi link tải file qua email cho người dùng.

---

## 10. Yêu cầu phi chức năng (NFRs)

| Yêu cầu | Mô tả |
| :--- | :--- |
| **Hiệu năng** | Tải danh sách dữ liệu dưới 2 giây. Thao tác chỉnh sửa, lưu phải mượt mà. |
| **Bảo mật** | Mật khẩu được mã hóa. Phân quyền chặt chẽ, người xem (Viewer) không thể truy cập chức năng tạo/sửa. Chống tấn công từ chối dịch vụ (Brute force) bằng cơ chế giới hạn số lần thử. |
| **Độ tin cậy** | Hệ thống lên lịch phải chạy chính xác. Khi lỗi API, phải báo lỗi thân thiện và cho phép thử lại. |
| **Trải nghiệm người dùng (UX)** | Giao diện thân thiện, hiển thị trạng thái tải (loading), thông báo thành công/thất bại rõ ràng. Hỗ trợ hiển thị tốt trên cả máy tính và thiết bị di động. |