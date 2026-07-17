// background.js - Service Worker cho AntBiz Assistant Extension

// Hàm lấy session đăng nhập Supabase từ cookie của AntBiz
function getSupabaseSession() {
  return new Promise((resolve) => {
    // 1. Kiểm tra session trong chrome.storage.local trước
    chrome.storage.local.get('antbiz_local_session', (res) => {
      const stored = res.antbiz_local_session;
      if (stored && Array.isArray(stored)) {
        return resolve({
          access_token: stored[0],
          refresh_token: stored[1],
          user: stored[4] || null
        });
      }

      // 2. Nếu không có trong storage, tìm trong cookie (để đồng bộ từ trình duyệt)
      chrome.cookies.getAll({}, (allCookies = []) => {
        if (chrome.runtime.lastError) {
          console.warn('Lỗi quét cookies:', chrome.runtime.lastError);
          return resolve(null);
        }

        const cookies = allCookies.filter(c => 
          c.domain.includes('localhost') || 
          c.domain.includes('127.0.0.1') || 
          c.domain.includes('172.25.240.1')
        );

        console.log('Quét tìm thấy các cookie:', cookies.map(c => `${c.domain}: ${c.name}`));

        const sbCookies = cookies.filter(c => 
          c.name.includes('nttnyvgprhbthsqmvyjp-auth-token') || 
          c.name.includes('sb-local-auth-token')
        );
        if (sbCookies.length === 0) {
          console.log('Không tìm thấy cookie Supabase nào khớp.');
          return resolve(null);
        }

        sbCookies.sort((a, b) => {
          const aParts = a.name.split('.');
          const bParts = b.name.split('.');
          const aIdx = aParts.length > 2 ? parseInt(aParts[aParts.length - 1], 10) : -1;
          const bIdx = bParts.length > 2 ? parseInt(bParts[bParts.length - 1], 10) : -1;
          return aIdx - bIdx;
        });

        const rawValue = sbCookies.map(c => c.value).join('');

        try {
          const decodedValue = decodeURIComponent(rawValue);
          const sessionData = JSON.parse(decodedValue);

          if (Array.isArray(sessionData)) {
            return resolve({
              access_token: sessionData[0],
              refresh_token: sessionData[1],
              user: sessionData[4] || null
            });
          }

          if (sessionData && typeof sessionData === 'object') {
            return resolve({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
              user: sessionData.user || null
            });
          }

          resolve(null);
        } catch (err) {
          console.warn('Lỗi giải mã session cookie:', err);
          resolve({ access_token: rawValue });
        }
      });
    });
  });
}

const activeRequests = new Map();

// Chuyển base64 về Blob trong Service Worker
function base64ToBlob(base64, type) {
  const binStr = atob(base64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type: type });
}

// Hàm cào bài viết qua API phía server (hỗ trợ AbortSignal)
async function scrapeArticleViaServer(targetUrl, token, requestId) {
  const controller = new AbortController();
  if (requestId) activeRequests.set(requestId, controller);

  try {
    const encodedUrl = encodeURIComponent(targetUrl);
    const response = await fetch(`http://localhost:3000/api/scrape?url=${encodedUrl}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi cào tin từ server: ${response.status}`);
    }

    return await response.json();
  } finally {
    if (requestId) activeRequests.delete(requestId);
  }
}

// Hàm gửi file ghi âm chuyển đổi thành văn bản (STT)
async function transcribeAudioViaServer(base64Data, fileName, fileType, token, requestId) {
  const controller = new AbortController();
  if (requestId) activeRequests.set(requestId, controller);

  try {
    const blob = base64ToBlob(base64Data, fileType);
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const response = await fetch('http://localhost:3000/api/stt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi chuyển giọng nói thành văn bản: ${response.status}`);
    }

    return await response.json();
  } finally {
    if (requestId) activeRequests.delete(requestId);
  }
}

// Hàm đăng nhập trực tiếp từ Extension
async function loginDirectViaServer(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Đăng nhập thất bại: ${response.status}`);
  }

  const data = await response.json();
  if (data.success && data.session) {
    const sessionData = [
      data.session.access_token,
      data.session.refresh_token,
      null,
      null,
      data.session.user
    ];
    const cookieValue = encodeURIComponent(JSON.stringify(sessionData));
    
    await new Promise((resolve) => {
      chrome.storage.local.set({ antbiz_local_session: sessionData }, () => {
        chrome.cookies.set({
          url: 'http://localhost:3000',
          name: 'sb-local-auth-token',
          value: cookieValue,
          path: '/',
          expirationDate: Math.floor(Date.now() / 1000) + 3600 * 24 * 7 // 7 days
        }, (cookie) => {
          if (chrome.runtime.lastError) console.error('Error setting cookie:', chrome.runtime.lastError);
          resolve(cookie);
        });
      });
    });
  }
  return data;
}

// Hàm gửi tệp tài liệu PDF/Word để trích xuất văn bản
async function parseDocumentViaServer(base64Data, fileName, fileType, token, requestId) {
  const controller = new AbortController();
  if (requestId) activeRequests.set(requestId, controller);

  try {
    const blob = base64ToBlob(base64Data, fileType);
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const response = await fetch('http://localhost:3000/api/parse-doc', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi trích xuất tài liệu: ${response.status}`);
    }

    return await response.json();
  } finally {
    if (requestId) activeRequests.delete(requestId);
  }
}

// Hàm gọi AI sinh nội dung bài viết
async function generateAiContentViaServer(title, content, platform, token, requestId) {
  const controller = new AbortController();
  if (requestId) activeRequests.set(requestId, controller);

  try {
    const response = await fetch('http://localhost:3000/api/prompts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        content,
        platform
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Lỗi AI sinh bài viết: ${response.status}`);
    }

    return await response.json();
  } finally {
    if (requestId) activeRequests.delete(requestId);
  }
}

// Hàm gửi bài viết về hệ thống backend AntBiz
async function sendArticleToAntBiz(articleData, token) {
  const response = await fetch('http://localhost:3000/api/captions/import-extension', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(articleData)
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Yêu cầu thất bại với trạng thái: ${response.status}`);
  }

  return await response.json();
}

// Lắng nghe các tin nhắn từ Popup UI hoặc Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'get_session') {
    getSupabaseSession()
      .then(session => sendResponse({ session }))
      .catch(error => sendResponse({ error: error.message || error }));
    return true; // Giữ kênh kết nối không đồng bộ
  }

  if (message.action === 'scrape_url') {
    scrapeArticleViaServer(message.url, message.token, message.requestId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'transcribe_audio') {
    transcribeAudioViaServer(message.base64Data, message.fileName, message.fileType, message.token, message.requestId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'parse_doc') {
    parseDocumentViaServer(message.base64Data, message.fileName, message.fileType, message.token, message.requestId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'generate_content') {
    generateAiContentViaServer(message.title, message.content, message.platform, message.token, message.requestId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'login_direct') {
    loginDirectViaServer(message.email, message.password)
      .then(data => sendResponse({ success: true, session: data.session }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'abort_request') {
    const controller = activeRequests.get(message.requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(message.requestId);
    }
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'send_article') {
    sendArticleToAntBiz(message.data, message.token)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }
});

// Tự động đóng tab đăng nhập thành công
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      if (url.pathname === '/login/success') {
        // Đợi 1 giây để người dùng thấy thông báo checkmark rồi đóng tab
        setTimeout(() => {
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              console.warn('Lỗi khi đóng tab đăng nhập:', chrome.runtime.lastError);
            }
          });
        }, 1000);
      }
    } catch (e) {
      console.error('Lỗi phân tích URL trong onUpdated:', e);
    }
  }
});
