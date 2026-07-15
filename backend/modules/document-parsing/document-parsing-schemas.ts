import { DocumentParsingError } from './document-parsing-errors';
import type {
  DocumentFormat,
  DocumentParsingInput,
  ValidatedDocumentInput,
} from './document-parsing-types';

const SUPPORTED_EXTENSIONS: Record<string, DocumentFormat> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
};

export function parseDocumentInput(input: DocumentParsingInput): ValidatedDocumentInput {
  if (!isFile(input.file)) {
    throw new DocumentParsingError(
      'INVALID_FILE',
      400,
      'Không tìm thấy file tải lên hợp lệ'
    );
  }

  const file = input.file;
  const fileName = file.name.trim();
  if (!fileName) {
    throw new DocumentParsingError('INVALID_FILE', 400, 'File tải lên phải có tên');
  }

  if (file.size === 0) {
    throw new DocumentParsingError('EMPTY_FILE', 400, 'File tải lên đang trống');
  }

  const extension = getExtension(fileName);
  const format = SUPPORTED_EXTENSIONS[extension];
  if (!format) {
    throw new DocumentParsingError(
      'UNSUPPORTED_FORMAT',
      400,
      'Định dạng file không được hỗ trợ. Chỉ hỗ trợ file PDF (.pdf) hoặc Word (.docx).'
    );
  }

  return { file, format };
}

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function isFile(value: unknown): value is File {
  return typeof value === 'object'
    && value !== null
    && typeof (value as File).name === 'string'
    && typeof (value as File).type === 'string'
    && typeof (value as File).size === 'number'
    && typeof (value as File).arrayBuffer === 'function';
}
