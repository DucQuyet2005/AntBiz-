import { SpeechProcessingError } from './speech-processing-errors';
import type { SpeechTranscriber } from './speech-processing-types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_STT_MODEL = 'whisper-large-v3';

type ApiKeyProvider = () => string | undefined;

export class GroqWhisperAdapter implements SpeechTranscriber {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly apiKeyProvider: ApiKeyProvider = () => process.env.GROQ_API_KEY
  ) {}

  async transcribe(file: File): Promise<string> {
    const apiKey = this.apiKeyProvider()?.trim();
    if (!apiKey) {
      throw new SpeechProcessingError(
        'TRANSCRIPTION_NOT_CONFIGURED',
        500,
        'Chưa thể xử lý tệp âm thanh lúc này'
      );
    }

    const body = new FormData();
    body.append('file', file);
    body.append('model', GROQ_STT_MODEL);
    body.append('language', 'vi');
    body.append('response_format', 'text');
    body.append('prompt', 'Chào bạn, đây là bản ghi âm giọng nói tiếng Việt tự nhiên nói về ý tưởng kinh doanh, tin tức xã hội, marketing, hoặc công nghệ. Hãy chuyển đổi âm thanh này thành văn bản tiếng Việt chính xác từng từ, viết hoa đúng chuẩn, tự động ngắt câu bằng dấu chấm, dấu phẩy phù hợp, và sửa các lỗi chính tả cơ bản.');

    let response: Response;
    try {
      response = await this.fetchImplementation(GROQ_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      });
    } catch (cause) {
      throw new SpeechProcessingError(
        'TRANSCRIPTION_FAILED',
        500,
        'Không thể xử lý tệp âm thanh lúc này',
        { cause: sanitizeNetworkCause(cause) }
      );
    }

    if (!response.ok) {
      throw new SpeechProcessingError(
        'TRANSCRIPTION_FAILED',
        500,
        'Không thể xử lý tệp âm thanh lúc này',
        { context: { providerStatus: response.status } }
      );
    }

    return (await response.text()).trim();
  }
}
function sanitizeNetworkCause(cause: unknown) {
  return cause instanceof Error ? new Error(cause.name) : new Error('Network request failed');
}
