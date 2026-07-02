export const TONE_DESCRIPTIONS: Record<string, string> = {
  'Chuyên nghiệp': 'Sử dụng đại từ nhân xưng trang trọng, ngôn từ chuẩn mực, cấu trúc câu gãy gọn. Tập trung vào logic khách quan, dẫn chứng số liệu thực tế và phong thái chuyên gia.',
  'Hài hước': 'Sử dụng lối ví von hóm hỉnh, các câu đùa nhẹ nhàng, duyên dáng và bắt trend khéo léo. Tạo vibe vui vẻ, gần gũi, giúp người đọc cảm thấy thoải mái và thích thú.',
  'Đồng cảm': 'Đặt mình vào góc nhìn của người đọc. Sử dụng giọng văn ấm áp, chân thành, chia sẻ những khó khăn thực tế và xoa dịu nỗi đau của họ.',
  'GenZ': 'Viết một cách năng động, phá cách, sử dụng các từ lóng phổ biến trên mạng xã hội hiện nay (ví dụ: cưng xỉu, hướng nội, flex,...), kết hợp nhiều emoji hợp thời và vui nhộn.',
  'Học thuật': 'Giọng văn mang tính phân tích sâu, khách quan, sử dụng thuật ngữ chuyên ngành chuẩn xác. Lập luận đa chiều và có độ tin cậy khoa học cao.',
  'Trẻ trung': 'Giọng văn cởi mở, năng động, tràn đầy năng lượng tích cực. Sử dụng các câu ngắn, từ ngữ hiện đại, gần gũi với giới trẻ và dân văn phòng.',
  'Thuyết phục': 'Lập luận sắc sảo, đánh trúng tâm lý người đọc. Tập trung nhấn mạnh lợi ích vượt trội, giải quyết triệt để các nghi ngại và có lời kêu gọi hành động (CTA) mạnh mẽ.'
};

export const LENGTH_DESCRIPTIONS: Record<string, string> = {
  'Ngắn': 'Bài viết tối giản, cô đọng, giới hạn dưới 150 từ. Tập trung trực diện vào thông điệp cốt lõi, ưu tiên sử dụng danh sách liệt kê dạng gạch đầu dòng.',
  'Vừa': 'Độ dài tiêu chuẩn từ 200 - 450 từ. Triển khai đầy đủ ý chính, phân tích đủ sâu nhưng không được dài dòng, lan man.',
  'Dài': 'Bài bài viết phân tích sâu từ 500 - 1000 từ. Cho phép kể chuyện (storytelling) chi tiết, phân tích đa chiều và đưa ra nhiều dẫn chứng cụ thể.'
};

export function getRichStyleContent(tone?: string, length?: string, customRules?: string): string {
  const toneVal = tone || '';
  const lengthVal = length || '';
  
  const toneDetail = TONE_DESCRIPTIONS[toneVal] || toneVal || 'Tự do';
  const lengthDetail = LENGTH_DESCRIPTIONS[lengthVal] || lengthVal || 'Tự do';

  return `- Giọng văn chủ đạo: ${toneDetail}
- Độ dài yêu cầu: ${lengthDetail}
- Quy tắc bổ sung: ${customRules || 'Không có'}`;
}
