import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildDocumentParsingModule,
  DOCUMENT_PARSING_ROLES,
  documentParsingErrorResponse,
  invalidMultipartResponse,
  toDocumentParsingResponse,
} from './_adapter';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole([...DOCUMENT_PARSING_ROLES]);
  if (unauthorized) return unauthorized;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidMultipartResponse();
  }

  try {
    const result = await buildDocumentParsingModule().parse({
      file: formData.get('file'),
    });
    return NextResponse.json(toDocumentParsingResponse(result));
  } catch (error) {
    return documentParsingErrorResponse(error);
  }
}
