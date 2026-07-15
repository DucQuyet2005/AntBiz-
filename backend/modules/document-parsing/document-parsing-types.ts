export type DocumentFormat = 'pdf' | 'docx';

export interface DocumentParsingInput {
  file: unknown;
}

export interface ValidatedDocumentInput {
  file: File;
  format: DocumentFormat;
}

export interface DocumentParsingResult {
  text: string;
}

export interface DocumentTextExtractor {
  extract(bytes: Uint8Array): Promise<string>;
}

export interface DocumentParsingModuleInterface {
  parse(input: DocumentParsingInput): Promise<DocumentParsingResult>;
}

export interface DocumentParsingLogger {
  warn(operation: 'docx-diagnostics', context: Record<string, unknown>): void;
}
