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
const stateHistory = document.getElementById('state-history');

// Lịch sử
const btnShowHistory = document.getElementById('btn-show-history');
const btnCloseHistory = document.getElementById('btn-close-history');
const historyList = document.getElementById('history-list');

// Màn hình ghi âm & Xác nhận mới
const stateRecording = document.getElementById('state-recording');
const stateVoiceConfirm = document.getElementById('state-voice-confirm');
const recordTimerLarge = document.getElementById('record-timer-large');
const btnCancelRecord = document.getElementById('btn-cancel-record');
const btnStopRecordLarge = document.getElementById('btn-stop-record-large');
const voiceTranscriptText = document.getElementById('voice-transcript-text');
const btnVoiceCancel = document.getElementById('btn-voice-cancel');
const btnVoiceConfirm = document.getElementById('btn-voice-confirm');
const textareaManualContent = document.getElementById('textarea-manual-content');
const btnManualWrite = document.getElementById('btn-manual-write');
const inputLoginEmail = document.getElementById('input-login-email');
const inputLoginPassword = document.getElementById('input-login-password');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const loginErrorMessage = document.getElementById('login-error-message');

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
const btnBackToSocial = document.getElementById('btn-back-to-social');
const btnPublishNow = document.getElementById('btn-publish-now');
const btnSchedulePost = document.getElementById('btn-schedule-post');

// Bước 4 Form (Lên lịch)
const stepScheduleConfig = document.getElementById('step-schedule-config');
const inputScheduleTime = document.getElementById('input-schedule-time');
const btnBackToPreview = document.getElementById('btn-back-to-preview');
const btnConfirmSchedule = document.getElementById('btn-confirm-schedule');

// Facebook Post Preview elements
const fbPreviewText = document.getElementById('fb-preview-text');
const fbPreviewImageContainer = document.getElementById('fb-preview-image-container');

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
let isRecordCancelled = false;
const MAX_RECORDING_SECONDS = 300; // 5 phút

// Hiển thị trạng thái/màn hình
function showState(stateEl, message = '') {
  stateLoading.classList.add('hidden');
  stateUnauth.classList.add('hidden');
  stateHome.classList.add('hidden');
  stateError.classList.add('hidden');
  stateExtracted.classList.add('hidden');
  stateSuccess.classList.add('hidden');
  if (stateRecording) stateRecording.classList.add('hidden');
  if (stateVoiceConfirm) stateVoiceConfirm.classList.add('hidden');
  if (stateHistory) stateHistory.classList.add('hidden');

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
  if (stepScheduleConfig) stepScheduleConfig.classList.add('hidden');

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

      // Kiểm tra và khôi phục trạng thái cũ nếu có
      chrome.storage.local.get('antbiz_extension_state', (res) => {
        const state = res.antbiz_extension_state;
        if (state && state.activeState) {
          // Khôi phục giá trị input
          if (state.articleData) {
            inputTitle.value = state.articleData.title || '';
            inputImage.value = state.articleData.imageUrl || '';
            inputDesc.value = state.articleData.description || '';
            inputContent.value = state.articleData.content || '';
          }
          if (state.socialConfig) {
            selectPlatform.value = state.socialConfig.platform || 'facebook';
            selectPreset.value = state.socialConfig.presetId || '';
          }
          if (state.postPreview) {
            inputCaption.value = state.postPreview.caption || '';
            inputScheduleTime.value = state.postPreview.scheduledAt || '';
          }

          // Hiển thị màn hình và bước Wizard
          const stateEl = document.getElementById(state.activeState);
          if (stateEl) {
            showState(stateEl);
            if (state.activeState === 'state-extracted' && state.activeStep) {
              const stepEl = document.getElementById(state.activeStep);
              if (stepEl) {
                showSubStep(stepEl);
                if (state.activeStep === 'step-post-preview') {
                  updateFbPreview();
                }
              }
            }
          } else {
            showState(stateHome);
          }
        } else {
          showState(stateHome);
        }
      });
    } else {
      authToken = '';
      userProfile.classList.add('hidden');
      showState(stateUnauth);
    }
  });
}

// Khởi tạo các sự kiện click và lắng nghe
function initEventListeners() {
  // Tự động lưu khi thay đổi trường nhập liệu
  const autoSaveElements = [
    inputTitle, inputImage, inputDesc, inputContent,
    selectPlatform, selectPreset, inputCaption, inputScheduleTime
  ];
  autoSaveElements.forEach(el => {
    if (el) {
      el.addEventListener('input', saveCurrentState);
      el.addEventListener('change', saveCurrentState);
    }
  });

  // Sự kiện nút Lịch sử
  if (btnShowHistory) {
    btnShowHistory.addEventListener('click', () => {
      showState(stateHistory);
      fetchExtensionHistory();
    });
  }

  if (btnCloseHistory) {
    btnCloseHistory.addEventListener('click', () => {
      showState(stateHome);
    });
  }

  function fetchExtensionHistory() {
    historyList.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 12px; padding: 20px 0;">Đang tải...</div>';
    
    chrome.runtime.sendMessage({ action: 'api_get', endpoint: '/api/scheduled-posts/extension-history' }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        historyList.innerHTML = `<div style="text-align: center; color: #ef4444; font-size: 12px; padding: 20px 0;">Lỗi tải dữ liệu.</div>`;
        return;
      }

      const items = response.history || [];
      if (items.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 12px; padding: 20px 0;">Chưa có bài đăng nào từ Extension.</div>';
        return;
      }

      historyList.innerHTML = '';
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        let statusName = item.status;
        if (item.status === 'pending') statusName = 'Chờ duyệt';
        if (item.status === 'scheduled') statusName = 'Đã lên lịch';
        if (item.status === 'posted') statusName = 'Thành công';
        if (item.status === 'failed') statusName = 'Thất bại';

        const date = new Date(item.scheduledAt || item.createdAt);
        const timeStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

        div.innerHTML = `
          <div class="history-item-header">
            <span class="history-item-platform">${item.platform || 'Unknown'}</span>
            <span class="history-item-status status-${item.status}">${statusName}</span>
          </div>
          <div class="history-item-title" title="${item.title}">${item.title}</div>
          <div class="history-item-time">Lịch: ${timeStr}</div>
        `;
        historyList.appendChild(div);
      });
    });
  }

  // Đăng nhập trực tiếp từ Extension
  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', () => {
      const email = inputLoginEmail.value.trim();
      const password = inputLoginPassword.value.trim();

      if (!email || !password) {
        if (loginErrorMessage) {
          loginErrorMessage.textContent = 'Vui lòng nhập đầy đủ email và mật khẩu.';
          loginErrorMessage.style.display = 'block';
        }
        return;
      }

      if (loginErrorMessage) {
        loginErrorMessage.style.display = 'none';
      }

      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = 'Đang đăng nhập...';

      chrome.runtime.sendMessage({ action: 'login_direct', email, password }, (response) => {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Đăng nhập';

        if (chrome.runtime.lastError) {
          if (loginErrorMessage) {
            loginErrorMessage.textContent = 'Lỗi kết nối đến máy chủ xác thực.';
            loginErrorMessage.style.display = 'block';
          }
          return;
        }

        if (response && response.success) {
          authToken = response.session.access_token;
          
          // Reset form
          inputLoginEmail.value = '';
          inputLoginPassword.value = '';
          
          // Khởi chạy lại kiểm tra session để load dữ liệu
          checkAuthAndInitialize();
        } else {
          if (loginErrorMessage) {
            loginErrorMessage.textContent = response?.error || 'Tài khoản hoặc mật khẩu không đúng.';
            loginErrorMessage.style.display = 'block';
          }
        }
      });
    });
  }

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
    clearSavedState();
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

  // Nút HOME: Nhập tay ý tưởng
  if (btnManualWrite) {
    btnManualWrite.addEventListener('click', () => {
      const text = textareaManualContent.value.trim();
      if (!text) {
        alert('Vui lòng nhập nội dung ý tưởng phác thảo.');
        return;
      }

      // Điền vào form Bước 1
      inputTitle.value = 'Ý tưởng bài viết ' + new Date().toLocaleDateString('vi-VN');
      inputImage.value = '';
      inputDesc.value = '';
      inputContent.value = text;

      // Xóa nội dung nhập tay để lần sau mở lại trống
      textareaManualContent.value = '';

      // Đi thẳng tới Bước 2
      showState(stateExtracted);
      showSubStep(stepSocialConfig);
      saveCurrentState();
    });
  }

  // Nút HOME: Lấy phần bôi đen
  btnInputSelect.addEventListener('click', () => {
    getSelectedText();
  });

  // Nút HOME: Ghi âm
  btnInputRecord.addEventListener('click', () => {
    startRecording();
  });

  btnStopRecord.addEventListener('click', () => {
    stopRecording(false);
  });

  // Màn hình Ghi âm & Xác nhận mới
  if (btnCancelRecord) {
    btnCancelRecord.addEventListener('click', () => {
      stopRecording(true); // Hủy bỏ ghi âm
      showState(stateHome);
    });
  }

  if (btnStopRecordLarge) {
    btnStopRecordLarge.addEventListener('click', () => {
      stopRecording(false); // Dừng và dịch chữ
    });
  }

  if (btnVoiceCancel) {
    btnVoiceCancel.addEventListener('click', () => {
      clearSavedState();
      startRecording();
    });
  }

  if (btnVoiceConfirm) {
    btnVoiceConfirm.addEventListener('click', () => {
      const text = voiceTranscriptText.value.trim();
      if (!text) {
        alert('Nội dung nhận diện giọng nói đang trống.');
        return;
      }

      // Điền vào form Bước 1
      inputTitle.value = 'Bài viết từ giọng nói ' + new Date().toLocaleDateString('vi-VN');
      inputImage.value = '';
      inputDesc.value = '';
      inputContent.value = text;

      // Đi thẳng tới Bước 2
      showState(stateExtracted);
      showSubStep(stepSocialConfig);
      saveCurrentState();
    });
  }

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
    clearSavedState();
    showState(stateHome);
  });

  btnNextToSocial.addEventListener('click', () => {
    const title = inputTitle.value.trim();
    const content = inputContent.value.trim();

    if (!content) {
      alert('Vui lòng nhập nội dung bài viết.');
      return;
    }
    if (!title) {
      inputTitle.value = 'Bài viết phác thảo ' + new Date().toLocaleDateString('vi-VN');
    }

    showSubStep(stepSocialConfig);
    saveCurrentState();
  });

  // WIZARD BƯỚC 2: Quay lại & Chuyển tiếp
  btnBackToArticle.addEventListener('click', () => {
    showSubStep(stepArticleInfo);
    saveCurrentState();
  });

  btnCreatePost.addEventListener('click', () => {
    const title = inputTitle.value.trim() || 'Bài viết phác thảo ' + new Date().toLocaleDateString('vi-VN');
    const content = inputContent.value.trim();
    const platform = selectPlatform.value;

    if (!content) {
      alert('Thiếu nội dung bài viết gốc để AI phân tích.');
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
        updateFbPreview();
        showState(stateExtracted);
        showSubStep(stepPostPreview);
        saveCurrentState();
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
    saveCurrentState();
  });

  // Đồng bộ ngược từ Preview sang Textarea ẩn khi người dùng gõ trực tiếp
  fbPreviewText.addEventListener('input', () => {
    inputCaption.value = fbPreviewText.innerText;
    saveCurrentState();
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
    showSubStep(stepScheduleConfig);

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
    renderGoldenHours();
    saveCurrentState();
  });

  btnBackToPreview.addEventListener('click', () => {
    showSubStep(stepPostPreview);
    saveCurrentState();
  });

  // Render Golden Hours function
  function renderGoldenHours() {
    const platform = selectPlatform.value || 'facebook';
    let hours = [];
    if (platform === 'facebook') {
      hours = [7, 9, 11, 15, 20];
    } else if (platform === 'instagram') {
      hours = [11, 15, 20];
    } else if (platform === 'thread' || platform === 'threads') {
      hours = [8, 11, 15, 20];
    }

    const container = document.getElementById('golden-hour-chips');
    const wrapper = document.getElementById('golden-hour-suggestions');
    if (!container || !wrapper) return;

    container.innerHTML = '';
    if (hours.length === 0) {
      wrapper.style.display = 'none';
      return;
    }
    
    wrapper.style.display = 'block';
    hours.forEach(hour => {
      const chip = document.createElement('div');
      const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
      chip.textContent = hourStr;
      chip.style.cssText = 'padding: 4px 8px; background: #fffbeb; border: 1px solid #fcd34d; color: #b45309; font-size: 11px; border-radius: 4px; cursor: pointer; font-weight: 600; transition: all 0.2s;';
      
      chip.onmouseover = () => {
        chip.style.background = '#fef3c7';
        chip.style.borderColor = '#f59e0b';
      };
      chip.onmouseout = () => {
        chip.style.background = '#fffbeb';
        chip.style.borderColor = '#fcd34d';
      };

      chip.onclick = () => {
        const d = new Date();
        if (d.getHours() >= hour) {
          d.setDate(d.getDate() + 1);
        }
        d.setHours(hour, 0, 0, 0);
        
        const pad = (n) => n < 10 ? '0' + n : n;
        const localIso = d.getFullYear() + '-' +
          pad(d.getMonth() + 1) + '-' +
          pad(d.getDate()) + 'T' +
          pad(d.getHours()) + ':' +
          pad(d.getMinutes());
        
        inputScheduleTime.value = localIso;
        saveCurrentState();
      };
      
      container.appendChild(chip);
    });
  }

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
    clearSavedState();
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
      saveCurrentState();
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
    saveCurrentState();
  } else {
    alert('Vui lòng quét (bôi đen) một đoạn chữ bất kỳ trên trang báo trước khi click "Lấy phần bôi đen".');
    showState(stateHome);
  }
}

// CÔNG CỤ 3: Ghi âm giọng nói (Microphone)
async function startRecording() {
  audioChunks = [];
  isRecordCancelled = false;

  // Kiểm tra quyền truy cập microphone trước
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

      // Nếu quyền đã bị từ chối
      if (permissionStatus.state === 'denied') {
        triggerError(
          'Không thể truy cập Microphone',
          'Bạn đã chặn quyền Micro cho Extension. Hãy nhấp vào biểu tượng ổ khóa bên cạnh thanh địa chỉ, chọn bật "Cho phép" (Allow) đối với Microphone, sau đó mở lại extension.'
        );
        return;
      }

      // Nếu chưa cấp quyền (prompt), mở trang trung gian để yêu cầu quyền một cách chính thống
      if (permissionStatus.state === 'prompt') {
        chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
        return;
      }
    }
  } catch (pe) {
    console.warn('Không thể kiểm tra trạng thái quyền bằng permissions API:', pe);
  }

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

      if (isRecordCancelled) {
        console.log('[AntBiz Voice] Ghi âm đã bị hủy bỏ bởi người dùng.');
        return;
      }

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

    // Chuyển sang màn hình đang ghi âm chuyên dụng
    showState(stateRecording);
  } catch (err) {
    console.error('Lỗi cấp quyền Microphone:', err);
    // Nếu gặp lỗi và không được phép, ta mở trang permission.html thay thế để kích hoạt hỏi quyền
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
      chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
    } else {
      triggerError(
        'Không thể truy cập Microphone',
        'Có lỗi xảy ra khi truy cập Micro. Hãy click vào biểu tượng ổ khóa trên thanh địa chỉ, cho phép Microphone và thử lại.'
      );
    }
  }
}

function startRecordingTimer() {
  stopRecordingTimer();
  if (recordTimer) recordTimer.textContent = '05:00';
  if (recordTimerLarge) recordTimerLarge.textContent = '05:00';

  recordTimerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
    const remainingSeconds = MAX_RECORDING_SECONDS - elapsedSeconds;

    if (remainingSeconds <= 0) {
      stopRecording(false);
      return;
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeStr = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    if (recordTimer) recordTimer.textContent = timeStr;
    if (recordTimerLarge) recordTimerLarge.textContent = timeStr;
  }, 1000);
}

// Dừng bộ đếm thời gian
function stopRecordingTimer() {
  if (recordTimerInterval) {
    clearInterval(recordTimerInterval);
    recordTimerInterval = null;
  }
}

function stopRecording(isCancelled = false) {
  stopRecordingTimer();
  isRecordCancelled = isCancelled;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (recordControlBox) recordControlBox.classList.add('hidden');
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
          title: response.data.generated_title || 'Bài viết từ giọng nói ' + new Date().toLocaleDateString('vi-VN'),
          description: '',
          content: text,
          originUrl: '',
          imageUrl: ''
        };

        // Gán văn bản vào màn hình xác nhận
        voiceTranscriptText.value = text;
        showState(stateVoiceConfirm);
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
          saveCurrentState();
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
          saveCurrentState();
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
      clearSavedState();
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
      updateFbPreview();
      showState(stateExtracted);
      showSubStep(stepPostPreview);
      saveCurrentState();
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

// Cập nhật giao diện xem trước Facebook
function updateFbPreview() {
  // Đồng bộ text sang contenteditable (dùng innerText để giữ ngắt dòng)
  if (fbPreviewText) {
    fbPreviewText.innerText = inputCaption.value;
  }

  // Đồng bộ ảnh (Dynamic grid layout giống Facebook thật, không bị crop mất chi tiết)
  if (fbPreviewImageContainer) {
    const imageVal = inputImage.value.trim();
    const imageLines = imageVal.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Reset container
    fbPreviewImageContainer.innerHTML = '';

    if (imageLines.length > 0) {
      fbPreviewImageContainer.classList.remove('hidden');
      const count = imageLines.length;

      if (count === 1) {
        // Layout 1 ảnh: Hiển thị trọn vẹn tỉ lệ ảnh, không bị cắt crop
        fbPreviewImageContainer.className = 'fb-preview-image-container layout-1';
        const img = document.createElement('img');
        img.src = imageLines[0];
        img.className = 'fb-img-single';
        fbPreviewImageContainer.appendChild(img);
      } else if (count === 2) {
        // Layout 2 ảnh: 2 cột chia đôi
        fbPreviewImageContainer.className = 'fb-preview-image-container layout-2';
        imageLines.forEach(url => {
          const img = document.createElement('img');
          img.src = url;
          img.className = 'fb-img-half';
          fbPreviewImageContainer.appendChild(img);
        });
      } else if (count === 3) {
        // Layout 3 ảnh: 1 ảnh lớn trên, 2 ảnh nhỏ dưới chia đôi
        fbPreviewImageContainer.className = 'fb-preview-image-container layout-3';

        const topRow = document.createElement('div');
        topRow.className = 'fb-grid-top';
        const img1 = document.createElement('img');
        img1.src = imageLines[0];
        img1.className = 'fb-img-top-large';
        topRow.appendChild(img1);
        fbPreviewImageContainer.appendChild(topRow);

        const bottomRow = document.createElement('div');
        bottomRow.className = 'fb-grid-bottom';
        for (let i = 1; i < 3; i++) {
          const img = document.createElement('img');
          img.src = imageLines[i];
          img.className = 'fb-img-bottom-small';
          bottomRow.appendChild(img);
        }
        fbPreviewImageContainer.appendChild(bottomRow);
      } else {
        // Layout 4 ảnh trở lên: 1 ảnh lớn trên, 3 ảnh nhỏ dưới chia ba
        fbPreviewImageContainer.className = 'fb-preview-image-container layout-4';

        const topRow = document.createElement('div');
        topRow.className = 'fb-grid-top';
        const img1 = document.createElement('img');
        img1.src = imageLines[0];
        img1.className = 'fb-img-top-large';
        topRow.appendChild(img1);
        fbPreviewImageContainer.appendChild(topRow);

        const bottomRow = document.createElement('div');
        bottomRow.className = 'fb-grid-bottom-three';
        for (let i = 1; i < 4; i++) {
          const imgWrapper = document.createElement('div');
          imgWrapper.className = 'fb-bottom-img-wrapper';

          const img = document.createElement('img');
          img.src = imageLines[i];
          img.className = 'fb-img-bottom-small-three';
          imgWrapper.appendChild(img);

          // Hiển thị overlay +N ở ảnh cuối cùng
          if (i === 3 && count > 4) {
            const overlay = document.createElement('div');
            overlay.className = 'fb-img-overlay';
            overlay.textContent = `+${count - 4}`;
            imgWrapper.appendChild(overlay);
          }
          bottomRow.appendChild(imgWrapper);
        }
        fbPreviewImageContainer.appendChild(bottomRow);
      }
    } else {
      fbPreviewImageContainer.classList.add('hidden');
    }
  }
}

// Lấy ID trạng thái màn hình hiện tại
function getActiveStateId() {
  const states = [stateLoading, stateUnauth, stateHome, stateError, stateExtracted, stateSuccess];
  for (const st of states) {
    if (st && !st.classList.contains('hidden')) {
      return st.id;
    }
  }
  return 'state-home';
}

// Lấy ID bước wizard hiện tại
function getActiveStepId() {
  const steps = [stepArticleInfo, stepSocialConfig, stepPostPreview, stepScheduleConfig];
  for (const st of steps) {
    if (st && !st.classList.contains('hidden')) {
      return st.id;
    }
  }
  return '';
}

// Tự động lưu trạng thái hiện tại của Extension
function saveCurrentState() {
  if (!authToken) return;

  const state = {
    activeState: getActiveStateId(),
    activeStep: getActiveStepId(),
    articleData: {
      title: inputTitle.value,
      imageUrl: inputImage.value,
      description: inputDesc.value,
      content: inputContent.value
    },
    socialConfig: {
      platform: selectPlatform.value,
      presetId: selectPreset.value
    },
    postPreview: {
      caption: inputCaption.value,
      scheduledAt: inputScheduleTime.value
    }
  };

  chrome.storage.local.set({ 'antbiz_extension_state': state }, () => {
    console.log('[AntBiz State] Đã tự động lưu trạng thái');
  });
}

// Xóa trạng thái đã lưu khi tác vụ hoàn thành
function clearSavedState() {
  chrome.storage.local.remove('antbiz_extension_state', () => {
    console.log('[AntBiz State] Đã xóa trạng thái lưu trữ');
  });
}
