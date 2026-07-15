import { describe, expect, it, vi } from 'vitest';
import {
  MammothDocxExtractor,
  type DocumentParsingLogger,
} from '@/backend/modules/document-parsing';

describe('MammothDocxExtractor', () => {
  it('passes a Buffer to Mammoth and returns raw text', async () => {
    const extractRawText = vi.fn().mockResolvedValue({ value: 'Raw text', messages: [] });
    const extractor = new MammothDocxExtractor(extractRawText);
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(extractor.extract(bytes)).resolves.toBe('Raw text');
    expect(extractRawText).toHaveBeenCalledWith({ buffer: Buffer.from(bytes) });
  });

  it('logs only the Mammoth message count', async () => {
    const extractRawText = vi.fn().mockResolvedValue({
      value: 'Raw text',
      messages: [{ type: 'warning', message: 'sensitive document detail' }],
    });
    const logger: DocumentParsingLogger = { warn: vi.fn() };
    const extractor = new MammothDocxExtractor(extractRawText, logger);

    await extractor.extract(new Uint8Array([1]));
    expect(logger.warn).toHaveBeenCalledWith('docx-diagnostics', { messageCount: 1 });
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain('sensitive document detail');
  });

  it('sanitizes Mammoth failures', async () => {
    const extractRawText = vi.fn().mockRejectedValue(new Error('secret filename and contents'));
    const extractor = new MammothDocxExtractor(extractRawText);

    try {
      await extractor.extract(new Uint8Array([1]));
      throw new Error('Expected extraction to fail');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'PARSING_FAILED',
        status: 500,
        context: { extractor: 'docx' },
      });
      expect(JSON.stringify(error)).not.toContain('secret filename');
    }
  });
});
