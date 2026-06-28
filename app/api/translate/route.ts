import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { texts, from = 'auto', to = 'en' } = await request.json();
    
    if (!texts || (typeof texts !== 'string' && !Array.isArray(texts))) {
      return NextResponse.json({ error: 'texts must be a string or array of strings' }, { status: 400 });
    }

    if (typeof texts === 'string') {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(texts)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Translate API returned status ${response.status}`);
      }
      const data = await response.json();
      const translatedText = data[0]?.map((x: any) => x[0]).join('') || '';
      return NextResponse.json({ translatedText });
    }

    // Array of strings - perform translations concurrently
    const results = await Promise.all(
      texts.map(async (text: string) => {
        if (!text || typeof text !== 'string' || text.trim() === '') return '';
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
          const response = await fetch(url);
          if (!response.ok) return text;
          const data = await response.json();
          return data[0]?.map((x: any) => x[0]).join('') || '';
        } catch {
          return text; // fallback to original on failure
        }
      })
    );

    return NextResponse.json({ translatedTexts: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
