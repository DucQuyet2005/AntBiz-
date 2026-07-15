import type {
  AnalyzeArticleConfigInput,
  WizardPromptInput,
} from './prompt-config-ai-schemas';

export const ANALYZE_SYSTEM_INSTRUCTION =
  'Bạn là chuyên gia AI phân tích nội dung báo chí. Hãy đề xuất các tham số cấu hình viết bài tối ưu dưới định dạng JSON.';

export const WIZARD_SYSTEM_INSTRUCTION =
  "Bạn là một chuyên gia Prompt Engineering. Bạn CHỈ trả về nội dung prompt được yêu cầu. TUYỆT ĐỐI KHÔNG có lời chào, không giải thích, không 'Ok', không 'Đây là prompt'. Chỉ trả về duy nhất nội dung prompt.";

export function buildAnalyzeInstruction(input: AnalyzeArticleConfigInput) {
  return `Dựa trên tiêu đề bài báo và nội dung tóm tắt dưới đây, hãy đề xuất cấu hình viết bài đăng mạng xã hội.

**Dữ liệu bài viết:**
- Tiêu đề: "${input.title}"
- Tóm tắt nội dung: "${input.content}"

**Yêu cầu đề xuất:**
1. "tone": Chọn duy nhất 1 trong các văn phong sau: "Chuyên nghiệp", "Thân thiện", "Hài hước", "Sắc sảo", "Storytelling", "Trang trọng", "Đơn giản".
2. "length": Chọn duy nhất 1 trong các độ dài sau: "Ngắn (dưới 200 từ)", "Vừa (200-500 từ)", "Dài (trên 500 từ)".
3. "emphasis": Trích xuất khía cạnh đắt giá/quan trọng nhất của bài viết để làm điểm nhấn chính (dưới 15 từ).

Hãy trả về chuỗi JSON hợp lệ theo cấu trúc sau:
{
  "tone": "Văn phong được chọn",
  "length": "Độ dài được chọn",
  "emphasis": "Nội dung nhấn mạnh đề xuất"
}`;
}

export function buildWizardInstruction(input: WizardPromptInput) {
  return `Bạn là một chuyên gia Prompt Engineering.
Hãy viết một Prompt (câu lệnh) chi tiết để yêu cầu một AI khác viết bài đăng mạng xã hội.

Dữ liệu đầu vào:
- Nền tảng mục tiêu: ${input.platform}
- Văn phong mong muốn (Tone): ${input.tone}
- Độ dài yêu cầu: ${input.length}
- Khía cạnh cần nhấn mạnh (Emphasis): ${input.emphasis}
- Số lượng biến thể sinh ra: ${input.variantCount}

Yêu cầu đối với Prompt bạn tạo ra:
1. Prompt phải quy định rõ AI đóng vai trò là một chuyên gia Content Marketer viết bài đăng mạng xã hội cho nền tảng ${input.platform}.
2. Prompt phải quy định cấu trúc bài viết (Hook giật gân, Body triển khai chi tiết, CTA rõ ràng thúc đẩy hành động, Hashtag xu hướng).
3. Prompt phải quy định rõ văn phong bài viết là "${input.tone}", độ dài bài viết là "${input.length}", và phải tập trung làm nổi bật khía cạnh: "${input.emphasis}".
4. Prompt phải hướng dẫn AI cách đọc tiêu đề bài viết từ placeholder [Tiêu đề] và nội dung tóm tắt từ placeholder [Nội dung bài viết] để phân tích và viết bài.
5. Prompt được tạo ra phải có chỉ dẫn nghiêm ngặt yêu cầu AI viết bài: "TUYỆT ĐỐI KHÔNG có lời dẫn giải, không 'Ok', không 'Đây là bài viết'. Trả về TRỰC TIẾP bài đăng hoàn chỉnh."
6. TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Chào bạn", không "Ok", không "Đây là prompt", không có bất kỳ ký tự nào ngoài nội dung prompt. Trả về TRỰC TIẾP nội dung prompt.`;
}
