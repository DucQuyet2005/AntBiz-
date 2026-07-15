import { describe, expect, it, vi } from 'vitest';
import {
  SpeechProcessingError,
  SpeechProcessingModule,
  type SpeechEnricher,
  type SpeechProcessingLogger,
  type SpeechTranscriber,
} from '@/backend/modules/speech-processing';

function setup() {
  const transcriber: SpeechTranscriber = { transcribe: vi.fn().mockResolvedValue('Transcript') };
  const enricher: SpeechEnricher = {
    correct: vi.fn().mockResolvedValue('Corrected'),
    generateMetadata: vi.fn().mockResolvedValue({
      title: 'Title',
      category: 'Category',
      tags: '#one, #two',
    }),
  };
  const logger: SpeechProcessingLogger = { warn: vi.fn() };
  return { module: new SpeechProcessingModule(transcriber, enricher, logger), transcriber, enricher, logger };
}

describe('SpeechProcessingModule', () => {
  it('uses bullets directly and never calls the transcriber', async () => {
    const { module, transcriber, enricher } = setup();
    const result = await module.process({ file: null, bullets: '  Ý chính  ' });

    expect(transcriber.transcribe).not.toHaveBeenCalled();
    expect(enricher.correct).toHaveBeenCalledWith('Ý chính');
    expect(enricher.generateMetadata).toHaveBeenCalledWith('Ý chính');
    expect(result.transcript).toBe('Ý chính');
  });

  it('transcribes audio and adds separate bullets only to metadata context', async () => {
    const { module, transcriber, enricher } = setup();
    const file = new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' });
    await module.process({ file, bullets: 'Ghi chú' });

    expect(transcriber.transcribe).toHaveBeenCalledOnce();
    expect(transcriber.transcribe).toHaveBeenCalledWith(file);
    expect(enricher.correct).toHaveBeenCalledWith('Transcript');
    expect(enricher.generateMetadata).toHaveBeenCalledWith('Transcript\n\nGhi chú');
  });

  it('rejects an empty transcription', async () => {
    const { module, transcriber, enricher } = setup();
    vi.mocked(transcriber.transcribe).mockResolvedValue('   ');
    const file = new File(['audio'], 'voice.mp3', { type: 'audio/mpeg' });

    await expect(module.process({ file, bullets: null })).rejects.toMatchObject({
      code: 'EMPTY_TRANSCRIPT',
      status: 422,
    });
    expect(enricher.correct).not.toHaveBeenCalled();
  });

  it('returns the raw transcript when correction fails', async () => {
    const { module, enricher, logger } = setup();
    vi.mocked(enricher.correct).mockRejectedValue(new Error('secret provider error'));

    const result = await module.process({ file: null, bullets: 'Raw transcript' });
    expect(result.rewrittenPost).toBe('Raw transcript');
    expect(result.metadata.title).toBe('Title');
    expect(logger.warn).toHaveBeenCalledWith('correction');
  });

  it('returns empty metadata when metadata generation fails', async () => {
    const { module, enricher, logger } = setup();
    vi.mocked(enricher.generateMetadata).mockRejectedValue(new Error('secret provider error'));

    const result = await module.process({ file: null, bullets: 'Raw transcript' });
    expect(result.rewrittenPost).toBe('Corrected');
    expect(result.metadata).toEqual({ title: '', category: '', tags: '' });
    expect(logger.warn).toHaveBeenCalledWith('metadata');
  });

  it('keeps the transcript when correction returns blank output', async () => {
    const { module, enricher } = setup();
    vi.mocked(enricher.correct).mockResolvedValue('   ');
    await expect(module.process({ file: null, bullets: 'Original' }))
      .resolves.toMatchObject({ transcript: 'Original', rewrittenPost: 'Original' });
  });

  it('uses typed validation errors', async () => {
    const { module } = setup();
    await expect(module.process({ file: null, bullets: null }))
      .rejects.toBeInstanceOf(SpeechProcessingError);
  });
});
