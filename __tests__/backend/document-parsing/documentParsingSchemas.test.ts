import { describe, expect, it } from 'vitest';
import {
  DocumentParsingError,
  parseDocumentInput,
} from '@/backend/modules/document-parsing';

describe('parseDocumentInput', () => {
  it('accepts PDF and DOCX extensions case-insensitively', () => {
    const pdf = new File(['pdf'], 'REPORT.PDF', { type: 'application/octet-stream' });
    const docx = new File(['docx'], 'brief.DocX', { type: 'application/octet-stream' });

    expect(parseDocumentInput({ file: pdf })).toEqual({ file: pdf, format: 'pdf' });
    expect(parseDocumentInput({ file: docx })).toEqual({ file: docx, format: 'docx' });
  });

  it.each([null, 'text', { name: 'report.pdf' }])(
    'rejects a missing or non-file value: %s',
    (file) => {
      expect(() => parseDocumentInput({ file })).toThrow(DocumentParsingError);
      expect(() => parseDocumentInput({ file })).toThrowError(
        expect.objectContaining({ code: 'INVALID_FILE', status: 400 })
      );
    }
  );

  it('rejects an empty file', () => {
    const file = new File([], 'report.pdf', { type: 'application/pdf' });
    expect(() => parseDocumentInput({ file })).toThrowError(
      expect.objectContaining({ code: 'EMPTY_FILE', status: 400 })
    );
  });

  it.each(['legacy.doc', 'notes.txt', 'document'])('rejects unsupported extension %s', (name) => {
    const file = new File(['content'], name, { type: 'application/pdf' });
    expect(() => parseDocumentInput({ file })).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_FORMAT', status: 400 })
    );
  });

  it('does not accept a format based on MIME type alone', () => {
    const file = new File(['content'], 'report.txt', { type: 'application/pdf' });
    expect(() => parseDocumentInput({ file })).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_FORMAT' })
    );
  });
});
