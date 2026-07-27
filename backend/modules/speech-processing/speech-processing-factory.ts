import { GeminiSpeechEnrichmentAdapter } from './gemini-speech-enrichment-adapter';
import { GroqWhisperAdapter } from './groq-whisper-adapter';
import { SpeechProcessingModule } from './speech-processing-module';

export function createSpeechProcessingModule() {
  return new SpeechProcessingModule(
    new GroqWhisperAdapter(),
    new GeminiSpeechEnrichmentAdapter()
  );
}
