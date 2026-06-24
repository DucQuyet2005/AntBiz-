# Tài liệu thiết kế: Thử thách Ma trận 3x3 khi Đăng nhập Sai

Tài liệu này đặc tả cơ chế thử thách khóa đăng nhập bằng Ma trận 3x3 thay cho cơ chế khóa thời gian 3 phút hiện tại.

## 1. Yêu cầu & Luồng nghiệp vụ

1. **Kích hoạt Khóa**: 
   - Khi người dùng đăng nhập thất bại liên tiếp đạt 5 lần (`login_attempts_count >= 5` hoặc nhận phản hồi khóa từ server), hệ thống sẽ không hiển thị thông báo đếm ngược 3 phút nữa.
   - Thay vào đó, hệ thống sẽ kích hoạt trạng thái khóa Ma trận bằng cách ghi nhận `login_matrix_locked = "true"` vào `localStorage` và mở một Modal thử thách đè lên màn hình đăng nhập.
   
2. **Thử thách Ma trận 3x3**:
   - Modal chứa một bảng lưới 3x3 gồm các số từ 1 đến 9 được xáo trộn ngẫu nhiên.
   - Người dùng bắt đầu bằng việc nhấn số 1, tiếp theo là số 2, số 3, ..., cho đến số 9.
   - **Quy tắc giải**:
     - Khi người dùng nhấn đúng số tiếp theo trong chuỗi, ô số đó sẽ đổi màu sang xanh lá cây (nhẹ) để phản hồi trạng thái đúng.
     - Nếu người dùng nhấn sai số tiếp theo (ví dụ: nhấn số 4 thay vì số 2):
       - Ma trận sẽ kích hoạt hiệu ứng rung / nhấp nháy đỏ để báo hiệu sai.
       - Hệ thống sẽ reset tiến trình về số 1 (xóa các số đã chọn).
       - Hệ thống tự động xáo trộn (reshuffle) lại vị trí các số trong ma trận 3x3 để đảm bảo bảo mật.
       
3. **Mở khóa**:
   - Khi người dùng nhấn đúng toàn bộ dãy số từ 1 đến 9 theo thứ tự tăng dần:
     - Thử thách hoàn thành.
     - Hệ thống xóa trạng thái khóa khỏi `localStorage` (`login_matrix_locked` và `login_attempts_count`).
     - Đóng Modal và cho phép người dùng nhập thông tin đăng nhập lại bình thường.

4. **Độ bền vững (Persistence)**:
   - Nếu người dùng tải lại trang khi đang bị khóa Ma trận, modal vẫn hiển thị đè lên form đăng nhập nhờ kiểm tra khóa lưu trong `localStorage`.

---

## 2. Thiết kế Kỹ thuật & Thuật toán

### A. Thuật toán xáo trộn (Fisher-Yates Shuffle)
Để tạo ma trận 3x3 ngẫu nhiên chứa các số từ 1 đến 9, ta sử dụng thuật toán xáo trộn Fisher-Yates:
```typescript
function shuffleMatrix(): number[] {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

### B. Quản lý trạng thái React (React States)
Thêm các biến trạng thái mới vào `LoginPage`:
- `isMatrixLocked`: Boolean (`true` khi đang bị khóa Ma trận).
- `matrixNumbers`: Array `number[]` (lưu mảng 9 số đã được xáo trộn).
- `nextNumber`: Number (số tiếp theo cần nhấn, bắt đầu từ 1 đến 9).

---

## 3. Thiết kế Giao diện (UI/UX)

- **Backdrop**: Lớp phủ nền mờ toàn màn hình (`fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4`).
- **Challenge Card**: Card căn giữa màn hình với bo góc lớn và thiết kế kính mờ (glassmorphism) đồng bộ với Bento Studio.
- **Tiêu đề**: "Xác minh an toàn đăng nhập" kèm mô tả: "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng hoàn thành thử thách bằng cách click các ô số theo thứ tự từ 1 đến 9."
- **Ma trận 3x3**:
  - Gồm 9 nút tròn hoặc bo góc vuông (`grid grid-cols-3 gap-3 w-64 h-64 mx-auto my-6`).
  - Các nút có hiệu ứng hover mượt mà và bóng đổ nhẹ.
  - Trạng thái màu sắc nút:
    - **Đã chọn đúng**: Nền xanh lá cây nhạt (`bg-emerald-100 border-emerald-500 text-emerald-700 pointer-events-none`).
    - **Chưa chọn**: Nền xám/trắng nhạt (`bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100 hover:border-gray-300`).
- **Hiệu ứng sai**:
  - Khi click sai số, phần bao ngoài ma trận sẽ nhấp nháy viền đỏ (`animate-shake` hoặc viền đỏ chuyển tiếp nhanh) để báo hiệu.

---

## 4. Kế hoạch Kiểm thử (Verification Plan)
1. Thao tác đăng nhập sai 5 lần liên tiếp trên giao diện.
2. Kiểm tra xem Modal Ma trận có hiển thị đè lên màn hình không.
3. Nhấn thử phím F5 / Refresh trang xem Modal có tiếp tục hiển thị hay không.
4. Click sai thứ tự số (ví dụ: click 1 rồi click 3) để xác nhận ma trận tự reset và xáo trộn lại.
5. Click đúng thứ tự từ 1 đến 9 để kiểm tra việc đóng Modal và cho phép nhập liệu đăng nhập bình thường.
