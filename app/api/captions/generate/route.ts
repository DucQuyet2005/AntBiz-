import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';
import { crawlUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import { validateThreadsLength } from '@/lib/validations/threads';

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

    const { url, articleId, promptId, customPrompt, platform, variantGroupId, variantIndex, oldCaptionId } = body;

    const isThreads = platform === 'threads' || platform === 'thread';
    if (!promptId && !customPrompt && !isThreads) {
      return NextResponse.json({ error: 'Thiếu promptId' }, { status: 400 });
    }

    if (customPrompt && !platform) {
      return NextResponse.json({ error: 'Thiếu platform khi sử dụng customPrompt' }, { status: 400 });
    }

    if (!url && !articleId) {
      return NextResponse.json({ error: 'Thiếu url hoặc articleId' }, { status: 400 });
    }

    // Validate variantIndex (0=A, 1=B, 2=C)
    const resolvedVariantIndex: number = typeof variantIndex === 'number' ? variantIndex : 0;
    if (resolvedVariantIndex < 0 || resolvedVariantIndex > 2) {
      return NextResponse.json({ error: 'variantIndex phải nằm trong khoảng 0–2' }, { status: 400 });
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

      // Always crawl URL to get the fresh data
      console.log(`[Generate API] Crawling URL with TypeScript Playwright: ${url}`);
      let cleanData: ReturnType<typeof preprocessArticle>;
      try {
        const rawData = await crawlUrl(url);
        cleanData = preprocessArticle(rawData);
      } catch (e: any) {
        console.error('[Generate API] Crawler failed:', e);
        return NextResponse.json({ error: 'Không thể cào và tiền xử lý dữ liệu bài viết' }, { status: 500 });
      }

      // Check if URL already exists in DB to decide insert vs update
      const { data: existingArticle } = await userSupabase
        .from('articles')
        .select('*')
        .eq('url', url)
        .maybeSingle();

      if (existingArticle) {
        // Update existing article with fresh data
        const { data: updatedArticle, error: dbError } = await supabaseService
          .from('articles')
          .update({
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
          .eq('id', existingArticle.id)
          .select()
          .single();

        if (dbError) {
          console.error('[Generate API] Error updating crawled article in database:', dbError);
          return NextResponse.json({ error: 'Không thể cập nhật bài viết vào database' }, { status: 500 });
        }

        article = updatedArticle;
      } else {
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
    let promptContent = '';
    let dbPromptId: string | null = null;
    let dbPromptName: string = '';
    let targetPlatform = platform;

    if (promptId) {
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

      promptContent = promptRecord.content;
      dbPromptId = promptRecord.id;
      dbPromptName = promptRecord.name || 'N/A';
      targetPlatform = promptRecord.platform;
    } else {
      promptContent = customPrompt;
    }

    // Đọc prompt mặc định cho Threads từ file hệ thống nếu không truyền prompt cụ thể
    if (!promptContent && (targetPlatform === 'threads' || targetPlatform === 'thread')) {
      try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'prompts', 'threads', 'system.md');
        let fileContent = fs.readFileSync(filePath, 'utf-8');
        fileContent = fileContent
          .replace(/\{\{title\}\}/g, article.title || '')
          .replace(/\{\{content\}\}/g, article.description || article.full_text || '');
        promptContent = fileContent;
      } catch (err) {
        console.error('Error reading/replacing prompts/threads/system.md:', err);
      }
    }

    // Compare prompts if regenerating (oldCaptionId is provided)
    if (oldCaptionId) {
      try {
        const { data: oldCaption, error: oldCaptionError } = await userSupabase
          .from('captions')
          .select('prompt_id, platform')
          .eq('id', oldCaptionId)
          .maybeSingle();

        if (oldCaptionError) {
          console.error('[Generate API] Error fetching old caption:', oldCaptionError);
        } else if (oldCaption) {
          const oldPromptId = oldCaption.prompt_id;
          let oldPromptContent = '';
          let oldPromptName = 'N/A';

          if (oldPromptId) {
            const { data: oldPromptRecord } = await userSupabase
              .from('prompts')
              .select('name, content')
              .eq('id', oldPromptId)
              .maybeSingle();

            if (oldPromptRecord) {
              oldPromptContent = oldPromptRecord.content;
              oldPromptName = oldPromptRecord.name;
            }
          }

          let isSamePrompt = false;
          if (dbPromptId && oldPromptId) {
            isSamePrompt = dbPromptId === oldPromptId;
          } else if (!dbPromptId && !oldPromptId) {
            isSamePrompt = promptContent.trim() === oldPromptContent.trim();
          }

          console.log('\n=================== CAPTION REGENERATION PROMPT COMPARISON ===================');
          console.log(`[Regen Log] Caption ID cũ: ${oldCaptionId} | Platform: ${oldCaption.platform}`);
          console.log(`[Regen Log] Trạng thái: ${isSamePrompt ? 'ĂN THEO PROMPT CŨ (Không thay đổi)' : 'ĂN THEO PROMPT MỚI (Có thay đổi)'}`);
          if (isSamePrompt) {
            if (dbPromptId) {
              console.log(`[Regen Log] Chi tiết: Sử dụng lại Library Prompt ID: ${dbPromptId} ("${dbPromptName}")`);
            } else {
              console.log(`[Regen Log] Chi tiết: Sử dụng lại Custom Prompt có nội dung giống cũ.`);
            }
          } else {
            console.log(`[Regen Log] Chi tiết: Prompt thay đổi.`);
            console.log(`  - Prompt cũ: ID: ${oldPromptId || 'Custom'}, Tên: ${oldPromptName || 'Custom'}`);
            console.log(`  - Prompt mới: ID: ${dbPromptId || 'Custom'}, Tên: ${dbPromptName || 'Custom'}`);
          }
          console.log('==============================================================================\n');
        }
      } catch (compareError) {
        console.error('[Generate API] Error comparing prompts:', compareError);
      }
    }

    // 4. Connect to Gemini API for Streaming
    const geminiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;

    if (!geminiKey) {
      console.error('[Generate API] GEMINI_API_KEY is not defined in .env');
      return NextResponse.json({ error: 'Chưa cấu hình API key cho Gemini' }, { status: 500 });
    }

    if (!model) {
      console.error('[Generate API] GEMINI_MODEL is not defined in .env');
      return NextResponse.json({ error: 'Chưa cấu hình model cho Gemini' }, { status: 500 });
    }

    const promptText = `
${promptContent}

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

CHỈ TRẢ VỀ NỘI DUNG BÀI ĐĂNG HOÀN CHỈNH. TUYỆT ĐỐI KHÔNG CÓ LỜI DẪN GIẢI, GIỚI THIỆU, LỜI CHÀO HỎI HỢP LỆ HAY CÁC KÝ TỰ PHÂN CÁCH NHƯ "Tuyệt vời!", "Dưới đây là...", "---", KHÔNG CÓ BẤT KỲ KÝ TỰ NÀO NGOÀI BÀI ĐĂNG MẠNG XÃ HỘI.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${geminiKey}`;
    // Use higher temperature for variant B/C (index >= 1) to increase caption diversity
    const temperature = resolvedVariantIndex >= 1 ? 1.0 : 0.7;
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
        generationConfig: {
          temperature,
        },
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

          // Save generated caption to database if we have content
          let captionId = '';
          if (generatedText) {
            // Validator kiểm tra độ dài Threads
            if (targetPlatform === 'threads' || targetPlatform === 'thread') {
              const validation = validateThreadsLength(generatedText);
              if (!validation.isValid) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      error: `Độ dài nội dung Threads (${validation.length} ký tự) vượt quá giới hạn 500 ký tự.`,
                      done: true,
                    })}\n\n`
                  )
                );
                controller.close();
                return;
              }
            }

            // Validator kiểm tra độ dài Instagram
            if (targetPlatform === 'instagram' && generatedText.length > 2200) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    error: `Độ dài nội dung Instagram (${generatedText.length} ký tự) vượt quá giới hạn 2200 ký tự.`,
                    done: true,
                  })}\n\n`
                )
              );
              controller.close();
              return;
            }

            const dbPlatform = (targetPlatform === 'threads' || targetPlatform === 'thread') ? 'thread' : targetPlatform;

            const insertPayload: Record<string, unknown> = {
              article_id: article.id,
              prompt_id: dbPromptId || null,
              created_by: user.id,
              platform: dbPlatform,
              ai_content: generatedText,
              status: 'draft',
              variant_index: resolvedVariantIndex,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Only set variant_group_id when grouping multiple variants together
            if (variantGroupId) {
              insertPayload.variant_group_id = variantGroupId;
            }

            const { data: savedCaption, error: saveError } = await userSupabase
              .from('captions')
              .insert(insertPayload)
              .select()
              .single();

            if (saveError) {
              console.error('[Generate API] Lỗi khi tự động lưu caption sau khi sinh:', saveError);
            } else if (savedCaption) {
              captionId = savedCaption.id;
            }
          }

          // Send signal that stream is complete with metadata
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                done: true,
                captionId,
                articleId: article.id,
                variantGroupId: variantGroupId || null,
              })}\n\n`
            )
          );

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
