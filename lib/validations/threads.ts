export interface ThreadsValidationResult {
  isValid: boolean;
  length: number;
  hasQuestion: boolean;
}

/**
 * Kiểm tra độ dài bài đăng Threads (< 280 ký tự) và phát hiện câu hỏi thảo luận ở cuối bài.
 */
export function validateThreadsLength(content: string): ThreadsValidationResult {
  const trimmed = content.trim();
  const length = trimmed.length;
  
  // Kiểm tra độ dài phải dưới 280 ký tự
  const isValid = length < 280;

  // Phát hiện câu hỏi thảo luận cuối bài:
  // Tìm dấu chấm hỏi ? hoặc ？ mà sau đó không chứa bất kỳ dấu kết thúc câu nào (. ! ? hoặc phiên bản fullwidth)
  const hasQuestion = /[?？][^.!?！？]*$/.test(trimmed);

  return {
    isValid,
    length,
    hasQuestion,
  };
}
