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
  const graphVersion = process.env.FB_GRAPH_API_VERSION || 'v19.0';

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
          `https://graph.facebook.com/${graphVersion}/${pageId}/photos`,
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

    const feedUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;
    let response: Response;

    if (photoIds.length > 0) {
      // T-1.19.4: Sử dụng FormData hoặc URLSearchParams để đảm bảo Facebook nhận diện đúng attached_media
      const params = new URLSearchParams();
      params.append('message', message);
      params.append('access_token', token);
      
      photoIds.forEach((pid, idx) => {
        params.append(`attached_media[${idx}]`, JSON.stringify({ media_fbid: pid }));
      });

      console.log(`[Facebook API] Đang đăng bài kèm ${photoIds.length} ảnh đã upload...`);
      response = await fetch(feedUrl, {
        method: 'POST',
        body: params,
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

/**
 * Đăng bài lên tài khoản Instagram (yêu cầu Facebook Page đã liên kết với Instagram Business Account).
 * API của Instagram bắt buộc phải có ít nhất 1 hình ảnh (imageUrls[0]).
 */
export async function publishToInstagramAccount(
  message: string,
  imageUrls: string[] = []
): Promise<FacebookPublishResult> {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const graphVersion = process.env.FB_GRAPH_API_VERSION || 'v19.0';

  if (!pageId || !token) {
    return {
      success: false,
      error: 'Thông tin xác thực Facebook bị thiếu',
    };
  }

  if (imageUrls.length === 0) {
    return {
      success: false,
      error: 'Instagram bắt buộc phải có ít nhất 1 hình ảnh để đăng bài. Vui lòng thêm hình ảnh.',
    };
  }

  try {
    // 1. Lấy ID của tài khoản Instagram liên kết với Page
    const pageInfoRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/${pageId}?fields=instagram_business_account&access_token=${token}`
    );
    const pageInfo = await pageInfoRes.json();
    
    if (pageInfo.error) {
      throw new Error(pageInfo.error.message || 'Lỗi khi lấy thông tin Instagram Business Account');
    }
    
    const igAccountId = pageInfo.instagram_business_account?.id;
    if (!igAccountId) {
      return {
        success: false,
        error: 'Facebook Page này chưa được liên kết với tài khoản Instagram Business nào.',
      };
    }

    const primaryImage = imageUrls[0]; // Instagram API hiện tại hỗ trợ đăng media đơn giản thông qua Graph API

    // 2. Tạo Media Container cho Instagram
    const containerRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: primaryImage,
          caption: message,
          access_token: token,
        }),
      }
    );
    const containerData = await containerRes.json();
    
    if (containerData.error) {
      throw new Error(containerData.error.message || 'Lỗi khi tạo media container cho Instagram');
    }
    
    const creationId = containerData.id;

    // 3. Publish Media Container
    const publishRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      throw new Error(publishData.error.message || 'Lỗi khi publish bài đăng lên Instagram');
    }

    return { success: true, postId: publishData.id };

  } catch (error: any) {
    console.error(`[Instagram API] Lỗi:`, error);
    return { success: false, error: error.message || 'Lỗi xảy ra khi gọi API đăng bài lên Instagram' };
  }
}

