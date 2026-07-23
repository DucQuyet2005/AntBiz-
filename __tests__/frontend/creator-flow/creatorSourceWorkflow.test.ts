import { describe, expect, it, vi } from 'vitest';
import type { CreatorFlowClient } from '@/frontend/modules/creator-flow/creator-flow-client';
import {
  persistManualCreatorSource,
  uploadCreatorSource,
} from '@/frontend/modules/creator-flow/creator-source-workflow';

const article = {
  articleId: 'article-1',
  context: {
    title: 'Source title',
    content: 'Source content',
    sourceUrl: 'manual://article-1',
    summary: 'Source content',
    keywords: [],
    entities: [],
  },
};

function createClient(): CreatorFlowClient {
  return {
    listConnectedPlatforms: vi.fn(),
    ingestUrl: vi.fn(),
    createManualArticle: vi.fn().mockResolvedValue(article),
    processSpeech: vi.fn().mockResolvedValue({ text: 'Corrected transcript', title: 'AI title' }),
    parseDocument: vi.fn().mockResolvedValue({ text: 'Extracted document' }),
  };
}

describe('creator source upload workflow', () => {
  it('processes audio and persists the processed text as a manual Article', async () => {
    const client = createClient();
    const file = new File(['audio'], 'interview.mp3', { type: 'audio/mpeg' });

    await expect(uploadCreatorSource(client, file)).resolves.toMatchObject({
      name: 'interview.mp3', type: 'audio', content: 'Corrected transcript', article,
    });
    expect(client.processSpeech).toHaveBeenCalledWith(file, undefined);
    expect(client.createManualArticle).toHaveBeenCalledWith('AI title', 'Corrected transcript');
  });

  it.each([
    ['report.pdf', 'application/pdf'],
    ['report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ])('parses and persists supported document %s', async (name, type) => {
    const client = createClient();
    const file = new File(['document'], name, { type });

    await expect(uploadCreatorSource(client, file)).resolves.toMatchObject({
      name, type: 'document', content: 'Extracted document',
    });
    expect(client.parseDocument).toHaveBeenCalledWith(file);
    expect(client.createManualArticle).toHaveBeenCalledWith('report', 'Extracted document');
  });

  it('reads TXT locally and persists its real content', async () => {
    const client = createClient();
    const file = new File(['  Plain text source  '], 'notes.txt', { type: 'text/plain' });

    await expect(uploadCreatorSource(client, file)).resolves.toMatchObject({
      name: 'notes.txt', type: 'document', content: 'Plain text source',
    });
    expect(client.processSpeech).not.toHaveBeenCalled();
    expect(client.parseDocument).not.toHaveBeenCalled();
    expect(client.createManualArticle).toHaveBeenCalledWith('notes', 'Plain text source');
  });

  it('does not persist an Article when source processing fails', async () => {
    const client = createClient();
    vi.mocked(client.processSpeech).mockRejectedValue(new Error('Provider unavailable'));
    const file = new File(['audio'], 'interview.mp3', { type: 'audio/mpeg' });

    await expect(uploadCreatorSource(client, file)).rejects.toThrow('Provider unavailable');
    expect(client.createManualArticle).not.toHaveBeenCalled();
  });

  it('rejects unsupported files without calling a backend', async () => {
    const client = createClient();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });

    await expect(uploadCreatorSource(client, file)).rejects.toThrow('Định dạng không được hỗ trợ');
    expect(client.processSpeech).not.toHaveBeenCalled();
    expect(client.parseDocument).not.toHaveBeenCalled();
    expect(client.createManualArticle).not.toHaveBeenCalled();
  });

  it('validates manual title and content before persistence', async () => {
    const client = createClient();

    await expect(persistManualCreatorSource(client, ' ', 'Body')).rejects.toThrow(
      'Vui lòng nhập tiêu đề bài viết'
    );
    await expect(persistManualCreatorSource(client, 'Title', ' ')).rejects.toThrow(
      'Vui lòng nhập nội dung bài viết'
    );
    expect(client.createManualArticle).not.toHaveBeenCalled();
  });
});
