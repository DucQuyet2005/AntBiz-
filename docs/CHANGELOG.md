# Lịch sử thay đổi (Changelog) - AntBiz

Tất cả các thay đổi đáng chú ý đối với dự án AntBiz sẽ được ghi nhận tại đây.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
## [1.2.7] - 2026-06-22

### Changed
- **Đồng nhất màu sắc giao diện Landing Page**:
  - Chuyển đổi toàn bộ tông màu đỏ cũ (`#E31A1A` và `#C21515` cho hover) trên Landing Page sang tông màu xanh/indigo chủ đạo của ứng dụng (`#5A5CDE` và `#4A4CBF` cho hover).
  - Cập nhật màu sắc cho thanh top border của Header, nút bấm chuyển đổi ngôn ngữ (VN/EN), nút đăng ký, nút kêu gọi hành động (CTA) trên Slide, các chấm tròn trượt ảnh, dải viền bên cạnh tiêu đề các khối nội dung "Chúng tôi làm gì", và liên kết "Xem thêm".
  - Tinh chỉnh các hiệu ứng đổ bóng (box shadow) và màu nền hiệu ứng phát sáng mờ từ tông đỏ sang tông màu xanh đồng bộ.
- **Tự động chuyển đến tuần hiện tại trên Lịch nội dung (ContentCalendarView)**:
  - Sửa lỗi hardcode ngày bắt đầu tuần `2026-06-19T09:09:00+07:00` khiến trang lịch luôn hiển thị tuần cũ khi mới tải trang hoặc khi bấm nút "Hôm nay".
  - Tự động xác định và chuyển sang ngày bắt đầu của tuần chứa thời gian hiện tại (`new Date()`) trên client khi component được mount.
  - Cập nhật nút "Hôm nay" (Today) để sử dụng thời gian thực tế.
  - Chuyển đổi tiêu đề tháng/năm ở đầu lịch sang dạng hiển thị động theo tuần đang xem (`currentWeekStart`) thay vì chuỗi tĩnh "Tháng 6, 2026".
- **Đẩy Footer xuống dưới trang và sửa lỗi đè nội dung**:
  - Thêm thuộc tính `min-h-screen` và `shrink-0` vào thẻ bọc nội dung chính của `DashboardLayout` in `app/(dashboard)/layout.tsx`.
  - Đảm bảo tất cả các trang quản trị (Overview, AI Creator, Prompts, Archive, Lịch nội dung, Settings, Profile...) luôn chiếm ít nhất 1 màn hình trước khi hiển thị Footer và không bị Flexbox nén nhỏ (squish) gây đè/trùng lấp nội dung (như biểu đồ, thông tin) lên Footer.
- **Bổ sung tính năng thay đổi màu sắc giao diện (Theme Customization)**:
  - Thiết lập `ThemeContext` và `ThemeProvider` để quản lý trạng thái theme màu chủ đạo toàn cục, hỗ trợ lưu trữ tuỳ chọn người dùng vào `localStorage`.
  - Tích hợp 11 tùy chọn màu giao diện đa dạng tại trang Cài đặt (Settings): 7 màu đơn sắc (Xanh, Đỏ, Tím, Vàng, Lục, Lam, Chàm), 3 màu Gradient (Đen đỏ, Vàng đen, Đen trắng) và hiệu ứng chuyển màu 7 sắc cầu vồng RGB chạy liên tục (*Continuous RGB Rainbow*).
  - Tùy biến lại quy tắc `.bg-primary` trong `globals.css` để hỗ trợ hiển thị mượt mà cả màu đơn sắc, màu gradient và CSS keyframe animations.
  - Thiết kế lại phần Logo trên Sidebar: Phủ nguyên độ rộng (`w-full px-6 py-6`) của Taskbar (Sidebar) với góc trên bên phải được bo mềm mại (`rounded-tr-[32px]`), khoảng cách dưới được kéo gần sát phía trên mục "Tổng quan" (`mb-6`). Chữ tên thương hiệu đổi thành màu trắng, logo đặt trong một khung nền trắng bo góc nhỏ cao cấp.
  - Đồng bộ màu nền Taskbar (Sidebar) và Footer (`bg-sidebar`) thay đổi tự động theo tông màu giao diện được chọn với sắc độ/cường độ thấp hơn (màu nhạt cho theme sáng, màu tối cho theme tối).
  - Tích hợp các bộ quy tắc ghi đè (overrides) trong CSS để đảm bảo khả năng tương phản chữ và các liên kết trong Sidebar/Footer luôn rõ nét trên cả nền tối và sáng.

## [1.2.6] - 2026-06-19

### Changed
- **Cải tiến giao diện Lịch biểu Gantt 2D (ContentCalendarView)**:
  - Thiết kế lại thẻ đại diện cho nhiều bài đăng trùng giờ (Multi-post card): Chuyển sang nền đục hoàn toàn (`bg-[#ECEEF9]`) để không bị trong suốt, tích hợp hiệu ứng xếp lớp 3D (Stacked Cards) chân thực tương ứng với số lượng bài viết lên lịch. Tinh chỉnh hướng xếp chồng bằng cách dịch chuyển các lớp phụ lên phía trên (`topOffset - layerIndex * 3.5`), đồng thời đồng bộ độ rộng của các lớp phụ trùng khớp hoàn toàn với thẻ chính (sử dụng `left-1 right-1`), chỉ cho phép các viền thẻ phụ nhô ra ở mép trên và che khuất hoàn toàn các góc thừa ở mép dưới.
  - Rút ngắn nhãn hiển thị số lượng từ "bài đăng" thành "bài" (ví dụ: "2 bài") và áp dụng kiểu co gọn văn bản (`whitespace-nowrap`) tránh tình trạng xuống dòng xé khung.
  - Tối ưu hóa hiển thị icon nền tảng: Chỉ hiển thị các icon đại diện cho các nền tảng duy nhất (`uniquePlatforms`) đang có bài đăng lên lịch trong ô giờ đó thay vì lặp lại tất cả bài viết.
  - Căn giữa dọc chữ số hiển thị giờ (như `1 AM`, `2 AM`...) vào chính giữa dòng giờ tương ứng thay vì bị lệch xuống dưới.
- **Ẩn Scrollbar và tinh chỉnh Thanh chỉ báo ở Sidebar (Taskbar) sát mép trái**:
  - Sửa lỗi ghi đè CSS bằng cách di chuyển lớp `.no-scrollbar` xuống cuối cùng của `globals.css`, ẩn hoàn toàn và triệt để thanh cuộn dọc trên Sidebar.
  - Tinh chỉnh bố cục Sidebar: Loại bỏ padding-left của Sidebar (`pl-0`), dịch chuyển Logo, Footer tương ứng, giúp thanh chỉ báo dạng vạch dọc có màu (`border-l-4 border-primary`) của nút chức năng đang kích hoạt (active item) nằm sát mép trái của Sidebar (tọa độ x=0) thay vì bị lơ lửng cách mép 24px, đem lại giao diện chuyên nghiệp và rõ ràng hơn.
- **Tùy biến Scrollbar toàn cục triệt để**:
  - Áp dụng các quy tắc tùy biến thanh cuộn webkit (`::-webkit-scrollbar`) cho toàn bộ ứng dụng để các thanh cuộn mặc định (bao gồm cả khung hiển thị chính) trở nên thanh mảnh, bo tròn góc, không chứa các nút mũi tên điều hướng (`::-webkit-scrollbar-button`), đem lại tính đồng bộ thẩm mỹ tối đa.
- **Tinh chỉnh giao diện Trình tạo AI (AiCreatorView)**:
  - Tách biệt và sắp xếp lại các thành phần ở cột bên trái theo từng bước:
    - Ở **Step 1**: Giữ nguyên hộp "Prompt sử dụng" (Prompt Selector) lồng bên trong và nằm dưới cùng của khung preview "Bài viết gốc" (Original Article Preview) để giữ đúng luồng chỉnh sửa tập trung.
    - Ở **Step 2**: Tách biệt thành 3 khối riêng biệt: "Tùy chỉnh mục hiển thị" ở trên cùng, "Prompt sử dụng" ở giữa và khung preview "Bài viết gốc" ở dưới cùng.
  - Sửa lỗi lệch khung hiển thị của ô nhập liệu "NỘI DUNG" ở Step 1: Bổ sung khoảng đệm phía dưới (`pb-6`) và thiết lập thuộc tính cuộn an toàn (`scroll-pb-4`) giúp văn bản ở dòng cuối cùng không bao giờ bị cắt hay chạm sát viền dưới của textarea khi người dùng kéo dãn hoặc nhập nội dung dài.
  - Xóa bỏ nhãn `✓ Đã chọn` (Selected) trên thẻ biến thể được chọn ở cả Step 2 và Step 3 để giao diện thoáng mắt và bớt chi tiết thừa.
  - Sửa lỗi con trỏ soạn thảo (cursor position) tự động nhảy về ký tự đầu tiên khi chỉnh sửa nội dung mô tả của biến thể: Di chuyển component `EditableText` lên cấp module bên ngoài `AiCreatorView` và sử dụng `EditableTextContext` để chia sẻ trạng thái chỉnh sửa, ngăn chặn việc React unmount/remount lại phần tử input/textarea mỗi khi cập nhật state.


## [1.2.5] - 2026-06-19

### Fixed
- **Sửa lỗi treo xác thực ("Đang xác thực tài khoản...") khi đăng nhập thành công**:
  - Xóa cờ `logging_out` khỏi `sessionStorage` ngay khi tải trang `/login` và `/register` để tránh rò rỉ trạng thái đăng xuất khiến `DashboardLayout` bị bỏ qua kiểm tra auth và treo loading spinner.
- **Đồng bộ hóa luồng Đăng xuất trong UserProfileDropdown**:
  - Chuyển đổi nút đăng xuất trong dropdown từ dạng Server Action sang xử lý client-side thống nhất với Sidebar.
  - Sử dụng chung logic thiết lập `logging_out = 'true'`, gọi `supabase.auth.signOut()` để làm sạch cache client, và điều hướng cứng bằng `window.location.href = '/'`.
- **Sửa luồng chuyển hướng của Google OAuth callback**:
  - Cập nhật tuyến đường callback mặc định của Google OAuth sang `/overview` thay vì `/` để tránh vòng lặp chuyển hướng không cần thiết qua trang Landing.
- **Chuyển hướng người dùng chưa đăng nhập về trang Landing**:
  - Cập nhật cơ chế bảo vệ định tuyến trong `DashboardLayout` ([app/(dashboard)/layout.tsx](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/app/(dashboard)/layout.tsx)) và bộ lọc ủy quyền trong `proxy.ts` ([proxy.ts](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/proxy.ts)) để tự động chuyển hướng các truy cập trái phép hoặc khi chưa đăng nhập về trang Landing (`/`) thay vì trang Đăng nhập (`/login`).
  - Thêm đường dẫn gốc `/` vào danh sách các tuyến đường công khai (`isPublicRoute`) trong `proxy.ts` để tránh lỗi lặp chuyển hướng vô hạn (infinite redirect loop / `ERR_TOO_MANY_REDIRECTS`).
  - Cập nhật `proxy.ts` để chuyển hướng người dùng đã đăng nhập khi cố truy cập `/login` hoặc `/register` trực tiếp về `/overview` thay vì `/`.
- **Cải tiến giao diện Header của Landing Page**:
  - Đổi màu nền của Header sang màu lavender nhạt (`bg-[#E9EAF5]`) trùng khớp với màu nền chân trang (Footer), tạo tính nhất quán thương hiệu.
  - Chuyển đổi toàn bộ màu chữ điều hướng của Header sang gam màu tối phù hợp để đảm bảo khả năng tương phản dễ đọc.
  - Thay thế nút kêu gọi hành động đơn lẻ "Trải nghiệm" thành cặp nút "Đăng nhập" (dạng viền thanh lịch) và "Đăng ký" (nền đỏ nổi bật) tương thích đa ngôn ngữ.

## [1.2.4] - 2026-06-19

### Added
- **Landing Page độc lập phong cách Garena**:
  - Thiết kế lại trang Landing Page hoàn chỉnh tại tuyến đường gốc `/`, loại bỏ Sidebar và các Header/Footer của Dashboard.
  - Tích hợp thanh Header tối màu phong cách Garena có viền đỏ chạy phía trên cùng, chứa các menu liên kết, bộ chọn ngôn ngữ VN/EN và nút Trải nghiệm.
  - Thêm Slider trình chiếu banner tự động chạy, nút điều hướng mũi tên và chấm chỉ số.
  - Thiết kế các khối nội dung "Chúng tôi làm gì" dạng thẻ có đường kẻ đỏ bên cạnh tiêu đề, phần giới thiệu nền tảng và khối typographic workflow ở dưới cùng.
  - Tích hợp Footer sẵn có của ứng dụng ở chân trang.

### Changed
- **Cơ chế điều hướng Đăng nhập/Đăng ký & Bảo vệ tuyến đường**:
  - Trang chủ `/` tự động chuyển hướng người dùng đã đăng nhập sang ứng dụng (`/overview`) từ phía Server-side.
  - Bảo vệ toàn bộ layout `(dashboard)` bằng kiểm tra session client-side, tự động chuyển hướng người dùng chưa đăng nhập về `/login`.
  - Tự động chuyển hướng người dùng đã đăng nhập tại trang `/login` và `/register` về `/overview`.
  - Cấu hình lại toàn bộ các nút kêu gọi hành động (CTA) trên Landing Page trỏ về `/login` để yêu cầu xác thực.

### Fixed
- **Sửa lỗi Đăng xuất trong app không hiển thị Landing Page**:
  - Chuyển đổi logic Đăng xuất từ Server Action form sang nút bấm xử lý Client-side thực hiện `signOut` và điều hướng cứng bằng `window.location.href = '/'`.
  - Tích hợp cờ `logging_out` trong `sessionStorage` để thông báo cho `DashboardLayout` không tự động chuyển hướng về `/login` khi phiên đăng nhập bị hủy trong lúc thoát, đảm bảo người dùng về thẳng Landing Page thành công.

## [1.2.3] - 2026-06-19

### Added
- **Redesign & Cập nhật nội dung FAQ (Câu hỏi thường gặp)**:
  - Thiết kế lại toàn bộ giao diện FaqView sử dụng cấu trúc lưới 2 cột và các thẻ panel glassmorphism đồng bộ với phong cách giao diện chung.
  - Cập nhật 8 câu hỏi và câu trả lời thực tế bám sát các tính năng của AntBiz (công cụ cào dữ liệu từ gocnhinmoi, trình duyệt Live Explorer, sinh nội dung A/B bằng Gemini API, thư viện Prompts, cơ chế phân lịch và ngăn ngừa va chạm lịch biểu 2D, checkpoints khôi phục lịch sử, và hàng đợi xuất CSV chạy dưới nền).
  - Tích hợp bộ lọc tìm kiếm thời gian thực (real-time query filter) tự động mở rộng (auto-expand) các câu trả lời trùng khớp để tối ưu hóa trải nghiệm người dùng.
  - Bổ sung thẻ mẹo viết Prompt hữu ích (Pro Tips) và thẻ Liên hệ hỗ trợ trực tuyến.

## [1.2.2] - 2026-06-19

### Added
- **Phân trang trong ArchiveView (Lưu trữ)**:
  - Giới hạn số lượng bài đăng hiển thị tối đa là 6 bài viết trên mỗi trang (`ITEMS_PER_PAGE = 6`).
  - Tự động đặt lại trang hiện tại về 1 khi thay đổi điều kiện tìm kiếm, chọn lọc nền tảng hoặc thứ tự sắp xếp bài viết.
  - Thiết kế và tích hợp bộ điều khiển phân trang cao cấp (Premium Pagination UI) hỗ trợ hiển thị khoảng vị trí bài viết hiện tại (ví dụ: "Hiển thị 1 - 6 trong tổng số 12 bài đăng"), các nút chọn số trang trực tiếp và biểu tượng điều hướng Chevron (`ChevronLeft` / `ChevronRight`).
- **Việt hóa & Bản địa hóa giao diện Prompts & Nút Lên lịch**:
  - Di chuyển nút "Lên lịch biến thể {variant}" trong `AiCreatorView.tsx` sang sử dụng key dịch thuật động `aiCreator.scheduleVariant` thay vì viết cứng tiếng Việt.
  - Xây dựng từ điển dịch thuật `prompts` cho cả hai ngôn ngữ (tiếng Việt và tiếng Anh) chứa tất cả nhãn, hộp thoại xác nhận xóa, ô tìm kiếm và biểu mẫu tạo/sửa.
  - Tích hợp `useLanguage` và chuyển đổi toàn bộ giao diện Prompts (`PromptsView.tsx`) sang dạng đa ngôn ngữ hoàn toàn, tự động chuyển đổi giao diện theo ngôn ngữ hệ thống đang chọn.

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
