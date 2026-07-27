// permission.js - Xử lý logic yêu cầu quyền truy cập Microphone cho Extension

document.addEventListener('DOMContentLoaded', () => {
  const btnRequest = document.getElementById('btn-request');
  const successMsg = document.getElementById('success-message');

  // Thử tự động yêu cầu ngay khi load trang
  requestMicPermission();

  btnRequest.addEventListener('click', () => {
    requestMicPermission();
  });

  async function requestMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Thành công: Giải phóng mic ngay lập tức
      stream.getTracks().forEach(track => track.stop());

      // Thông báo cho Popup Side Panel để tự khởi động ghi âm
      chrome.runtime.sendMessage({ action: 'mic_permission_granted' });

      // Hiển thị giao diện thành công và đóng tab
      btnRequest.style.display = 'none';
      successMsg.style.display = 'block';

      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi yêu cầu quyền Microphone:', err);
      // Hướng dẫn người dùng nếu họ lỡ bấm từ chối
      alert('Không thể truy cập Microphone. Vui lòng cho phép quyền truy cập Micro trên thanh địa chỉ của trình duyệt.');
    }
  }
});
