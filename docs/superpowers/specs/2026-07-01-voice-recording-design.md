# Design Spec — Direct In-App Voice Recording

## Overview
Cho phép người dùng tự động thu âm giọng nói trực tiếp qua trình duyệt web bằng Web Audio API & MediaRecorder API. Bản ghi sau đó được chuyển đổi trực tiếp thành file ảo `audio/webm` có kích thước giới hạn và gửi đi xử lý qua Groq Whisper STT API.

---

## 🎨 Trực quan & Nhịp điệu giao diện (Visual & Interaction Design)

### 1. Trạng thái Mặc định (Default State)
- Vùng kéo thả file hiển thị 2 tuỳ chọn:
  1. Kéo thả file lên (truyền thống).
  2. Nút **"Ghi âm trực tiếp"** màu primary, có icon 🎙️.

### 2. Trạng thái Đang ghi âm (Recording State)
- Ẩn toàn bộ nội dung kéo thả cũ.
- Hiển thị **Canvas Sóng âm (Live Audio Visualizer Waveform)**:
  - Sử dụng `AnalyserNode` trong Web Audio API để đo biên độ tần số âm thanh đầu vào (`getByteFrequencyData`).
  - Vẽ trực tiếp trên một thẻ `<canvas>` dạng 30-40 thanh cột đứng màu sắc primary `#5A5CDE` có biên độ co giãn liên tục theo giọng nói.
- Bộ đếm thời gian dạng `00:00` hiển thị chính giữa bên dưới canvas nhấp nháy đèn đỏ ghi hình.
- Giới hạn tối đa **10 phút** (sau 10 phút tự động kích hoạt sự kiện Stop để bảo vệ bộ nhớ).
- 2 nút điều khiển:
  - `[ ⏹️ Dừng ghi âm ]` (Stop & export).
  - `[ ❌ Huỷ bỏ ]` (Huỷ luồng thu âm, tắt mic và reset state).

### 3. Trạng thái Lỗi Quyền truy cập (Mic Permission Denied State)
- Nếu trình duyệt báo lỗi `NotAllowedError` hoặc `PermissionDeniedError`:
  - Kích hoạt **Popup Dialog Hướng dẫn bật Mic** (Guideline modal).
  - Hiển thị hình ảnh hoặc text chỉ rõ cách bấm vào icon ổ khoá/mic ở thanh địa chỉ để chuyển trạng thái từ Block sang Allow.

---

## ⚙️ Thiết kế Kỹ thuật (Technical Implementation)

### 1. Audio Recording Flow (Client-side)
- `navigator.mediaDevices.getUserMedia({ audio: true })` để lấy stream âm thanh.
- Tạo `AudioContext` & `AnalyserNode` kết nối với stream để trích xuất dữ liệu vẽ visualizer qua `requestAnimationFrame`.
- Sử dụng `MediaRecorder` với định dạng `audio/webm` (hoặc `audio/ogg` tùy trình duyệt hỗ trợ).
- Lắng nghe `dataavailable` để gom các chunk âm thanh vào `Blob`.
- Khi bấm Dừng, chuyển đổi `Blob` thành một đối tượng `File` ảo đặt tên `ghi-am-truc-tiep.webm` và lưu vào state `voiceFile` của component để tái sử dụng luồng gửi API STT cũ mà không cần chỉnh sửa phần gửi dữ liệu API.

---

## 📋 Checklist Thực thi (Checklist implementation)

1. [ ] **Thiết kế Popup Guideline** — Tạo component modal hoặc hiển thị inline cảnh báo hướng dẫn cấp quyền microphone.
2. [ ] **Xây dựng Canvas Visualizer Hook / Logic** — Viết hàm khởi tạo `AudioContext`, lấy mẫu tần số âm thanh từ microphone và vẽ hoạt hoạ cột sóng trên canvas.
3. [ ] **Tích hợp MediaRecorder** — Quản lý vòng đời ghi âm (Start, Pause, Stop, Cancel) và chuyển đổi Blob sang `File` định dạng `.webm`.
4. [ ] **Cập nhật Giao diện `AiCreatorView.tsx`** — Nhúng giao diện recording, bộ đếm giờ và bộ phát nghe lại (audio player) vào lòng Dropzone.
5. [ ] **Kiểm thử** — Chạy thử toàn bộ luồng ghi âm trực tiếp → xuất file → phân tích qua API Groq.
