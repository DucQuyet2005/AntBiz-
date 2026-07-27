import { DocumentParsingError } from './document-parsing-errors';
import type { DocumentTextExtractor } from './document-parsing-types';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
];

const PDF_EXTRACTION_PROMPT = 'Nhiệm vụ của bạn là trích xuất toàn bộ văn bản từ tài liệu PDF này một cách chính xác nhất có thể. Giữ nguyên cấu trúc xuống dòng và trật tự nội dung của tài liệu. KHÔNG tóm tắt, KHÔNG thêm bớt từ ngữ, KHÔNG thêm lời giải thích hay bất kỳ lời dẫn nào. Chỉ trả về nội dung văn bản trích xuất được.';

type ValueProvider = () => string | undefined;

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export class GeminiPdfExtractor implements DocumentTextExtractor {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly apiKeyProvider: ValueProvider = () => process.env.GEMINI_API_KEY,
    private readonly modelProvider: ValueProvider = () => process.env.GEMINI_MODEL
  ) {}

  async extract(bytes: Uint8Array): Promise<string> {
    const apiKey = this.apiKeyProvider()?.trim();
    if (!apiKey) {
      throw new DocumentParsingError(
        'PARSING_NOT_CONFIGURED',
        500,
        'Chưa thể xử lý file PDF lúc này'
      );
    }

    const models = buildGeminiModelFallback(this.modelProvider());
    let lastContext: Record<string, unknown> = { extractor: 'pdf' };

    for (const model of models) {
      let response: Response;
      try {
        response = await this.fetchImplementation(
          `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildRequestBody(bytes)),
          }
        );
      } catch (cause) {
        throw parsingFailed({ extractor: 'pdf', model }, sanitizeNetworkCause(cause));
      }

      if (response.ok) {
        try {
          const data = await response.json() as GeminiGenerateResponse;
          return data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join('') ?? '';
        } catch (cause) {
          throw parsingFailed(
            { extractor: 'pdf', model, providerStatus: response.status },
            sanitizeNetworkCause(cause)
          );
        }
      }

      const responseText = await safeResponseText(response);
      lastContext = { extractor: 'pdf', model, providerStatus: response.status };
      if (isRetryableQuotaFailure(response.status, responseText)) continue;
      throw parsingFailed(lastContext);
    }

    throw parsingFailed(lastContext);
  }
}

export function buildGeminiModelFallback(configuredModel?: string) {
  const primaryModel = configuredModel?.trim() || DEFAULT_GEMINI_MODEL;
  return [primaryModel, ...FALLBACK_MODELS]
    .filter((model, index, models) => models.indexOf(model) === index);
}

function buildRequestBody(bytes: Uint8Array) {
  return {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: Buffer.from(bytes).toString('base64'),
          },
        },
        { text: PDF_EXTRACTION_PROMPT },
      ],
    }],
    generationConfig: { temperature: 0.1 },
  };
}

function isRetryableQuotaFailure(status: number, responseText: string) {
  return status === 429 || /quota/i.test(responseText);
}

async function safeResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function parsingFailed(context: Record<string, unknown>, cause?: unknown) {
  return new DocumentParsingError(
    'PARSING_FAILED',
    500,
    'Không thể xử lý file PDF lúc này',
    { cause, context }
  );
}

function sanitizeNetworkCause(cause: unknown) {
  return cause instanceof Error ? new Error(cause.name) : new Error('Provider request failed');
}
