import { describe, expect, it } from 'vitest';
import {
  MAX_SPEECH_FILE_BYTES,
  parseSpeechProcessingInput,
  SpeechProcessingError,
} from '@/backend/modules/speech-processing';

describe('parseSpeechProcessingInput', () => {
  it('requires a usable file or bullets', () => {
    expect(() => parseSpeechProcessingInput({ file: null, bullets: '   ' }))
      .toThrow(expect.objectContaining({ code: 'INVALID_INPUT', status: 400 }));
  });

  it('normalizes bullets and treats a zero-byte file as absent', () => {
    const file = new File([], 'empty.webm', { type: 'audio/webm' });
    expect(parseSpeechProcessingInput({ file, bullets: '  Ý chính  ' })).toEqual({
      file: undefined,
      bullets: 'Ý chính',
    });
  });

  it.each([
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/wav',
    'audio/webm;codecs=opus',
    'audio/ogg',
    'audio/x-m4a',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ])('accepts supported media type %s', (type) => {
    const file = new File(['audio'], 'voice', { type });
    expect(parseSpeechProcessingInput({ file, bullets: null }).file).toBe(file);
  });

  it('rejects a non-media upload', () => {
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    expect(() => parseSpeechProcessingInput({ file, bullets: null }))
      .toThrow(expect.objectContaining({ code: 'UNSUPPORTED_MEDIA_TYPE', status: 400 }));
  });

  it('rejects files larger than 25 MB', () => {
    const file = {
      name: 'large.mp3',
      type: 'audio/mpeg',
      size: MAX_SPEECH_FILE_BYTES + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as File;

    try {
      parseSpeechProcessingInput({ file, bullets: null });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SpeechProcessingError);
      expect(error).toMatchObject({ code: 'FILE_TOO_LARGE', status: 400 });
    }
  });
});
