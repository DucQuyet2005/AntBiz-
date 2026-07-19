import {
  CreatorFlowError,
  type CreatorFlowClient,
  type IngestedCreatorArticle,
} from './creator-flow-client';

export type CreatorUploadedSourceType = 'audio' | 'document';

export interface CreatorUploadedSource {
  name: string;
  size: string;
  type: CreatorUploadedSourceType;
  content: string;
  article: IngestedCreatorArticle;
}

const AUDIO_EXTENSIONS = new Set(['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'webm']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx']);

export async function uploadCreatorSource(
  client: CreatorFlowClient,
  file: File
): Promise<CreatorUploadedSource> {
  const extension = fileExtension(file.name);
  const titleFromFile = fileStem(file.name);
  let type: CreatorUploadedSourceType;
  let title = titleFromFile;
  let content: string;

  if (AUDIO_EXTENSIONS.has(extension)) {
    type = 'audio';
    const result = await client.processSpeech(file);
    content = result.text.trim();
    title = result.title?.trim() || titleFromFile;
  } else if (DOCUMENT_EXTENSIONS.has(extension)) {
    type = 'document';
    content = (await client.parseDocument(file)).text.trim();
  } else if (extension === 'txt') {
    type = 'document';
    content = (await file.text()).trim();
    if (!content) {
      throw new CreatorFlowError('EMPTY_TEXT_FILE', 'Tệp TXT không có nội dung');
    }
  } else {
    throw new CreatorFlowError(
      'UNSUPPORTED_SOURCE_FILE',
      'Định dạng không được hỗ trợ. Hãy dùng Audio, PDF, DOCX hoặc TXT.'
    );
  }

  if (!content) {
    throw new CreatorFlowError('EMPTY_SOURCE_CONTENT', 'Không trích xuất được nội dung từ tệp');
  }

  const article = await client.createManualArticle(title, content);
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type,
    content,
    article,
  };
}

export async function persistManualCreatorSource(
  client: CreatorFlowClient,
  title: string,
  content: string
) {
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  if (!normalizedTitle) {
    throw new CreatorFlowError('MANUAL_TITLE_REQUIRED', 'Vui lòng nhập tiêu đề bài viết');
  }
  if (!normalizedContent) {
    throw new CreatorFlowError('MANUAL_CONTENT_REQUIRED', 'Vui lòng nhập nội dung bài viết');
  }
  return client.createManualArticle(normalizedTitle, normalizedContent);
}

function fileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

function fileStem(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  const stem = (dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName).trim();
  return stem || 'Nguồn nội dung tải lên';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
