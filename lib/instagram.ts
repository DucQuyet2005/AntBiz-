export interface InstagramPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Đăng bài viết (ảnh/caption) lên tài khoản Instagram Business.
 * Instagram Business API yêu cầu ảnh để đăng tải. Nếu không truyền ảnh, sẽ trả về lỗi.
 */
export async function publishToInstagram(
  caption: string,
  imageUrls: string[] = [],
  instagramAccountId?: string,
  accessToken?: string
): Promise<InstagramPublishResult> {
  const igId = instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
  const token = accessToken || process.env.FB_PAGE_ACCESS_TOKEN; // IG dùng chung Page Access Token

  if (!igId || !token) {
    return {
      success: false,
      error: 'Thông tin xác thực Instagram (Account ID, Access Token) bị thiếu.',
    };
  }

  if (imageUrls.length === 0) {
    return {
      success: false,
      error: 'Instagram bắt buộc phải đăng kèm ít nhất 1 hình ảnh (image url).',
    };
  }

  try {
    // 1. Tạo Instagram Media Container
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrls[0], // Instagram API v19.0 nhận hình ảnh đầu tiên
        caption: caption,
        access_token: token,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      return {
        success: false,
        error: containerData.error?.message || 'Không thể tạo container bài viết trên Instagram',
      };
    }

    const containerId = containerData.id;

    // 2. Publish Instagram Container
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
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
        error: publishData.error?.message || 'Không thể publish bài viết trên Instagram',
      };
    }

    return {
      success: true,
      postId: publishData.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi xảy ra khi gọi API đăng bài lên Instagram',
    };
  }
}
