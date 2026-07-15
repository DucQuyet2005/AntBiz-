import mammoth from 'mammoth';
import { DocumentParsingError } from './document-parsing-errors';
import type {
  DocumentParsingLogger,
  DocumentTextExtractor,
} from './document-parsing-types';

type MammothResult = Awaited<ReturnType<typeof mammoth.extractRawText>>;
type ExtractRawText = (input: { buffer: Buffer }) => Promise<MammothResult>;

const defaultLogger: DocumentParsingLogger = {
  warn(operation, context) {
    console.warn(`[Document Parsing] ${operation}`, context);
  },
};

export class MammothDocxExtractor implements DocumentTextExtractor {
  constructor(
    private readonly extractRawText: ExtractRawText = mammoth.extractRawText,
    private readonly logger: DocumentParsingLogger = defaultLogger
  ) {}

  async extract(bytes: Uint8Array): Promise<string> {
    try {
      const result = await this.extractRawText({ buffer: Buffer.from(bytes) });
      if (result.messages.length > 0) {
        this.logger.warn('docx-diagnostics', { messageCount: result.messages.length });
      }
      return result.value ?? '';
    } catch (cause) {
      throw new DocumentParsingError(
        'PARSING_FAILED',
        500,
        'Không thể xử lý tài liệu lúc này',
        { cause: sanitizeCause(cause), context: { extractor: 'docx' } }
      );
    }
  }
}

function sanitizeCause(cause: unknown) {
  return cause instanceof Error ? new Error(cause.name) : new Error('DOCX extraction failed');
}
