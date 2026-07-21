import { describe, expect, it, vi } from 'vitest';
import {
  GroqWhisperAdapter,
  SpeechProcessingError,
} from '@/backend/modules/speech-processing';

describe('GroqWhisperAdapter', () => {
  it('sends the expected Whisper multipart request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('  Xin chào  ', { status: 200 }));
    const adapter = new GroqWhisperAdapter(fetchMock, () => 'groq-key');
    const file = new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' });

    await expect(adapter.transcribe(file)).resolves.toBe('Xin chào');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer groq-key' },
        body: expect.any(FormData),
      })
    );
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('model')).toBe('whisper-large-v3');
    expect(body.get('language')).toBe('vi');
    expect(body.get('response_format')).toBe('text');
    expect(body.get('prompt')).toContain('Chào bạn, đây là bản ghi âm');
  });

  it('checks configuration only when transcription is invoked', async () => {
    const fetchMock = vi.fn();
    const adapter = new GroqWhisperAdapter(fetchMock, () => undefined);
    const file = new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' });

    await expect(adapter.transcribe(file)).rejects.toMatchObject({
      code: 'TRANSCRIPTION_NOT_CONFIGURED',
      status: 500,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose a failed provider response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      'secret provider body with account details',
      { status: 401 }
    ));
    const adapter = new GroqWhisperAdapter(fetchMock, () => 'groq-key');
    const file = new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' });

    try {
      await adapter.transcribe(file);
      throw new Error('Expected transcription to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SpeechProcessingError);
      expect(error).toMatchObject({
        code: 'TRANSCRIPTION_FAILED',
        clientMessage: 'Không thể xử lý tệp âm thanh lúc này',
        context: { providerStatus: 401 },
      });
      expect(JSON.stringify(error)).not.toContain('secret provider body');
    }
  });
});
