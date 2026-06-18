export interface FacebookPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Đăng nội dung lên trang Facebook Page.
 * Nếu có truyền vào danh sách URL hình ảnh, hệ thống sẽ đăng tải các ảnh đó lên dưới dạng ảnh nháp (unpublished photos)
 * sau đó đính kèm chúng vào bài đăng feed chung.
 */
export async function publishToFacebookPage(
  message: string,
  imageUrls: string[] = []
): Promise<FacebookPublishResult> {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!pageId || !token) {
    return {
      success: false,
      error: 'Thông tin xác thực Facebook (FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN) bị thiếu trong cấu hình biến môi trường',
    };
  }

  // Coi các giá trị placeholder là thông tin cấu hình chưa hoàn tất ở môi trường local
  if (pageId.includes('điền id') || token.includes('điền access token')) {
    return {
      success: false,
      error: 'Thông tin xác thực Facebook vẫn là dữ liệu mẫu và chưa được cấu hình thực tế',
    };
  }

  try {
    const photoIds: string[] = [];

    // Cho phép đăng tối đa 4 hình ảnh kèm bài viết
    const targetImages = imageUrls.slice(0, 4);
    for (const imgUrl of targetImages) {
      try {
        const uploadRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/photos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imgUrl,
              published: false,
              access_token: token,
            }),
          }
        );
        const uploadJson = await uploadRes.json();
        if (uploadJson.id) {
          photoIds.push(uploadJson.id);
        } else {
          console.warn(`[Facebook API] Không thể tải ảnh lên ${imgUrl}:`, uploadJson.error?.message);
        }
      } catch (err: any) {
        console.error(`[Facebook API] Lỗi xảy ra khi tải ảnh lên ${imgUrl}:`, err);
      }
    }

    const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    let response: Response;

    if (photoIds.length > 0) {
      const payload: any = {
        message,
        access_token: token,
      };
      photoIds.forEach((pid, idx) => {
        payload[`attached_media[${idx}]`] = JSON.stringify({ media_fbid: pid });
      });

      response = await fetch(feedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      response = await fetch(feedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: token,
        }),
      });
    }

    const resultJson = await response.json();
    if (response.ok && resultJson.id) {
      return { success: true, postId: resultJson.id };
    } else {
      return {
        success: false,
        error: resultJson.error?.message || response.statusText || 'Lỗi không xác định từ Facebook API',
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi xảy ra khi gọi API đăng bài lên Facebook' };
  }
}
