import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole, createServiceRoleClient } from '@/lib/api/auth';
import { runSchedulerCycle } from '@/lib/scheduler/scheduler';
import { z } from 'zod';

// Định nghĩa schema kiểm tra đầu vào từ Extension (hỗ trợ cả đăng ngay/lên lịch)
const importExtensionSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được rỗng'),
  description: z.string().optional().default(''),
  content: z.string().min(1, 'Nội dung không được rỗng'),
  imageUrl: z.string().optional().default(''),
  originUrl: z.string().optional().default(''),

  // Các trường phục vụ chức năng Đăng bài / Lên lịch
  action: z.enum(['draft', 'publish_now', 'schedule']).optional().default('draft'),
  platform: z.enum(['facebook', 'thread', 'threads', 'instagram']).optional(),
  scheduledAt: z.string().optional(),
  postContent: z.string().optional()
});

/**
 * POST /api/captions/import-extension
 *
 * Tiếp nhận bài viết và yêu cầu đăng bài/lên lịch gửi từ Chrome Extension.
 * Sử dụng Service Role Client để tránh lỗi phân quyền RLS khi thao tác bảng articles.
 */
export async function POST(request: NextRequest) {
  // 1. Xác thực quyền người dùng
  const { user, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung yêu cầu không phải JSON hợp lệ' }, { status: 400 });
  }

  const parsed = importExtensionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    title,
    description,
    content,
    imageUrl,
    originUrl,
    action,
    platform,
    scheduledAt,
    postContent
  } = parsed.data;

  // Sử dụng Admin Client để bypass RLS
  const adminSupabase = createServiceRoleClient();
  const images = imageUrl
    ? imageUrl.split('\n').map((u: string) => u.trim()).filter(Boolean).map((url: string) => ({ url }))
    : [];

  try {
    // 2. Tìm kiếm bài viết gốc (chỉ tìm nếu có originUrl hợp lệ)
    let existingArticle = null;
    if (originUrl) {
      const { data, error: findError } = await adminSupabase
        .from('articles')
        .select('*')
        .eq('url', originUrl)
        .maybeSingle();

      if (findError) {
        console.warn('[Extension Import API] Lỗi tìm bài viết cũ:', findError);
      }
      existingArticle = data;
    }

    let articleId = '';

    // 3. Tiến hành Insert hoặc Update bài viết
    if (existingArticle) {
      console.log(`[Extension Import API] Bài viết đã tồn tại. Đang cập nhật ID: ${existingArticle.id}`);
      const { data: updatedArticle, error: updateError } = await adminSupabase
        .from('articles')
        .update({
          title,
          description,
          full_text: content,
          images,
          crawled_at: new Date().toISOString(),
        })
        .eq('id', existingArticle.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[Extension Import API] Lỗi cập nhật bài viết:', updateError);
        return NextResponse.json({ error: 'Không thể cập nhật bài viết trong hệ thống' }, { status: 500 });
      }
      articleId = updatedArticle?.id || existingArticle.id;
    } else {
      console.log(`[Extension Import API] Bài viết chưa tồn tại. Đang tạo mới...`);
      const { data: insertedArticle, error: insertError } = await adminSupabase
        .from('articles')
        .insert({
          url: originUrl || `extension-import-${crypto.randomUUID()}`,
          title,
          description,
          author: 'Chrome Extension',
          published_at: new Date().toISOString(),
          views: '0',
          images,
          body: [{ type: 'paragraph', text: content }],
          full_text: content,
          category: '#Extension',
          tags: ['chrome-extension'],
          crawled_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[Extension Import API] Lỗi chèn bài viết mới:', insertError);
        return NextResponse.json({ error: 'Không thể lưu bài viết mới vào hệ thống' }, { status: 500 });
      }
      articleId = insertedArticle?.id || '';
    }

    // 4. Nếu hành động là Đăng bài hoặc Lên lịch
    if (action === 'publish_now' || action === 'schedule') {
      if (!platform || !postContent) {
        return NextResponse.json({ error: 'Yêu cầu điền nền tảng đăng và nội dung Caption' }, { status: 400 });
      }

      const dbPlatform = platform === 'threads' ? 'thread' : platform;

      // 4.1 Tạo Caption liên kết với bài viết gốc
      const { data: caption, error: captionError } = await adminSupabase
        .from('captions')
        .insert({
          article_id: articleId,
          platform: dbPlatform,
          ai_content: postContent,
          edited_content: null,
          created_by: user.id,
          status: action === 'schedule' ? 'scheduled' : 'draft',
        })
        .select()
        .single();

      if (captionError || !caption) {
        console.error('[Extension Import API] Lỗi tạo Caption:', captionError);
        return NextResponse.json({ error: 'Không thể tạo Caption cho bài đăng' }, { status: 500 });
      }

      // Xác định thời gian lên lịch
      let scheduledTime: Date;
      if (action === 'schedule') {
        if (!scheduledAt) {
          return NextResponse.json({ error: 'Thiếu thời gian lên lịch đăng bài' }, { status: 400 });
        }
        scheduledTime = new Date(scheduledAt);
        if (isNaN(scheduledTime.getTime())) {
          return NextResponse.json({ error: 'Thời gian lên lịch không hợp lệ' }, { status: 400 });
        }
        if (scheduledTime.getTime() <= Date.now()) {
          return NextResponse.json({ error: 'Chỉ được phép lên lịch đăng bài cho thời gian trong tương lai' }, { status: 400 });
        }
      } else {
        // Đăng ngay: Lùi thời gian lên lịch 5 giây về quá khứ để scheduler quét trúng ngay lập tức
        scheduledTime = new Date(Date.now() - 5000);
      }

      // 4.2 Tạo lịch đăng bài trong bảng scheduled_posts
      const { data: scheduledPost, error: postError } = await adminSupabase
        .from('scheduled_posts')
        .insert({
          caption_id: caption.id,
          created_by: user.id,
          platform: dbPlatform,
          status: 'pending',
          scheduled_at: scheduledTime.toISOString(),
          image_urls: imageUrl
            ? imageUrl.split('\n').map((u: string) => u.trim()).filter(Boolean)
            : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (postError) {
        console.error('[Extension Import API] Lỗi tạo lịch scheduled_post:', postError);
        return NextResponse.json({ error: 'Không thể tạo lịch đăng bài' }, { status: 500 });
      }

      // 4.3 Nếu chọn Đăng ngay, kích hoạt Scheduler chạy luôn
      if (action === 'publish_now') {
        console.log('[Extension Import API] Đăng bài ngay lập tức. Kích hoạt Scheduler...');
        // Chạy bất đồng bộ để tránh làm nghẽn kết nối của user
        runSchedulerCycle()
          .then(() => console.log('[Extension Import API] Kích hoạt Scheduler thành công.'))
          .catch((err) => console.error('[Extension Import API] Lỗi Scheduler:', err));
      }
    }

    return NextResponse.json({
      success: true,
      articleId,
      title
    }, { status: 201 });
  } catch (err: any) {
    console.error('[Extension Import API] Lỗi Runtime Exception:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ: ' + err.message }, { status: 500 });
  }
}
