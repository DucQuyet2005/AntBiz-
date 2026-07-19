import type { ArticleRecord } from './caption-generation-types';

export function buildCaptionPrompt(input: {
  article: ArticleRecord;
  platform?: string;
  platformRules: string | null;
  instruction: string;
  styleContent: string;
}) {
  const platformLabel = (input.platform || '').charAt(0).toUpperCase()
    + (input.platform || '').slice(1);
  const title = String(input.article.title || '');
  const truncatedTitle = title.length > 300 ? `${title.slice(0, 300)}...` : title;
  const fullText = String(input.article.full_text || input.article.description || '');
  const truncatedContent = fullText.length > 3000
    ? `${fullText.slice(0, 3000)}... (Nội dung rút gọn)`
    : fullText;
  const customSection = input.instruction.trim()
    ? `\n**Hướng dẫn bổ sung:**\n*   ${input.instruction.trim()}\n`
    : '';
  const styleSection = input.styleContent
    ? `\n${input.styleContent}\n`
    : '*   Tone giọng yêu cầu: Tự do\n';
  const presetSection = input.platformRules === null
    ? ''
    : `\n**Hướng dẫn khai thác nội dung:**\n*   ${input.platformRules || `(Chưa chọn quy chuẩn ${platformLabel})`}\n`;

  return `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platformLabel} post) dựa trên thông tin sau:

**Nền tảng:** ${platformLabel}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${truncatedTitle || '(Chưa có tiêu đề)'}"
*   **Nội dung tóm tắt:** "${truncatedContent || '(Chưa có nội dung)'}"
${presetSection}${customSection}**Văn phong:**
${styleSection}**Cấu trúc bài viết:**
1.  Hook (Móc câu): Tạo điểm nhấn gây tò mò từ đoạn tóm tắt bài báo.
2.  Body (Nội dung chính): Phát triển câu chuyện ngắn gọn, súc tích.
3.  Call to Action (CTA): Gợi mở tương tác, đặt câu hỏi cho độc giả.
4.  Hashtag: Đề xuất 3-5 hashtag liên quan.
TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Dưới đây là...", không "Ok", không "Đây là bài viết". Trả về TRỰC TIẾP bài đăng hoàn chỉnh.`;
}
