import { SpeechProcessingError } from './speech-processing-errors';
import type {
  SpeechProcessingInput,
  ValidatedSpeechProcessingInput,
} from './speech-processing-types';

export const MAX_SPEECH_FILE_BYTES = 25 * 1024 * 1024;

const SUPPORTED_MEDIA_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function parseSpeechProcessingInput(
  input: SpeechProcessingInput
): ValidatedSpeechProcessingInput {
  const bullets = typeof input.bullets === 'string' ? input.bullets.trim() : '';
  const file = parseFile(input.file);

  if (!file && !bullets) {
    throw new SpeechProcessingError(
      'INVALID_INPUT',
      400,
      'Vui lòng upload file âm thanh/video hoặc nhập nội dung ý chính'
    );
  }

  if (file) validateFile(file);
  return { file, bullets };
}
function parseFile(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (!isFile(value)) {
    throw new SpeechProcessingError(
      'UNSUPPORTED_MEDIA_TYPE',
      400,
      'Tệp tải lên không phải file âm thanh hoặc video hợp lệ'
    );
  }
  return value.size > 0 ? value : undefined;
}

function validateFile(file: File) {
  const mediaType = normalizeMediaType(file.type);
  if (!SUPPORTED_MEDIA_TYPES.has(mediaType)) {
    throw new SpeechProcessingError(
      'UNSUPPORTED_MEDIA_TYPE',
      400,
      `Định dạng file không hỗ trợ: ${mediaType || 'không xác định'}. Dùng MP3, MP4, M4A, WAV, OGG hoặc WebM.`
    );
  }

  if (file.size > MAX_SPEECH_FILE_BYTES) {
    const fileSizeMb = file.size / (1024 * 1024);
    throw new SpeechProcessingError(
      'FILE_TOO_LARGE',
      400,
      `File quá lớn (${fileSizeMb.toFixed(1)}MB). Tối đa 25MB.`
    );
  }
}

function normalizeMediaType(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase();
}

function isFile(value: unknown): value is File {
  return typeof value === 'object'
    && value !== null
    && typeof (value as File).name === 'string'
    && typeof (value as File).type === 'string'
    && typeof (value as File).size === 'number'
    && typeof (value as File).arrayBuffer === 'function';
}
