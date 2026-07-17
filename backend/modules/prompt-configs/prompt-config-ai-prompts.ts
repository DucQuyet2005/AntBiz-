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

export const GENERATE_QUESTIONS_SYSTEM_INSTRUCTION =
  'Bạn là chuyên gia thiết kế thương hiệu (Brand Strategist). Nhiệm vụ của bạn là sinh ra một bộ câu hỏi trắc nghiệm dưới định dạng JSON hợp lệ để khám phá định vị và văn phong thương hiệu của người dùng. CHÚ Ý QUAN TRỌNG: Tất cả các dấu ngoặc kép nằm trong văn bản câu hỏi hoặc phương án trả lời phải được viết bằng dấu ngoặc đơn (\') hoặc escape bằng dấu gạch chéo ngược (\\") để đảm bảo chuỗi JSON luôn hợp lệ và không bị lỗi cú pháp khi parse.';


export function buildGenerateQuestionsInstruction(objectives: string[], historySummary?: string) {
  let instruction = `Mục tiêu cốt lõi của thương hiệu là: ${objectives.map(o => `"${o}"`).join(', ')}.\n`;
  if (historySummary && historySummary.trim().length > 0) {
    instruction += `\nLịch sử các câu trả lời ưa thích của người dùng: \n${historySummary}\n\n`;
  }
  
  instruction += `Hãy đề xuất từ 3 đến 6 câu hỏi (tùy thuộc vào độ phức tạp của mục tiêu) để thiết lập Văn phong thương hiệu.
Với mỗi câu hỏi, cung cấp 4 phương án trả lời (options) có ý nghĩa thiết thực để định hình văn phong.
${historySummary ? 'Ưu tiên đưa các câu trả lời ưa thích trong lịch sử lên vị trí đầu tiên của options nếu nó phù hợp với ngữ cảnh câu hỏi.' : ''}

Định dạng đầu ra BẮT BUỘC là JSON theo cấu trúc sau:
{
  "steps": [
    {
      "key": "persona",
      "label": "Vai trò thương hiệu",
      "question": "Danh xưng thương hiệu đóng vai trò gì khi viết bài?",
      "options": ["Người bán hàng năng động", "Chuyên gia tư vấn", "Người bạn đồng hành", "Nhà sáng lập truyền cảm hứng"]
    }
  ]
}
Lưu ý: 
- Trường "key" là một từ định danh tiếng Anh, ví dụ: "persona", "pronoun", "tone", "emoji", "hashtag", "cta".
- Trường "label" là một nhãn tiếng Việt ngắn gọn, trực diện đại diện cho thuộc tính/khía cạnh của câu hỏi đó (ví dụ: "Vai trò thương hiệu", "Sắc thái cảm xúc", "Ngôn từ ưu tiên", "Thúc đẩy hành động (CTA)", "Quy tắc Emoji").
Chỉ trả về JSON hợp lệ, không giải thích gì thêm.`;
  return instruction;
}
