-- ============================================================
-- Migration: Fix mismatched platform presets (Facebook <-> Threads <-> Instagram)
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Cập nhật các quy chuẩn mặc định của hệ thống (user_id IS NULL)
-- Facebook: Tối đa 500 ký tự (lấy từ rules Threads cũ và đổi giới hạn ký tự thành 500)
UPDATE public.platform_presets 
SET rules = 'Tối đa 500 từ. Hành văn mang tính trò chuyện, tranh luận mở. Hạn chế dùng quá nhiều hashtag.'
WHERE platform = 'facebook' AND user_id IS NULL;

-- Threads (thread): Caption ngắn gọn (lấy từ rules Instagram cũ)
UPDATE public.platform_presets 
SET rules = 'Bài viết ngắn gọn, tập trung chủ yếu vào hình ảnh. Dùng nhiều emoji biểu cảm. Cuối bài phải có 5-10 hashtag liên quan đến chủ đề.'
WHERE platform = 'thread' AND user_id IS NULL;

-- Instagram: Độ dài 80-180 ký tự (lấy từ rules Facebook cũ)
UPDATE public.platform_presets 
SET rules = 'Bài viết cung cấp đầy đủ thông tin, có lời dẫn dắt, chia đoạn rõ ràng để dễ đọc. Kết thúc bằng lời kêu gọi hành động (Call to Action) và 3-5 hashtag.'
WHERE platform = 'instagram' AND user_id IS NULL;


-- 2. Cập nhật các bản ghi mặc định của người dùng đang sử dụng nội dung cũ để đồng bộ
UPDATE public.platform_presets
SET rules = 'Tối đa 500 từ. Hành văn mang tính trò chuyện, tranh luận mở. Hạn chế dùng quá nhiều hashtag.'
WHERE platform = 'facebook' AND user_id IS NOT NULL AND name = 'Mặc định' 
  AND (rules LIKE '%Bài viết cung cấp đầy đủ thông tin%' OR rules LIKE '%Tối ưu độ dài 80-180%');

UPDATE public.platform_presets
SET rules = 'Bài viết ngắn gọn, tập trung chủ yếu vào hình ảnh. Dùng nhiều emoji biểu cảm. Cuối bài phải có 5-10 hashtag liên quan đến chủ đề.'
WHERE platform = 'thread' AND user_id IS NOT NULL AND name = 'Mặc định'
  AND (rules LIKE '%Nội dung cực kỳ ngắn gọn%' OR rules LIKE '%giới hạn dưới 280 ký tự%');

UPDATE public.platform_presets
SET rules = 'Bài viết cung cấp đầy đủ thông tin, có lời dẫn dắt, chia đoạn rõ ràng để dễ đọc. Kết thúc bằng lời kêu gọi hành động (Call to Action) và 3-5 hashtag.'
WHERE platform = 'instagram' AND user_id IS NOT NULL AND name = 'Mặc định'
  AND (rules LIKE '%Bài viết ngắn gọn, tập trung chủ yếu vào hình ảnh%' OR rules LIKE '%emoji biểu cảm%');
