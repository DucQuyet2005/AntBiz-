export interface InstagramPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  imageCount?: number;
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
    let containerId = '';

    // Auto pad hình ảnh về tỷ lệ chuẩn 1:1 (1080x1080) bằng public proxy (tránh lỗi Aspect Ratio)
    const paddedImageUrls = imageUrls.map(url => {
      if (!url.startsWith('http')) return url;
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1080&h=1080&fit=contain&we&bg=white`;
    });

    if (paddedImageUrls.length === 1) {
      const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: paddedImageUrls[0],
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
      containerId = containerData.id;
    } else {
      // Instagram Carousel
      const allowedUrls = paddedImageUrls.slice(0, 10);
      const childPromises = allowedUrls.map(async (url, idx) => {
        const res = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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

      const parentRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childIds,
          caption: caption,
          access_token: token,
        }),
      });
      const parentData = await parentRes.json();
      if (!parentRes.ok || !parentData.id) {
        return {
          success: false,
          error: parentData.error?.message || 'Không thể tạo container album (Carousel) trên Instagram',
        };
      }
      containerId = parentData.id;
    }

    console.log(`[Instagram API] Đang tiến hành đăng bài với ${paddedImageUrls.length} hình ảnh...`);

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
      console.error(`[Instagram API] Thất bại khi publish container ${containerId}:`, publishData.error);
      return {
        success: false,
        error: publishData.error?.message || 'Không thể publish bài viết trên Instagram',
      };
    }

    console.log(`[Instagram API] ✅ Đăng bài thành công! Post ID: ${publishData.id} (Tổng số ảnh đã đăng: ${paddedImageUrls.length})`);

    return {
      success: true,
      postId: publishData.id,
      imageCount: paddedImageUrls.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi xảy ra khi gọi API đăng bài lên Instagram',
    };
  }
}

/**
 * Đóng gói cuộc gọi đăng bài lên Instagram qua Graph API.
 */
export async function publishMedia(
  accessToken: string,
  mediaUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  return publishToInstagram(caption, mediaUrl ? [mediaUrl] : [], undefined, accessToken);
}
