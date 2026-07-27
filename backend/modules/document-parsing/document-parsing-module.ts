import { DocumentParsingError } from './document-parsing-errors';
import { parseDocumentInput } from './document-parsing-schemas';
import type {
  DocumentParsingInput,
  DocumentParsingModuleInterface,
  DocumentParsingResult,
  DocumentTextExtractor,
} from './document-parsing-types';

export class DocumentParsingModule implements DocumentParsingModuleInterface {
  constructor(
    private readonly docxExtractor: DocumentTextExtractor,
    private readonly pdfExtractor: DocumentTextExtractor
  ) {}

  async parse(input: DocumentParsingInput): Promise<DocumentParsingResult> {
    const { file, format } = parseDocumentInput(input);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extractor = format === 'docx' ? this.docxExtractor : this.pdfExtractor;
    const text = (await extractor.extract(bytes)).trim();

    if (!text) {
      throw new DocumentParsingError(
        'EMPTY_DOCUMENT',
        422,
        'Không thể trích xuất văn bản từ tài liệu này hoặc tài liệu trống'
      );
    }

    return { text };
  }
}
