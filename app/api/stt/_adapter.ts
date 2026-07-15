import { NextResponse } from 'next/server';
import {
  createSpeechProcessingModule,
  SpeechProcessingError,
  type SpeechProcessingResult,
} from '@/backend/modules/speech-processing';

export const SPEECH_PROCESSING_ROLES = [
  'admin',
  'marketer_full',
  'marketer_content',
] as const;

export function buildSpeechProcessingModule() {
  return createSpeechProcessingModule();
}
export function speechProcessingErrorResponse(error: unknown) {
  if (error instanceof SpeechProcessingError) {
    if (error.status >= 500) {
      console.error('[POST /api/stt] operation failed', {
        code: error.code,
        status: error.status,
        ...error.context,
      });
    }
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }

  console.error('[POST /api/stt] unexpected failure');
  return NextResponse.json(
    { error: 'Lỗi hệ thống khi xử lý giọng nói' },
    { status: 500 }
  );
}

export function invalidMultipartResponse() {
  return speechProcessingErrorResponse(new SpeechProcessingError(
    'INVALID_MULTIPART',
    400,
    'Request phải là multipart/form-data'
  ));
}

export function toSpeechProcessingResponse(result: SpeechProcessingResult) {
  return {
    transcript: result.transcript,
    rewritten_post: result.rewrittenPost,
    generated_title: result.metadata.title,
    generated_category: result.metadata.category,
    generated_tags: result.metadata.tags,
  };
}
