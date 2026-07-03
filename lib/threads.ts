export interface ThreadsPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Tạo URL để người dùng bắt đầu tiến trình xác thực OAuth với Threads.
 */
export function getThreadsAuthUrl(): string {
  const appId = process.env.THREADS_APP_ID || '';
  const redirectUri = process.env.THREADS_REDIRECT_URI || '';
  const scope = 'threads_basic,threads_content_publish';
  return `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
}

/**
 * Trao đổi Authorization Code lấy Access Token dài hạn (long-lived access token).
 */
export async function getThreadsAccessToken(code: string): Promise<string> {
  const appId = process.env.THREADS_APP_ID || '';
  const appSecret = process.env.THREADS_APP_SECRET || '';
  const redirectUri = process.env.THREADS_REDIRECT_URI || '';

  if (!appId || !appSecret || !redirectUri) {
    throw new Error('Thông tin cấu hình THREADS_APP_ID, THREADS_APP_SECRET, hoặc THREADS_REDIRECT_URI bị thiếu');
  }

  // 1. Đổi code lấy short-lived access token
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_message || tokenData.error?.message || 'Lỗi lấy short-lived token từ Threads API');
  }

  const shortToken = tokenData.access_token;

  // 2. Đổi short-lived token lấy long-lived token
  const longTokenRes = await fetch(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
  );
  const longTokenData = await longTokenRes.json();
  if (!longTokenRes.ok) {
    throw new Error(longTokenData.error?.message || 'Lỗi lấy long-lived token từ Threads API');
  }

  return longTokenData.access_token;
}

/**
 * Đăng bài viết dạng văn bản (text) lên tài khoản Threads của người dùng.
 */
export async function postThread(content: string, customToken?: string): Promise<ThreadsPublishResult> {
  const token = customToken || process.env.THREADS_ACCESS_TOKEN;

  if (!token) {
    return {
      success: false,
      error: 'Thông tin xác thực Threads (THREADS_ACCESS_TOKEN) bị thiếu trong cấu hình biến môi trường hoặc tham số gọi hàm',
    };
  }

  if (!customToken && (token.includes('điền access token') || token.includes('placeholder'))) {
    return {
      success: false,
      error: 'Thông tin xác thực Threads vẫn là dữ liệu mẫu và chưa được cấu hình thực tế',
    };
  }

  try {
    // 1. Tạo Threads Media Container
    const containerRes = await fetch(`https://graph.threads.net/v1.0/me/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: content,
        access_token: token,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      return {
        success: false,
        error: containerData.error?.message || 'Không thể tạo container bài viết trên Threads',
      };
    }

    const containerId = containerData.id;

    // 2. Publish Threads Container
    const publishRes = await fetch(`https://graph.threads.net/v1.0/me/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      return {
        success: false,
        error: publishData.error?.message || 'Không thể publish container bài viết trên Threads',
      };
    }

    return {
      success: true,
      postId: publishData.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi xảy ra khi gọi API đăng bài lên Threads',
    };
  }
}

/**
 * Xóa bài đăng trên Threads bằng media ID.
 */
export async function deleteThread(postId: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://graph.threads.net/v1.0/${postId}?access_token=${token}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || 'Lỗi khi xóa bài viết Threads',
      };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi kết nối khi xóa bài viết Threads',
    };
  }
}

/**
 * Lấy trạng thái của bài đăng Threads.
 */
export async function getStatus(postId: string, token: string): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.threads.net/v1.0/${postId}?fields=status,permalink&access_token=${token}`);
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || 'Lỗi lấy trạng thái bài viết Threads',
      };
    }
    return {
      success: true,
      status: data.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi kết nối khi lấy trạng thái Threads',
    };
  }
}
