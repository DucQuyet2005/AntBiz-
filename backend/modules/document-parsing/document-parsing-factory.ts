import { DocumentParsingModule } from './document-parsing-module';
import { GeminiPdfExtractor } from './gemini-pdf-extractor';
import { MammothDocxExtractor } from './mammoth-docx-extractor';

export function createDocumentParsingModule() {
  return new DocumentParsingModule(
    new MammothDocxExtractor(),
    new GeminiPdfExtractor()
  );
}
