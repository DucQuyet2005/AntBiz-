# Đồng bộ Văn phong và Tạo bài giữa Extension và Web

## Mục tiêu

Sau khi người dùng đăng nhập thành công:

- Dropdown Văn phong trong Chrome Extension phải hiển thị cùng tập dữ liệu với trang Văn phong trên web: văn phong mặc định, văn phong cá nhân và các văn phong mẫu hệ thống.
- Extension phải tạo được bài bằng phiên đăng nhập hiện tại và áp dụng Văn phong đã chọn, kể cả khi người dùng bấm Thử lại.

## Phạm vi

- Dùng `GET /api/prompt-configs` làm nguồn dữ liệu chung cho web và extension.
- Sửa luồng tải, hiển thị và áp dụng Văn phong trong `chrome-extension/`.
- Dùng một adapter xác thực chung cho request web dùng cookie và request extension dùng Bearer token.
- Áp dụng adapter chung cho API danh sách Văn phong và API tạo bài.
- Không thay đổi database, contract của API hoặc hành vi trang Văn phong trên web.
- Không thay đổi quy chuẩn nền tảng (`platform_presets`); dropdown này chỉ đại diện cho Văn phong thương hiệu (`prompt_configs`).

## Thiết kế

### Luồng dữ liệu

1. Sau khi extension nhận được phiên đăng nhập, popup gửi token và host cho background service worker.
2. Background gọi `GET /api/prompt-configs` với Bearer token.
3. Popup kiểm tra response, lấy toàn bộ phần tử trong `data`, rồi chuẩn hóa thứ tự giống web:
   - Văn phong đang được chọn làm mặc định.
   - Các văn phong cá nhân còn lại.
   - Các văn phong mẫu hệ thống.
4. Dropdown được dựng lại từ danh sách chuẩn hóa, không tạo thêm một bản sao của văn phong mặc định.
5. Extension giữ lựa chọn trước đó nếu ID vẫn tồn tại; nếu không, chọn văn phong mặc định; nếu chưa có mặc định, dùng trạng thái “Không áp dụng”.
6. Khi tạo bài, extension tiếp tục dùng ID và rules của phần tử đang chọn theo luồng hiện tại.

### Xác thực và tạo bài

1. Adapter xác thực dùng session cookie khi request đến từ web.
2. Khi request có header `Authorization: Bearer <token>`, adapter tạo Supabase client gắn token đó và xác minh người dùng bằng Supabase Auth.
3. Sau khi xác thực, adapter đọc role từ bảng `users` và chỉ cho phép `admin`, `marketer_full` hoặc `marketer_content`.
4. API Văn phong và API tạo bài cùng gọi adapter này; Route Handler không tự sao chép quy tắc xác thực.
5. API tạo bài giữ nguyên schema input, Gemini Capacity workflow và response hiện tại.
6. Extension lưu cả `customPrompt` trong tham số retry để Văn phong đang chọn không bị mất khi người dùng bấm Thử lại.

### An toàn phiên đăng nhập web

1. Cookie Supabase thuộc `dev.antbiz.me` hoặc host AntBiz đang mở là tài sản của phiên đăng nhập web; extension chỉ được đọc để đồng bộ, không được xóa khi một API trả 401.
2. Session sao chép vào `chrome.storage.local` là cache riêng của extension. Khi API xác nhận token không hợp lệ, extension chỉ xóa cache này rồi quét lại cookie web một lần.
3. Nếu cookie web chứa token hợp lệ mới, extension tiếp tục khởi tạo bằng token mới.
4. Nếu không tìm thấy token hợp lệ, extension hiển thị màn hình đăng nhập nhưng không đăng xuất hoặc thay đổi trạng thái của trang web.
5. Đăng xuất chủ động chỉ xóa session extension; việc đăng xuất web phải do chính trang web thực hiện.

### Giao diện

- Đổi nhãn “Chọn cấu hình bài đăng (Preset)” thành “Chọn Văn phong”.
- Hiển thị tên của mọi văn phong mà API trả về.
- Phân biệt văn phong cá nhân và mẫu hệ thống bằng nhãn ngắn, nhất quán.
- Chỉ có một option cho mỗi Văn phong.
- Trạng thái “Không áp dụng” là lựa chọn riêng có giá trị rỗng, không giả làm một Văn phong mặc định.

### Xử lý lỗi

- Nếu chưa có token, giữ lựa chọn “Không áp dụng” và không gọi API.
- Nếu background báo lỗi, response sai cấu trúc hoặc API thất bại, dropdown vẫn dùng được với “Không áp dụng”; lỗi được ghi rõ trong console phục vụ chẩn đoán.
- Một lỗi tải Văn phong không được làm hỏng quá trình khởi tạo phần còn lại của popup.
- Chỉ xóa session cache của extension khi server xác nhận Bearer token không hợp lệ; không xóa cookie web và lỗi tạo bài khác vẫn cho phép thử lại.

## Kiến trúc

Logic trình bày và retry nằm trong adapter extension. Xác thực cookie/Bearer nằm trong lớp transport auth dùng chung của server; Route Handler chỉ yêu cầu actor đã xác thực rồi gọi workflow hiện có. Backend `prompt-configs` tiếp tục là nguồn quyết định danh sách người dùng được phép thấy. Extension không sao chép các văn phong mẫu và không truy cập trực tiếp database.

## Kiểm thử

- Kiểm tra response có văn phong mặc định, nhiều văn phong cá nhân và bốn văn phong mẫu hệ thống.
- Kiểm tra thứ tự mặc định → cá nhân → mẫu hệ thống.
- Kiểm tra không lặp văn phong mặc định.
- Kiểm tra giữ lựa chọn cũ khi đổi bước hoặc mở lại popup.
- Kiểm tra fallback khi danh sách rỗng, token thiếu và API trả lỗi.
- Kiểm tra API Văn phong và API tạo bài chấp nhận Bearer token hợp lệ, từ chối token sai và vẫn chấp nhận cookie session của web.
- Kiểm tra lần tạo đầu và lần Thử lại đều gửi cùng `customPrompt` của Văn phong đã chọn.
- Kiểm tra 401 từ cào link, tạo bài, tải file và đăng bài không gọi `chrome.cookies.remove`.
- Kiểm tra extension có thể đồng bộ lại từ cookie web sau khi cache token riêng bị xóa.
- Chạy kiểm tra cú pháp cho JavaScript extension và các test liên quan hiện có.

## Tiêu chí hoàn thành

- Sau đăng nhập, extension hiển thị toàn bộ Văn phong đang hiển thị trên trang Văn phong của cùng tài khoản.
- Mỗi Văn phong xuất hiện đúng một lần và có nhãn dễ nhận biết.
- Văn phong được chọn vẫn được áp dụng khi tạo bài.
- Người dùng đang đăng nhập có thể tạo và thử lại bài từ extension mà không nhận lỗi hết hạn giả.
- Lỗi API trong extension không làm người dùng bị đăng xuất khỏi web.
- Không làm thay đổi API, database hoặc luồng Văn phong trên web.
