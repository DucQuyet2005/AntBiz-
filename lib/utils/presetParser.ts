export function getDefaultTemplateForPlatform(platform: string): string {
  switch (platform) {
    case 'facebook':
      return `- **Bố cục & Độ dài:** Độ dài từ 150-300 từ. Chia nội dung thành 2-3 đoạn ngắn dễ đọc (mỗi đoạn không quá 3 câu). Có tiêu đề thu hút người đọc (in hoa hoặc viết kèm emoji). Sử dụng các gạch đầu dòng để liệt kê thông tin rõ ràng.\n- **Đường dẫn & Hashtags:** Chèn link URL trực tiếp ở cuối bài viết. Sử dụng 3-5 hashtag liên quan ở cuối cùng, bao gồm hashtag thương hiệu và chủ đề bài viết.\n- **Kêu gọi hành động (CTA):** Đặt một câu hỏi mở ở cuối để kích thích thảo luận, mời mọi người bình luận chia sẻ ý kiến hoặc tag bạn bè cùng đọc.`;
    case 'instagram':
      return `- **Bố cục & Độ dài:** Ngắn gọn từ 80-150 từ. Dòng đầu tiên (Hook) phải cực kỳ hấp dẫn để kích thích người dùng bấm "xem thêm". Phân tách các đoạn bằng dòng trống rõ ràng để giao diện trực quan.\n- **Đường dẫn & Hashtags:** Tuyệt đối không chèn link URL trực tiếp vào caption. Hãy dùng câu điều hướng: "Chi tiết xem tại link ở phần Bio nhé!". Chèn từ 5-15 hashtag ngách liên quan ở cuối bài viết.\n- **Kêu gọi hành động (CTA):** Kêu gọi lưu lại bài viết (Save) để xem sau, chia sẻ lên tin (story), hoặc bình luận một từ khóa cụ thể để nhận tài liệu qua tin nhắn (DM).`;
    case 'thread':
    case 'threads':
      return `- **Bố cục & Độ dài:** Độ dài ngắn gọn dưới 280 ký tự. Viết theo giọng văn chia sẻ cá nhân, tự sự tự nhiên. Không dùng tiêu đề in hoa, không dùng các ký hiệu gạch đầu dòng trang trọng.\n- **Đường dẫn & Hashtags:** Chèn link URL trực tiếp vào bài viết. Hạn chế sử dụng hashtag (chỉ dùng tối đa 1 hashtag chủ đề nếu thực sự cần thiết).\n- **Kêu gọi hành động (CTA):** Kết thúc bằng một câu hỏi gợi mở, mang tính thảo luận cao để khuyến khích mọi người phản hồi (reply) chia sẻ quan điểm cá nhân.`;
    default:
      return '';
  }
}
