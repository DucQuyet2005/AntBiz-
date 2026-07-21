// background.js - Service Worker cho AntBiz Assistant Extension

// Bật chế độ mở extension thành Sidebar (không bị đóng khi chuyển tab)
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}
// Hàm lấy session đăng nhập Supabase từ cookie của AntBiz
function getSupabaseSession(forceCookieCheck = false) {
  return new Promise((resolve) => {
    // 1. Kiểm tra session trong chrome.storage.local trước
    chrome.storage.local.get('antbiz_local_session', (res) => {
      const stored = res.antbiz_local_session;
      if (!forceCookieCheck && stored && Array.isArray(stored)) {
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

        const debugInfo = { allFoundCookies: cookies.map(c => ({ name: c.name, domain: c.domain })) };

        const sbCookies = cookies.filter(c => {
          // Chỉ lấy chính xác cookie chứa token (và các mảnh .0, .1 của nó), loại bỏ hoàn toàn -code-verifier hay các cookie phụ khác
          return /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name) || 
                 /^nttnyvgprhbthsqmvyjp-auth-token(?:\.\d+)?$/.test(c.name);
        });

        debugInfo.filteredSbCookies = sbCookies.map(c => ({ name: c.name }));

        // Nhóm các cookie. Tách biệt hoàn toàn cookie có đuôi .0 (chunked) và cookie không có đuôi (unchunked)
        // để tránh ghép nhầm 2 phiên bản cũ/mới của cùng một dự án.
        const groupedCookies = {};
        sbCookies.forEach(c => {
          const isChunked = /\.\d+$/.test(c.name);
          const baseName = c.name.replace(/\.\d+$/, '');
          const groupKey = isChunked ? `${baseName}_chunked` : `${baseName}_unchunked`;
          
          if (!groupedCookies[groupKey]) groupedCookies[groupKey] = [];
          groupedCookies[groupKey].push(c);
        });

        debugInfo.cookieGroups = Object.keys(groupedCookies);

        // Hàm phụ kiểm tra hạn của token
        function checkTokenValid(token) {
          if (!token) return false;
          try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const payload = JSON.parse(atob(base64));
            if (payload && payload.exp) {
              const now = Math.floor(Date.now() / 1000);
              return payload.exp > now;
            }
          } catch (e) {}
          return false;
        }

        // Duyệt qua từng nhóm cookie để thử parse
        for (const baseName in groupedCookies) {
          const group = groupedCookies[baseName];
          // Sắp xếp các mảnh theo đúng thứ tự (nếu có .0, .1)
          group.sort((a, b) => {
            const aMatch = a.name.match(/\.(\d+)$/);
            const bMatch = b.name.match(/\.(\d+)$/);
            const aIdx = aMatch ? parseInt(aMatch[1], 10) : -1;
            const bIdx = bMatch ? parseInt(bMatch[1], 10) : -1;
            return aIdx - bIdx;
          });

          const rawValue = group.map(c => c.value).join('');

          try {
            let sessionData;
            try {
              // Thử parse dạng URL-encoded
              const decodedValue = decodeURIComponent(rawValue);
              sessionData = JSON.parse(decodedValue);
            } catch (e1) {
              // Thử parse dạng Base64URL
              let base64Str = rawValue;
              if (base64Str.startsWith('base64-')) {
                base64Str = base64Str.substring(7);
              }
              let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
              while (base64.length % 4) {
                base64 += '=';
              }
              const decoded = atob(base64);
              const utf8Decoded = decodeURIComponent(escape(decoded));
              sessionData = JSON.parse(utf8Decoded);
            }

            if (Array.isArray(sessionData) && sessionData[0] && checkTokenValid(sessionData[0])) {
              fetch('http://localhost:3000/api/auth/debug', { method: 'POST', body: JSON.stringify({ msg: 'Success parse valid token', baseName, method: 'array' }) }).catch(()=>{});
              return resolve({
                access_token: sessionData[0],
                refresh_token: sessionData[1],
                user: sessionData[4] || null
              });
            } else if (Array.isArray(sessionData) && sessionData[0]) {
              debugInfo[`expired_${baseName}`] = true;
            }

            if (sessionData && typeof sessionData === 'object' && sessionData.access_token && checkTokenValid(sessionData.access_token)) {
              fetch('http://localhost:3000/api/auth/debug', { method: 'POST', body: JSON.stringify({ msg: 'Success parse valid token', baseName, method: 'object' }) }).catch(()=>{});
              return resolve({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
                user: sessionData.user || null
              });
            } else if (sessionData && typeof sessionData === 'object' && sessionData.access_token) {
              debugInfo[`expired_${baseName}`] = true;
            }
          } catch (err) {
            // Lỗi parse nhóm này, thử nhóm tiếp theo
            debugInfo[`error_${baseName}`] = err.message || err.toString();
          }
        }

        // Nếu tất cả các nhóm đều thất bại
        fetch('http://localhost:3000/api/auth/debug', { method: 'POST', body: JSON.stringify({ msg: 'All groups failed', ...debugInfo }) }).catch(()=>{});
        resolve(null);
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
async function generateAiContentViaServer(title, content, platform, token, requestId, customPrompt) {
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
        platform,
        customPrompt
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

// Hàm gửi GET request chung (ví dụ lấy lịch sử)
async function fetchDataViaServer(endpoint, token) {
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Lỗi truy vấn dữ liệu: ${response.status}`);
  }

  return await response.json();
}

// Hàm lấy danh sách cấu hình văn phong (Prompt Configs / Presets) từ server
async function getPromptConfigsViaServer(token, host = 'http://localhost:3000') {
  const response = await fetch(`${host}/api/prompt-configs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Lỗi tải danh sách văn phong: ${response.status}`);
  }

  return await response.json();
}

// Hàm lấy lịch sử các bài đăng được tạo từ Extension qua server
async function getHistoryViaServer(token, host = 'http://localhost:3000') {
  const response = await fetch(`${host}/api/scheduled-posts?trigger_source=extension&limit=10`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Lỗi tải lịch sử bài đăng: ${response.status}`);
  }

  return await response.json();
}

// Lắng nghe các tin nhắn từ Popup UI hoặc Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'get_session') {
    getSupabaseSession(true)
      .then(session => sendResponse({ session }))
      .catch(error => sendResponse({ error: error.message || error }));
    return true; // Giữ kênh kết nối không đồng bộ
  }

  if (message.action === 'get_prompt_configs') {
    getPromptConfigsViaServer(message.token, message.host)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'get_history') {
    getHistoryViaServer(message.token, message.host)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'scrape_url') {
    scrapeArticleViaServer(message.url, message.token, message.requestId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message || error }));
    return true;
  }

  if (message.action === 'api_get') {
    getSupabaseSession(false).then(session => {
      if (!session || !session.access_token) throw new Error('Unauthenticated');
      return fetchDataViaServer(message.endpoint, session.access_token);
    })
    .then(data => sendResponse(data))
    .catch(error => sendResponse({ error: error.message || error }));
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
    generateAiContentViaServer(message.title, message.content, message.platform, message.token, message.requestId, message.customPrompt)
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

// Tự động đóng tab đăng nhập thành công + đồng bộ session vào storage
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      if (url.pathname === '/login/success') {
        // Đợi 2 giây để Supabase cookie được set xong hoàn toàn
        setTimeout(async () => {
          // Thử đọc cookie tối đa 3 lần, mỗi lần cách nhau 500ms
          for (let attempt = 0; attempt < 3; attempt++) {
            const session = await getSupabaseSession(true);
            if (session && session.access_token) {
              const sessionData = [
                session.access_token,
                session.refresh_token,
                null,
                null,
                session.user
              ];
              chrome.storage.local.set({ antbiz_local_session: sessionData }, () => {
                console.log(`[Background] Đã đồng bộ session từ web login (lần ${attempt + 1}).`);
              });
              break;
            }
            // Chờ 500ms trước khi thử lại
            await new Promise(r => setTimeout(r, 500));
          }

          // Đóng tab sau khi đã thử đồng bộ xong
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              console.warn('Lỗi khi đóng tab đăng nhập:', chrome.runtime.lastError);
            }
          });
        }, 2000);
      }
    } catch (e) {
      console.error('Lỗi phân tích URL trong onUpdated:', e);
    }
  }
});
