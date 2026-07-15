export interface SpeechProcessingInput {
  file: unknown;
  bullets: unknown;
}
export interface ValidatedSpeechProcessingInput {
  file?: File;
  bullets: string;
}

export interface SpeechMetadata {
  title: string;
  category: string;
  tags: string;
}

export interface SpeechProcessingResult {
  transcript: string;
  rewrittenPost: string;
  metadata: SpeechMetadata;
}

export interface SpeechTranscriber {
  transcribe(file: File): Promise<string>;
}

export interface SpeechEnricher {
  correct(transcript: string): Promise<string>;
  generateMetadata(content: string): Promise<SpeechMetadata>;
}

export interface SpeechProcessingLogger {
  warn(operation: 'correction' | 'metadata'): void;
}

export interface SpeechProcessingModuleInterface {
  process(input: SpeechProcessingInput): Promise<SpeechProcessingResult>;
}
