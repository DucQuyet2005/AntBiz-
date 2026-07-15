import { QuickPublishingError } from './quick-publishing-errors';
import { parseCaptionSseFrame } from './quick-publishing-events';
import type {
  CaptionStreamEvent,
  GenerateCaptionCommand,
  QuickPublishingClient,
  QuickPublishingPlatform,
  QuickPublishingPreset,
} from './quick-publishing-types';

export class BrowserQuickPublishingClient implements QuickPublishingClient {
  constructor(private readonly request: typeof fetch = fetch) {}

  async listPresets(platform: QuickPublishingPlatform): Promise<QuickPublishingPreset[]> {
    const response = await this.request(`/api/platform-presets?platform=${platform}`);
    const body = await readJson(response);
    if (!response.ok) throw new QuickPublishingError('PRESET_LOAD_FAILED', { status: response.status });
    return Array.isArray(body.data) ? body.data as QuickPublishingPreset[] : [];
  }

  async *generate(
    command: GenerateCaptionCommand,
    signal?: AbortSignal
  ): AsyncIterable<CaptionStreamEvent> {
    let response: Response;
    try {
      response = await this.request('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
        signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw new QuickPublishingError('GENERATION_ABORTED');
      throw new QuickPublishingError('GENERATION_FAILED', { phase: 'request' });
    }

    if (!response.ok) {
      throw new QuickPublishingError('GENERATION_FAILED', { status: response.status });
    }
    if (!response.body) throw new QuickPublishingError('GENERATION_FAILED', { phase: 'stream' });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        for (const event of parseCaptionSseFrame(frame)) yield event;
      }
      if (done) break;
    }
    if (buffer.trim()) {
      for (const event of parseCaptionSseFrame(buffer)) yield event;
    }
  }

  async updateCaption(id: string, input: { edited_content: string; status: 'draft' }) {
    const response = await this.request(`/api/captions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    const body = await readJson(response);
    if (!response.ok) throw new QuickPublishingError('CAPTION_SAVE_FAILED', { operation: 'update', status: response.status });
    return (asRecord(body.data) ?? body) as { id: string; status?: string };
  }

  async createCaption(input: Parameters<QuickPublishingClient['createCaption']>[0]) {
    const response = await this.request('/api/captions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    const body = await readJson(response);
    const data = asRecord(body.data);
    if (!response.ok || typeof data?.id !== 'string') {
      throw new QuickPublishingError('CAPTION_SAVE_FAILED', { operation: 'create', status: response.status });
    }
    return data as { id: string; status?: string };
  }

  async schedule(input: { captionId: string; scheduledAt: string; imageUrls: string[] }) {
    const response = await this.request('/api/scheduled-posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    if (!response.ok) throw new QuickPublishingError('SCHEDULE_FAILED', { status: response.status });
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; }
  catch { return {}; }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}
