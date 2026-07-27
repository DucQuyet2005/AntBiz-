import type { CaptionStreamEvent } from './quick-publishing-types';

export function parseCaptionSseFrame(frame: string): CaptionStreamEvent[] {
  const events: CaptionStreamEvent[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === '[DONE]') continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object') continue;
    const value = parsed as Record<string, unknown>;
    if (typeof value.text === 'string' && value.text) {
      events.push({ type: 'text', text: value.text });
    }
    if (typeof value.error === 'string' && value.error) {
      events.push({ type: 'validation-error', message: value.error });
    }
    if (value.done === true) {
      events.push({
        type: 'completed',
        ...(typeof value.captionId === 'string' ? { captionId: value.captionId } : {}),
        ...(typeof value.articleId === 'string' ? { articleId: value.articleId } : {}),
        ...(typeof value.variantGroupId === 'string' || value.variantGroupId === null
          ? { variantGroupId: value.variantGroupId as string | null }
          : {}),
      });
    }
  }
  return events;
}
