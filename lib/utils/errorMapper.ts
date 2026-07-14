/**
 * Chuyển đổi các thông báo lỗi kỹ thuật (API, Gemini, STT, Crawl, v.v.)
 * thành định dạng thân thiện với người dùng và hỗ trợ đa ngôn ngữ.
 */
export function mapErrorToHumanFriendly(
  err: any,
  t: (key: string, variables?: Record<string, string | number>) => string
): string {
  if (!err) return t('errors.unknownError', { message: '' });

  const errMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  const errMsgLower = errMsg.toLowerCase();

  // 1. Quota / Rate Limit (Gemini API hoặc các API khác)
  if (
    errMsgLower.includes('429') ||
    errMsgLower.includes('quota') ||
    errMsgLower.includes('rate limit') ||
    errMsgLower.includes('exhausted') ||
    errMsgLower.includes('limit exceeded')
  ) {
    return t('errors.quotaExceeded');
  }

  // 2. API Key Invalid / Auth
  if (
    errMsgLower.includes('api key not valid') ||
    errMsgLower.includes('api_key_invalid') ||
    errMsgLower.includes('invalid api key') ||
    errMsgLower.includes('key is invalid') ||
    errMsgLower.includes('api key is invalid') ||
    errMsgLower.includes('auth error') ||
    errMsgLower.includes('unauthorized')
  ) {
    return t('errors.apiKeyInvalid');
  }

  // 3. All backup keys failed in rotation pool
  if (
    (errMsgLower.includes('tất cả') && errMsgLower.includes('api key') && errMsgLower.includes('lỗi')) ||
    errMsgLower.includes('all backup api keys') ||
    errMsgLower.includes('all api keys failed') ||
    errMsgLower.includes('đều gặp lỗi')
  ) {
    return t('errors.allKeysFailed');
  }

  // 4. No API keys available
  if (
    errMsgLower.includes('không tìm thấy api key') ||
    errMsgLower.includes('no active keys') ||
    errMsgLower.includes('no active api keys') ||
    errMsgLower.includes('không có api key')
  ) {
    return t('errors.noKeysAvailable');
  }

  // 5. Invalid URL format
  if (errMsgLower.includes('invalid url format') || errMsgLower.includes('url format') || errMsgLower.includes('url parameter')) {
    return t('errors.invalidUrl');
  }

  // 6. Crawl / Scrape / Link input
  if (
    errMsgLower.includes('crawl') ||
    errMsgLower.includes('scrape') ||
    errMsgLower.includes('scrape failed') ||
    errMsgLower.includes('cào') ||
    errMsgLower.includes('gocnhinmoi') ||
    errMsgLower.includes('firecrawl')
  ) {
    return t('errors.crawlFailed');
  }

  // 6. STT / Voice transcription
  if (
    errMsgLower.includes('stt') ||
    errMsgLower.includes('transcribe') ||
    errMsgLower.includes('voice') ||
    errMsgLower.includes('giọng nói') ||
    errMsgLower.includes('speech') ||
    errMsgLower.includes('audio')
  ) {
    return t('errors.sttFailed');
  }

  // 7. Parse Document (PDF/DOCX)
  if (
    errMsgLower.includes('parse-doc') ||
    errMsgLower.includes('parse document') ||
    errMsgLower.includes('trích xuất tài liệu') ||
    errMsgLower.includes('pdf') ||
    errMsgLower.includes('docx') ||
    errMsgLower.includes('parse failed')
  ) {
    return t('errors.parseFailed');
  }

  // 8. Network Connection / Server unreachable
  if (
    errMsgLower.includes('failed to fetch') ||
    errMsgLower.includes('network error') ||
    errMsgLower.includes('connect') ||
    errMsgLower.includes('connection') ||
    errMsgLower.includes('internet')
  ) {
    return t('errors.networkError');
  }

  // Trả về lỗi thô sạch sẽ nếu không khớp nhóm nào
  return t('errors.unknownError', { message: errMsg });
}
