# Kế hoạch triển khai: Tái cấu trúc Giao diện Thẻ Văn phong Tối giản & Modal Chi tiết (CRUD)

Kế hoạch này mô tả các bước chỉnh sửa mã nguồn để cập nhật giao diện Văn phong Thương hiệu theo Phương án B (Thẻ File tối giản, nhấp mở Modal chi tiết, loại bỏ tính năng nhân bản).

---

## 1. Danh sách file thay đổi

| File | Trách nhiệm | Loại thay đổi |
| :--- | :--- | :--- |
| `components/views/PresetsView.tsx` | - Cài đặt state `viewingPreset` để quản lý văn phong đang xem chi tiết.<br>- Tái cấu trúc `PresetCard`: Biến toàn bộ thẻ thành vùng nhấp chuột mở Modal (ngoại trừ khi bấm menu ba chấm), ẩn nội dung quy tắc chữ thô.<br>- Loại bỏ tính năng Nhân bản khỏi menu ba chấm và các hàm liên quan.<br>- Tạo mới component `PresetDetailModal` hiển thị thông tin quy tắc được cấu trúc hóa đẹp mắt. | Sửa đổi |

---

## 2. Chi tiết các bước triển khai

### Step 1: Loại bỏ tính năng Nhân bản (Duplicate)
* Xóa nút "Nhân bản" trong phần dropdown menu của `PresetCard`.
* Trong component chính `PresetsView`:
  * Xóa hàm `handleDuplicate`.
  * Dọn dẹp các tham chiếu không cần thiết liên quan đến việc nhân bản.

### Step 2: Cải tiến PresetCard (Thẻ tối giản dạng File)
* **Kích thước**: Đặt chiều cao cố định hoặc tối thiểu nhẹ (`min-h-[160px]`).
* **Bố cục**:
  * Dòng 1: Badge Platform, Badge Mặc định (nếu có), Menu ba chấm ở góc phải.
  * Dòng 2: Tên văn phong nổi bật, font đậm, kích cỡ `text-base` (truncate tối đa 2 dòng).
  * Dòng 3: Danh sách mục tiêu `🎯 [Mục tiêu]` xếp gọn gàng.
  * Xóa hoàn toàn khối quy tắc văn phong cũ.
* **Tương tác**:
  * Bổ sung sự kiện `onClick={() => onSelect(preset)}` vào thẻ chính `<motion.div>`.
  * Tránh xung đột sự kiện (event bubbling) khi nhấp vào menu ba chấm bằng cách gọi `e.stopPropagation()` trong menu.
  * Thêm biểu tượng mắt/xem (`Eye` hoặc `Maximize2` từ Lucide) ở góc dưới bên phải, hiển thị dịu nhẹ khi hover (`opacity-0 group-hover:opacity-100 transition-opacity`).

### Step 3: Tạo Component PresetDetailModal
* Sử dụng `AnimatePresence` và `motion.div` để dựng Modal xem chi tiết:
  * Nền tối mờ nhẹ (`backdrop-blur-sm bg-black/45`).
  * Khung nội dung bo góc tròn, viền tinh tế, bóng mờ cao cấp.
* **Cơ chế bóc tách quy tắc (Rule Parser)**:
  * Đọc chuỗi `preset.rules` và tách dòng.
  * Các dòng quy tắc chính hiển thị với chấm tròn tím nổi bật và nhãn in đậm.
  * Các dòng lưu ý bổ sung nằm trong một box riêng biệt lịch lãm ở chân Modal.
* **Hành động**: Nút "Đóng" màu xám nhẹ và nút "Chỉnh sửa" màu primary nằm ở footer Modal để chuyển nhanh sang Wizard chỉnh sửa.

### Step 4: Quản lý State tại component chính `PresetsView`
* Khai báo state mới:
  ```typescript
  const [viewingPreset, setViewingPreset] = useState<PromptConfigRecord | null>(null);
  ```
* Truyền handler click từ grid vào `PresetCard`.
* Đặt component `<PresetDetailModal>` ở cuối phần JSX để hiển thị khi có yêu cầu.

---

## 3. Kế hoạch kiểm thử & nghiệm thu

1. **Kiểm thử biên dịch**: Chạy `npm run test` để đảm bảo code sạch và không lỗi TypeScript.
2. **Kiểm tra tương tác thẻ**:
   * Rê chuột vào thẻ: Thẻ phóng to nhẹ, đổi viền, hiện icon phóng to ở góc.
   * Click vào vùng trống trên thẻ: Modal chi tiết hiện lên mượt mà.
   * Click vào menu ba chấm -> Chọn Sửa: Modal sửa mở ra (không mở Modal chi tiết).
   * Click vào menu ba chấm -> Kiểm tra không còn tùy chọn "Nhân bản".
3. **Kiểm tra Modal chi tiết**:
   * Thông tin hiển thị đầy đủ, không bị lỗi dòng trống hay ký tự lạ.
   * Nút Đóng đóng Modal bình thường.
   * Nút Sửa mở Wizard Modal tương ứng.
