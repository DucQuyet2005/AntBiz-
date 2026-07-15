// content.js - Lấy thông tin hoặc văn bản bôi đen từ trang web hiện tại

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extract_content') {
    sendResponse({ success: true, url: window.location.href });
  } else if (message.action === 'get_selected_text') {
    sendResponse({
      success: true,
      text: window.getSelection().toString().trim(),
      title: document.title,
      url: window.location.href
    });
  }
  return true; // Giữ kênh kết nối không đồng bộ
});
