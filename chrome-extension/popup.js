// popup.js - Xử lý logic hiển thị và giao tiếp API trên giao diện Extension
let AntBizUrl = 'http://localhost:3000';

// Các màn hình chính
const stateLoading = document.getElementById('state-loading');
const stateUnauth = document.getElementById('state-unauth');
const btnLogin = document.getElementById('btn-login');
const stateHome = document.getElementById('state-home');
const stateError = document.getElementById('state-error');
const stateExtracted = document.getElementById('state-extracted');
const stateSuccess = document.getElementById('state-success');

const userProfile = document.getElementById('user-profile');
const userNameEl = document.getElementById('user-name');
const loadingText = document.getElementById('loading-text');

// Màn hình lỗi
const errorTitle = document.getElementById('error-title');
const errorDescription = document.getElementById('error-description');
const btnErrorRetry = document.getElementById('btn-error-retry');
const btnErrorHome = document.getElementById('btn-error-home');

// Màn hình Home
const btnInputScrape = document.getElementById('btn-input-scrape');
const btnInputSelect = document.getElementById('btn-input-select');
const btnInputRecord = document.getElementById('btn-input-record');
const btnInputUpload = document.getElementById('btn-input-upload');
const inputManualUrl = document.getElementById('input-manual-url');
const btnManualScrape = document.getElementById('btn-manual-scrape');
const recordControlBox = document.getElementById('record-control-box');
const recordTimer = document.getElementById('record-timer');
const btnStopRecord = document.getElementById('btn-stop-record');
const fileUploader = document.getElementById('file-uploader');

// Các bước Wizard trong state-extracted
const stepArticleInfo = document.getElementById('step-article-info');
const stepSocialConfig = document.getElementById('step-social-config');
const stepPostPreview = document.getElementById('step-post-preview');

// Bước 1 Form
const inputTitle = document.getElementById('input-title');
const inputImage = document.getElementById('input-image');
const inputDesc = document.getElementById('input-desc');
const inputContent = document.getElementById('input-content');
const btnCancelToHome1 = document.getElementById('btn-cancel-to-home-1');
const btnNextToSocial = document.getElementById('btn-next-to-social');

// Bước 2 Form
const selectPlatform = document.getElementById('select-platform');
const selectPreset = document.getElementById('select-preset');
const btnBackToArticle = document.getElementById('btn-back-to-article');
const btnCreatePost = document.getElementById('btn-create-post');

// Bước 3 Form
const inputCaption = document.getElementById('input-caption');
const schedulePickerBox = document.getElementById('schedule-picker-box');
const inputScheduleTime = document.getElementById('input-schedule-time');
const btnBackToSocial = document.getElementById('btn-back-to-social');
const btnPublishNow = document.getElementById('btn-publish-now');
const btnSchedulePost = document.getElementById('btn-schedule-post');
const btnConfirmSchedule = document.getElementById('btn-confirm-schedule');

// Bước thành công
const btnViewArchive = document.getElementById('btn-view-archive');
const btnSuccessHome = document.getElementById('btn-success-home');

// Các biến lưu trạng thái
let authToken = '';
let currentArticleData = null;
let activeRequestId = null;
let lastActionType = ''; // 'scrape', 'select', 'record', 'upload'
let lastActionParams = null; // Lưu tham số khi thử lại

// Biến quản lý ghi âm
let mediaRecorder = null;
let audioChunks = [];
let recordTimerInterval = null;
let recordingStartTime = null;
const MAX_RECORDING_SECONDS = 120; // 2 phút

// Hiển thị trạng thái/màn hình
function showState(stateEl, message = '') {
  stateLoading.classList.add('hidden');
  stateUnauth.classList.add('hidden');
  stateHome.classList.add('hidden');
  stateError.classList.add('hidden');
  stateExtracted.classList.add('hidden');
  stateSuccess.classList.add('hidden');

  if (stateEl === stateLoading && message) {
    loadingText.textContent = message;
  }
  stateEl.classList.remove('hidden');
}

// Ẩn/Hiện bước Wizard con
function showSubStep(stepEl) {
  stepArticleInfo.classList.add('hidden');
  stepSocialConfig.classList.add('hidden');
  stepPostPreview.classList.add('hidden');

  stepEl.classList.remove('hidden');
}

// Kích hoạt màn hình lỗi chung
function triggerError(title, desc, retryAction = null, retryParams = null) {
  stopRecordingTimer();
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  recordControlBox.classList.add('hidden');
  
  errorTitle.textContent = title;
  errorDescription.textContent = desc;
  
  if (retryAction) {
    btnErrorRetry.classList.remove('hidden');
    lastActionType = retryAction;
    lastActionParams = retryParams;
  } else {
    btnErrorRetry.classList.add('hidden');
  }
  
  showState(stateError);
}

// Quản lý AbortController thông qua Background
function startNewRequest() {
  cancelActiveRequest();
  activeRequestId = Math.random().toString();
  return activeRequestId;
}

function cancelActiveRequest() {
  if (activeRequestId) {
    chrome.runtime.sendMessage({ action: 'abort_request', requestId: activeRequestId });
    activeRequestId = null;
  }
}

// Khởi chạy khi Popup mở
document.addEventListener('DOMContentLoaded', () => {
  // Xác định động địa chỉ server AntBiz nếu người dùng đang ở trên trang web dự án (localhost / IP)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const tabUrl = new URL(tabs[0].url);
        // Nếu là localhost, 127.0.0.1 hoặc mạng nội bộ 172.25.240.1, cập nhật lại AntBizUrl động
        if (tabUrl.hostname === 'localhost' || tabUrl.hostname === '127.0.0.1' || tabUrl.hostname === '172.25.240.1') {
          AntBizUrl = tabUrl.origin;
          console.log('Đã cấu hình động AntBizUrl:', AntBizUrl);
        }
      } catch (e) {
        console.warn('Lỗi phân tích URL tab active:', e);
      }
    }
    // Chạy kiểm tra phiên làm việc sau khi xác định xong AntBizUrl
    checkAuthAndInitialize();
  });

  initEventListeners();

  // Tự động nhận diện thay đổi Cookie để cập nhật trạng thái kết nối tức thời
  chrome.cookies.onChanged.addListener((changeInfo) => {
    const domain = changeInfo.cookie.domain;
    if (domain.includes('localhost') || domain.includes('127.0.0.1') || domain.includes('172.25.240.1')) {
      checkAuthAndInitialize();
    }
  });
});

// Kiểm tra xem JWT token của Supabase đã hết hạn chưa
function isJwtExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const payload = JSON.parse(atob(base64));
    if (payload && payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    }
  } catch (e) {
    console.warn('Error checking token expiration:', e);
  }
  return true;
}

// Kiểm tra phiên đăng nhập từ Web AntBiz
function checkAuthAndInitialize() {
  showState(stateLoading, 'Đang kiểm tra kết nối AntBiz...');

  chrome.runtime.sendMessage({ action: 'get_session' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Lỗi nhận session:', chrome.runtime.lastError);
      triggerError(
        'Lỗi kết nối',
        'Không thể giao tiếp với Service Worker chạy nền. Vui lòng tắt và mở lại extension hoặc F5 trình duyệt.'
      );
      return;
    }

    if (response && response.session && response.session.access_token && !isJwtExpired(response.session.access_token)) {
      authToken = response.session.access_token;

      // Hiển thị thông tin kết nối
      if (response.session.user && response.session.user.email) {
        const name = response.session.user.user_metadata?.full_name || response.session.user.email.split('@')[0];
        userNameEl.textContent = name;
        userProfile.classList.remove('hidden');
      } else {
        userNameEl.textContent = 'Đã kết nối';
        userProfile.classList.remove('hidden');
      }

      showState(stateHome);
    } else {
      authToken = '';
      userProfile.classList.add('hidden');
      showState(stateUnauth);
    }
  });
}

// Khởi tạo các sự kiện click và lắng nghe
function initEventListeners() {
  btnLogin.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const currentUrl = tabs[0].url;
        // Nếu là trang hệ thống (chrome://, file://...) thì mở tab mới dự phòng
        if (!currentUrl || (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://'))) {
          const loginUrl = `${AntBizUrl}/login?next=${encodeURIComponent('/login/success')}`;
          chrome.tabs.create({ url: loginUrl });
        } else {
          const loginUrl = `${AntBizUrl}/login?next=${encodeURIComponent(currentUrl)}`;
          chrome.tabs.update(tabs[0].id, { url: loginUrl });
        }
      }
    });
  });

  // Hủy tiến trình khi về Home hoặc bấm lỗi
  btnErrorHome.addEventListener('click', () => {
    cancelActiveRequest();
    showState(stateHome);
  });

  btnErrorRetry.addEventListener('click', () => {
    if (lastActionType === 'scrape') {
      startExtraction(lastActionParams);
    } else if (lastActionType === 'select') {
      getSelectedText();
    } else if (lastActionType === 'record') {
      // Ghi âm trực tiếp không lưu trữ blob được để retry trực tiếp nên đưa về ghi âm mới
      startRecording();
    } else if (lastActionType === 'upload') {
      processUploadedFile(lastActionParams);
    } else if (lastActionType === 'generate') {
      retryAiGeneration(lastActionParams);
    }
  });

  // Nút HOME: Cào trang hiện tại
  btnInputScrape.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        // Chỉ cào nếu url hợp lệ
        const url = tabs[0].url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          alert('Chỉ hỗ trợ cào dữ liệu trên các trang web giao thức http hoặc https.');
          return;
        }
        startExtraction(url);
      } else {
        alert('Không tìm thấy tab nào đang hoạt động.');
      }
    });
  });

  // Nút HOME: Cào URL thủ công
  btnManualScrape.addEventListener('click', () => {
    const url = inputManualUrl.value.trim();
    if (!url) {
      alert('Vui lòng nhập địa chỉ URL.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Địa chỉ URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://).');
      return;
    }
    startExtraction(url);
  });

  // Nút HOME: Lấy phần bôi đen
  btnInputSelect.addEventListener('click', () => {
    getSelectedText();
  });

  // Nút HOME: Ghi âm
  btnInputRecord.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  });

  btnStopRecord.addEventListener('click', () => {
    stopRecording();
  });

  // Nút HOME: Tải file
  btnInputUpload.addEventListener('click', () => {
    fileUploader.value = '';
    fileUploader.click();
  });

  fileUploader.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Kiểm tra file <= 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert('Dung lượng tệp lớn hơn 10MB. Vui lòng chọn tệp nhỏ hơn để tránh bị timeout.');
        return;
      }
      processUploadedFile(file);
    }
  });

  // WIZARD BƯỚC 1: Quay lại & Chuyển tiếp
  btnCancelToHome1.addEventListener('click', () => {
    cancelActiveRequest();
    showState(stateHome);
  });

  btnNextToSocial.addEventListener('click', () => {
    const title = inputTitle.value.trim();
    const content = inputContent.value.trim();

    if (!title) {
      alert('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (!content) {
      alert('Vui lòng nhập nội dung bài viết.');
      return;
    }

    showSubStep(stepSocialConfig);
  });

  // WIZARD BƯỚC 2: Quay lại & Chuyển tiếp
  btnBackToArticle.addEventListener('click', () => {
    showSubStep(stepArticleInfo);
  });

  btnCreatePost.addEventListener('click', () => {
    const title = inputTitle.value.trim();
    const content = inputContent.value.trim();
    const platform = selectPlatform.value;

    if (!title || !content) {
      alert('Thiếu tiêu đề hoặc nội dung bài viết gốc để AI phân tích.');
      return;
    }

    const reqId = startNewRequest();
    showState(stateLoading, 'Đang dùng AI sinh nội dung bài viết đăng mạng xã hội...');

    chrome.runtime.sendMessage({
      action: 'generate_content',
      title: title,
      content: content,
      platform: platform,
      token: authToken,
      requestId: reqId
    }, (response) => {
      if (activeRequestId !== reqId) return;

      if (chrome.runtime.lastError) {
        triggerError('Lỗi kết nối', 'Không thể kết nối đến máy chủ AI.', 'generate', { title, content, platform });
        return;
      }

      if (response && response.success && response.data) {
        inputCaption.value = response.data.content || '';
        showState(stateExtracted);
        showSubStep(stepPostPreview);
      } else {
        const errorMsg = response?.error || 'Không xác định';
        triggerError(
          'AI tạo bài viết thất bại',
          `Không thể sinh bài viết từ AI. Chi tiết: ${errorMsg}. Vui lòng thử lại.`,
          'generate',
          { title, content, platform }
        );
      }
    });
  });

  // WIZARD BƯỚC 3: Quay lại & Đăng/Lên lịch
  btnBackToSocial.addEventListener('click', () => {
    showSubStep(stepSocialConfig);
  });

  btnPublishNow.addEventListener('click', () => {
    const platform = selectPlatform.value;
    const postContent = inputCaption.value.trim();

    if (!postContent) {
      alert('Vui lòng nhập nội dung đăng (Caption) trước khi đăng.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn đăng ngay lên ${platform.toUpperCase()} không?`)) {
      submitArticle('publish_now', { platform, postContent });
    }
  });

  btnSchedulePost.addEventListener('click', () => {
    if (schedulePickerBox.classList.contains('hidden')) {
      schedulePickerBox.classList.remove('hidden');

      // Gán mặc định là 1 tiếng sau
      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      now.setSeconds(0);

      const pad = (n) => n < 10 ? '0' + n : n;
      const localIso = now.getFullYear() + '-' +
        pad(now.getMonth() + 1) + '-' +
        pad(now.getDate()) + 'T' +
        pad(now.getHours()) + ':' +
        pad(now.getMinutes());

      inputScheduleTime.value = localIso;
    } else {
      schedulePickerBox.classList.add('hidden');
    }
  });

  btnConfirmSchedule.addEventListener('click', () => {
    const platform = selectPlatform.value;
    const postContent = inputCaption.value.trim();
    const scheduledAt = inputScheduleTime.value;

    if (!postContent) {
      alert('Vui lòng nhập nội dung đăng (Caption).');
      return;
    }

    if (!scheduledAt) {
      alert('Vui lòng chọn thời gian đăng bài.');
      return;
    }

    const scheduledTime = new Date(scheduledAt);
    if (scheduledTime.getTime() <= Date.now()) {
      alert('Thời gian lên lịch đăng bài phải nằm trong tương lai.');
      return;
    }

    submitArticle('schedule', { platform, postContent, scheduledAt });
  });

  // MÀN HÌNH THÀNH CÔNG
  btnViewArchive.addEventListener('click', () => {
    chrome.tabs.create({ url: `${AntBizUrl}/archive` });
  });

  btnSuccessHome.addEventListener('click', () => {
    showState(stateHome);
  });
}

// Chuyển file sang Base64 chuỗi để truyền qua sendMessage
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// CÔNG CỤ 1: Luồng cào link bài viết
function startExtraction(url) {
  const reqId = startNewRequest();
  showState(stateLoading, 'Đang tiến hành cào nội dung bài viết...');

  chrome.runtime.sendMessage({
    action: 'scrape_url',
    url: url,
    token: authToken,
    requestId: reqId
  }, (response) => {
    if (activeRequestId !== reqId) return; // Request đã bị hủy hoặc thay thế

    if (chrome.runtime.lastError) {
      triggerError(
        'Lỗi kết nối',
        'Không thể kết nối đến máy chủ cào dữ liệu qua background.',
        'scrape',
        url
      );
      return;
    }

    if (response && response.success && response.data) {
      currentArticleData = {
        title: response.data.title || '',
        description: response.data.description || '',
        content: response.data.full_text || response.data.description || '',
        originUrl: response.data.url || url,
        imageUrl: response.data.imageUrl || ''
      };

      inputTitle.value = currentArticleData.title;
      inputImage.value = currentArticleData.imageUrl;
      inputDesc.value = currentArticleData.description;
      inputContent.value = currentArticleData.content;

      showState(stateExtracted);
      showSubStep(stepArticleInfo);
    } else {
      const errorMsg = response?.error || 'Có thể do lỗi mạng hoặc chặn truy cập (SSRF Protection/Cloudflare)';
      triggerError(
        'Cào link thất bại',
        `Không thể cào dữ liệu tự động từ liên kết này. Lỗi: ${errorMsg}. Vui lòng kiểm tra lại URL hoặc copy nội dung bài viết và dán thủ công.`,
        'scrape',
        url
      );
    }
  });
}

// CÔNG CỤ 2: Luồng trích xuất văn bản bôi đen
function getSelectedText() {
  showState(stateLoading, 'Đang trích xuất vùng bôi đen...');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      triggerError('Lỗi tác vụ', 'Không tìm thấy cửa sổ trình duyệt nào hoạt động.');
      return;
    }

    const activeTab = tabs[0];
    if (!activeTab.url.startsWith('http://') && !activeTab.url.startsWith('https://')) {
      triggerError(
        'Không hỗ trợ',
        'Tính năng lấy vùng bôi đen chỉ hoạt động trên các trang web (http/https), không hỗ trợ trên trang cài đặt trình duyệt.'
      );
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: 'get_selected_text' }, (response) => {
      if (chrome.runtime.lastError) {
        // Tự động nạp content.js nếu tab chưa được inject
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            triggerError(
              'Lỗi kết nối trang',
              'Không thể nhúng mã trích xuất vào trang web này. Hãy F5 tải lại trang báo và thử lại.'
            );
            return;
          }

          chrome.tabs.sendMessage(activeTab.id, { action: 'get_selected_text' }, (secondResponse) => {
            if (chrome.runtime.lastError) {
              triggerError('Lỗi kết nối trang', 'Không thể giao tiếp với trang báo để trích xuất.');
              return;
            }
            handleSelectionResponse(secondResponse);
          });
        });
        return;
      }

      handleSelectionResponse(response);
    });
  });
}

function handleSelectionResponse(response) {
  if (response && response.success && response.text) {
    currentArticleData = {
      title: response.title || 'Bài viết bôi đen từ ' + new Date().toLocaleDateString('vi-VN'),
      description: '',
      content: response.text,
      originUrl: response.url || '',
      imageUrl: ''
    };

    inputTitle.value = currentArticleData.title;
    inputImage.value = '';
    inputDesc.value = '';
    inputContent.value = currentArticleData.content;

    showState(stateExtracted);
    showSubStep(stepArticleInfo);
  } else {
    alert('Vui lòng quét (bôi đen) một đoạn chữ bất kỳ trên trang báo trước khi click "Lấy phần bôi đen".');
    showState(stateHome);
  }
}

// CÔNG CỤ 3: Ghi âm giọng nói (Microphone)
async function startRecording() {
  audioChunks = [];
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop()); // Tắt mic thu âm

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      if (audioBlob.size === 0 || audioBlob.size < 500) {
        triggerError('Ghi âm thất bại', 'Tệp âm thanh thu được rỗng hoặc quá ngắn.');
        return;
      }

      uploadAudioBlob(audioBlob);
    };

    mediaRecorder.start();
    recordingStartTime = Date.now();
    startRecordingTimer();

    recordControlBox.classList.remove('hidden');
    // Thay đổi trạng thái nút thu âm trực quan trên card
    btnInputRecord.querySelector('.card-icon').textContent = '⏹️';
    btnInputRecord.querySelector('.card-title').textContent = 'Đang ghi âm...';
  } catch (err) {
    console.error('Lỗi quyền Microphone:', err);
    triggerError(
      'Không thể truy cập Microphone',
      'Bạn đã chặn hoặc chưa cấp quyền Micro cho Extension. Hãy nhấp vào biểu tượng ổ khóa bên cạnh thanh địa chỉ Chrome, chọn bật "Cho phép" (Allow) đối với Microphone, sau đó mở lại extension.'
    );
  }
}

function startRecordingTimer() {
  stopRecordingTimer();
  recordTimer.textContent = '02:00';

  recordTimerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
    const remainingSeconds = MAX_RECORDING_SECONDS - elapsedSeconds;

    if (remainingSeconds <= 0) {
      stopRecording();
      return;
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    recordTimer.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }, 1000);
}

// Dừng bộ đếm thời gian
function stopRecordingTimer() {
  if (recordTimerInterval) {
    clearInterval(recordTimerInterval);
    recordTimerInterval = null;
  }
}

function stopRecording() {
  stopRecordingTimer();
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  recordControlBox.classList.add('hidden');
  btnInputRecord.querySelector('.card-icon').textContent = '🎙️';
  btnInputRecord.querySelector('.card-title').textContent = 'Ghi âm giọng nói';
}

async function uploadAudioBlob(audioBlob) {
  const reqId = startNewRequest();
  showState(stateLoading, 'Đang nhận dạng và dịch giọng nói thành chữ (STT)...');

  try {
    const base64 = await fileToBase64(audioBlob);

    chrome.runtime.sendMessage({
      action: 'transcribe_audio',
      base64Data: base64,
      fileName: 'recording.webm',
      fileType: 'audio/webm',
      token: authToken,
      requestId: reqId
    }, (response) => {
      if (activeRequestId !== reqId) return;

      if (chrome.runtime.lastError) {
        triggerError('Lỗi kết nối', 'Không thể kết nối máy chủ dịch giọng nói.');
        return;
      }

      if (response && response.success && response.data) {
        const text = response.data.rewritten_post || response.data.transcript;
        if (!text || !text.trim()) {
          triggerError(
            'Nhận dạng rỗng',
            'Không thể trích xuất được giọng nói từ bản ghi. Hãy đảm bảo bạn thu âm trong môi trường yên tĩnh, có tiếng nói rõ ràng.'
          );
          return;
        }

        currentArticleData = {
          title: response.data.generated_title || 'Bài đăng ghi âm ' + new Date().toLocaleDateString('vi-VN'),
          description: '',
          content: text,
          originUrl: '',
          imageUrl: ''
        };

        inputTitle.value = currentArticleData.title;
        inputImage.value = '';
        inputDesc.value = '';
        inputContent.value = currentArticleData.content;

        showState(stateExtracted);
        showSubStep(stepArticleInfo);
      } else {
        triggerError(
          'STT thất bại',
          'Quá trình dịch giọng nói thất bại: ' + (response?.error || 'Lỗi không xác định')
        );
      }
    });
  } catch (err) {
    console.error('Lỗi chuyển base64 ghi âm:', err);
    triggerError('Lỗi đọc dữ liệu', 'Không thể đọc tệp âm thanh ghi âm.');
  }
}

// CÔNG CỤ 4: Tải tệp lên (.docx, .pdf, .mp3, .wav, .m4a)
async function processUploadedFile(file) {
  const name = file.name.toLowerCase();
  const isAudio = name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a');
  const isDoc = name.endsWith('.pdf') || name.endsWith('.docx');

  if (!isAudio && !isDoc) {
    alert('Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ .pdf, .docx, .mp3, .wav, .m4a.');
    return;
  }

  const reqId = startNewRequest();

  if (isAudio) {
    showState(stateLoading, 'Đang tải lên và phân tích file âm thanh...');
    try {
      const base64 = await fileToBase64(file);
      chrome.runtime.sendMessage({
        action: 'transcribe_audio',
        base64Data: base64,
        fileName: file.name,
        fileType: file.type || 'audio/mpeg',
        token: authToken,
        requestId: reqId
      }, (response) => {
        if (activeRequestId !== reqId) return;

        if (chrome.runtime.lastError) {
          triggerError('Lỗi kết nối', 'Không thể kết nối đến máy chủ xử lý âm thanh.', 'upload', file);
          return;
        }

        if (response && response.success && response.data) {
          const text = response.data.rewritten_post || response.data.transcript;
          if (!text || !text.trim()) {
            triggerError(
              'Âm thanh câm',
              'Không phát hiện được văn bản trong file âm thanh này. Vui lòng kiểm tra lại chất lượng thu âm.',
              'upload',
              file
            );
            return;
          }

          currentArticleData = {
            title: response.data.generated_title || file.name.replace(/\.[^/.]+$/, ""),
            description: '',
            content: text,
            originUrl: '',
            imageUrl: ''
          };

          inputTitle.value = currentArticleData.title;
          inputImage.value = '';
          inputDesc.value = '';
          inputContent.value = currentArticleData.content;

          showState(stateExtracted);
          showSubStep(stepArticleInfo);
        } else {
          triggerError(
            'STT file thất bại',
            'Chuyển văn bản từ file âm thanh thất bại: ' + (response?.error || 'Lỗi không xác định'),
            'upload',
            file
          );
        }
      });
    } catch (err) {
      triggerError('Lỗi đọc file', 'Không thể đọc file âm thanh này.', 'upload', file);
    }
  } else if (isDoc) {
    showState(stateLoading, 'Đang trích xuất chữ từ tệp tài liệu...');
    try {
      const base64 = await fileToBase64(file);
      chrome.runtime.sendMessage({
        action: 'parse_doc',
        base64Data: base64,
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        token: authToken,
        requestId: reqId
      }, (response) => {
        if (activeRequestId !== reqId) return;

        if (chrome.runtime.lastError) {
          triggerError('Lỗi kết nối', 'Không thể gửi tài liệu lên hệ thống phân tích.', 'upload', file);
          return;
        }

        if (response && response.success && response.data) {
          const text = response.data.text;
          if (!text || !text.trim()) {
            triggerError(
              'Tài liệu rỗng',
              'Tệp tin PDF/Word này rỗng hoặc là ảnh quét hoàn toàn không chứa văn bản dạng ký tự.',
              'upload',
              file
            );
            return;
          }

          currentArticleData = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            description: text.substring(0, 150) + '...',
            content: text,
            originUrl: '',
            imageUrl: ''
          };

          inputTitle.value = currentArticleData.title;
          inputImage.value = '';
          inputDesc.value = currentArticleData.description;
          inputContent.value = currentArticleData.content;

          showState(stateExtracted);
          showSubStep(stepArticleInfo);
        } else {
          triggerError(
            'Trích xuất tài liệu thất bại',
            'Không thể phân tích dữ liệu tệp tài liệu này. Chi tiết: ' + (response?.error || 'Lỗi không xác định'),
            'upload',
            file
          );
        }
      });
    } catch (err) {
      triggerError('Lỗi đọc file', 'Đọc tài liệu gặp lỗi.', 'upload', file);
    }
  }
}

// Hàm gửi bài viết sau cùng về AntBiz qua API
function submitArticle(action, extraPayload = {}) {
  const title = inputTitle.value.trim();
  const description = inputDesc.value.trim();
  const content = inputContent.value.trim();

  const payload = {
    title,
    imageUrl: inputImage.value.trim(),
    description,
    content,
    originUrl: currentArticleData?.originUrl || '',
    action,
    ...extraPayload
  };

  setButtonsDisabled(true);

  chrome.runtime.sendMessage({
    action: 'send_article',
    data: payload,
    token: authToken
  }, (response) => {
    setButtonsDisabled(false);

    if (chrome.runtime.lastError) {
      alert('Lỗi kết nối tiến trình chạy nền khi gửi bài đăng.');
      return;
    }

    if (response && response.success) {
      showState(stateSuccess);
    } else {
      alert('Không thể lưu/đăng bài viết: ' + (response?.error || 'Lỗi không xác định'));
    }
  });
}

// Khoá/Mở khoá các nút đăng để tránh spam click
function setButtonsDisabled(disabled) {
  btnPublishNow.disabled = disabled;
  btnSchedulePost.disabled = disabled;
  if (btnConfirmSchedule) btnConfirmSchedule.disabled = disabled;

  if (disabled) {
    btnPublishNow.textContent = 'Đang đăng...';
    btnSchedulePost.textContent = 'Đợi chút...';
  } else {
    btnPublishNow.textContent = 'Đăng ngay';
    btnSchedulePost.textContent = 'Lên lịch đăng bài';
  }
}

// Gọi lại AI sinh nội dung (khi nhấn Thử lại ở màn hình lỗi)
function retryAiGeneration(params) {
  const { title, content, platform } = params;
  const reqId = startNewRequest();
  showState(stateLoading, 'Đang dùng AI sinh nội dung bài viết đăng mạng xã hội...');

  chrome.runtime.sendMessage({
    action: 'generate_content',
    title: title,
    content: content,
    platform: platform,
    token: authToken,
    requestId: reqId
  }, (response) => {
    if (activeRequestId !== reqId) return;

    if (chrome.runtime.lastError) {
      triggerError('Lỗi kết nối', 'Không thể kết nối đến máy chủ AI.', 'generate', params);
      return;
    }

    if (response && response.success && response.data) {
      inputCaption.value = response.data.content || '';
      showState(stateExtracted);
      showSubStep(stepPostPreview);
    } else {
      const errorMsg = response?.error || 'Không xác định';
      triggerError(
        'AI tạo bài viết thất bại',
        `Không thể sinh bài viết từ AI. Chi tiết: ${errorMsg}. Vui lòng thử lại.`,
        'generate',
        params
      );
    }
  });
}
