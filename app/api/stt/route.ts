import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildSpeechProcessingModule,
  invalidMultipartResponse,
  SPEECH_PROCESSING_ROLES,
  speechProcessingErrorResponse,
  toSpeechProcessingResponse,
} from './_adapter';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireUserWithRole([...SPEECH_PROCESSING_ROLES]);
  if (unauthorized) return unauthorized;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidMultipartResponse();
  }

  try {
    const result = await buildSpeechProcessingModule().process({
      file: formData.get('file'),
      bullets: formData.get('bullets'),
    });
    return NextResponse.json(toSpeechProcessingResponse(result));
  } catch (error) {
    return speechProcessingErrorResponse(error);
  }
}
