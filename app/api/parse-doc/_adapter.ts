import { NextResponse } from 'next/server';
import {
  createDocumentParsingModule,
  DocumentParsingError,
  type DocumentParsingResult,
} from '@/backend/modules/document-parsing';

export const DOCUMENT_PARSING_ROLES = [
  'admin',
  'marketer_full',
  'marketer_content',
] as const;

export function buildDocumentParsingModule() {
  return createDocumentParsingModule();
}

export function documentParsingErrorResponse(error: unknown) {
  if (error instanceof DocumentParsingError) {
    if (error.status >= 500) {
      console.error('[POST /api/parse-doc] operation failed', {
        code: error.code,
        status: error.status,
        ...error.context,
      });
    }
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }

  console.error('[POST /api/parse-doc] unexpected failure');
  return NextResponse.json(
    { error: 'Lỗi hệ thống khi trích xuất tài liệu' },
    { status: 500 }
  );
}

export function invalidMultipartResponse() {
  return documentParsingErrorResponse(new DocumentParsingError(
    'INVALID_MULTIPART',
    400,
    'Request phải là multipart/form-data'
  ));
}

export function toDocumentParsingResponse(result: DocumentParsingResult) {
  return { text: result.text };
}
