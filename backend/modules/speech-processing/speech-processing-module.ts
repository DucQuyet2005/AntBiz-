import { SpeechProcessingError } from './speech-processing-errors';
import { parseSpeechProcessingInput } from './speech-processing-schemas';
import type {
  SpeechEnricher,
  SpeechMetadata,
  SpeechProcessingInput,
  SpeechProcessingLogger,
  SpeechProcessingModuleInterface,
  SpeechProcessingResult,
  SpeechTranscriber,
} from './speech-processing-types';

const EMPTY_METADATA: SpeechMetadata = { title: '', category: '', tags: '' };

const defaultLogger: SpeechProcessingLogger = {
  warn(operation) {
    console.warn(`[Speech Processing] ${operation} unavailable`);
  },
};

export class SpeechProcessingModule implements SpeechProcessingModuleInterface {
  constructor(
    private readonly transcriber: SpeechTranscriber,
    private readonly enricher: SpeechEnricher,
    private readonly logger: SpeechProcessingLogger = defaultLogger
  ) {}

  async process(input: SpeechProcessingInput): Promise<SpeechProcessingResult> {
    const parsed = parseSpeechProcessingInput(input);
    const transcript = (parsed.file
      ? await this.transcriber.transcribe(parsed.file)
      : parsed.bullets).trim();

    if (!transcript) {
      throw new SpeechProcessingError(
        'EMPTY_TRANSCRIPT',
        422,
        'Không thể trích xuất nội dung. Hãy thử nhập ý chính thủ công.'
      );
    }

    const metadataInput = parsed.file && parsed.bullets
      ? `${transcript}\n\n${parsed.bullets}`
      : transcript;
    const [correctionResult, metadataResult] = await Promise.allSettled([
      this.enricher.correct(transcript),
      this.enricher.generateMetadata(metadataInput),
    ]);

    if (correctionResult.status === 'rejected') this.logger.warn('correction');
    if (metadataResult.status === 'rejected') this.logger.warn('metadata');

    return {
      transcript,
      rewrittenPost: correctionResult.status === 'fulfilled'
        ? correctionResult.value.trim() || transcript
        : transcript,
      metadata: metadataResult.status === 'fulfilled'
        ? metadataResult.value
        : { ...EMPTY_METADATA },
    };
  }
}
