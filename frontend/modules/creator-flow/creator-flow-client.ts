import type { ArticleContext } from '@/lib/services/creator/article.service';
import type { PlatformConnection, PlatformType } from '@/lib/services/creator/platform.service';

interface ArticleTransportRecord {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  full_text?: unknown;
  url?: unknown;
  imageUrl?: unknown;
  author?: unknown;
  tags?: unknown;
}

interface LinkedAccountTransportRecord {
  platform?: unknown;
  account_name?: unknown;
}

interface SpeechTransportRecord {
  error?: unknown;
  transcript?: unknown;
  rewritten_post?: unknown;
  generated_title?: unknown;
}

interface DocumentTransportRecord {
  error?: unknown;
  text?: unknown;
}

export interface IngestedCreatorArticle {
  articleId: string;
  context: ArticleContext;
}

export interface ProcessedSpeechSource {
  text: string;
  title?: string;
}

export interface ParsedDocumentSource {
  text: string;
}

export class CreatorFlowError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CreatorFlowError';
  }
}

export interface CreatorFlowClient {
  listConnectedPlatforms(): Promise<PlatformConnection[]>;
  ingestUrl(url: string): Promise<IngestedCreatorArticle>;
  createManualArticle(title: string, content: string): Promise<IngestedCreatorArticle>;
  processSpeech(file: File): Promise<ProcessedSpeechSource>;
  parseDocument(file: File): Promise<ParsedDocumentSource>;
}

export class BrowserCreatorFlowClient implements CreatorFlowClient {
  private readonly request: typeof fetch;

  constructor(request: typeof fetch = globalThis.fetch) {
    this.request = (input, init) => request.call(globalThis, input, init);
  }

  async listConnectedPlatforms() {
    const response = await this.request('/api/linked-accounts');
    const body = await readJson(response);
    if (!response.ok) throw new Error('PLATFORM_CONNECTIONS_FAILED');
    const records = Array.isArray(body.data) ? body.data as LinkedAccountTransportRecord[] : [];
    const connected = new Map<PlatformType, LinkedAccountTransportRecord>();
    for (const record of records) {
      const platform = normalizePlatform(record.platform);
      if (platform) connected.set(platform, record);
    }
    return (['facebook', 'threads', 'instagram'] as PlatformType[]).map((platform) => {
      const record = connected.get(platform);
      const accountId = record ? String((record as any).account_id || '') : undefined;
      let profileUrl: string | undefined;

      if (record && accountId) {
        if (platform === 'facebook') {
          profileUrl = `https://facebook.com/${accountId}`;
        } else if (platform === 'threads') {
          const rawName = record ? String((record as any).account_name || '') : '';
          const handle = rawName.split(/\s*\(/)[0].trim().replace(/^@/, '');
          profileUrl = handle ? `https://threads.net/@${handle}` : `https://threads.net`;
        } else if (platform === 'instagram') {
          const rawName = record ? String((record as any).account_name || '') : '';
          const handle = rawName.split(/\s*\(/)[0].trim().replace(/^@/, '');
          profileUrl = handle ? `https://instagram.com/${handle}` : `https://instagram.com`;
        }
      }

      return {
        id: platform,
        name: platform === 'threads' ? 'Threads' : `${platform[0].toUpperCase()}${platform.slice(1)}`,
        connected: !!record,
        accountName: record ? String((record as any).account_name || '') : undefined,
        accountId,
        profileUrl,
      };
    });
  }

  async ingestUrl(url: string) {
    const response = await this.request(`/api/scrape?url=${encodeURIComponent(url)}`);
    const body = await readJson(response);
    if (!response.ok) throw new Error('SOURCE_INVALID');
    return normalizeArticle(body);
  }

  async createManualArticle(title: string, content: string) {
    const response = await this.request('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, full_text: content }),
    });
    const body = await readJson(response);
    if (!response.ok) throw transportError(body, 'SOURCE_INVALID', 'Không thể lưu nguồn nội dung');
    return normalizeArticle(body);
  }

  async processSpeech(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.request('/api/stt', { method: 'POST', body: formData });
    const body = await readJson(response) as SpeechTransportRecord;
    if (!response.ok) {
      throw transportError(body, 'SPEECH_PROCESSING_FAILED', 'Không thể xử lý tệp âm thanh');
    }
    const rewritten = stringValue(body.rewritten_post);
    const transcript = stringValue(body.transcript);
    const text = transcript || rewritten;
    if (!text) {
      throw new CreatorFlowError(
        'EMPTY_SPEECH_RESULT',
        'Không trích xuất được nội dung từ tệp âm thanh'
      );
    }
    const title = stringValue(body.generated_title);
    return { text, ...(title ? { title } : {}) };
  }

  async parseDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.request('/api/parse-doc', { method: 'POST', body: formData });
    const body = await readJson(response) as DocumentTransportRecord;
    if (!response.ok) {
      throw transportError(body, 'DOCUMENT_PARSING_FAILED', 'Không thể xử lý tài liệu');
    }
    const text = stringValue(body.text);
    if (!text) {
      throw new CreatorFlowError(
        'EMPTY_DOCUMENT_RESULT',
        'Không trích xuất được nội dung từ tài liệu'
      );
    }
    return { text };
  }
}

function normalizeArticle(value: Record<string, unknown>): IngestedCreatorArticle {
  const record = value as ArticleTransportRecord;
  const articleId = typeof record.id === 'string' ? record.id : '';
  const content = typeof record.full_text === 'string'
    ? record.full_text
    : typeof record.description === 'string' ? record.description : '';
  const tags = typeof record.tags === 'string'
    ? record.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];
  if (!articleId || !content) throw new Error('SOURCE_NOT_PERSISTED');

  const rawImages = typeof record.imageUrl === 'string' ? record.imageUrl : '';
  const imageUrls: string[] = rawImages
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://'));

  if (Array.isArray((record as any).images)) {
    for (const img of (record as any).images as Array<{ url?: unknown }>) {
      if (typeof img?.url === 'string' && (img.url.startsWith('http://') || img.url.startsWith('https://'))) {
        if (!imageUrls.includes(img.url)) imageUrls.push(img.url);
      }
    }
  }

  const thumbnail = imageUrls[0] || undefined;

  return {
    articleId,
    context: {
      title: typeof record.title === 'string' ? record.title : '',
      content,
      sourceUrl: typeof record.url === 'string' ? record.url : '',
      summary: typeof record.description === 'string' ? record.description : content.slice(0, 150),
      keywords: tags,
      entities: [],
      thumbnail,
      author: typeof record.author === 'string' ? record.author : undefined,
      imageUrls,
    } as any,
  };
}

function normalizePlatform(value: unknown): PlatformType | null {
  if (value === 'thread' || value === 'threads') return 'threads';
  if (value === 'facebook' || value === 'instagram') return value;
  return null;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; }
  catch { return {}; }
}

function transportError(
  value: { error?: unknown },
  code: string,
  fallbackMessage: string
) {
  const serverMessage = stringValue(value.error);
  return new CreatorFlowError(code, serverMessage || fallbackMessage);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
