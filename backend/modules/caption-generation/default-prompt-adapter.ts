import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ArticleRecord, DefaultPromptSource } from './caption-generation-types';

export class FileDefaultPromptSource implements DefaultPromptSource {
  async getThreadsPrompt(article: ArticleRecord) {
    const filePath = path.join(process.cwd(), 'prompts', 'threads', 'system.md');
    const template = await readFile(filePath, 'utf8');
    return template
      .replace(/\{\{title\}\}/g, String(article.title || ''))
      .replace(/\{\{content\}\}/g, String(article.description || article.full_text || ''));
  }
}
