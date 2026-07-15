export interface ThreadsPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

async function pollThreadsContainerStatus(containerId: string, token: string): Promise<boolean> {
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch(`https://graph.threads.net/v1.0/${containerId}?fields=status,error_message&access_token=${token}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'FINISHED') {
          return true;
        }
        if (data.status === 'ERROR') {
          throw new Error(data.error_message || 'Lỗi xử lý media container trên Threads API');
        }
      }
    } catch (err: any) {
      console.warn(`[Threads API] Polling status error (Attempt ${i + 1}/15): ${err.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

/**
 * Đăng bài viết (hỗ trợ văn bản thuần, ảnh đơn, hoặc album ảnh tối đa 10 ảnh) lên tài khoản Threads.
 */
export async function postThread(
  content: string,
  imageUrls?: string[],
  customToken?: string
): Promise<ThreadsPublishResult> {
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
    const urls = imageUrls || [];
    let containerId = '';

    if (urls.length === 0) {
      // 1. Đăng văn bản thuần
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
          error: containerData.error?.message || 'Không thể tạo container bài viết chữ trên Threads',
        };
      }
      containerId = containerData.id;
    } else if (urls.length === 1) {
      // 2. Đăng 1 hình ảnh
      const containerRes = await fetch(`https://graph.threads.net/v1.0/me/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'IMAGE',
          image_url: urls[0],
          text: content,
          access_token: token,
        }),
      });

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) {
        return {
          success: false,
          error: containerData.error?.message || 'Không thể tạo container ảnh đơn trên Threads',
        };
      }
      containerId = containerData.id;

      // Chờ Threads API xử lý ảnh xong
      const finished = await pollThreadsContainerStatus(containerId, token);
      if (!finished) {
        return {
          success: false,
          error: 'Quá thời gian chờ xử lý ảnh đơn trên Threads API',
        };
      }
    } else {
      // 3. Đăng album ảnh (Carousel - tối đa 10 ảnh)
      const allowedUrls = urls.slice(0, 10);

      // Tạo các container con cho từng ảnh song song
      const childPromises = allowedUrls.map(async (url, idx) => {
        const res = await fetch(`https://graph.threads.net/v1.0/me/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'IMAGE',
            image_url: url,
            is_carousel_item: true,
            access_token: token,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.id) {
          throw new Error(data.error?.message || `Không thể tạo container con cho ảnh thứ ${idx + 1}`);
        }
        return data.id as string;
      });

      const childIds = await Promise.all(childPromises);

      // Chờ tất cả container con xử lý xong
      const pollPromises = childIds.map(id => pollThreadsContainerStatus(id, token));
      const pollResults = await Promise.all(pollPromises);
      if (pollResults.includes(false)) {
        return {
          success: false,
          error: 'Một hoặc nhiều ảnh trong album chưa được xử lý xong trên Threads API',
        };
      }

      // Tạo container cha liên kết album
      const parentRes = await fetch(`https://graph.threads.net/v1.0/me/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          text: content,
          access_token: token,
        }),
      });

      const parentData = await parentRes.json();
      if (!parentRes.ok || !parentData.id) {
        return {
          success: false,
          error: parentData.error?.message || 'Không thể tạo container album (Carousel) trên Threads',
        };
      }
      containerId = parentData.id;
    }

    // 4. Thực hiện đăng công khai bài viết (Publish Container)
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
        error: publishData.error?.message || 'Không thể publish bài viết lên Threads',
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
