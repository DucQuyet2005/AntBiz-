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

    // Crop hình ảnh về tỷ lệ chuẩn 1:1 (1080x1080) bằng fit=cover nếu chưa qua Smart Crop
    const paddedImageUrls = imageUrls.map(url => {
      if (!url.startsWith('http')) return url;
      if (url.includes('supabase.co') || url.includes('smart_crop')) return url;
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1080&h=1080&fit=cover&a=attention`;
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

      // Poll each child container until FINISHED before creating parent
      for (const childId of childIds) {
        const childReady = await waitForContainerReady(childId, token);
        if (!childReady.ok) {
          return { success: false, error: `Ảnh con trong carousel thất bại: ${childReady.error}` };
        }
      }

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

    // 2. Poll container status until FINISHED (Instagram requires this before media_publish)
    const statusReady = await waitForContainerReady(containerId, token);
    if (!statusReady.ok) {
      return { success: false, error: statusReady.error };
    }

    // 3. Publish Instagram Container
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

/**
 * Poll Instagram container status until FINISHED.
 * Instagram processes media asynchronously; publishing before FINISHED results in "Media ID is not available".
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-media
 */
async function waitForContainerReady(
  containerId: string,
  token: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${token}`
    );
    const data = await res.json();
    const status: string = data.status_code || '';

    if (status === 'FINISHED') {
      console.log(`[Instagram API] Container ${containerId} sẵn sàng sau ${attempt} lần kiểm tra`);
      return { ok: true };
    }
    if (status === 'ERROR' || status === 'EXPIRED') {
      const reason = data.status || status;
      console.error(`[Instagram API] Container ${containerId} thất bại: ${reason}`);
      return { ok: false, error: `Instagram từ chối xử lý ảnh (${reason}). Có thể ảnh không đạt yêu cầu tỷ lệ hoặc kích thước.` };
    }

    // IN_PROGRESS or PUBLISHED — keep waiting
    console.log(`[Instagram API] Container ${containerId} đang xử lý (${status || 'IN_PROGRESS'}), thử lại lần ${attempt}/${maxAttempts}...`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return {
    ok: false,
    error: `Container ${containerId} chưa sẵn sàng sau ${maxAttempts * intervalMs / 1000}s. Vui lòng thử lại sau.`,
  };
}
