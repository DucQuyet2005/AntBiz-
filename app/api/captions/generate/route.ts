import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';
import { crawlUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';

// Create a service role client to bypass RLS for articles insertion
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Function to call a URL with retries & exponential backoff for rate limits (429)
async function fetchGeminiWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        console.warn(`[Gemini API] Rate limited (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`[Gemini API] Fetch error: ${error}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Failed to fetch from Gemini API after maximum retries');
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { user, supabase: userSupabase, unauthorized } = await requireUserWithRole([
      'admin',
      'marketer_full',
      'marketer_content',
    ]);
    if (unauthorized) return unauthorized;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const { url, articleId, promptId } = body;

    if (!promptId) {
      return NextResponse.json({ error: 'Thiếu promptId' }, { status: 400 });
    }

    if (!url && !articleId) {
      return NextResponse.json({ error: 'Thiếu url hoặc articleId' }, { status: 400 });
    }

    const supabaseService = createServiceClient();
    let article: any = null;

    // 2. Fetch or Crawl Article
    if (articleId) {
      const { data, error } = await userSupabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .maybeSingle();

      if (error) {
        console.error('[Generate API] error fetching article:', error);
        return NextResponse.json({ error: 'Không thể tải bài viết từ database' }, { status: 500 });
      }
      article = data;
    } else if (url) {
      // Validate URL to prevent command injection
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
      }

      // Check if URL already exists in DB
      const { data: existingArticle } = await userSupabase
        .from('articles')
        .select('*')
        .eq('url', url)
        .maybeSingle();

      if (existingArticle) {
        article = existingArticle;
      } else {
        // ── TypeScript Playwright crawler (no Python needed) ──────────────────
        console.log(`[Generate API] Crawling URL with TypeScript Playwright: ${url}`);
        let cleanData: ReturnType<typeof preprocessArticle>;
        try {
          const rawData = await crawlUrl(url);
          cleanData = preprocessArticle(rawData);
        } catch (e: any) {
          console.error('[Generate API] Crawler failed:', e);
          return NextResponse.json({ error: 'Không thể cào và tiền xử lý dữ liệu bài viết' }, { status: 500 });
        }

        // Save preprocessed article into DB using service role to bypass RLS if needed
        const { data: newArticle, error: dbError } = await supabaseService
          .from('articles')
          .insert({
            url: cleanData.url || url,
            title: cleanData.title || '',
            category: cleanData.category || '',
            description: cleanData.description || '',
            author: cleanData.author || '',
            published_at: cleanData.published_at || '',
            views: cleanData.views || '',
            images: cleanData.images || [],
            body: cleanData.body || [],
            full_text: cleanData.full_text || '',
            tags: cleanData.tags || [],
            crawled_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) {
          console.error('[Generate API] Error saving crawled article to database:', dbError);
          return NextResponse.json({ error: 'Không thể lưu bài viết vào database' }, { status: 500 });
        }

        article = newArticle;
      }
    }

    if (!article) {
      return NextResponse.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });
    }

    // 3. Fetch Prompt
    const { data: promptRecord, error: promptError } = await userSupabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (promptError) {
      console.error('[Generate API] error fetching prompt:', promptError);
      return NextResponse.json({ error: 'Không thể tải prompt' }, { status: 500 });
    }

    if (!promptRecord) {
      return NextResponse.json({ error: 'Không tìm thấy prompt hợp lệ' }, { status: 404 });
    }

    // 4. Connect to Gemini API for Streaming
    const geminiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!geminiKey) {
      console.error('[Generate API] GEMINI_API_KEY is not defined in .env');
      return NextResponse.json({ error: 'Chưa cấu hình API key cho Gemini' }, { status: 500 });
    }

    const promptText = `
${promptRecord.content}

---
Original Article (Full Preprocessed Data):
Title: ${article.title || ''}
Description: ${article.description || ''}
Category: ${article.category || ''}
Author: ${article.author || ''}
Published At: ${article.published_at || ''}
Views: ${article.views || ''}
Tags: ${(article.tags || []).join(', ')}
Images: ${JSON.stringify(article.images || [], null, 2)}
Body Blocks: ${JSON.stringify(article.body || [], null, 2)}
Full Text Content:
${article.full_text ? article.full_text.substring(0, 8000) : ''}
---
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${geminiKey}`;
    const response = await fetchGeminiWithRetry(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate API] Gemini API returned error status:', response.status, errorText);
      return NextResponse.json({ error: `AI API error: ${response.statusText}` }, { status: response.status });
    }

    // 5. Stream response and save to DB on complete
    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    let generatedText = '';
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Process the buffer
            // Gemini streams return JSON arrays or objects.
            // When streaming, the chunks can be like:
            // [\n  {\n    "candidates": ...\n  },\n  {\n    "candidates": ...\n  }\n]
            // We can search for the text in candidates using a regex to extract text safely.
            const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
            let match;
            let lastIndex = 0;
            
            while ((match = regex.exec(buffer)) !== null) {
              const rawText = match[1];
              try {
                // Parse it as JSON string to handle escape sequences like \n, \t
                const parsedText = JSON.parse(`"${rawText}"`);
                if (parsedText) {
                  generatedText += parsedText;
                  // Stream it to Client as SSE
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ text: parsedText })}\n\n`)
                  );
                }
              } catch (e) {
                // In case parsing fails, fallback to raw text
                generatedText += rawText;
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ text: rawText })}\n\n`)
                );
              }
              lastIndex = regex.lastIndex;
            }

            if (lastIndex > 0) {
              buffer = buffer.substring(lastIndex);
            }
          }

          // Ingest completed caption into DB as draft
          const { data: savedCaption, error: saveError } = await userSupabase
            .from('captions')
            .insert({
              article_id: article.id,
              prompt_id: promptRecord.id,
              created_by: user.id,
              platform: promptRecord.platform,
              ai_content: generatedText,
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          let captionId = '';
          if (saveError) {
            console.error('[Generate API] Error saving generated caption to DB:', saveError);
          } else if (savedCaption) {
            captionId = savedCaption.id;
          }

          // Send signal that stream is complete with metadata
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, captionId, articleId: article.id })}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[Generate API] Error during streaming:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Generate API] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định' }, { status: 500 });
  }
}
