import { describe, expect, it, vi } from 'vitest';
import {
  DocumentParsingModule,
  type DocumentTextExtractor,
} from '@/backend/modules/document-parsing';

function setup() {
  const docxExtractor: DocumentTextExtractor = { extract: vi.fn().mockResolvedValue('DOCX text') };
  const pdfExtractor: DocumentTextExtractor = { extract: vi.fn().mockResolvedValue('PDF text') };
  return {
    module: new DocumentParsingModule(docxExtractor, pdfExtractor),
    docxExtractor,
    pdfExtractor,
  };
}

describe('DocumentParsingModule', () => {
  it('dispatches DOCX bytes only to the DOCX extractor', async () => {
    const { module, docxExtractor, pdfExtractor } = setup();
    const file = new File(['docx-bytes'], 'brief.docx');
    const arrayBufferSpy = vi.spyOn(file, 'arrayBuffer');

    await expect(module.parse({ file })).resolves.toEqual({ text: 'DOCX text' });
    expect(arrayBufferSpy).toHaveBeenCalledOnce();
    expect(docxExtractor.extract).toHaveBeenCalledWith(
      new Uint8Array(Buffer.from('docx-bytes'))
    );
    expect(pdfExtractor.extract).not.toHaveBeenCalled();
  });

  it('dispatches PDF bytes only to the PDF extractor', async () => {
    const { module, docxExtractor, pdfExtractor } = setup();
    const file = new File(['pdf-bytes'], 'report.pdf');

    await expect(module.parse({ file })).resolves.toEqual({ text: 'PDF text' });
    expect(pdfExtractor.extract).toHaveBeenCalledOnce();
    expect(docxExtractor.extract).not.toHaveBeenCalled();
  });

  it('trims extracted text', async () => {
    const { module, pdfExtractor } = setup();
    vi.mocked(pdfExtractor.extract).mockResolvedValue('  Extracted text\n');
    const file = new File(['pdf'], 'report.pdf');

    await expect(module.parse({ file })).resolves.toEqual({ text: 'Extracted text' });
  });

  it('rejects a document without meaningful text', async () => {
    const { module, pdfExtractor } = setup();
    vi.mocked(pdfExtractor.extract).mockResolvedValue('   ');
    const file = new File(['pdf'], 'report.pdf');

    await expect(module.parse({ file })).rejects.toMatchObject({
      code: 'EMPTY_DOCUMENT',
      status: 422,
    });
  });
});
