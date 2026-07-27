import { NextResponse } from 'next/server';

// VPS production config
export const maxDuration = 30;

// Timeout mỗi translate call — tránh VPS bị treo khi Google API chậm
const TRANSLATE_TIMEOUT_MS = 10_000;

// Giới hạn concurrency để không spam Google từ một IP VPS
const BATCH_CONCURRENCY = 5;

/** Gọi unofficial Google Translate với AbortController timeout */
async function translateText(text: string, from: string, to: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return text; // fallback về gốc
    const data = await response.json();
    return data[0]?.map((x: any) => x[0]).join('') || text;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.warn(`[Translate] Timeout sau ${TRANSLATE_TIMEOUT_MS / 1000}s cho: "${text.slice(0, 50)}..."`);
    }
    return text; // fallback về text gốc thay vì throw
  }
}

/** Xử lý mảng theo batch để tránh overload VPS network */
async function translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < texts.length; i += BATCH_CONCURRENCY) {
    const batch = texts.slice(i, i + BATCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(text =>
        !text || typeof text !== 'string' || text.trim() === ''
          ? Promise.resolve('')
          : translateText(text, from, to)
      )
    );
    results.push(...batchResults);
  }
  return results;
}

export async function POST(request: Request) {
  try {
    const { texts, from = 'auto', to = 'en' } = await request.json();

    if (!texts || (typeof texts !== 'string' && !Array.isArray(texts))) {
      return NextResponse.json({ error: 'texts must be a string or array of strings' }, { status: 400 });
    }

    if (typeof texts === 'string') {
      const translatedText = await translateText(texts, from, to);
      return NextResponse.json({ translatedText });
    }

    // Array — dùng batch có giới hạn concurrency
    const translatedTexts = await translateBatch(texts, from, to);
    return NextResponse.json({ translatedTexts });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
