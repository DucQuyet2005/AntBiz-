# Lịch sử thay đổi (Changelog) - AntBiz

Tất cả các thay đổi đáng chú ý đối với dự án AntBiz sẽ được ghi nhận tại đây.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.7.3] - 2026-07-07

### Changed
- Cập nhật nhãn của nút quay lại trong Bước 3 thành "Quay lại Bước 2" (tiếng Việt) và "Back to Step 2" (tiếng Anh) để nhất quán với trải nghiệm quy trình 3 bước thay vì kiểm thử A/B chung chung.

### Fixed
- Khắc phục lỗi nút "Xác nhận và Lên lịch" (Confirm & Schedule) không lên lịch cho toàn bộ các kênh đã chọn khi đăng bài đồng thời. Giờ đây, hệ thống hỗ trợ lên lịch song song cho tất cả các nền tảng hoạt động đã chọn ở Bước 1 thông qua `Promise.all`.
- Sửa lỗi hệ thống "im lặng" (silent fail) khi có lỗi xảy ra trong quá trình lên lịch (như chọn sai giờ trong quá khứ). Các thông báo lỗi (`schedulingError`) giờ đây sẽ được hiển thị rõ ràng ngay phía trên nút Xác nhận thay vì bị ẩn dưới console hoặc không phản hồi.
- Sửa lỗi không thể lên lịch bài viết hiển thị dòng chữ cảnh báo "Please select a variant before scheduling" ở màn hình xác nhận do giá trị biến thể bị null. Hệ thống đã được bổ sung cơ chế fallback để tự động lấy biến thể mặc định đầu tiên khi người dùng loại bỏ thao tác chọn tab.
- Loại bỏ hoàn toàn giới hạn cứng tối đa 3 bài viết/giờ (`isCellOccupied` luôn trả về `false`). Giờ đây, người dùng có thể kéo thả và lên lịch đăng bài hoàn toàn tự do cho nhiều bài viết/nhiều nền tảng trong cùng một khung giờ mà không bị hệ thống chặn cảnh báo.
- Khắc phục lỗi API `PGRST116` ("JSON object requested, multiple rows returned") trong route `POST /api/scheduled-posts` bằng việc thêm `.limit(1)` vào câu truy vấn kiểm tra lịch đăng bài trùng lặp. Điều này giúp ngăn chặn ứng dụng bị crash khi cập nhật lịch đăng cho các caption đã có sẵn nhiều bản ghi trùng lặp ở trạng thái `pending`.
- Sửa lỗi nghiêm trọng khiến bài viết lên lịch cho Instagram hoặc Threads bị ghi nhận và đăng lên Facebook. Nguyên nhân do cơ chế fallback dùng chung thuộc tính `captionId` không phân biệt nền tảng của Variant dẫn đến việc gửi nhầm ID caption của Facebook sang các nền tảng khác. Hệ thống đã được nâng cấp để lưu trữ và truy vấn độc lập thông qua các thuộc tính riêng biệt (`facebookCaptionId`, `instagramCaptionId`, `threadsCaptionId`).
- Tối ưu hóa điều kiện kích hoạt nút "Xác nhận lên lịch": Hệ thống giờ đây chỉ kiểm tra lỗi thời gian/trùng lịch của các nền tảng **đang hoạt động** (được chọn và không bị loại trừ). Các lỗi thuộc về nền tảng đã bị tắt sẽ không còn vô hiệu hóa (disable) nút xác nhận chung của người dùng nữa.
- Tích hợp API đăng bài chính thức cho **Instagram Business**. Hệ thống hiện tại có khả năng tự động liên kết và đăng bài trực tiếp lên tài khoản Instagram thông qua Facebook Page Access Token (Yêu cầu bài viết bắt buộc phải có ít nhất 1 hình ảnh đi kèm theo tiêu chuẩn của Instagram API).

## [1.7.2] - 2026-07-07

### Added
- **Chia bài viết trùng giờ dạng Side-by-Side trên Grid Calendar**:
  - Khi có nhiều bài viết (bản nháp hoặc bài viết cũ) được lên lịch trùng giờ, thay vì gộp chung thành một ô hiển thị "X bài", lịch sẽ tự động chia đôi hoặc chia ba theo chiều rộng để hiển thị các bài viết song song.
  - Cho phép người dùng kéo thả độc lập từng kênh (Facebook, Instagram, Threads) sang ô giờ mới trực tiếp trên lịch mà không bị ràng buộc hay gộp nhóm.
  - Điều chỉnh ẩn tên tiêu đề bài viết trong các thẻ thu nhỏ (khi có nhiều hơn 1 bài trùng giờ) để giữ giao diện gọn gàng và sạch đẹp.
  - Hỗ trợ nhấn vào các thẻ nháp để hiển thị hộp thoại thông tin chi tiết lịch đăng bài (Schedule Details modal) tương tự các bài viết đã lên lịch, hiển thị đầy đủ tiêu đề thực tế của bài viết AI đã sinh thay vì tiêu đề bản nháp tĩnh.

## [1.7.1] - 2026-07-07

### Added
- **Giao diện Bước 2 mới — Mockup Feed Đơn Kênh (Unified Single-Platform Preview)**:
  - Thay thế hoàn toàn bố cục lưới 2 cột biến thể A/B tại Bước 2 bằng một màn hình xem trước đơn kênh sạch gọn, theo phong cách "Bàn làm việc của nhà xuất bản".
  - Thêm thanh chọn nền tảng (Platform Selector) tích hợp icon Facebook, Threads, Instagram dạng tabs gọn nhẹ phù hợp với hệ màu Indigo thương hiệu.
  - Thêm toolbar card hiển thị rõ kênh đang xem và nút **Tái tạo** (`Tái tạo`) với nhãn văn bản thay vì icon đơn độc — tăng khả năng khám phá chức năng.
- **Hỗ trợ chọn nhiều nền tảng cùng lúc (Multi-platform Selection)**:
  - Bổ sung `selectedPlatforms[]` state tại Bước 1 cho phép chọn đồng thời Facebook, Threads và Instagram bằng checkbox.
  - Parallel streaming: sinh nội dung AI song song cho tất cả kênh đã chọn khi nhấn "Tạo nội dung".
- **Tùy chọn nhanh (Quick Picks) trong "Yêu cầu tùy chỉnh"**:
  - Thêm bộ tag chọn nhanh (`selectedQuickPicks`) bên trong dropdown Yêu cầu tùy chỉnh, tự động bổ sung vào prompt cuối.

### Changed
- **Refactor Bước 2 (Step 2 Workspace)**:
  - Loại bỏ hoàn toàn các tab "Biến thể A / Biến thể B" trên thanh toolbar card theo yêu cầu người dùng.
  - Nút điều hướng quay lại được chuyển thành ghost button (không viền, không shadow) đúng chuẩn hệ thống.
  - Nút tiến tiếp chuyển thành solid primary button `bg-primary` thay thế gradient kèm `shadow-primary` vi phạm nguyên tắc Flat-By-Rest.

### Fixed
- Sửa lỗi `Unterminated regexp literal` tại dòng 5727 — Facebook mockup bị thiếu thẻ đóng ảnh và action bar.
- Sửa lỗi `Cannot access 'variants' before initialization` (Temporal Dead Zone) do `useEffect` khai báo sai vị trí trước khi `variants` được định nghĩa.
- Sửa lỗi biên dịch `Expected '</', got 'ident'` do comment `#` trong khối `catch` JSX.
- Sửa lỗi `selectedPlatforms is defined multiple times` do trùng tên biến state.

### Removed
- Xoá 9 file test JavaScript tạm thời tại thư mục gốc (`check_syntax.js`, `apply_model6.js`, v.v.).
- Xoá các file giao diện Preview thử nghiệm: `AiCreatorPreviewView.tsx`, `AiCreatorStep1PreviewView.tsx`, `SplitStepDropdownWizard.tsx` và các route `/ai-creator/preview`, `/ai-creator/preview-step1`.



### Added
- **5 Kịch bản Tương tác Cấu hình AI (Step 1 Interaction Scenarios)**:
  - Tích hợp trang đánh giá kịch bản tương tác cấu hình tại `/ai-creator/preview-step1`.
  - **Kịch bản 1: Modal Nổi (Dialog Stepper)**: Hộp thoại Wizard 3 bước nổi giữa màn hình kèm chọn nhanh bằng các Tag/Chip.
  - **Kịch bản 2: Ngăn Kéo Trượt (Side Drawer)**: Menu cấu hình dọc dạng Accordion trượt ra từ bên phải màn hình.
  - **Kịch bản 3: Mở Rộng Tại Chỗ (Inline Expand)**: Trình cấu hình lồng accordion mở rộng trực tiếp ngay trên thanh sidebar.
  - **Kịch bản 4: Phong cách Sci-Fi/Cyberpunk HUD**: Giao diện điều khiển mang cảm hứng game khoa học viễn tưởng với viền neon mỏng và hiệu ứng terminal biên dịch.
  - **Kịch bản 5: Thẻ Trượt Tương Tác (Card-based Swiper)**: Bộ thẻ flashcard trượt sang trái khi hoàn thành lựa chọn.
  - **Biên dịch Prompt (Prompt Compiler)**: Đồng bộ hóa toàn bộ các lựa chọn cấu hình và tự động sinh mã prompt thô xem trước.

## [1.6.6] - 2026-07-06

### Added
- **Mẫu 6: Soạn thảo & Xem trước Dọc (Tabbed Stacked Editor/Preview)**:
  - Tích hợp thêm Mẫu 6 cho bước 2 AI Creator với cấu trúc soạn thảo dọc phía trên và hiển thị preview bài viết phía dưới.
  - Sử dụng các Tab màu ấm nổi bật (vàng/cam) làm điểm nhấn giao diện giúp dễ dàng chuyển đổi nền tảng đang kiểm thử.
- **Tùy chỉnh nội dung trực tiếp trên Preview (Inline Editing)**:
  - Cho phép click trực tiếp vào Tiêu đề, Tác giả, Hashtags, và Nội dung bài đăng trên các card xem trước (Facebook, Threads, Instagram) để sửa đổi nội dung một cách trực quan, đồng bộ hóa tức thì với dữ liệu state.
- **Tính năng Tái bản AI (AI Content Regeneration)**:
  - Bổ sung nút Tái bản AI (`RefreshCw`) trên góc phải các card xem trước. Khi kích hoạt sẽ hiển thị hiệu ứng xoay loading và tự động điền nội dung được AI tối ưu hóa lại.

### Changed
- **Đồng bộ thuật ngữ và Kích thước Bố cục**:
  - Đổi tên nhãn lựa chọn nền tảng từ "A/B" thành "Nền tảng".
  - Căn chỉnh chiều rộng cột tùy chỉnh mục hiển thị (Sidebar bên trái) lên bằng đúng 33.3% (`lg:col-span-4`) để cân đối diện tích với các phần ưu điểm/nhược điểm phía trên.

## [1.6.5] - 2026-07-06

### Changed
- **Nâng cấp Văn phong thương hiệu & Loại bỏ Hồ sơ tác giả**:
  - Gỡ bỏ hoàn toàn tính năng "Hồ sơ tác giả" (Author Profiles) khỏi toàn bộ dự án theo yêu cầu của người dùng để tối giản hóa quy trình sáng tạo.
  - Loại bỏ các state, handler, API calls (`fetchAuthorProfiles`, `handleCreateAuthorProfile`) và các modal/dropdown tương ứng trên cả giao diện AI Creator (`AiCreatorView.tsx`) và API Engine sinh bài đăng (`api/captions/generate/route.ts`).
  - Đổi tên bước "4. Yêu cầu tùy chỉnh" thành "3. Yêu cầu tùy chỉnh" trên giao diện AI Creator.
- **Tích hợp Quy chuẩn Văn phong thương hiệu dạng Tab (Tabbed Editor)**:
  - Cập nhật giao diện modal tạo/sửa cấu hình văn phong thương hiệu tại `AiCreatorView.tsx` sang dạng Tab (Quy tắc chung, Facebook, Threads, Instagram) đồng bộ hoàn toàn với giao diện chính tại `PromptsView.tsx`.
  - Hỗ trợ lưu trữ quy chuẩn dạng chuỗi JSON của cấu trúc quy tắc từng nền tảng, bám sát hành văn thương hiệu của từng kênh xuất bản riêng biệt.

## [1.6.4] - 2026-07-06

### Added
- **Quy chuẩn Markdown cho Văn phong thương hiệu (Brand Style Rules)**:
  - Bổ sung trường `rules` dạng văn bản lớn (Markdown) vào cơ sở dữ liệu `prompt_configs` và chuyển đổi liền mạch từ các tham số tĩnh (Tone, Độ dài).
  - Tự động điền mẫu (template) hành văn thương hiệu chuyên nghiệp (chứa định nghĩa Hình mẫu, Cách xưng hô, Từ khuyên dùng, Từ cấm, Quy tắc Emoji) khi tạo mới cấu hình.
  - Tích hợp giao diện Textarea Glassmorphism lớn để nhập văn bản tự do trong các modal tạo/sửa cấu hình ở trang thư viện (`PromptsView.tsx`) và không gian sáng tạo (`AiCreatorView.tsx`).
  - Nâng cấp API Engine sinh bài đăng (`api/captions/generate/route.ts`) để inject trực tiếp toàn bộ khối Markdown hướng dẫn vào system prompt của Gemini AI, đảm bảo văn phong bám sát thương hiệu tuyệt đối.

### Changed
- **Nâng cấp Giao diện Xem trước Văn phong (Brand Style Preview)**: 
  - Loại bỏ hoàn toàn các nhãn/chip rời rạc (Tone: Chuyên nghiệp, Độ dài: Vừa).
  - Thay thế bằng khung xem trước nội dung Markdown cắt gọn đẹp mắt (line-clamp-3) với hiệu ứng thủy tinh mờ ở màn hình danh sách thẻ (PromptsView) và bảng tóm tắt Layer 2 (AiCreatorView).

---
## [1.6.3] - 2026-07-03

### Fixed
- **Sửa lỗi hiển thị Hashtag tại AI Creator**: Di chuyển khối thẻ hashtag nằm lên trên phần thông tin tác giả (Author Info) để tránh lỗi đè chữ, đồng thời căn chỉnh khoảng cách hợp lý trong cả giao diện Xem trước bài viết gốc lẫn Modal Xem chi tiết.

## [1.6.2] - 2026-07-01

### Added
- **Unit & Integration Test Suite cho Prompt Config Wizard**:
  - Viết file test Vitest `__tests__/api/promptWizard.test.ts` kiểm thử toàn diện các luồng của bộ câu hỏi định hướng.
  - Test các tổ hợp input nền tảng/tone văn phong/độ dài để kiểm tra độ tin cậy của prompt sinh ra từ Gemini.
  - Integration test toàn luồng: Gọi Wizard sinh prompt $\rightarrow$ Lưu cấu hình vào DB $\rightarrow$ Đồng bộ lên UI.
  - Đạt tỷ lệ bao phủ dòng lệnh (Line Coverage) của API route là **85.71%** và `auth.ts` là **91.66%**, 100% test cases pass.

### Changed
- **Gộp Wizard vào nút Tạo Prompt thông minh**: Di chuyển và tích hợp nút kích hoạt Wizard 5 bước trực tiếp vào nút **"Tạo Prompt thông minh"** trong Dialog soạn thảo chính, gỡ bỏ tất cả các nút Wizard lẻ loi khác để tối giản hóa UI.
- **Tránh lời dẫn giải thừa thãi của AI viết bài**: Bổ sung chỉ thị nghiêm ngặt `"TUYỆT ĐỐI KHÔNG có lời dẫn giải, không 'Ok', không 'Đây là bài viết'. Trả về TRỰC TIẾP bài đăng hoàn chỉnh."` vào template prompt do Gemini sinh ra trong Wizard.
- **Cơ chế chống click nhầm ra ngoài**: Loại bỏ tính năng tự động đóng modal/dialog khi click vào vùng mờ (overlay) đối với Dialog Prompt chính và Modal Wizard. Chỉ cho phép đóng khi bấm nút **[X]**.
- **Chuyển đổi platform thông minh trong prompt**: Khi chuyển đổi các nền tảng (Facebook, Threads, Instagram), hệ thống tự động tìm kiếm và thay đổi các chữ tên platform tương ứng trong Prompt tùy chỉnh đang soạn thảo.
- **Bộ lọc heuristics chặn spam phím rác**: Tích hợp kiểm duyệt nâng cao khi nhập custom tone/length: chặn từ lặp 1 ký tự (ví dụ `"ộ i i"`) và chặn các tổ hợp phím QWERTY spam liên tiếp (như `"dsadadadd"`).

---
## [1.6.1] - 2026-07-01

### Added
- **API phân tích bài viết bằng Gemini (`POST /api/prompt-configs/analyze`)**: Tự động phân tích tiêu đề và nội dung bài viết khi cào để đề xuất Tone, Length, Emphasis phù hợp nhất.
- **Tự động hóa cấu hình prompt khi cào báo**: Khi cào dữ liệu thành công từ URL hoặc Live Explorer, hệ thống tự động điền sẵn các tham số cấu hình gợi ý của AI và sinh prompt mẫu tương ứng.
- **Hiển thị đếm số từ tiếng Việt (~words)**: Tích hợp bộ ước lượng đếm số từ tiếng Việt hiển thị song song cùng số ký tự tại các vùng đếm trong AI Creator và Caption Editor (định dạng `... ký tự (~... từ) / ... ký tự`).
- **Giao diện quản lý cấu hình chuyên biệt tại trang Prompts**: Tích hợp Tab Switcher "Thư viện Prompt" & "Cấu hình tham số AI" trên trang Prompts. Hỗ trợ xem danh sách, Sửa (qua Modal Edit chuyên biệt), Xóa cấu hình, và Đặt cấu hình làm mặc định cho từng platform.
- **Bộ Câu Hỏi Định Hướng (Prompt Config Wizard - Phase 2)**:
  - Tích hợp nút **"🪄 Wizard"** ngay bên cạnh ô Cấu hình đã lưu ở Dialog prompt của AI Creator.
  - Thiết kế Modal Wizard 5 bước bằng Framer Motion: chọn nền tảng, tone, độ dài, nhấn mạnh, variant count & đặt tên.
  - Xây dựng API route `POST /api/prompt-configs/from-wizard` sử dụng Gemini AI sinh prompt động tương ứng với 5 lựa chọn.
  - Hiển thị màn hình kết quả cho phép chỉnh sửa prompt, chọn mặc định, tự động lưu cấu hình và tự điền form sáng tạo caption.

### Changed
- **Tích hợp Lưu cấu hình prompt tự động**: Xóa nút đĩa mềm lưu cấu hình riêng lẻ, tự động thực hiện lưu kép cả prompt lẫn tham số cấu hình (Tone, Length, Emphasis) khi người dùng bấm nút "Lưu và Sử dụng" ở chân Dialog prompt.

### Fixed
- **Sửa lỗi giới hạn ký tự prompt (Zod 400 Bad Request)**: Tự động rút gọn (truncate) nội dung bài viết cào được trong hàm sinh prompt mẫu xuống tối đa 3000 ký tự để luôn vượt qua giới hạn độ dài 8000 ký tự của schema validation.

---
## [1.6.0] - 2026-06-26

### Added
- **Giao diện trang Quản trị & Sáng tạo Nội dung AI (AI Creator & Dashboard Views)**:
  - Tích hợp các component `AdminOverviewView`, `AiCreatorView`, và `ContentCalendarView` cho trang quản trị, sáng tạo nội dung AI và lịch đăng bài đa kênh.
  - Bổ sung ảnh nền `/images/welcome-team.jpg` cho biểu đồ tổng quan (Overview Banner).
  - Thêm tệp kịch bản `inspect_db.ts` hỗ trợ truy vấn trực tiếp trạng thái các bảng `articles`, `captions`, và `scheduled_posts` trong Supabase Database.

### Changed
- **Tối ưu hóa Bố cục và Hoạt ảnh trang Tổng quan (Overview Layout & Animations)**:
  - Cải tiến biểu ngữ chào mừng (`Overview Greeting Banner`) với bố cục căn chỉnh hình ảnh đội ngũ (`welcome-team.jpg`) tỉ lệ chuẩn kết hợp hiệu ứng gradient mờ sang màu chủ đạo của theme (`bg-gradient-to-r`).
  - Áp dụng các hiệu ứng chuyển động mượt mà bằng `framer-motion` cho các khu vực chính của trang `OverviewView` khi tải trang (greeting banner, stats, featured posts, post log).
  - Tái cấu trúc sidebar (`components/Sidebar.tsx`) đồng bộ với layout responsive và quản lý theme; tích hợp trực tiếp menu người dùng và xóa file component tách rời `components/UserProfileDropdown.tsx`.
- **Cải tiến tính năng Onboarding Tour trên trang Overview**:
  - Sử dụng `createPortal` để render popup tour trực tiếp lên `document.body` (tránh lỗi z-index/chèn layout).
  - Cải tiến kích thước mặt nạ SVG mask (`x="-100" y="-100" width="10000" height="10000"`) giúp chống tràn khung khi cuộn trang hoặc ở màn hình lớn.
  - Hỗ trợ Dark Mode đầy đủ cho popup hướng dẫn.
  - Cập nhật tài liệu dịch thuật ngôn ngữ (`lib/i18n/translations.ts`) bổ sung thêm các bước hướng dẫn về tính năng "Tái tạo phiên bản AI" (Regenerate AI Variant) trong tour hướng dẫn.

### Fixed
- **Sửa lỗi hiển thị thời gian đăng bài trong Mockup (Mockup Dynamic Time)**:
  - Trong trang `ArticleDetailView.tsx`, thay thế các mốc thời gian tĩnh ("7 giờ", "2h ago") trong mockup đăng bài của Facebook, Instagram, Threads bằng hàm tính toán động `getMockupDisplayTime()` dựa trên dữ liệu thực tế của bảng `scheduled_posts` trong Supabase.
- **Sửa lỗi phân tích JSON từ phản hồi của Gemini API (Gemini JSON Cleanup)**:
  - Xử lý trường hợp Gemini trả về nội dung bọc trong block code markdown (```json ... ```) trong hàm `classifyArticle`, đồng thời thêm khối try-catch an toàn để tự động chuyển về cơ chế phân loại fallback nếu parse JSON thất bại.
- **Khắc phục lỗi định dạng Dark Mode hiển thị trên trang Chi tiết bài viết (`ArticleDetailView.tsx`)**:
  - Áp dụng các lớp màu nền, viền và kiểu mờ đục phù hợp (`bg-white/80 dark:bg-zinc-900/50`, `border-gray-200/80 dark:border-zinc-800/80`, `backdrop-blur-md`) cho khung bài viết, khối lịch sử phiên bản và danh sách tag khi chạy ở chế độ Dark Mode.

### Removed
- **Loại bỏ file cấu hình tự sinh khỏi Git**:
  - Gỡ bỏ hoàn toàn việc theo dõi tập tin môi trường tự động sinh `next-env.d.ts` khỏi git quản lý (`git rm --cached` và thêm vào `.gitignore`) giúp hạn chế xung đột khi deploy.

---
## [1.5.2] - 2026-06-27

### Changed
- **Cấu hình tìm kiếm Header theo vai trò người dùng (Role-Based Search)**:
  - Tự động thay đổi danh mục truy cập nhanh (Quick Access Links) và các từ khóa tìm kiếm phổ biến (Popular Keywords) dựa trên vai trò của người dùng (`admin`, `marketer_content`, `marketer_full`).
  - Đối với `admin`: Hiển thị các truy cập nhanh đến Quản lý người dùng, Nhật ký hoạt động, Chỉnh sửa Landing, Cài đặt hệ thống.
  - Đối với `marketer`: Giữ nguyên liên kết Thư viện Prompt, AI Creator, Lịch nội dung, Lưu trữ.
  - Cập nhật Placeholder thanh tìm kiếm động theo từng vai trò.
- **Phân tách kết quả tìm kiếm theo phân quyền (Role-Based Search Results)**:
  - Cập nhật API tìm kiếm `/api/search` để tìm kiếm `users` (dựa trên email) và `audit_logs` (dựa trên action) thay vì `articles` và `captions` đối với tài khoản `admin`.
  - Cập nhật giao diện trang tìm kiếm `SearchView` để hiển thị danh sách người dùng và nhật ký hoạt động (với các thẻ hiển thị `UserCard` và `AuditLogCard`) dành riêng cho quản trị viên.

### Fixed
- **Khắc phục lỗi tự động ép tối giao diện (Force Dark Mode override)**:
  - Khắc phục lỗi hiển thị nền thẻ bài viết màu xám tối và chữ trắng khi trình duyệt bật tính năng Force Dark Mode bằng cách bổ sung thuộc tính CSS tiêu chuẩn `color-scheme: light` cho `:root` và `color-scheme: dark` cho `.dark` trong tệp `globals.css`.

## [1.5.1] - 2026-06-25

### Fixed
- **Sửa lỗi hiển thị lịch đăng bài (Calendar Stack Bug)**: Sửa lỗi thiếu hậu tố đơn vị `px` trong thuộc tính định vị `topOffset` của các thẻ bài đăng dạng xếp chồng (stacked post cards), giúp hiển thị đúng khung giờ dự kiến thay vì mặc định dồn về 12 AM.
- **Tối ưu hóa Giao diện Lịch và Khung phân loại (Calendar & Category UI)**:
  - Cập nhật khung lịch tháng thu nhỏ (Mini Monthly Calendar) có màu nền đen tuyền và viền xám tối (`dark:bg-black dark:border-zinc-800`).
  - Thiết lập màu chữ rõ ràng cho ngày trong tháng: chữ trắng đối với các ngày trong tháng hiện tại (`dark:text-white`) và chữ xám đối với ngày thuộc tháng trước/sau (`dark:text-slate-500`).
  - Cung cấp khung viền màu xám rõ nét (`dark:border-zinc-600` qua lớp `.platform-filter-btn`) cho từng nút phân loại mạng xã hội (Facebook, Instagram, Threads) trong phần "Lịch của tôi" ở chế độ Dark Mode.
- **Tắt trạng thái Hover khi dùng Dark Mode**:
  - Vô hiệu hóa màu nền hover sáng màu (`bg-slate-50`, `bg-gray-50`, `bg-slate-50/50`, etc.) bằng quy tắc CSS toàn cục `background-color: transparent !important` khi giao diện ở chế độ Dark Mode (`.dark`), giúp loại bỏ hiện tượng chói mắt/mất chữ khi rê chuột qua các dòng bảng và thẻ danh sách.

## [1.5.0] - 2026-06-24

### Added
- **Bộ lọc danh mục thông báo (Notification Category Filters)**:
  - **Notifications Page (`app/(dashboard)/notifications/page.tsx`)**: Bổ sung thanh bộ lọc danh mục thông báo (Tất cả, Thành công, Thất bại, A/B Testing, Hệ thống) có các nút màu tương ứng với trạng thái và biểu tượng đại diện trực quan.
- **Nút floating cuộn lên đầu trang (Floating Back-to-Top Button)**:
  - **Dashboard Layout (`app/(dashboard)/layout.tsx`)**: Tích hợp nút cuộn lên đầu trang dạng floating với hiệu ứng nảy xúc giác (Framer Motion scale) và chuyển đổi mượt mà khi cuộn trang xuống quá 400px.
- **Bảng hướng dẫn phím tắt năng suất (Keyboard Shortcut Assistant Overlay)**:
  - **Header Component (`components/Header.tsx`)**: Tích hợp biểu tượng hướng dẫn phím tắt trên Header và cơ chế lắng nghe phím `?` toàn cục để kích hoạt một bảng overlay hiển thị chi tiết các phím tắt năng suất trong hệ thống.

### Changed
- **Biểu đồ Thống kê Động (Interactive Analytics Charts)**:
  - **Overview View (`components/views/OverviewView.tsx`)**: Nâng cấp biểu đồ thống kê xuất bản thành biểu đồ tương tác động, hỗ trợ lọc theo mốc thời gian (7 Ngày / 30 Ngày) và nền tảng (Tất cả, Facebook, Instagram, Threads), hiển thị tooltip chi tiết khi hover vào từng cột và tự động giãn cách cột hợp lý khi dữ liệu dày.
- **Biểu đồ xu hướng mini (Dashboard Sparklines)**:
  - **StatCard Component (`components/StatCard.tsx`)**: Tích hợp biểu đồ đường xu hướng mini bằng SVG tự động căn chỉnh tỷ lệ theo dữ liệu số liệu truyền vào.
  - **Overview View (`components/views/OverviewView.tsx`)**: Tích hợp sparkline xu hướng 7 ngày thực tế vào thẻ "Nội dung tích lũy" dựa trên dữ liệu thống kê volume hàng ngày.

## [1.4.2] - 2026-06-24

### Added
- **Phím tắt Năng suất (Keyboard Shortcuts) trong AI Creator**:
  - **AI Creator View (`components/views/AiCreatorView.tsx`)**: Tích hợp các phím tắt nhanh giúp tăng tối đa năng suất làm việc:
    - `Ctrl + Enter` (hoặc `Cmd + Enter`): Kích hoạt sinh caption AI ngay lập tức.
    - Phím `←` / `→` (khi không focus vào ô nhập liệu): Đổi nhanh tab nền tảng (Facebook, Threads, Instagram) dễ dàng.
    - `Ctrl + Shift + C`: Sao chép nhanh văn bản biến thể đang được chọn cho nền tảng hiện tại.
    - `Esc`: Hủy tiến trình sinh đang chạy hoặc đóng modal.

### Changed
- **Tối ưu hóa Hiệu năng Re-render (Memoization)**:
  - **Content Calendar View (`components/views/ContentCalendarView.tsx`)**: Bọc toàn bộ các hàm xử lý trạng thái cốt lõi (`showPopup`, `handleSelectDay`, `fetchPosts`, `handleCancel`, `handlePrevWeek`, `handleNextWeek`, `handleToday`, `handleTogglePlatform`) bằng `useCallback` để giữ tính nhất quán tham chiếu giữa các lần render.
  - **Search View (`components/views/SearchView.tsx`)**: Bao bọc các component kết quả thẻ phụ (`ArticleCard`, `CaptionRow`, `PromptCard`, `FaqCard`) bằng `React.memo` để tránh vẽ lại DOM không cần thiết khi người dùng nhấp chuyển đổi tab kết quả tìm kiếm.

## [1.4.1] - 2026-06-24

### Added
- **AI Model Selection Switcher (Mẫu chọn Model AI - Craft / Shape)**:
  - **AI Creator View (`components/views/AiCreatorView.tsx`)**: Bổ sung bảng chọn Engine AI (`GPT-4o`, `Gemini`, `Claude`) trực quan và sang trọng dạng segmented controls với đầy đủ các trạng thái hover, focus, và active scale, truyền tải chính xác lựa chọn model sang API sinh caption.
- **Trực quan hóa Sinh Nội dung & Hạt lấp lánh (Typewriting & Particles - Overdrive / Delight)**:
  - **AI Creator View (`components/views/AiCreatorView.tsx`)**: Tích hợp hiệu ứng máy đánh chữ hiển thị text đang sinh cùng với hoạt ảnh lấp lánh nhẹ (glowing border ring màu ngọc lục bảo) và phun hạt lấp lánh (pulsing active particles) xung quanh hộp kết quả khi hoàn thành sinh caption thành công.
- **Trích xuất Component & Tối ưu hóa (Extract / Optimize)**:
  - **Debounced Textarea Component (`components/DebouncedTextarea.tsx`)**: Tách logic component `DebouncedTextarea` từ `AiCreatorView.tsx` ra file riêng để ngăn ngừa input lag và re-render toàn cục, giúp cải thiện đáng kể hiệu năng gõ chữ của marketer.
- **Bộ kiểm thử Tự động cho Component mới (Automated Unit Tests)**:
  - **DebouncedTextarea Test (`__tests__/components/DebouncedTextarea.test.tsx`)**: Xây dựng bộ kiểm thử đơn vị cho component `DebouncedTextarea` sử dụng cơ chế giả lập hook của Vitest (`vi.mock`), xác minh cấu trúc props và tính tương thích kết xuất trong môi trường Node.js.

### Changed
- **Nút Sao chép Xúc giác & Hoạt ảnh xoay checkmark (Tactile Copy Buttons - Delight)**:
  - **Captions View (`components/views/CaptionsView.tsx`)** & **Prompts View (`components/views/PromptsView.tsx`)**: Tích hợp hiệu ứng nhấn co giãn xúc giác (`active:scale-95 duration-100`) và hoạt ảnh xoay scale checkmark mượt mà trên các nút Sao chép (Copy) và Nhân bản (Clone) khi thực hiện hành động thành công.
- **Độ nảy xúc giác của Admin Landing Editor (Admin Editor Refinements - Delight)**:
  - **History Sidebar (`components/admin/landing-editor/HistorySidebar.tsx`)**: Tích hợp hiệu ứng co giãn xúc giác `active:scale-[0.98]` khi nhấp nút Khôi phục (Restore) và `active:scale-95` khi nhấp đóng thanh lịch sử.
  - **Image Uploader (`components/admin/landing-editor/ImageUploader.tsx`)**: Bổ sung hiệu ứng xúc giác `active:scale-95` cho các nút Sử dụng hình ảnh/Hủy và `active:scale-[0.99]` cho khu vực kéo thả tệp (Dropzone).
- **Rõ nghĩa Thông báo Lỗi (API Error Banner - Clarify)**:
  - **AI Creator View (`components/views/AiCreatorView.tsx`)**: Thay đổi thiết kế banner thông báo lỗi `generateError` thành dạng phân cấp rõ ràng (phân biệt lỗi thiếu prompt với lỗi API key kết nối), cung cấp nút dẫn hướng nhanh sang trang Cài đặt (Settings) để người dùng dễ dàng cấu hình API Key.

## [1.4.0] - 2026-06-24

### Added
- **Luồng Hướng dẫn nhanh đa ngôn ngữ (Onboarding Tour - Onboard)**:
  - **Overview View (`components/views/OverviewView.tsx`)**: Tích hợp một luồng hướng dẫn nhanh 5 bước cho người dùng lần đầu tiên truy nhập hệ thống (hoặc tùy chọn xem lại bằng nút "Hướng dẫn" ở Banner). Hướng dẫn bao gồm: Bảng chào mừng, Các chỉ số thống kê, Biểu đồ 7 ngày và Nhật ký bài đăng gần đây. Hệ thống tự động ghi nhớ trạng thái hoàn thành tour vào `localStorage` của trình duyệt.
  - **Cải tiến tiêu điểm (Overlay Highlights)**: Kết hợp làm mờ nền bằng backdrop overlay mượt mà cùng hiệu ứng viền phát sáng primary (`ring-4 ring-primary`) trên các khối UI được hướng dẫn.

### Changed
- **Nâng cấp trạng thái Tải kết nối API (Simulated Loading - Critique)**:
  - **Settings View (`components/views/SettingsView.tsx`)**: Thiết lập hiệu ứng tải trạng thái kết nối `openaiLoading` và `midjourneyLoading` kèm biểu tượng xoay `<Loader2 className="animate-spin" />` trong 600ms khi marketer nhấp bật/tắt kết nối API, thay vì thay đổi tức thì, giúp tăng tính tin cậy thực tế và thẩm mỹ cao cấp.

## [1.3.9] - 2026-06-24

### Changed
- **Tối ưu hóa Thẩm mỹ, Định dạng Typography và Khắc phục lỗi TypeScript (Phase 2 UI/UX Refinement)**:
  - **Landing View (`components/views/LandingView.tsx`)**: Loại bỏ hoàn toàn mã màu xanh tím viết cứng `#5A5CDE` và `#4A4CBF` trên các component SVG overlay, nút chỉnh sửa banner và khối CTA Banner sang các biến màu dynamic primary (`border-primary`, `bg-primary`, `text-primary`, `from-primary to-primary-hover`).
  - **Popup Dialog (`components/PopupDialog.tsx`)**: Chuyển đổi mã màu `#5A5CDE` của biểu tượng thông tin (`Info` icon) và màu nền hộp thoại cảnh báo info sang dynamic theme `text-primary` và `bg-primary/10`.
  - **Header (`components/Header.tsx`)**: Đổi màu nền của thông báo chưa đọc trong menu dropdown từ `#5A5CDE/5` sang dynamic `bg-primary/5`.
  - **Article Detail View (`components/views/ArticleDetailView.tsx`)**: Thiết lập giới hạn chiều rộng chữ `max-w-[72ch]` cho khối render nội dung bài viết đầy đủ (bao gồm cả khối body blocks và fallback text), tối ưu hóa trải nghiệm đọc cho marketer tránh mỏi mắt theo tiêu chuẩn typeset.
  - **Global CSS (`app/globals.css`)**: Tích hợp media query `@media (prefers-reduced-motion: reduce)` ở cuối tệp để tự động tắt hoặc tinh giản tất cả các chuyển động/hoạt ảnh CSS đối với người dùng bật chế độ giảm chuyển động trong hệ điều hành.

### Fixed
- **Sửa lỗi TypeScript compilation cho Suite kiểm thử tự động (Hardening & Test Suite)**:
  - **AI Prompt Suggestion Test (`__tests__/api/aiPromptSuggestion.test.ts`)**: Nhập bổ sung helper `vi` từ package `vitest` giải quyết triệt để lỗi không nhận diện `vi.mock`.
  - **Notifications API Test (`__tests__/api/notifications.test.ts`)**: Áp dụng type-casting `as any` cho các tham số Request truyền vào route handler để giải quyết lỗi NextRequest type mismatch.
  - **Scheduled Posts API Test (`__tests__/api/scheduled-posts.test.ts`)**: Đóng gói dynamic route parameters `params` trong hàm `Promise.resolve` tương thích hoàn toàn với Next.js 15+ async params definitions.
  - **Caption Flow Test (`__tests__/captionFlow.test.ts`)**: Bổ sung kiểu khai báo rõ ràng `: string` cho các hằng số so sánh literal để giải quyết cảnh báo no-overlap comparison.
  - **Prompt Suggestion Test (`__tests__/promptSuggestion.test.ts`)**: Cast đối tượng prompt sang `any` để giải quyết lỗi truy xuất thuộc tính `usage_count`.
  - **TS Config (`tsconfig.json`)**: Bổ sung thư mục kiểm thử Playwright `"e2e"` vào mảng `exclude` để tránh biên dịch các file test Playwright vốn thiếu kiểu thư viện E2E.
  - **Background Worker (`worker.ts`)**: Thêm chỉ dẫn `// @ts-ignore` cho thư viện cron để bỏ qua các cảnh báo module resolution của script worker độc lập.

## [1.3.8] - 2026-06-24

### Changed
- **Nâng cấp Giao diện, SEO và Accessibility cho các Trang Xác thực và Root Layout (Phase 2 UI/UX)**:
  - **Root Layout (`app/layout.tsx`)**: Tối ưu hóa thẻ SEO metadata (bilingual Title & Description tiếng Việt/tiếng Anh) giúp hiển thị chuyên nghiệp và tăng điểm xếp hạng tìm kiếm.
  - **Login Page (`app/(auth)/login/page.tsx`)**: Đồng bộ góc bo của container chính về `rounded-2xl` (16px) và ảnh graphic góc trái về `rounded-xl`. Bổ sung focus indicators `:focus-visible:ring-2` trên tất cả các trường input email/password, liên kết quên mật khẩu/đăng ký, nút hiển thị mật khẩu và nút Google OAuth. Tích hợp chỉ số focus và đồng bộ góc bo về `rounded-2xl` cho phần thử thách bảo mật mã PIN matrix locked.
  - **Register Page (`app/(auth)/register/page.tsx`)**: Đồng bộ góc bo của container về `rounded-2xl` (16px). Thiết lập lại góc bo của các input fields từ dạng tròn `rounded-full` sang bo góc chữ nhật chuẩn `rounded-xl` (12px), mang lại sự nhất quán hoàn hảo cho giao diện biểu mẫu. Bổ sung focus ring `:focus-visible:ring-2` cho tất cả các input, nút submit, nút hiển thị mật khẩu và liên kết quay lại đăng nhập.
  - **Forgot Password Page (`app/(auth)/forgot-password/page.tsx`)**: Đồng bộ góc bo container về `rounded-2xl` (16px), chuyển mã màu xanh viết cứng `#5A5CDE` của nút gửi và liên kết về dynamic primary theme. Bổ sung các chỉ số tiêu điểm focus-visible cho các trường email input, nút submit, nút back-to-login và liên kết quay lại.
  - **Reset Password Page (`app/(auth)/reset-password/page.tsx`)**: Đồng bộ góc bo của card loading xác minh, card báo lỗi token và card form mật khẩu về `rounded-2xl` (16px). Chuyển mã màu xanh viết cứng `#5A5CDE` của loading spinner và nút bấm sang primary theme. Tích hợp focus ring `:focus-visible` cho các input mật khẩu mới/xác nhận, nút hiển thị mật khẩu và nút gửi form.
  - **Landing Editor Page (`app/(dashboard)/admin/landing-editor/page.tsx`)**: Chuyển đổi toàn bộ màu sắc Indigo và xanh tím viết cứng (`#5A5CDE` và `#4A4CBF`) sang màu dynamic theme (`bg-primary`, `bg-primary/10`, `text-primary`, `hover:bg-primary-hover`). Bổ sung chỉ số focus `:focus-visible` cho toàn bộ các nút bấm của thanh công cụ nổi (floating toolbar), các nút thêm/xóa Banner/Logo/Review/Plan/FAQ, các trường input/textarea và nút xác nhận trên modal xuất bản.
  - **Admin Access Denied Page (`app/(dashboard)/admin/AdminAccessDenied.tsx`)**: Bổ sung focus ring `:focus-visible:ring-2` cho nút bấm quay lại Dashboard để tối ưu trải nghiệm bàn phím.

## [1.3.7] - 2026-06-24

### Changed
- **Nâng cấp Giao diện và Accessibility cho Layouts và Trang Quản trị (Phase 2 UI/UX)**:
  - **Dashboard Shell Layout (`app/(dashboard)/layout.tsx`)**: Thay thế spinner tải trang truyền thống bằng bộ loader logo thương hiệu pulsing 3D mượt mà có hiệu ứng phát sáng mờ. Thêm focus indicator (`focus-visible:ring-2`) cho nút đăng xuất trên modal khóa tài khoản. Tích hợp thuộc tính `focus-within` cho Sidebar và Header ẩn hiện khi di chuyển tiêu điểm phím Tab giúp keyboard users truy cập và thao tác dễ dàng.
  - **Notifications Page (`app/(dashboard)/notifications/page.tsx`)**: Đồng bộ hóa góc bo hộp chứa thông báo về `rounded-2xl` (16px). Loại bỏ hoàn toàn viền sọc unread side-stripe (banned style). Bổ sung `tabIndex={0}`, xử lý sự kiện keyboard (Space/Enter) và focus ring `:focus-visible` cho các thẻ thông báo để tương tác trơn tru bằng phím. Thiết lập focus-visible rings cho toàn bộ các nút phân trang và nút "Đánh dấu đã đọc". Thay thế mã màu xanh viết cứng `#5A5CDE` sang dynamic primary theme.
  - **User Management Page (`app/(dashboard)/admin/users/page.tsx`)**: Đồng bộ góc bo của khối bộ lọc và bảng danh sách người dùng, cùng các hộp thoại phân quyền/khóa tài khoản về `rounded-2xl` (16px). Nâng cấp focus rings `:focus-visible:ring-2` trên thanh tìm kiếm, các nút phân trang, thẻ chọn vai trò/trạng thái và các nút xác nhận trên modal.
  - **Audit Logs Page (`app/(dashboard)/admin/audit-logs/page.tsx`)**: Đồng bộ góc bo của khối tiêu đề và timeline nhật ký về `rounded-2xl` (16px). Bổ sung `tabIndex={0}`, role="button", thuộc tính ARIA `aria-expanded` và sự kiện bàn phím (Space/Enter) cho các thẻ nhật ký để cho phép duyệt chi tiết log (before/after state) bằng phím. Nâng cấp các nút phân trang, bộ lọc hành động sang dạng focus ring rõ nét.

## [1.3.6] - 2026-06-24

### Changed
- **Nâng cấp Giao diện và Accessibility cho Bộ Component dùng chung (Shared Components)**:
  - **Header.tsx**: Đồng bộ góc bo của thẻ search suggestions dropdown về `rounded-2xl` (16px). Bổ sung chỉ số focus `:focus-visible` cho nút Menu, các liên kết gợi ý tìm kiếm, nút tìm kiếm toàn bộ, nút tạo bài viết mới, nút chuông thông báo, nút đánh dấu đã đọc và các card thông báo. Tích hợp `tabIndex={0}` và xử lý sự kiện bàn phím (Space/Enter) cho các thẻ thông báo để hỗ trợ hoàn hảo bàn phím.
  - **Footer.tsx**: Đồng bộ góc bo trên về `rounded-t-2xl` (16px). Bổ sung focus ring `:focus-visible` cho toàn bộ các liên kết điều hướng menu, liên kết mạng xã hội và nút bấm chọn ngôn ngữ.
  - **Sidebar.tsx**: Đồng bộ góc bo trên bên phải của sidebar và header sidebar về `rounded-tr-2xl` (16px). Bổ sung focus ring `:focus-visible` cho nút đóng sidebar, các liên kết điều hướng, nút chọn ngôn ngữ, nút hỗ trợ và nút đăng xuất.
  - **UserProfileDropdown.tsx**: Bổ sung chỉ số focus-visible cho nút avatar kích hoạt dropdown, nút liên kết chỉnh sửa profile, liên kết cài đặt và nút đăng xuất.
  - **PopupDialog.tsx**: Đồng bộ góc bo của hộp thoại về `rounded-2xl` (16px) và bổ sung focus ring `:focus-visible` cho nút đóng (X).
  - **Toast.tsx**: Bổ sung chỉ số focus `:focus-visible` cho nút đóng thông báo.
  - **StatCard.tsx**: Đồng bộ góc bo của thẻ về `rounded-2xl` (16px). Thay thế màu nền tím cứng `#DFE1FA` bằng dynamic primary tint `bg-primary/10 border border-primary/20`. Thay màu văn bản giá trị viết cứng `#1a1b4b` sang dynamic `text-text`.
  - **ActivityList.tsx**: Đồng bộ góc bo của các thẻ hoạt động về `rounded-2xl` (16px). Thay thế màu nền tím viết cứng `#DFE1FA` và `#DFE1FA]/50` thành dynamic theme `bg-primary/10 border border-primary/20` và `bg-primary/5`. Bổ sung chỉ số focus `:focus-visible`, `tabIndex={0}` và xử lý sự kiện bàn phím cho các card và nút tạo bài viết mới.
  - **CaptionEditor.tsx**: Bổ sung chỉ số focus `:focus-visible` cho nút khôi phục nguyên bản AI. Thiết lập `tabIndex={0}` và sự kiện keyboard (Space/Enter) cùng focus outline cho khung soạn thảo khi ở chế độ xem tĩnh.
  - **ChartPlaceholder.tsx**: Đồng bộ góc bo về `rounded-2xl` (16px). Nâng cấp khu vực hiển thị biểu đồ trống thành bộ cột biểu đồ CSS (Indigo, Peach, Mint) tương tác và co giãn mượt mà khi hover.
  - **PromptCard.tsx**: Tích hợp `tabIndex={0}`, sự kiện keyboard (Space/Enter) và focus ring `:focus-visible` giúp duyệt và chọn các thẻ prompt bằng bàn phím.
  - **PromptSuggestionSection.tsx**: Đồng bộ góc bo của khung gợi ý về `rounded-2xl` (16px). Bổ sung thuộc tính `focus-within:opacity-100` cho phần nút hành động và focus ring `:focus-visible` để hiển thị và kích hoạt nút "Dùng prompt này" bằng bàn phím.
- **Nâng cấp Giao diện và Accessibility cho Bộ Component chỉnh sửa Landing Page (landing-editor/*)**:
  - **BrandForm.tsx**: Loại bỏ viền sọc trái cứng (Side-stripe border) của các tiêu đề phần, đồng bộ hóa góc bo các trường input và select sang `rounded-xl`, đồng bộ bo góc bảng màu và input màu sang `rounded-lg`, bổ sung focus ring `:focus-visible` cho tất cả các điều khiển form.
  - **HeroForm.tsx**: Loại bỏ viền sọc trái cứng của các tiêu đề, đồng bộ hóa góc bo các trường textarea/input sang `rounded-xl`, nâng cấp bo góc preview ảnh nền Hero sang `rounded-2xl` và bổ sung focus ring `:focus-visible` cho các nút điều khiển.
  - **HistorySidebar.tsx**: Thay thế hoàn toàn cơ chế thông báo mặc định của trình duyệt `window.alert()` thành hộp thoại in-app `PopupDialog` mượt mà. Đồng bộ hóa góc bo của các thẻ lịch sử sang `rounded-2xl`, nút khôi phục sang `rounded-xl`, và bổ sung focus ring `:focus-visible` cho nút Close/Restore.
  - **ImageUploader.tsx**: Đồng bộ hóa góc bo của các khung preview ảnh cũ/mới và khung kéo thả tệp dropzone sang `rounded-2xl`, thay thế mã màu xanh viết cứng `#5A5CDE` bằng màu `primary` dynamic. Bổ sung `tabIndex={0}` và xử lý sự kiện Space/Enter cho khung kéo thả giúp tương tác hoàn toàn bằng bàn phím.
  - **SectionsForm.tsx**: Loại bỏ viền sọc trái của tiêu đề, đồng bộ hóa góc bo các trường input/textarea sang `rounded-xl`. Nâng cấp nút "Thêm tính năng" sang dạng `rounded-full` kết hợp màu dynamic, bổ sung `:focus-within` để nút Xóa thẻ có thể hiển thị và tương tác khi di chuyển tiêu điểm bàn phím.

---
## [1.3.5] - 2026-06-24

### Changed
- **Giao diện Kho lưu trữ Caption (CaptionsView.tsx)**:
  - Đồng bộ hóa bán kính bo góc của card caption và màn hình empty state từ `rounded-[32px]` về tiêu chuẩn `rounded-2xl` (16px).
  - Tích hợp thêm các bộ chỉ định tiêu điểm `focus-visible:ring-2` trên thanh tìm kiếm, các nút lọc nền tảng, nút sao chép nhanh, nút phân trang và đường dẫn tiêu đề bài viết gốc để hỗ trợ tiếp cận bàn phím.
- **Giao diện Thư viện Prompt (PromptsView.tsx)**:
  - Đồng bộ bán kính bo góc của các card prompt, hộp thông báo trống, và các cửa sổ popup modal (Create/Edit modal, Delete confirm modal) từ `rounded-[28px]`/`rounded-[32px]` về tiêu chuẩn `rounded-2xl` (16px).
  - Tích hợp thêm các bộ chỉ định tiêu điểm `focus-visible:ring-2` trên tất cả các nút bộ lọc nền tảng, nút mở dropdown tag, bộ phân trang, các nút hành động (Clone, Edit, Delete), và các trường nhập liệu trong modal.
  - Chuyển màu nền trống màu tím nhạt `#F3F4FD` thành xám nhạt trung tính `bg-slate-50`.
- **Giao diện Hồ sơ cá nhân (ProfileView.tsx)**:
  - Đồng bộ bán kính bo góc của các card tổng quan trái/phải và modal chọn hiệu ứng từ `rounded-[32px]`/`rounded-[28px]` về `rounded-2xl` (16px).
  - Bổ sung focus ring `:focus-visible` cho nút Preset ảnh đại diện, ô tải tệp kéo thả, nút chọn khung, hiệu ứng và bục pedestal, nút Lưu thay đổi và liên kết Đổi mật khẩu.
  - Thay màu nền tím nhạt viết cứng `#F3F4FD` trên nhãn phòng ban thành bộ màu dynamic theme `bg-primary/10`.
- **Giao diện Đổi mật khẩu (ChangePasswordView.tsx)**:
  - Đồng bộ bán kính bo góc của các card chi tiết trái/phải từ `rounded-[32px]` về `rounded-2xl` (16px).
  - Bổ sung focus ring `:focus-visible` cho các nút bấm chuyển đổi ẩn/hiện mật khẩu, nút quay lại trang hồ sơ cá nhân và nút xác nhận đổi mật khẩu.
  - Thay màu nền tím nhạt viết cứng `#F3F4FD` trên nhãn phòng ban thành dynamic theme `bg-primary/10`.
- **Giao diện Tìm kiếm tổng hợp (SearchView.tsx)**:
  - Đồng bộ bán kính bo góc của các card bài viết, caption, prompt, FAQ và hộp thông báo trống từ `rounded-[32px]`/`rounded-[28px]`/`rounded-[24px]` về `rounded-2xl` (16px).
  - Tích hợp thêm các bộ chỉ định tiêu điểm `focus-visible:ring-2` trên ô nhập liệu tìm kiếm, nút tìm kiếm, các thẻ tab kết quả và tất cả các thẻ liên kết kết quả.
  - Thay màu nền tím nhạt viết cứng `#F8F9FD` trên màn hình rỗng thành xám nhạt trung tính `bg-slate-50 border-slate-200/60`.
- **Giao diện Giới thiệu sản phẩm (LandingView.tsx)**:
  - Bổ sung chỉ số tiêu điểm `:focus-visible` cho các liên kết điều hướng đầu trang, các nút chọn ngôn ngữ (VN/EN), các nút Đăng nhập/Đăng ký, nút CTA ở banner Hero, chấm phân trang slide, nút điều hướng slide (trong Editor Mode) và nút CTA ở chân trang để đảm bảo khả năng tiếp cận bàn phím hoàn hảo.
- **Giao diện Chi tiết bài viết (ArticleDetailView.tsx)**:
  - Đồng bộ bán kính bo góc của các block nội dung, ảnh minh họa và tag từ `32px`/`24px` về tiêu chuẩn `rounded-2xl` (16px).
  - Chuyển đổi màu sắc xanh tím viết cứng `#3F51B5` trên nút hành động, icon checkpoint, tag metadata sang màu dynamic `primary` thích ứng theo giao diện chủ đạo.
  - Bổ sung chỉ số touch target tối thiểu và focus ring `:focus-visible` cho các nút bấm điều khiển (Share, Link, Edit, Save, Revert) và danh sách checkpoint lịch sử.
- **Giao diện Lưu trữ bài đăng (ArchiveView.tsx)**:
  - Đồng bộ hóa bán kính bo góc của card bài viết và bảng hiển thị từ `32px`/`30px` về tiêu chuẩn `rounded-2xl` (16px).
  - Nâng cấp độ tương phản cho nhãn chữ từ màu xám mờ `text-gray-400` sang xám rõ ràng `text-slate-500`.
  - Tích hợp thêm các bộ chỉ định tiêu điểm `focus-visible:ring-2` trên thanh Tab chuyển đổi, nút lọc phân loại và sắp xếp, bộ phân trang và các liên kết download để nâng cao trải nghiệm truy cập bàn phím.
- **Giao diện Tổng quan Dashboard (OverviewView.tsx)**:
  - Thiết kế đồng bộ bán kính bo góc card từ `32px` / `30px` về tiêu chuẩn `rounded-2xl` (16px).
  - Loại bỏ các màu tím/xanh viết cứng (`indigo-*`, v.v.) thay bằng biến thể màu dynamic `text-primary`, `bg-primary/10`, `border-primary/20` để đồng bộ theo cài đặt giao diện chủ đạo.
  - Tăng độ tương phản chữ xám từ `text-slate-450` / `text-slate-400` lên `text-slate-500` để đạt độ tương phản WCAG AA cao hơn.
  - Thêm focus indicator (`focus-visible:ring-2`) trên nút Refresh, nút Xem lịch đăng bài, và các thẻ bài viết gần đây.
- **Giao diện Cấu hình hệ thống (SettingsView.tsx)**:
  - Tích hợp màu sắc thích ứng theo theme (`bg-primary`, `bg-sidebar/50`) thay cho màu xanh lục `#4E7164` và tím nhạt `#F3F4FD` viết cứng để đồng bộ hiển thị khi người dùng đổi màu chủ đạo hệ thống.
  - Tăng kích thước nút tròn chọn màu từ `32px` lên `40px` và chiều cao tối thiểu của các nút chức năng để tối ưu hóa diện tích chạm trên màn hình cảm ứng di động.
- **Giao diện Hỏi đáp (FaqView.tsx)**:
  - Giảm bán kính bo góc card từ `32px` về `16px` (`rounded-2xl`) tạo nhịp điệu thiết kế tinh gọn, hiện đại và loại bỏ đặc trưng AI Slop.
  - Chuyển màu card Pro Tips viết cứng xanh lục bảo sang gradient màu primary dynamic thích ứng theo cấu hình theme.
- **Giao diện Lịch xuất bản (ContentCalendarView.tsx)**:
  - Triển khai chế độ xem danh sách (Timeline List View) cho mobile (<768px), tự động ẩn Hourly Grid 24h để tăng tính khả dụng và hiển thị tối ưu trên màn hình nhỏ.
  - Loại bỏ viền sọc trái dày `border-l-[4px]` (Anti-Pattern) trên các thẻ sự kiện sang viền toàn phần `border-2 border-slate-200/65` kết hợp nền màu nhạt dynamic.
  - Chuyển màu thẻ lịch viết cứng xanh tím sang màu dynamic primary thích ứng theo theme đang bật.
  - Tăng diện tích chạm cho các nút chuyển đổi tuần đạt chiều cao tối thiểu 40px.
- **Giao diện Soạn thảo & Sáng tạo AI (AiCreatorView.tsx)**:
  - Giải quyết triệt để lỗi trễ gõ chữ (input lag) của form prompt AI bằng cách tích hợp component đệm `DebouncedTextarea` ngăn chặn re-render component cha 4000 dòng trên từng keypress.
  - Thiết kế đồng bộ lại bán kính bo góc thẻ card/modal từ `28px`/`32px` về `16px`/`12px`.
  - Thay màu sắc viết cứng xanh lục nhập URL `#4A6B5D` và `#C4F0E1` thành màu primary thích ứng theo theme và màu CSS biến thể `--color-mint`.
  - Tăng touch target cho các nút điều khiển Web Explorer lên `40x40px` (`w-10 h-10`).

### Fixed
- **Sửa lỗi Accessibility (A11y) trên các trang giao diện đã nâng cấp**:
  - **CaptionsView.tsx**: Bổ sung focus ring `:focus-visible` cho các nút bộ lọc, ô tìm kiếm và các nút phân trang, tối ưu hóa điều hướng bàn phím.
  - **PromptsView.tsx**: Bật focus rings rõ ràng `:focus-visible` cho toàn bộ các nút thao tác chính/phụ và ô tìm kiếm, tối ưu khả năng điều hướng bằng bàn phím.
  - **ProfileView.tsx**: Bổ sung các chỉ số focus-visible cho các nút Preset ảnh đại diện, ô tải tệp kéo thả (hỗ trợ phím Enter/Space qua tabIndex={0}), nút chọn khung/hiệu ứng/đế bục và nút lưu thay đổi.
  - **ChangePasswordView.tsx**: Tích hợp các chỉ chỉ số focus-visible cho các trường nhập liệu mật khẩu và nút chuyển đổi ẩn/hiện, tối ưu hóa điều hướng phím Tab.
  - **SearchView.tsx**: Bật các chỉ số focus-visible cho ô tìm kiếm, nút bấm tìm kiếm, các thẻ tab kết quả và các card liên kết kết quả để cải thiện khả năng tiếp cận bàn phím.
  - **LandingView.tsx**: Bổ sung focus ring cho toàn bộ các nút bấm và thẻ liên kết hành động để nâng cao tính khả dụng bàn phím.
  - **ArticleDetailView.tsx**: Thiết lập focus indicators cho các button điều khiển, tag metadata, và checkpoint button, điều chỉnh tương phản màu chữ đạt WCAG AA.
  - **ArchiveView.tsx**: Bổ sung chỉ số focus cho toàn bộ phần tử tương tác của Lịch sử bài đăng và biểu mẫu tải file, điều chỉnh mức tương phản xám đạt chuẩn WCAG AA.
  - **OverviewView.tsx**: Bật focus outline rõ ràng và thuộc tính keyboard focus cho các thành phần điều khiển, sửa độ tương phản nhãn chữ `text-slate-450` -> `text-slate-500` đảm bảo khả dụng.
  - **SettingsView.tsx**: Bật lại focus ring trên toggle checkbox và nút chuyển đổi phông/ngôn ngữ. Thêm liên kết ARIA `aria-labelledby` và `aria-describedby` cho checkbox input, điều chỉnh phân cấp headings `h4` -> `h3`.
  - **FaqView.tsx**: Bật focus ring trên các tiêu đề accordion, tích hợp thuộc tính ARIA động (`aria-expanded`, `aria-controls`, `role="region"`) và thêm `aria-label` cho ô tìm kiếm.
  - **ContentCalendarView.tsx**: Thêm focus ring `:focus-visible` cho các nút lọc và chuyển tuần, bổ sung `role="switch"` và `aria-checked` cho bộ lọc mạng xã hội, sửa độ tương phản nhãn chữ xám `text-slate-400` -> `text-slate-500`.
  - **AiCreatorView.tsx**: Triển khai thuật toán khóa tiêu điểm bàn phím (Keyboard Focus Trap) cho 5 modal quan trọng trên trang, bật focus outlines cho inline text area và bổ sung `aria-current="step"` cho thanh chỉ dẫn các bước.

---

## [1.3.4] - 2026-06-24

### Added
- **Tài liệu thiết kế Log Caption Prompt**:
  - Bổ sung tài liệu đặc tả thiết kế log so sánh prompt cũ và prompt mới chọn khi tái sinh caption tại `docs/superpowers/specs/2026-06-24-log-caption-prompt-design.md`.

### Changed
- **Log so sánh Prompt khi tái sinh Caption (Backend)**:
  - Cập nhật API route `/api/captions/generate` nhận tham số `oldCaptionId` từ request body.
  - Tích hợp logic truy vấn thông tin prompt của caption cũ từ cơ sở dữ liệu (Supabase) và tiến hành so sánh với prompt mới được yêu cầu (so sánh theo ID đối với prompt thư viện, hoặc so sánh nội dung text đối với custom prompt).
  - In log rõ ràng ra Server Console chi tiết trạng thái thay đổi (`ĂN THEO PROMPT CŨ` hoặc `ĂN THEO PROMPT MỚI`) kèm theo ID và tên prompt cũ/mới để phục vụ quá trình debug và kiểm tra tối ưu hóa bản sao AI.
- **Truyền Caption ID cũ từ Frontend**:
  - Cập nhật hàm `handleRegenerateVariant` trong `components/views/AiCreatorView.tsx` để lưu lại `captionId` của variant trước khi reset state và truyền `oldCaptionId` lên API tái sinh caption.

### Fixed
- **Sửa lỗi Hashtag bị đứt đoạn chứa khoảng trắng khi đăng Facebook**:
  - Thêm helper function `convertToHashtag` và `formatTagsAsHashtags` trong `components/views/AiCreatorView.tsx`.
  - Tự động chuẩn hóa danh sách thẻ tag (tags) bằng cách loại bỏ khoảng trắng bên trong từng tag và chuyển đổi sang dạng PascalCase (VD: `#Hệ số K` -> `#HệSốK`) để Facebook nhận diện nguyên vẹn toàn bộ cụm hashtag.

## [1.3.3] - 2026-06-23

### Changed
- **Sửa lỗi lưu trữ thời gian Đăng nhập cuối (last_login_at)**:
  - Cập nhật luồng xử lý đăng nhập qua mật khẩu trong `app/(auth)/actions.ts` và Google OAuth trong `app/api/auth/callback/route.ts` sang sử dụng Supabase Admin Client (`createAdminClient`) thay thế cho client người dùng thông thường khi ghi nhận/cập nhật trường `last_login_at` trên bảng `users`.
  - Giúp bypass thành công chính sách bảo mật Row Level Security (RLS) vốn chỉ cho phép Admin chỉnh sửa bảng `users`, đảm bảo thời điểm đăng nhập cuối của toàn bộ đối tượng tài khoản (kể cả Marketer) luôn được lưu trữ và ghi nhận chính xác 100% khi deploy.
- **Tối ưu hóa tốc độ nhận thông báo qua Supabase Realtime**:
  - Tích hợp lắng nghe thay đổi thời gian thực qua Supabase Realtime WebSocket cho bảng `notifications` trong `components/Header.tsx` và trang danh sách thông báo chính `/notifications` (`page.tsx`).
  - Giúp giao diện cập nhật lập tức số đếm chưa đọc và danh sách thông báo thả xuống/chính ngay khi thông báo được ghi nhận vào database, thay vì chờ polling 30 giây như trước đây.
- **Đồng bộ hóa quy trình xuất dữ liệu CSV**:
  - Chuyển đổi cơ chế xuất file CSV sang xử lý đồng bộ (synchronous execution) trong API `/api/captions/export` để đảm bảo gửi email và tải về hoạt động tin cậy 100% khi deploy (Vercel/VPS) mà không lo ngại tiến trình nền bị giải phóng.
  - Thay thế endpoint tải file CSV mẫu bằng endpoint mới `/api/captions/export/download` cho phép truy xuất và tạo nội dung CSV theo đúng bộ lọc của job đã lưu.

### Removed
- **Xóa bỏ tính năng mô phỏng Demo Complete**:
  - Gỡ bỏ hoàn toàn nút bấm "Demo Complete" trên giao diện tab Lịch sử (tab History) của `ArchiveView.tsx` và hàm `handleMockCompleteJob` ở client-side.
  - Xóa bỏ API Route POST mock hoàn tất công việc `/api/export-jobs` và toàn bộ thư mục chứa các route test cũ tại `app/api/test/` (`complete-job` và `download-csv`).

## [1.3.2] - 2026-06-23

### Added
- **Migration kích hoạt Realtime cho bảng users**:
  - Bổ sung migration `migrations/20260623_enable_users_realtime.sql` để tự động kích hoạt Supabase Realtime cho bảng `users` thông qua publication `supabase_realtime`, đảm bảo tính năng đồng bộ hóa trạng thái khóa tài khoản hoạt động tự động khi deploy trên môi trường VPS.

### Changed
- **Log trạng thái kết nối Realtime ở DashboardLayout**:
  - Cập nhật `app/(dashboard)/layout.tsx` để ghi log chi tiết trạng thái đăng ký kênh Realtime (`SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR`), hỗ trợ quá trình phát hiện lỗi kết nối WebSocket trên VPS.
- **Tối ưu hóa hiệu năng truy vấn thông báo (Parallel Queries)**:
  - Cải tiến chạy song song các truy vấn cơ sở dữ liệu bằng `Promise.all` tại Client (`components/Header.tsx`) và API Route (`app/api/notifications/route.ts`), giúp giảm một nửa thời gian phản hồi bằng cách loại bỏ các bước chờ tuần tự (sequential network round-trips) khi kết nối với database Supabase từ VPS.
- **Tối ưu hóa trải nghiệm Thay đổi trạng thái & Quyền người dùng (Optimistic UI & Non-blocking APIs)**:
  - Loại bỏ từ khóa `await` đối với nhóm tác vụ phụ trong API cập nhật trạng thái (`[id]/status/route.ts`) và vai trò (`[id]/role/route.ts`) như gửi email và ghi nhật ký hệ thống, giúp API phản hồi ngay lập tức cho client mà không bị nghẽn (do SMTP mail server phản hồi chậm trên VPS).
  - Áp dụng kỹ thuật **Optimistic UI** tại trang Quản lý người dùng (`admin/users/page.tsx`) giúp cập nhật trạng thái "Khóa/Mở khóa" và "Vai trò" lập tức trên màn hình ngay khi xác nhận mà không cần chờ đợi.
  - Bổ sung cấu hình `{ cache: 'no-store' }` cho API tải danh sách người dùng tại client, giải quyết triệt để lỗi trình duyệt lưu cache kết quả cũ dẫn tới giao diện không đổi sau khi thực hiện thao tác.
- **Ẩn nút Thêm bài viết tại giao diện Admin & tài khoản Admin (Header Optimization)**:
  - Cập nhật `components/Header.tsx` tự động ẩn nút "Thêm bài viết" (`Add Post`) khi ở các trang quản trị (đường dẫn bắt đầu bằng `/admin`) hoặc khi tài khoản đăng nhập có vai trò là `admin` (`role === 'admin'`), mang lại sự nhất quán với giao diện Sidebar.
- **Gom nhóm bài viết lên lịch sát nhau trên Lịch nội dung (Calendar Grouping)**:
  - Cải tiến logic hiển thị tại `components/views/ContentCalendarView.tsx` bằng thuật toán gom nhóm khoảng trượt (sliding window 60 phút). Bất kỳ bài đăng nào có thời gian lên lịch cách nhau dưới 60 phút trong ngày sẽ tự động được gộp chung vào một ô xếp chồng (stacked group), ngăn chặn triệt để lỗi chồng chéo giao diện (overlapping card) và giúp trải nghiệm hiển thị trực quan hơn.
  - Sử dụng mã màu đục (`bg-[#F0F1FD]`) cho thẻ gộp chính để che khuất phần viền dưới của các lớp bài đăng xếp chồng bên dưới, giúp phần gộp chỉ hiển thị phần lồi ra ở trên cùng của thẻ mà không bị lộ ở dưới.
- **Hiển thị giờ phút của thông báo**:
  - Cập nhật hàm `formatTimeAgo` ở cả trang xem thông báo (`app/(dashboard)/notifications/page.tsx`) và danh sách thông báo thả xuống ở Header (`components/Header.tsx`) để hiển thị kèm giờ và phút của thông báo (Ví dụ: `14:30 - 2 giờ trước` hoặc `10:15 22/06 - 3 ngày trước`).
- **Việt hóa và bổ sung Icon cho hoạt động Đăng bài trên Nhật ký Hệ thống**:
  - Bản dịch hóa hai hành động `publish_post_success` và `publish_post_failed` sang ngôn ngữ tự nhiên hiển thị tương ứng ở cả hai ngôn ngữ ("Đăng bài thành công"/"Đăng bài thất bại" và "Publish Post Success"/"Publish Post Failed").
  - Gán icon trực quan tương ứng: `CheckCircle2` (màu xanh lá) cho đăng bài thành công và `XCircle` (màu đỏ) cho đăng bài thất bại, thay thế cho icon `Activity` (nhịp tim/pulse) mặc định.
  - Bổ sung hai hành động này vào bộ lọc danh sách thả xuống ở trang Nhật ký Hệ thống (`app/(dashboard)/admin/audit-logs/page.tsx`).
- **Tự động lưu trữ đăng nhập cuối (last_login_at)**:
  - Lưu thời điểm đăng nhập cuối (`last_login_at`) vào bảng `users` khi người dùng đăng nhập thành công qua mật khẩu hoặc Google OAuth.
  - Hiển thị đầy đủ giờ, phút, và giây (`HH:MM:SS DD/MM/YYYY`) thay vì chỉ hiển thị ngày ở cột Đăng nhập cuối trên trang Quản lý người dùng (`app/(dashboard)/admin/users/page.tsx`).
- **Tự động thêm @gmail.com khi nhập thiếu**:
  - Tự động bổ sung hậu tố `@gmail.com` nếu người dùng nhập email đăng nhập thiếu phần `@`.
  - Chuyển đổi thẻ input Email từ `type="email"` sang `type="text"` để bypass cơ chế chặn bubble mặc định của trình duyệt và cho phép xử lý tự động này chạy trơn tru.

## [1.3.1] - 2026-06-23

### Added
- **Quốc tế hóa toàn diện các trang xác thực (Auth Pages)**:
  - Tích hợp hook `useLanguage` và tệp dịch thuật `translations.ts` cho các trang Đăng nhập (`/login`), Đăng ký (`/register`), Quên mật khẩu (`/forgot-password`), và Đặt lại mật khẩu (`/reset-password`).
  - Ánh xạ động các lỗi xác thực từ máy chủ Supabase (như "invalid login credentials", "user already registered", giới hạn tần suất) và các thông báo lỗi Zod validation hiển thị trực quan theo locale đang chọn.

### Changed
- **Tối ưu hóa bố cục trang Landing Page**:
  - Áp dụng các lớp Tailwind (`w-24 text-center inline-block`) cho hai nút Đăng nhập / Đăng ký để cố định kích thước hiển thị, ngăn chặn hiện tượng co giãn, xô lệch menu khi thay đổi ngôn ngữ.
  - Loại bỏ dải màu đen copyright dư thừa (`bg-slate-950`) ở chân trang Landing Page để làm sạch thiết kế giao diện.

### Fixed
- **Khắc phục lỗi ngôn ngữ màn hình tải trung chuyển (Transition Screen)**:
  - Đồng bộ hóa ngôn ngữ người dùng chọn sang cookie `lang` trên trình duyệt.
  - Cập nhật `RootLayout` đọc cookie ngôn ngữ và truyền xuống `LanguageProvider` qua `defaultLanguage` prop giúp render giao diện phía máy chủ (SSR) đồng bộ ngôn ngữ, giải quyết triệt để lỗi hiển thị tiếng Việt mặc định ("Đang xác thực tài khoản...") khi chuyển sang trang Overview.

## [1.3.0] - 2026-06-23

### Added
- **Hệ thống Thông báo In-app thời gian thực (Epic-07)**:
  - Thiết kế schema và tạo migration database cho bảng `notifications` lưu trữ thông tin thông báo (id, user_id, type, title, message, is_read, metadata, created_at).
  - Xây dựng bộ service helper `notificationService.ts` để chuẩn hóa việc tạo thông báo in-app.
  - Phát triển các API route xử lý thông báo: `GET/POST /api/notifications` hỗ trợ phân trang và lọc theo loại; `PUT /api/notifications/[id]/read` và `PUT /api/notifications/read-all` để cập nhật trạng thái đã đọc.
  - Tích hợp lắng nghe thay đổi thời gian thực qua Supabase CDC Realtime Subscription giúp đẩy thông báo dạng Premium Toast tức thì trên thanh Header và cập nhật số lượng tin nhắn chưa đọc.
  - Thiết kế và xây dựng trang xem toàn bộ thông báo tại `/notifications`, hỗ trợ bộ lọc phân loại trực quan (Tất cả, Lên lịch thành công, Bài đăng thất bại, A/B Test hoàn thành, Thông báo hệ thống) cùng nút "Tải thêm" phân trang động.
  - Viết suite kiểm thử tự động `notifications.test.ts` kiểm thử toàn diện các API route với độ bao phủ >80% (đạt 80.3%).
- **Tự động kích hoạt thông báo theo vai trò người dùng**:
  - **Mọi người dùng**: Nhận thông báo khi lưu thông tin cá nhân (ProfileView), thay đổi màu sắc giao diện (SettingsView), hoặc đổi mật khẩu thành công (change-password API).
  - **Marketer**: Nhận thông báo khi lên lịch bài viết thành công (scheduled-posts API), tạo prompt mới thành công (prompts API), hoặc khôi phục thành công phiên bản caption lịch sử (ArticleDetailView).
  - **Admin**: Nhận thông báo khi thực hiện khóa/mở khóa tài khoản người dùng, thay đổi vai trò người dùng (role API), hoặc xuất bản cấu hình landing page mới (landing-config API).
- **Gửi Email thông báo bảo mật**:
  - Tích hợp gửi email tự động (kèm lý do cụ thể) tới người dùng khi tài khoản của họ bị khóa hoặc được mở khóa bởi Admin, sử dụng SMTP cấu hình qua Nodemailer.

### Changed
- **Tối ưu hóa hiệu năng Database & API Admin**:
  - Tích hợp song song (parallelization) bằng `Promise.all` cho các tác vụ phụ của Admin bao gồm: ghi nhật ký hệ thống (`audit_logs`), gửi email thông báo, và tạo thông báo in-app hàng loạt (`createNotifications` qua bulk insert) tại API cập nhật trạng thái tài khoản (`status` route) và thay đổi vai trò người dùng (`role` route), giúp giảm đáng kể thời gian chờ phản hồi của API Database.
- **Trải nghiệm đóng Modal nhanh lập tức (Optimistic UI)**:
  - Cập nhật giao diện quản lý người dùng tại `app/(dashboard)/admin/users/page.tsx` để đóng Modal thay đổi vai trò và Modal khóa/mở khóa tài khoản ngay lập tức khi Admin nhấn nút xác nhận. Các API fetch sẽ được thực thi ngầm dưới background, sau đó hiển thị toast thông báo kết quả qua `PopupDialog` và tải lại bảng danh sách người dùng.
- **Ẩn nút "Thêm bài viết" cho Admin trên toàn cục**:
  - Cập nhật `components/Header.tsx` truy vấn vai trò của người dùng (`userRole`); ẩn hoàn toàn nút "Thêm bài viết" khi vai trò là `admin` trên tất cả các trang (bao gồm cả các trang dùng chung như Tổng quan, Cài đặt và FAQ).
- **Đồng bộ hóa quốc tế hóa (i18n) cho Trang thông báo**:
  - Gắn tệp dịch `translations.ts` và tích hợp hàm `t()` của context ngôn ngữ cho toàn bộ văn bản giao diện tĩnh tại `app/(dashboard)/notifications/page.tsx`.
  - Cập nhật cơ chế dịch động (Dynamic Translation) các thông báo thô từ cơ sở dữ liệu (tiêu đề và nội dung) từ Tiếng Việt sang Tiếng Anh sử dụng helper `translateNotification.ts` để đồng bộ khi thay đổi ngôn ngữ trên cả trang Xem thông báo và dropdown thông báo ở Header.
  - Xóa bỏ dòng mô tả phụ bên dưới tiêu đề trang thông báo.
- **Tinh chỉnh giao diện AI Creator (Step 2)**:
  - Xóa bỏ nhãn `✓ Đã chọn` (Selected) trên các thẻ biến thể được chọn để giao diện gọn gàng hơn.
  - Loại bỏ hoàn toàn khối nút tạo biến thể mới bằng dấu cộng nét đứt ("GENERATE NEW VARIANT") tại màn hình kiểm thử A/B đa kênh để đơn giản hóa giao diện theo yêu cầu.

### Fixed
- **Loại bỏ xung đột kiểm thử vitest**:
  - Cấu hình loại trừ thư mục `e2e` trong `vitest.config.ts` để ngăn vitest quét nhầm các file test Playwright E2E gây lỗi thực thi.
- **Lọc thông báo A/B Test hoàn thành cho Admin**:
  - Cấu hình API `GET /api/notifications` để tự động lọc và không trả về các thông báo loại `ab_test_complete` cho người dùng có vai trò `admin`.
  - Cập nhật hàm `completeABTest` tại `lib/services/abTestService.ts` để kiểm tra vai trò người tạo; bỏ qua việc tạo thông báo in-app `ab_test_complete` nếu người tạo có vai trò `admin`.
  - Điều chỉnh `components/Header.tsx` và `app/(dashboard)/notifications/page.tsx` để ẩn tab lọc "A/B Test hoàn thành" và bỏ qua các sự kiện thông báo thời gian thực loại `ab_test_complete` khi tài khoản đăng nhập là `admin`.
- **Cải tiến Icon và loại bỏ Toast trùng lặp**:
  - Cập nhật hàm `getNotificationIcon` trong `Header.tsx` và trang `/notifications` để phân tích tiêu đề; tự động đổi icon tương ứng với mô tả (ví dụ: hiển thị Lock/Unlock khi khóa/mở tài khoản, UserCog khi đổi vai trò, Palette khi đổi màu giao diện, Key khi đổi mật khẩu, RotateCcw khi khôi phục phiên bản...) thay vì chỉ hiển thị một dấu chấm than (`Info` icon) mặc định.
  - Loại bỏ hoàn toàn pop-up toast trượt `activeToast` ở góc màn hình tại `Header.tsx` để tránh chồng chéo/trùng lặp do hệ thống đã sử dụng bộ `PopupDialog` riêng ở các view chức năng.

## [1.2.9] - 2026-06-23

### Added
- **Trang Đổi mật khẩu độc lập (`/profile/change-password`)**:
  - Tạo route mới `/profile/change-password` sử dụng view `ChangePasswordView` để xử lý đổi mật khẩu riêng biệt thay vì tích hợp chung một trang.
  - Cung cấp form đổi mật khẩu với đầy đủ các trường: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới.
  - Tích hợp bộ kiểm tra độ mạnh của mật khẩu (real-time password strength validation) và check khớp mật khẩu xác nhận.
  - Hỗ trợ ẩn/hiện mật khẩu bằng icon `Eye`/`EyeOff`.
  - Tự động đăng xuất sau 3 giây khi đổi thành công và redirect về trang đăng nhập với thông báo khôi phục mật khẩu thành công (`/login?reset=success`).
- **API đổi mật khẩu có xác minh (`POST /api/users/me/change-password`)**:
  - Tạo endpoint API `POST /api/users/me/change-password` hỗ trợ xác minh mật khẩu hiện tại thông qua Supabase Auth.
  - Cập nhật mật khẩu mới và gọi `signOut(user.id, 'global')` qua Supabase Admin Client để huỷ toàn bộ session/refresh token trên mọi thiết bị.
  - Gửi email xác nhận thay đổi mật khẩu thành công đến hòm thư người dùng qua SMTP (sử dụng thư viện Nodemailer).

### Changed
- **Nút "Đổi mật khẩu tài khoản" trên Profile**:
  - Tạo nút bấm "Đổi mật khẩu tài khoản" (sử dụng icon `Key`) nằm gọn gàng bên dưới Avatar và phần Vai trò / Trạng thái ở thẻ thông tin cột trái của trang cá nhân.
- **Đồng bộ hóa cảnh báo thành `PopupDialog`**:
  - Loại bỏ toàn bộ các khối thông báo alert cũ trên trang Profile và đổi mật khẩu.
  - Thay thế bằng component `PopupDialog` (dạng toast trượt ở góc dưới bên phải) cho tất cả các hành động: cập nhật thông tin cá nhân thành công, lỗi tải ảnh đại diện lên bộ nhớ lưu trữ, cảnh báo điều kiện mật khẩu không thoả mãn, và đổi mật khẩu thành công.

### Fixed
- **Sửa lỗi crash build và 404 do xung đột Middleware**:
  - Khôi phục file cấu hình định tuyến bắt buộc `proxy.ts` (Next.js 16) từ Git.
  - Đổi tên file `middleware.ts` (file backup/log hoạt động của người dùng) thành `middleware-history.ts` ở thư mục gốc để tránh xung đột cấu hình gây crash Turbopack biên dịch.
  - Sửa đổi tham số hàm `POST` của change-password API route từ `NextRequest` thành `Request` để vượt qua kiểm tra kiểu TypeScript của Vitest.

## [1.2.8] - 2026-06-22

### Added
- **Triển khai Bảng điều khiển Admin và Quản lý Người dùng (Admin Panel)**:
  - Tạo mới các trang quản trị `/admin/users` và `/admin/audit-logs` để quản lý phân quyền và kiểm soát bảo mật hệ thống.
  - Xây dựng API endpoints `GET/POST /api/admin/users` và `GET /api/admin/audit-logs` hỗ trợ truy xuất, phân trang, lọc dữ liệu dành riêng cho vai trò Admin.
  - Thêm trang xử lý từ chối quyền truy cập `AdminAccessDenied.tsx` và cấu hình phân quyền trong Layout của trang Admin.

### Changed
- **Cải tiến tự động hóa Changelog (AI Skill)**: Nâng cấp kỹ năng `write-changelog` để AI tự động đánh giá và chỉ ghi nhận các thay đổi quan trọng vào file CHANGELOG.md mỗi khi hoàn thành tác vụ, bỏ qua các sửa đổi nhỏ lẻ.
- **Tương thích Playwright trên Serverless / VPS**: Tích hợp `@sparticuz/chromium` và `playwright-core` vào `lib/crawler/index.ts` để cho phép chạy Playwright headless ổn định trên cả môi trường Local và Vercel/VPS, thiết lập làm trình duyệt cào dữ liệu ưu tiên mặc định.
- **Ẩn nút "Add Post" trên giao diện Admin**:
  - Cập nhật `components/Header.tsx` sử dụng hook `usePathname` để nhận diện các đường dẫn bắt đầu bằng `/admin` và tự động ẩn nút thêm bài viết ("Add Post").
- **Điều chỉnh hiển thị Sidebar theo phân quyền Admin**:
  - Cập nhật `components/Sidebar.tsx` để truy vấn vai trò của người dùng hiện tại; tự động ẩn các liên kết "AI Creator", "Prompts", "Lịch nội dung", "Lưu trữ" khi đăng nhập bằng tài khoản Admin.
  - Tách Bảng điều khiển Admin thành hai mục riêng biệt trên Taskbar (Sidebar): **Quản lý người dùng** (sử dụng icon `Users`) và **Nhật ký hệ thống** (sử dụng icon `History`).
- **Loại bỏ thanh Tab Sub-navigation trùng lặp ở trang Admin**:
  - Cập nhật [AdminHeaderTabs.tsx](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/app/(dashboard)/admin/AdminHeaderTabs.tsx) để loại bỏ hoàn toàn các liên kết Tab Navigation (tránh trùng lặp do đã có trên Sidebar).
  - Tự động thay đổi tiêu đề và mô tả đầu trang tương ứng với trang đang truy cập (Quản lý người dùng hoặc Nhật ký hệ thống).
- **Bổ sung từ điển dịch thuật đa ngôn ngữ (i18n) cho Admin**:
  - Cập nhật [translations.ts](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/lib/i18n/translations.ts) bổ sung toàn bộ các khóa dịch Việt/Anh (`admin.*`) phục vụ trang quản trị, hộp thoại khóa tài khoản, phân trang, và nhật ký bảo mật.
- **Cho phép lên lịch tối đa 3 bài đăng trong cùng một khung giờ**:
  - Phát triển hàm đếm số lượng bài đăng trong ô giờ `getCellPostCount` tại `components/views/AiCreatorView.tsx`, hợp nhất đếm cả bài viết đã lên lịch từ cơ sở dữ liệu và các bản nháp đang kéo thả của các kênh khác trong cùng chiến dịch.
  - Cập nhật hàm kiểm tra `isCellOccupied` để trả về `true` khi số lượng bài viết đạt ngưỡng tối đa là 3 bài/giờ.
  - Cập nhật các hàm thay đổi thời gian thủ công và sự kiện kết thúc kéo thả (`handleFbDragEnd`, `handleThreadsDragEnd`, `handleInstagramDragEnd`) để áp dụng giới hạn mới, tự động chặn và hiển thị thông báo lỗi thân thiện khi vượt quá 3 bài thay vì chặn tuyệt đối khi chỉ có 1 bài như trước.
  - Loại bỏ các đoạn code kiểm tra trùng lặp thủ công và làm sạch hàm `handleInstagramDragEnd` bị dư thừa ở cuối tệp.
- **Thay thế logo thương hiệu bằng thiết kế 3D Glassmorphic mới**:
  - Cập nhật tệp ảnh logo thương hiệu tại [logo.png](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/public/images/logo.png) sang phiên bản logo 3D glassmorphic trong suốt chất lượng cao theo yêu cầu của người dùng.
  - Đồng bộ hóa hiển thị logo mới trên tất cả các trang bao gồm Sidebar (Taskbar), Landing Page và Footer toàn cục.
- **Thay thế toàn bộ hộp thoại cảnh báo (browser alert) thành popup in-app hiện đại**:
  - Tạo mới component [PopupDialog.tsx](file:///c:/Users/ADMIN/Desktop/AntBiz/AntBiz-/components/PopupDialog.tsx) tái sử dụng được, hiển thị nhỏ gọn ở góc dưới cùng bên phải màn hình (Toast style) giúp người dùng theo dõi mà không làm mờ/gián đoạn việc tương tác với giao diện.
  - Tích hợp hoạt ảnh mượt mà từ `framer-motion`, hệ thống icon trạng thái sinh động, cùng bộ đếm thời gian tự động đóng sau 5 giây.
  - Loại bỏ hoàn toàn 13 vị trí sử dụng hàm `alert` mặc định của trình duyệt và thay thế bằng `PopupDialog` trong các chế độ xem: Lịch nội dung (`ContentCalendarView`), Lưu trữ bài viết (`ArchiveView`), và Trình tạo AI (`AiCreatorView`).

### Fixed
- **Sửa lỗi chuyển hướng Google OAuth trên VPS**: Bổ sung hỗ trợ ưu tiên đọc biến môi trường `NEXT_PUBLIC_SITE_URL` trong `app/(auth)/actions.ts` và `app/api/auth/callback/route.ts` để sửa lỗi redirect nhầm về `http://localhost:3000` khi Nginx reverse proxy không forward cấu hình header chuyển tiếp một cách hợp lệ.
- **Sửa lỗi Footer đè lên nội dung cuối trang**:
  - Thay thế thuộc tính `min-h-screen` bằng `flex-1` trên thẻ bọc nội dung chính của `DashboardLayout` (`app/(dashboard)/layout.tsx`), cho phép container chính co giãn tự nhiên theo chiều cao thực tế của nội dung trang và đẩy Footer xuống dưới cùng của trang một cách chuẩn xác.
- **Sửa lỗi chật hẹp và tràn dòng của Header trên thiết bị di động**:
  - Giới hạn chiều rộng tối đa (`max-w`) của ô tìm kiếm trong `components/Header.tsx` từ `max-w-[200px]` xuống `max-w-[120px]` ở các màn hình hẹp (dưới `sm`), giúp Header hiển thị đầy đủ menu, nút thêm bài, chuông thông báo và avatar mà không bị méo hay tràn.
- **Sửa lỗi đè giao diện do cột Preview Sticky trên di động**:
  - Chuyển đổi class `sticky top-6` của cột Shared Preview trong `components/views/AiCreatorView.tsx` thành `lg:sticky lg:top-6` để tắt chế độ sticky khi các cột chuyển sang dạng xếp chồng dọc trên màn hình di động/máy tính bảng, tránh việc cột preview trôi nổi đè lên vùng tùy chỉnh mục hiển thị.

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

## [1.3.0] - 2026-06-19

### Added
- **Endpoint API Scheduler cho Vercel Cron (`app/api/cron/run-scheduler/route.ts`)**: Tạo endpoint API mới để Vercel Cron Job ping kích hoạt chu kỳ kiểm tra và tự động đăng bài viết lên Facebook Page.
- **Tập tin cấu hình Vercel Cron (`vercel.json`)**: Định nghĩa lịch trình chạy Cron Job tự động kích hoạt endpoint scheduler mỗi 10 phút.
- **Tài liệu Hướng dẫn Triển khai Vercel (`docs/DEPLOYMENT_VERCEL.md`)**: Hướng dẫn chi tiết từng bước deploy nhánh tùy chỉnh (custom branch) lên Vercel, cấu hình biến môi trường và redirect URL trên Supabase cho Google OAuth.

### Changed
- **Chuyển đổi Scraper sang Firecrawl API (`lib/crawler/index.ts`)**: Tránh lỗi giới hạn Chromium trên Vercel Serverless bằng cách chuyển đổi Playwright Chromium cũ sang sử dụng Firecrawl Cloud Scraper API (code cũ được comment lại bảo lưu).
- **Vô hiệu hóa Scheduler nội bộ (`app/api/scheduled-posts/route.ts`)**: Comment lại lệnh khởi tạo scheduler trong bộ nhớ (`initScheduler()`) để tránh treo serverless container trên Vercel.
- **Cập nhật cấu hình Biến môi trường (`.env.local`)**: Thêm các biến cấu hình `FIRECRAWL_API_KEY` và `CRON_SECRET` phục vụ cho cào dữ liệu và bảo mật Cron Job.

---

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
