-- Up
-- Cập nhật Quy chuẩn nền tảng Facebook
UPDATE platform_presets
SET rules = 'Phát triển câu chuyện chi tiết, phân tích sâu sắc các khía cạnh. Cấu trúc rõ ràng: Hook -> Body -> CTA -> 3-5 hashtag. LƯU Ý ĐỘ DÀI: Khoảng 400 - 500 từ (Nếu có Yêu cầu bổ sung quy định số từ cụ thể, hãy BẮT BUỘC tuân thủ theo Yêu cầu bổ sung).'
WHERE platform = 'facebook' 
  AND (rules LIKE '%Bài viết cung cấp đầy đủ thông tin%' OR rules LIKE '%Tối ưu độ dài%');

-- Cập nhật Quy chuẩn nền tảng Instagram
UPDATE platform_presets
SET rules = 'Phát triển câu chuyện súc tích, hình ảnh hóa hoặc cảm xúc hóa nội dung. Cấu trúc: Hook -> Body -> CTA -> 5-10 hashtag. LƯU Ý ĐỘ DÀI: Ngắn gọn, khoảng 100 từ (Nếu có Yêu cầu bổ sung quy định số từ cụ thể, hãy BẮT BUỘC tuân thủ, nhưng TUYỆT ĐỐI KHÔNG vượt quá 2200 ký tự).'
WHERE platform = 'instagram'
  AND (rules LIKE '%Caption ngắn gọn, tập trung vào hình ảnh%' OR rules LIKE '%Bài viết cung cấp đầy đủ thông tin%');

-- Cập nhật Quy chuẩn nền tảng Threads
UPDATE platform_presets
SET rules = 'Đưa ra quan điểm nhanh, đi thẳng vào vấn đề. Hành văn mang tính trò chuyện, tranh luận mở. Hạn chế dùng hashtag. LƯU Ý ĐỘ DÀI: Khoảng 30 từ, tối đa 2 câu (Nếu có Yêu cầu bổ sung quy định số từ cụ thể, hãy BẮT BUỘC tuân thủ, nhưng TUYỆT ĐỐI KHÔNG vượt quá 500 ký tự).'
WHERE platform = 'thread'
  AND (rules LIKE '%Caption ngắn gọn%' OR rules LIKE '%Nội dung cực kỳ ngắn gọn%');

-- Down
-- (Not implemented for data updates)
