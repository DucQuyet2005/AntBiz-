// popup.js - Xử lý logic hiển thị và giao tiếp API trên giao diện Extension
// Mặc định trỏ vào server production. Nếu đang test ở tab dev (localhost/127.0.0.1/172.25.240.1),
// đoạn dò tự động bên dưới (DOMContentLoaded) sẽ tự chuyển sang host dev tương ứng.
let AntBizUrl = 'https://dev.antbiz.me';

// Các màn hình chính
const stateLoading = document.getElementById('state-loading');
const stateUnauth = document.getElementById('state-unauth');
const btnLogin = document.getElementById('btn-login');
const stateHome = document.getElementById('state-home');
const stateError = document.getElementById('state-error');
const stateExtracted = document.getElementById('state-extracted');
const stateSuccess = document.getElementById('state-success');

// Các màn hình nhập liệu mới
const stateIdeaInput = document.getElementById('state-idea-input');
const stateUrlInput = document.getElementById('state-url-input');
const stateRecordInput = document.getElementById('state-record-input');
const stateUploadInput = document.getElementById('state-upload-input');

// Navigation và Lịch sử
const extensionNav = document.getElementById('extension-nav');
const tabCreate = document.getElementById('tab-create');
const tabHistory = document.getElementById('tab-history');
const stateHistory = document.getElementById('state-history');
const historyLoader = document.getElementById('history-loader');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const btnCloseHistory = document.getElementById('btn-close-history');
const btnOpenAntbiz = document.getElementById('btn-open-antbiz');

// Màn hình ghi âm & Xác nhận mới
const stateVoiceConfirm = document.getElementById('state-voice-confirm');
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
let activePresets = [];
let lastCreationState = null;

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
  const stateRecording = document.getElementById('state-recording');
  if (stateRecording) stateRecording.classList.add('hidden');
  if (stateVoiceConfirm) stateVoiceConfirm.classList.add('hidden');
  if (stateHistory) stateHistory.classList.add('hidden');

  // Ẩn các màn hình nhập liệu mới
  if (stateIdeaInput) stateIdeaInput.classList.add('hidden');
  if (stateUrlInput) stateUrlInput.classList.add('hidden');
  if (stateRecordInput) stateRecordInput.classList.add('hidden');
  if (stateUploadInput) stateUploadInput.classList.add('hidden');

  if (stateEl === stateLoading && message) {
    loadingText.textContent = message;
  }
  stateEl.classList.remove('hidden');

  // Lưu lại màn hình nghiệp vụ tạo bài viết hiện tại
  if (stateEl !== stateLoading && stateEl !== stateUnauth && stateEl !== stateHistory && stateEl !== stateError) {
    lastCreationState = stateEl;
  }

  // Đồng bộ trạng thái active của tab điều hướng
  if (stateEl === stateHistory) {
    if (tabHistory) tabHistory.classList.add('active');
    if (tabCreate) tabCreate.classList.remove('active');
  } else if (stateEl !== stateLoading && stateEl !== stateUnauth && stateEl !== stateError) {
    if (tabCreate) tabCreate.classList.add('active');
    if (tabHistory) tabHistory.classList.remove('active');
  }
  // Cập nhật Stepper toàn cục và nút quay lại ở Header
  updateStepperProgress(stateEl);

  // Tự động lưu trạng thái khi đổi màn hình hợp lệ
  if (stateEl !== stateLoading && stateEl !== stateUnauth && stateEl !== stateError && stateEl !== stateSuccess) {
    saveCurrentState();
  }
}
// Cập nhật tiến trình Stepper và nút Quay lại ở Header
function updateStepperProgress(stateEl) {
  const globalStepper = document.getElementById('global-stepper');
  const btnHeaderBack = document.getElementById('btn-header-back');

  if (!globalStepper) return;

  // Ẩn nút quay lại trên trang chủ, trang loading và unauth
  if (stateEl === stateHome || stateEl === stateLoading || stateEl === stateUnauth) {
    if (btnHeaderBack) btnHeaderBack.classList.add('hidden');
  } else {
    if (btnHeaderBack) btnHeaderBack.classList.remove('hidden');
  }

  let activeStep = 0;
  if (stateEl === stateIdeaInput || stateEl === stateUrlInput || stateEl === stateRecordInput || stateEl === stateUploadInput) {
    activeStep = 1;
  } else if (stateEl === stateExtracted) {
    const activeStepId = getActiveStepId();
    if (activeStepId === 'step-article-info') {
      activeStep = 2;
    } else if (activeStepId === 'step-social-config' || activeStepId === 'step-post-preview') {
      activeStep = 3;
    } else if (activeStepId === 'step-schedule-config') {
      activeStep = 4;
    }
  }

  if (activeStep > 0) {
    globalStepper.classList.remove('hidden');
    const dots = globalStepper.querySelectorAll('.step-dot');
    const lines = globalStepper.querySelectorAll('.step-line');

    dots.forEach((dot, index) => {
      const stepNum = index + 1;
      dot.className = 'step-dot';
      if (stepNum === activeStep) {
        dot.classList.add('active');
      } else if (stepNum < activeStep) {
        dot.classList.add('completed');
      }
    });

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      line.className = 'step-line';
      if (lineNum < activeStep) {
        line.classList.add('completed');
      }
    });
  } else {
    globalStepper.classList.add('hidden');
  }
}

function showSubStep(stepEl) {
  stepArticleInfo.classList.add('hidden');
  stepSocialConfig.classList.add('hidden');
  stepPostPreview.classList.add('hidden');
  if (stepScheduleConfig) stepScheduleConfig.classList.add('hidden');

  stepEl.classList.remove('hidden');

  // Đồng bộ lại stepper progress khi đổi wizard step
  updateStepperProgress(stateExtracted);

  // Tự động lưu trạng thái
  saveCurrentState();
}

// Kích hoạt màn hình lỗi chung
function triggerError(title, desc, retryAction = null, retryParams = null) {
  stopRecordingTimer();
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordControlBox) recordControlBox.classList.add('hidden');

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
    let prodHostname = 'app.example.com';
    try { prodHostname = new URL(AntBizUrl).hostname; } catch (e) { }
    if (domain.includes('localhost') || domain.includes('127.0.0.1') || domain.includes('172.25.240.1') || domain.includes(prodHostname)) {
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

function handleApiError(error) {
  if (!error) return false;
  const errMsg = error.toString();
  if (errMsg.includes('đăng nhập') || errMsg.includes('expired') || errMsg.includes('Unauthorized') || errMsg.includes('401') || errMsg.includes('hết hạn')) {
    console.warn('Phát hiện token hết hạn hoặc chưa đăng nhập, tự động đăng xuất extension.');
    authToken = null;
    if (userNameEl) userNameEl.textContent = 'Chưa kết nối';
    if (userProfile) userProfile.classList.add('hidden');
    if (extensionNav) extensionNav.classList.add('hidden');
    
    // Clear storage state
    chrome.storage.local.remove('antbiz_extension_state');
    
    showState(stateUnauth);
    return true;
  }
  return false;
}

// Tải danh sách Văn phong thương hiệu động từ API
function loadPromptConfigs(callback) {
  if (!authToken) {
    if (callback) callback();
    return;
  }

  chrome.runtime.sendMessage({
    action: 'get_prompt_configs',
    token: authToken,
    host: AntBizUrl
  }, (response) => {
    // Debug log to Next.js server console
    fetch(`${AntBizUrl}/api/auth/debug`, {
      method: 'POST',
      body: JSON.stringify({
        msg: 'loadPromptConfigs response',
        success: response?.success,
        hasData: !!response?.data,
        dataType: typeof response?.data,
        rawResponse: response
      })
    }).catch(() => {});

    if (chrome.runtime.lastError) {
      console.warn('Lỗi tải cấu hình văn phong:', chrome.runtime.lastError);
      if (callback) callback();
      return;
    }

    if (response && response.success && response.data && Array.isArray(response.data.data)) {
      activePresets = response.data.data;

      // Lưu lại giá trị hiện tại trước khi cập nhật
      const currentValue = selectPreset.value;

      // Tìm cấu hình mặc định (is_default === true)
      const defaultPreset = activePresets.find(config => config.is_default);

      // Xóa tất cả các option hiện có
      selectPreset.innerHTML = '';

      // Thêm tùy chọn mặc định động lên đầu
      const defaultOption = document.createElement('option');
      if (defaultPreset) {
        defaultOption.value = defaultPreset.id;
        defaultOption.textContent = `-- Mặc định (${defaultPreset.name}) --`;
      } else {
        defaultOption.value = '';
        defaultOption.textContent = '-- Mặc định (Không áp dụng) --';
      }
      selectPreset.appendChild(defaultOption);

      activePresets.forEach(config => {
        const option = document.createElement('option');
        option.value = config.id;

        let displayName = config.name;
        if (config.is_system) {
          displayName += ' (Mẫu hệ thống)';
        } else {
          displayName += ' (Cá nhân)';
        }
        if (config.is_default) {
          displayName += ' [Mặc định]';
        }
        option.textContent = displayName;
        selectPreset.appendChild(option);
      });

      // Phục hồi lại giá trị cũ nếu giá trị đó vẫn tồn tại trong danh sách mới, ngược lại chọn mặc định
      const exists = currentValue && Array.from(selectPreset.options).some(opt => opt.value === currentValue);
      if (exists) {
        selectPreset.value = currentValue;
      } else if (defaultPreset) {
        selectPreset.value = defaultPreset.id;
      } else {
        selectPreset.value = '';
      }
    } else {
      console.warn('Không thể lấy danh sách văn phong từ API:', response?.error);
      if (handleApiError(response?.error)) {
        if (callback) callback();
        return;
      }
      selectPreset.innerHTML = '';
      const errorOption = document.createElement('option');
      errorOption.value = '';
      errorOption.textContent = `-- Lỗi tải: ${response?.error || 'Không xác định'} --`;
      selectPreset.appendChild(errorOption);
    }

    if (callback) callback();
  });
}

// Kiểm tra phiên đăng nhập từ Web AntBiz
function checkAuthAndInitialize() {
  showState(stateLoading, 'Đang kiểm tra kết nối AntBiz...');

  chrome.runtime.sendMessage({ action: 'get_session', host: AntBizUrl }, (response) => {
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
      if (extensionNav) extensionNav.classList.remove('hidden');

      // Hiển thị thông tin kết nối
      if (response.session.user && response.session.user.email) {
        const name = response.session.user.user_metadata?.full_name || response.session.user.email.split('@')[0];
        userNameEl.textContent = name;
        const avatarCircle = document.getElementById('user-avatar-circle');
        if (avatarCircle && name) {
          avatarCircle.textContent = name.charAt(0).toUpperCase();
        }
        userProfile.classList.remove('hidden');
      } else {
        userNameEl.textContent = 'Đã kết nối';
        const avatarCircle = document.getElementById('user-avatar-circle');
        if (avatarCircle) avatarCircle.textContent = 'U';
        userProfile.classList.remove('hidden');
      }

      // Tải văn phong động, sau khi hoàn thành mới khôi phục state để selectPreset nhận được value
      loadPromptConfigs(() => {
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

              const savedPresetId = state.socialConfig.presetId;
              const hasSavedPreset = savedPresetId && Array.from(selectPreset.options).some(opt => opt.value === savedPresetId);
              if (hasSavedPreset) {
                selectPreset.value = savedPresetId;
              } else {
                const defaultPreset = activePresets.find(config => config.is_default);
                selectPreset.value = defaultPreset ? defaultPreset.id : '';
              }
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
                  if (state.activeStep === 'step-article-info') {
                    renderExtractedImagesGrid();
                    updateWordCountLabel();
                    updateExtractedSourceBadge();
                  } else if (state.activeStep === 'step-post-preview') {
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
      });
    } else {
      authToken = '';
      userProfile.classList.add('hidden');
      if (extensionNav) extensionNav.classList.add('hidden');
      showState(stateUnauth);
    }
  });
}

// Khởi tạo các sự kiện click và lắng nghe
function initEventListeners() {
  // Sự kiện chuyển Tab điều hướng
  if (tabCreate) {
    tabCreate.addEventListener('click', () => {
      showState(lastCreationState || stateHome);
    });
  }

  if (tabHistory) {
    tabHistory.addEventListener('click', () => {
      showState(stateHistory);
      loadPostHistory();
    });
  }

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

  // Sự kiện nút Lịch sử và thông tin tài khoản
  if (userProfile) {
    userProfile.style.cursor = 'pointer';
    userProfile.addEventListener('click', () => {
      // Nếu đang mở rồi thì đóng lại
      if (!stateHistory.classList.contains('hidden')) {
        showState(stateHome);
      } else {
        // Nếu chưa mở thì mở lên
        showState(stateHistory);
        fetchExtensionHistory();
      }
    });
  }

  if (btnCloseHistory) {
    btnCloseHistory.addEventListener('click', () => {
      showState(stateHome);
    });
  }

  if (btnOpenAntbiz) {
    btnOpenAntbiz.addEventListener('click', (e) => {
      e.preventDefault();
      const antbizUrl = `${AntBizUrl}/archive`;
      chrome.tabs.create({ url: antbizUrl });
    });
  }

  function fetchExtensionHistory() {
    if (historyList) {
      historyList.classList.remove('hidden');
      historyList.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 12px; padding: 20px 0;">Đang tải...</div>';
    }

    chrome.runtime.sendMessage({ action: 'api_get', endpoint: '/api/scheduled-posts/extension-history', host: AntBizUrl }, (response) => {
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

        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
          if (item.articleId) {
            chrome.tabs.create({ url: `${AntBizUrl}/archive/${item.articleId}` });
          } else {
            chrome.tabs.create({ url: `${AntBizUrl}/archive` });
          }
        });

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

      chrome.runtime.sendMessage({ action: 'login_direct', email, password, host: AntBizUrl }, (response) => {
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
    const loginUrl = `${AntBizUrl}/login?next=${encodeURIComponent('/login/success')}`;
    chrome.tabs.create({ url: loginUrl });
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

  // Nút quay lại chung ở Header
  const btnHeaderBack = document.getElementById('btn-header-back');
  if (btnHeaderBack) {
    btnHeaderBack.addEventListener('click', () => {
      const activeState = getActiveStateId();
      if (activeState === 'state-idea-input' || activeState === 'state-url-input' || activeState === 'state-record-input' || activeState === 'state-upload-input' || activeState === 'state-history' || activeState === 'state-voice-confirm') {
        if (activeState === 'state-record-input' && mediaRecorder && mediaRecorder.state !== 'inactive') {
          stopRecording(true);
        }
        showState(stateHome);
      } else if (activeState === 'state-extracted') {
        const activeStep = getActiveStepId();
        if (activeStep === 'step-article-info') {
          if (lastActionType === 'scrape') {
            showState(stateUrlInput);
          } else if (lastActionType === 'record') {
            showState(stateRecordInput);
          } else if (lastActionType === 'upload') {
            showState(stateUploadInput);
          } else {
            showState(stateHome);
          }
        } else if (activeStep === 'step-social-config') {
          showSubStep(stepArticleInfo);
        } else if (activeStep === 'step-post-preview') {
          showSubStep(stepSocialConfig);
        } else if (activeStep === 'step-schedule-config') {
          showSubStep(stepPostPreview);
        }
      }
    });
  }

  // Nút đóng Header
  const btnHeaderClose = document.getElementById('btn-header-close');
  if (btnHeaderClose) {
    btnHeaderClose.addEventListener('click', () => {
      window.close();
    });
  }

  // Nút HOME: Cào trang hiện tại
  btnInputScrape.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
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

  // Nút HOME: Lấy phần bôi đen
  btnInputSelect.addEventListener('click', () => {
    getSelectedText();
  });

  // Nút HOME: Mở màn hình nhập URL
  const btnHomeUrl = document.getElementById('btn-home-url');
  if (btnHomeUrl) {
    btnHomeUrl.addEventListener('click', () => {
      const inputUrlValue = document.getElementById('input-url-value');
      if (inputUrlValue) inputUrlValue.value = '';
      showState(stateUrlInput);
    });
  }

  // Nút HOME: Mở màn hình Ghi âm
  const btnHomeRecord = document.getElementById('btn-home-record');
  if (btnHomeRecord) {
    btnHomeRecord.addEventListener('click', () => {
      setRecordingUI('ready');
      showState(stateRecordInput);
    });
  }

  // Nút HOME: Mở màn hình Tải tệp
  const btnHomeUpload = document.getElementById('btn-home-upload');
  if (btnHomeUpload) {
    btnHomeUpload.addEventListener('click', () => {
      showState(stateUploadInput);
    });
  }

  // Nút HOME: Mở màn hình Ý tưởng
  const btnHomeIdea = document.getElementById('btn-home-idea');
  if (btnHomeIdea) {
    btnHomeIdea.addEventListener('click', () => {
      const textareaIdeaContent = document.getElementById('textarea-idea-content');
      const ideaCharCount = document.getElementById('idea-char-count');
      if (textareaIdeaContent) textareaIdeaContent.value = '';
      if (ideaCharCount) ideaCharCount.textContent = '0';
      showState(stateIdeaInput);
    });
  }

  // Xử lý ô nhập Ý tưởng (Đếm chữ & Tiếp tục)
  const textareaIdeaContent = document.getElementById('textarea-idea-content');
  const ideaCharCount = document.getElementById('idea-char-count');
  if (textareaIdeaContent && ideaCharCount) {
    textareaIdeaContent.addEventListener('input', () => {
      ideaCharCount.textContent = textareaIdeaContent.value.length;
    });
  }

  const btnIdeaSubmit = document.getElementById('btn-idea-submit');
  if (btnIdeaSubmit) {
    btnIdeaSubmit.addEventListener('click', () => {
      const text = textareaIdeaContent.value.trim();
      if (!text) {
        alert('Vui lòng nhập nội dung ý tưởng phác thảo.');
        return;
      }

      inputTitle.value = 'Ý tưởng bài viết ' + new Date().toLocaleDateString('vi-VN');
      inputImage.value = '';
      inputDesc.value = '';
      inputContent.value = text;

      textareaIdeaContent.value = '';
      if (ideaCharCount) ideaCharCount.textContent = '0';

      // Đi thẳng tới Bước 2
      showState(stateExtracted);
      showSubStep(stepSocialConfig);
      saveCurrentState();
    });
  }

  // Xử lý ô nhập URL (Phân tích)
  const btnUrlSubmit = document.getElementById('btn-url-submit');
  const inputUrlValue = document.getElementById('input-url-value');
  if (btnUrlSubmit && inputUrlValue) {
    btnUrlSubmit.addEventListener('click', () => {
      const url = inputUrlValue.value.trim();
      if (!url) {
        alert('Vui lòng nhập địa chỉ URL.');
        return;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Địa chỉ URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://).');
        return;
      }
      if (inputManualUrl) inputManualUrl.value = url;
      startExtraction(url);
    });
  }

  // Xử lý sự kiện kéo thả Tải tệp
  const uploadDropzoneBox = document.getElementById('upload-dropzone-box');
  const btnUploadBrowse = document.getElementById('btn-upload-browse');
  if (btnUploadBrowse) {
    btnUploadBrowse.addEventListener('click', () => {
      fileUploader.value = '';
      fileUploader.click();
    });
  }

  if (uploadDropzoneBox) {
    uploadDropzoneBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadDropzoneBox.classList.add('dragover');
    });
    uploadDropzoneBox.addEventListener('dragleave', () => {
      uploadDropzoneBox.classList.remove('dragover');
    });
    uploadDropzoneBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadDropzoneBox.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.size > 10 * 1024 * 1024) {
          alert('Dung lượng tệp lớn hơn 10MB. Vui lòng chọn tệp nhỏ hơn để tránh bị timeout.');
          return;
        }
        processUploadedFile(file);
      }
    });
  }

  if (fileUploader) {
    fileUploader.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
          alert('Dung lượng tệp lớn hơn 10MB. Vui lòng chọn tệp nhỏ hơn để tránh bị timeout.');
          return;
        }
        processUploadedFile(file);
      }
    });
  }

  // Xử lý sự kiện nút Ghi âm mới
  const btnRecordPrimary = document.getElementById('btn-record-primary');
  const btnRecordClear = document.getElementById('btn-record-clear');
  
  if (btnRecordPrimary) {
    btnRecordPrimary.addEventListener('click', () => {
      const isRecordingActive = mediaRecorder && mediaRecorder.state !== 'inactive';
      if (isRecordingActive) {
        stopRecording(false); // Dừng & dịch chữ
      } else {
        startRecording();
      }
    });
  }

  if (btnRecordClear) {
    btnRecordClear.addEventListener('click', () => {
      stopRecording(true); // Hủy bỏ
      setRecordingUI('ready');
      showState(stateHome);
    });
  }

  if (btnVoiceCancel) {
    btnVoiceCancel.addEventListener('click', () => {
      clearSavedState();
      setRecordingUI('ready');
      showState(stateRecordInput);
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

  // Tinh chỉnh xem trước Step 1
  const btnToggleRawImages = document.getElementById('btn-toggle-raw-images');
  const rawImagesTextareaWrapper = document.getElementById('raw-images-textarea-wrapper');
  if (btnToggleRawImages && rawImagesTextareaWrapper) {
    btnToggleRawImages.addEventListener('click', () => {
      if (rawImagesTextareaWrapper.classList.contains('hidden')) {
        rawImagesTextareaWrapper.classList.remove('hidden');
        btnToggleRawImages.textContent = 'Ẩn chỉnh sửa URL ảnh thô ▲';
      } else {
        rawImagesTextareaWrapper.classList.add('hidden');
        btnToggleRawImages.textContent = 'Chỉnh sửa URL ảnh thô ▼';
      }
    });
  }

  if (inputImage) {
    inputImage.addEventListener('input', () => {
      renderExtractedImagesGrid();
      updateFbPreview();
    });
  }

  if (inputContent) {
    inputContent.addEventListener('input', () => {
      updateWordCountLabel();
    });
  }

  // WIZARD BƯỚC 1: Quay lại & Chuyển tiếp
  if (btnCancelToHome1) {
    btnCancelToHome1.addEventListener('click', () => {
      cancelActiveRequest();
      clearSavedState();
      showState(stateHome);
    });
  }

  if (btnNextToSocial) {
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
  }

  // WIZARD BƯỚC 2: Quay lại & Chuyển tiếp
  if (btnBackToArticle) {
    btnBackToArticle.addEventListener('click', () => {
      showSubStep(stepArticleInfo);
      saveCurrentState();
    });
  }

  if (btnCreatePost) {
    btnCreatePost.addEventListener('click', () => {
      const title = inputTitle.value.trim() || 'Bài viết phác thảo ' + new Date().toLocaleDateString('vi-VN');
      const content = inputContent.value.trim();
      const platform = selectPlatform.value;
      const presetId = selectPreset.value;

      if (!content) {
        alert('Thiếu nội dung bài viết gốc để AI phân tích.');
        return;
      }

      // Xây dựng customPrompt nếu người dùng chọn Văn phong cụ thể
      let customPrompt = undefined;
      if (presetId) {
        const selectedPreset = activePresets.find(p => p.id === presetId);
        if (selectedPreset) {
          let rulesText = selectedPreset.rules;
          try {
            const parsed = JSON.parse(rulesText);
            if (parsed && typeof parsed === 'object') {
              rulesText = parsed.general || '';
              const platformKey = platform === 'threads' ? 'threads' : platform;
              if (parsed[platformKey]) {
                rulesText += `\n\nQuy định riêng cho ${platform}: ${parsed[platformKey]}`;
              }
            }
          } catch (e) {
            // Chuỗi thô không phải JSON, giữ nguyên
          }

          customPrompt = `Bạn là một chuyên gia Content Marketing.
Hãy viết một bài đăng cho nền tảng ${platform} dựa trên bài báo sau:
Tiêu đề: ${title}
Nội dung tóm tắt: ${content}

Yêu cầu bài viết (Áp dụng nghiêm ngặt các quy tắc văn phong sau):
${rulesText}

Yêu cầu định dạng:
1. Có cấu trúc rõ ràng: Hook -> Body -> CTA.
2. Sử dụng Emoji phù hợp.
3. Thêm 3-5 hashtag liên quan.
4. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Chào bạn", không "Ok", không "Đây là bài viết", không có bất kỳ ký tự nào ngoài nội dung bài viết. Trả về TRỰC TIẾP bài đăng.`;
        }
      }

      const reqId = startNewRequest();
      showState(stateLoading, 'Đang dùng AI sinh nội dung bài viết đăng mạng xã hội...');

      chrome.runtime.sendMessage({
        action: 'generate_content',
        title: title,
        content: content,
        platform: platform,
        customPrompt: customPrompt,
        token: authToken,
        requestId: reqId,
        host: AntBizUrl
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
  }

  // WIZARD BƯỚC 3: Quay lại & Đăng/Lên lịch
  if (btnBackToSocial) {
    btnBackToSocial.addEventListener('click', () => {
      showSubStep(stepSocialConfig);
      saveCurrentState();
    });
  }

  // Đồng bộ ngược từ Preview sang Textarea ẩn khi người dùng gõ trực tiếp
  if (fbPreviewText) {
    fbPreviewText.addEventListener('input', () => {
      inputCaption.value = fbPreviewText.innerText;
      saveCurrentState();
    });
  }
  if (btnPublishNow) {
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
  }

  if (btnSchedulePost) {
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
  }

  if (btnBackToPreview) {
    btnBackToPreview.addEventListener('click', () => {
      showSubStep(stepPostPreview);
      saveCurrentState();
    });
  }

  // Render Golden Hours function
  function renderGoldenHours() {
    const platform = selectPlatform.value || 'facebook';
    const container = document.getElementById('golden-hour-chips');
    const wrapper = document.getElementById('golden-hour-suggestions');
    if (!container || !wrapper) return;

    container.innerHTML = '<span style="font-size:11px;color:#9ca3af;">Đang tải giờ vàng...</span>';
    wrapper.style.display = 'block';

    chrome.runtime.sendMessage({ action: 'api_get', endpoint: `/api/reports/golden-hours?platform=${platform}`, host: AntBizUrl }, (response) => {
      let hours = [];
      let defaultHours = [];
      if (platform === 'facebook') {
        defaultHours = [7, 9, 11, 15, 20];
      } else if (platform === 'instagram') {
        defaultHours = [11, 15, 20];
      } else if (platform === 'thread' || platform === 'threads') {
        defaultHours = [8, 11, 15, 20];
      }

      if (!chrome.runtime.lastError && response && response.topSlots && response.topSlots.length > 0) {
        hours = response.topSlots.map(item => item.hourOfDay);
        // Bổ sung thêm giờ mặc định nếu chưa đủ 3 giờ
        for (const dh of defaultHours) {
          if (hours.length >= 3) break;
          if (!hours.includes(dh)) hours.push(dh);
        }
      } else {
        hours = defaultHours;
      }

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
    });
  }

  if (btnConfirmSchedule) {
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
  }

  // MÀN HÌNH THÀNH CÔNG
  if (btnViewArchive) {
    btnViewArchive.addEventListener('click', () => {
      chrome.tabs.create({ url: `${AntBizUrl}/archive` });
    });
  }

  if (btnSuccessHome) {
    btnSuccessHome.addEventListener('click', () => {
      clearSavedState();
      showState(stateHome);
    });
  }
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
    requestId: reqId,
    host: AntBizUrl
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
      renderExtractedImagesGrid();
      updateWordCountLabel();
      updateExtractedSourceBadge();
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
    renderExtractedImagesGrid();
    updateWordCountLabel();
    updateExtractedSourceBadge();
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

    // Cập nhật giao diện sang Đang ghi âm
    setRecordingUI('recording');
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
  const recordTimerVal = document.getElementById('record-timer-val');
  if (recordTimerVal) recordTimerVal.textContent = '05:00';

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
    if (recordTimerVal) recordTimerVal.textContent = timeStr;
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

  setRecordingUI('ready');
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
      requestId: reqId,
      host: AntBizUrl
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
        requestId: reqId,
        host: AntBizUrl
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
          renderExtractedImagesGrid();
          updateWordCountLabel();
          updateExtractedSourceBadge();
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
        requestId: reqId,
        host: AntBizUrl
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
          renderExtractedImagesGrid();
          updateWordCountLabel();
          updateExtractedSourceBadge();
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
    token: authToken,
    host: AntBizUrl
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
    requestId: reqId,
    host: AntBizUrl
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

// Tải lịch sử bài đăng từ hệ thống API
function loadPostHistory() {
  if (!authToken) return;

  if (historyLoader) historyLoader.classList.remove('hidden');
  if (historyList) historyList.classList.add('hidden');
  if (historyEmpty) historyEmpty.classList.add('hidden');

  chrome.runtime.sendMessage({
    action: 'get_history',
    token: authToken,
    host: AntBizUrl
  }, (response) => {
    if (historyLoader) historyLoader.classList.add('hidden');

    if (chrome.runtime.lastError) {
      console.error('Lỗi tải lịch sử bài đăng:', chrome.runtime.lastError);
      if (historyEmpty) historyEmpty.classList.remove('hidden');
      return;
    }

    if (response && response.success && response.data && Array.isArray(response.data.data)) {
      const posts = response.data.data;
      if (posts.length === 0) {
        if (historyEmpty) historyEmpty.classList.remove('hidden');
        return;
      }

      renderHistoryList(posts);
      if (historyList) historyList.classList.remove('hidden');
    } else {
      console.warn('Không thể tải danh sách bài đăng từ API lịch sử:', response?.error);
      if (handleApiError(response?.error)) return;
      if (historyEmpty) historyEmpty.classList.remove('hidden');
    }
  });
}

// Render danh sách 10 bài đăng gần nhất lên giao diện
function renderHistoryList(posts) {
  if (!historyList) return;
  historyList.innerHTML = '';

  posts.forEach(post => {
    const item = document.createElement('div');
    item.className = 'history-item';

    // Xác định emoji của nền tảng đăng
    let platformEmoji = '📱';
    if (post.platform === 'facebook') platformEmoji = '👥';
    else if (post.platform === 'thread' || post.platform === 'threads') platformEmoji = '🧵';
    else if (post.platform === 'instagram') platformEmoji = '📸';

    // Xác định chấm màu và nhãn trạng thái bài đăng
    let statusClass = 'pending';
    let statusText = 'Đang lên lịch';

    if (post.status === 'posted') {
      statusClass = 'posted';
      statusText = 'Đã đăng';
    } else if (post.status === 'failed') {
      statusClass = 'failed';
      statusText = 'Thất bại';
    } else if (post.status === 'cancelled') {
      statusClass = 'cancelled';
      statusText = 'Đã hủy';
    }

    // Thời gian hiển thị
    const timeVal = post.posted_at || post.scheduled_at || post.created_at;
    let timeString = '';
    if (timeVal) {
      const dateObj = new Date(timeVal);
      timeString = dateObj.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      if (post.status === 'posted') {
        timeString = `Đăng lúc: ${timeString}`;
      } else if (post.status === 'pending') {
        timeString = `Lên lịch: ${timeString}`;
      } else {
        timeString = `Thời gian: ${timeString}`;
      }
    }

    // Xác định tiêu đề hiển thị (rút gọn)
    let titleText = 'Bài viết không tên';
    if (post.captions?.articles?.title) {
      titleText = post.captions.articles.title;
    } else if (post.captions?.ai_content) {
      titleText = post.captions.ai_content.substring(0, 45).replace(/[\r\n]+/g, ' ') + '...';
    }

    item.innerHTML = `
      <div class="history-item-left">
        <div class="history-platform-icon">${platformEmoji}</div>
        <div class="history-item-details">
          <div class="history-item-title" title="${titleText.replace(/"/g, '&quot;')}">${titleText}</div>
          <div class="history-item-time">${timeString}</div>
        </div>
      </div>
      <div class="history-item-right">
        <span class="status-dot ${statusClass}"></span>
        <span class="status-label">${statusText}</span>
      </div>
    `;

    historyList.appendChild(item);
  });
}

// ==========================================
// CÁC HÀM HỖ TRỢ GIAO DIỆN MỚI
// ==========================================

function setRecordingUI(state) {
  const rip1 = document.getElementById('record-ripple-1');
  const rip2 = document.getElementById('record-ripple-2');
  const innerCircle = document.getElementById('record-icon-circle-btn');
  const timerVal = document.getElementById('record-timer-val');
  const statusLabel = document.getElementById('record-status-label');
  const btnClear = document.getElementById('btn-record-clear');
  const primaryText = document.getElementById('primary-record-text');
  const primaryIcon = document.getElementById('primary-record-icon');
  const bannerText = document.getElementById('record-banner-text');

  if (state === 'ready') {
    if (rip1) rip1.classList.add('hidden');
    if (rip2) rip2.classList.add('hidden');
    if (innerCircle) innerCircle.classList.remove('active');
    if (timerVal) {
      timerVal.textContent = '00:00';
      timerVal.classList.remove('recording');
    }
    if (statusLabel) statusLabel.textContent = 'Sẵn sàng ghi âm';
    if (btnClear) btnClear.disabled = true;
    if (primaryText) primaryText.textContent = 'Bắt đầu ghi';
    if (primaryIcon) {
      primaryIcon.innerHTML = `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
    }
    if (bannerText) bannerText.textContent = 'AI sẽ chuyển giọng nói thành văn bản sau khi bạn dừng ghi.';
  } else if (state === 'recording') {
    if (rip1) rip1.classList.remove('hidden');
    if (rip2) rip2.classList.remove('hidden');
    if (innerCircle) innerCircle.classList.add('active');
    if (timerVal) {
      timerVal.classList.add('recording');
    }
    if (statusLabel) statusLabel.textContent = 'Đang ghi âm...';
    if (btnClear) btnClear.disabled = false;
    if (primaryText) primaryText.textContent = 'Hoàn tất';
    if (primaryIcon) {
      primaryIcon.innerHTML = `<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>`;
    }
    if (bannerText) bannerText.textContent = 'Hãy nói rõ ràng, hạn chế tạp âm xung quanh (tối đa 5 phút)';
  }
}

function renderExtractedImagesGrid() {
  const gridContainer = document.getElementById('extracted-images-grid');
  const countLabel = document.getElementById('images-count-info-label');
  if (!gridContainer) return;

  const imageVal = inputImage.value.trim();
  const imageLines = imageVal.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  gridContainer.innerHTML = '';
  
  if (imageLines.length === 0) {
    if (countLabel) countLabel.textContent = '0 hình ảnh được tìm thấy';
    return;
  }

  if (countLabel) {
    countLabel.textContent = `${imageLines.length} hình ảnh được tìm thấy`;
  }

  imageLines.forEach((url, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-card-wrapper';

    const img = document.createElement('img');
    img.src = url;
    img.className = 'image-card-thumb';
    img.onerror = () => {
      img.src = 'icon.svg';
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'image-card-delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Xóa ảnh';
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const updatedLines = imageLines.filter((_, idx) => idx !== index);
      inputImage.value = updatedLines.join('\n');
      saveCurrentState();
      renderExtractedImagesGrid();
      updateFbPreview();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    gridContainer.appendChild(wrapper);
  });
}

function updateWordCountLabel() {
  const label = document.getElementById('word-count-info-label');
  if (!label) return;
  const content = inputContent.value.trim();
  if (!content) {
    label.textContent = '(Đã trích xuất 0 từ)';
    return;
  }
  const wordCount = content.split(/\s+/).length;
  label.textContent = `(Đã trích xuất ${wordCount.toLocaleString('vi-VN')} từ)`;
}

function updateExtractedSourceBadge() {
  const badge = document.getElementById('extracted-source-badge');
  if (!badge) return;

  let text = 'URL bài viết';
  let badgeClass = 'badge-url';
  let svgContent = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

  if (lastActionType === 'scrape') {
    text = 'URL bài viết';
    badgeClass = 'badge-url';
  } else if (lastActionType === 'select') {
    text = 'Đoạn văn đã chọn';
    badgeClass = 'badge-select';
    svgContent = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
  } else if (lastActionType === 'record') {
    text = 'Ghi âm';
    badgeClass = 'badge-record';
    svgContent = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
  } else if (lastActionType === 'upload') {
    text = 'Tải tệp';
    badgeClass = 'badge-upload';
    svgContent = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
  }

  badge.className = `source-badge ${badgeClass}`;
  badge.innerHTML = `${svgContent} <span>Nguồn: ${text}</span>`;
}