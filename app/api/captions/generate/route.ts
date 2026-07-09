import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { getRichStyleContent } from '@/lib/api/styleDictionary';
import { createClient } from '@supabase/supabase-js';
import { crawlUrl } from '@/lib/crawler';
import { preprocessArticle } from '@/lib/crawler/preprocess';
import { validateThreadsLength } from '@/lib/validations/threads';
import { executeWithRotation } from '@/lib/services/geminiRotationManager';

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

    const { url, articleId, promptId, customPrompt, platform, variantGroupId, variantIndex, oldCaptionId, authorProfileId, stylePresetId, platformPresetId, model: requestedModel } = body;

    const isThreads = platform === 'threads' || platform === 'thread';
    if (!promptId && !customPrompt && !stylePresetId && !platformPresetId && !isThreads) {
      return NextResponse.json({ error: 'Thiếu thông số cấu hình nội dung (promptId, stylePresetId, hoặc platformPresetId)' }, { status: 400 });
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
        if (cleanData.type === 'LISTING') {
          return NextResponse.json({ error: 'Đây là trang danh sách liên kết (LISTING), vui lòng chọn một bài viết cụ thể để tạo caption.' }, { status: 400 });
        }
      } catch (e: any) {
        console.error('[Generate API] Crawler failed:', e);
        return NextResponse.json({ error: 'Không thể cào và tiền xử lý dữ liệu bài viết' }, { status: 500 });
      }

      const articleData = cleanData as any;

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
            title: articleData.title || '',
            category: articleData.category || '',
            description: articleData.description || '',
            author: articleData.author || '',
            published_at: articleData.published_at || '',
            views: articleData.views || '',
            images: articleData.images || [],
            body: articleData.body || [],
            full_text: articleData.full_text || '',
            tags: articleData.tags || [],
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
            url: articleData.url || url,
            title: articleData.title || '',
            category: articleData.category || '',
            description: articleData.description || '',
            author: articleData.author || '',
            published_at: articleData.published_at || '',
            views: articleData.views || '',
            images: articleData.images || [],
            body: articleData.body || [],
            full_text: articleData.full_text || '',
            tags: articleData.tags || [],
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

    // 3. Fetch Prompts (Dual-Layer Model + Backward Compatibility)
    let promptContent = '';
    let dbPromptId: string | null = null;
    let dbPromptName: string = '';
    let targetPlatform = platform;

    // --- LỚP 1: QUY CHUẨN KÊNH (Platform Presets) ---
    let platformRules = '';
    if (platformPresetId) {
      const { data: platformData } = await supabaseService
        .from('platform_presets')
        .select('rules')
        .eq('id', platformPresetId)
        .maybeSingle();
      if (platformData) {
        platformRules = platformData.rules;
      }
    }

    if (!platformRules && platform) {
      const p = platform === 'threads' ? 'thread' : platform;
      // Load all presets for this platform and select default
      const { data: presets } = await supabaseService
        .from('platform_presets')
        .select('*')
        .eq('platform', p)
        .or(`user_id.eq.${user.id},user_id.is.null`);

      if (presets && presets.length > 0) {
        const userDefault = presets.find((pr: any) => pr.user_id === user.id && pr.is_default);
        const userFirst = presets.find((pr: any) => pr.user_id === user.id);
        const systemDefault = presets.find((pr: any) => !pr.user_id && pr.is_default);
        const systemFirst = presets.find((pr: any) => !pr.user_id);

        const selectedPreset = userDefault || userFirst || systemDefault || systemFirst;
        if (selectedPreset) {
          platformRules = selectedPreset.rules;
        }
      }
    }

    // --- LỚP 2: VĂN PHONG THƯƠNG HIỆU (User Style Presets) ---
    let styleContent = '';
    if (stylePresetId && stylePresetId !== 'none') {
      const { data: styleData } = await userSupabase
        .from('prompt_configs')
        .select('*')
        .eq('id', stylePresetId)
        .maybeSingle();

      if (styleData && styleData.rules) {
        try {
          if (styleData.rules.trim().startsWith('{')) {
            const rulesObj = JSON.parse(styleData.rules);
            styleContent = rulesObj.general || '';
            const specificPlatformKey = platform === 'threads' ? 'threads' : platform;
            if (rulesObj[specificPlatformKey]) {
              styleContent += '\n\n' + rulesObj[specificPlatformKey];
            }
          } else {
            styleContent = styleData.rules;
          }
        } catch {
          styleContent = styleData.rules;
        }
      }
    }

    // --- LỚP 3: YÊU CẦU CỤ THỂ (Old Prompts - Backward Compatibility) ---
    if (promptId) {
      const { data: promptRecord, error: promptError } = await userSupabase
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (promptError) {
        console.error('[Generate API] error fetching prompt:', promptError);
      } else if (promptRecord) {
        promptContent = promptRecord.content;
        dbPromptId = promptRecord.id;
        dbPromptName = promptRecord.name || 'N/A';
        targetPlatform = promptRecord.platform;
      }
    } else if (customPrompt) {
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

    // 4. Connect to Gemini API for Streaming using Rotation
    const platformLabel = (platform || '').charAt(0).toUpperCase() + (platform || '').slice(1);
    const truncatedTitle = article.title && article.title.length > 300 ? article.title.slice(0, 300) + '...' : article.title;
    const fullText = article.full_text || article.description || '';
    const truncatedContent = fullText.length > 3000 ? fullText.slice(0, 3000) + '... (Nội dung rút gọn)' : fullText;

    const presetRulesStr = platformRules || `(Chưa chọn quy chuẩn ${platformLabel})`;
    const customSectionStr = promptContent?.trim() ? `*   ${promptContent.trim()}\n` : '';
    const styleSectionStr = styleContent ? `\n${styleContent}\n` : '*   Tone giọng yêu cầu: Tự do\n';

    let strictLengthRule = "Khoảng 100 - 150 từ";
    if (targetPlatform === 'threads' || targetPlatform === 'thread') {
      strictLengthRule = "Cực kỳ ngắn gọn, khoảng 30 từ (tối đa 2 câu)";
    } else if (targetPlatform === 'instagram') {
      strictLengthRule = "Ngắn gọn, khoảng 100 từ";
    } else if (targetPlatform === 'facebook') {
      strictLengthRule = "Khoảng 400 - 500 từ";
    }

    const promptText = `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platformLabel} post) dựa trên thông tin sau:

**Nền tảng:** ${platformLabel}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${truncatedTitle || '(Chưa có tiêu đề)'}"
*   **Nội dung tóm tắt:** "${truncatedContent || '(Chưa có nội dung)'}"

**Hướng dẫn khai thác nội dung:**
*   ${presetRulesStr}
${customSectionStr}
**Văn phong:**
${styleSectionStr}
**Cấu trúc bài viết:**
1.  Hook (Móc câu): Tạo điểm nhấn gây tò mò từ đoạn tóm tắt bài báo.
2.  Body (Nội dung chính): Phát triển câu chuyện ngắn gọn, súc tích.
3.  Call to Action (CTA): Khuyến khích người đọc tương tác.
4.  Hashtag: Đề xuất 3-5 hashtag liên quan.

**LƯU Ý ĐẶC BIỆT QUAN TRỌNG:**
- ĐỘ DÀI: ${strictLengthRule}.
- BẢN QUYỀN: TUYỆT ĐỐI KHÔNG sao chép y nguyên bài báo. Phải viết lại bằng ngôn ngữ riêng, thân thiện mạng xã hội.
- KẾT QUẢ: KHÔNG có lời dẫn giải, không "Dưới đây là...", không "Ok". Trả về TRỰC TIẾP bài đăng.`;

    if (requestedModel === 'qwen') {
      console.log('[Generate API] Using AntBiz Qwen via Hugging Face Space');
      const { Client } = await import('@gradio/client');
      const spaceId = process.env.HUGGINGFACE_SPACE_ID;
      if (!spaceId) {
        return NextResponse.json({ error: 'Thiếu HUGGINGFACE_SPACE_ID trong .env' }, { status: 500 });
      }

      let hfPlatform = 'Facebook';
      if (targetPlatform === 'threads' || targetPlatform === 'thread') hfPlatform = 'Threads';
      if (targetPlatform === 'instagram') hfPlatform = 'Instagram';

      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: "Đang gọi AI AntBiz Qwen (vui lòng đợi khoảng 15 phút)...\n\n" })}\n\n`));
            
            const systemPrompt = "Bạn là AI viết content chuyên nghiệp bằng tiếng Việt. Tuyệt đối KHÔNG dùng hashtag tiếng Anh. Hãy luôn tạo 3-5 hashtag tiếng Việt bám sát nội dung bài viết.";
            
            const client = await Client.connect(spaceId);
            const result = await client.predict("/generate_text", { 
              system_prompt: systemPrompt,
              user_prompt: promptText
            });
            
            const generatedText = (result.data as any)[0] as string;
            
            // Push final result (using replace: true to overwrite the waiting message)
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: generatedText, replace: true })}\n\n`));

            // Save generated caption to database
            let captionId = '';
            if (generatedText) {
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
              if (variantGroupId) insertPayload.variant_group_id = variantGroupId;

              const { data: savedCaption, error: saveError } = await userSupabase
                .from('captions')
                .insert(insertPayload)
                .select()
                .single();

              if (saveError) {
                console.error('[Generate API] Lỗi khi tự động lưu caption Qwen:', saveError);
              } else if (savedCaption) {
                captionId = savedCaption.id;
              }
            }

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
          } catch (err: any) {
            console.error('[Generate API] Error with Qwen API:', err);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: `\n\nLỗi gọi AI: ${err.message}` })}\n\n`));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 4. Connect to Gemini API for Streaming
    const geminiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || '';

    let resolvedModel = model;

    if (!geminiKey) {
      console.error('[Generate API] GEMINI_API_KEY is not defined in .env');
      return NextResponse.json({ error: 'Chưa cấu hình API key cho Gemini' }, { status: 500 });
    }

    if (!model) {
      console.error('[Generate API] GEMINI_MODEL is not defined in .env');
      return NextResponse.json({ error: 'Chưa cấu hình model cho Gemini' }, { status: 500 });
    }

    const temperature = resolvedVariantIndex >= 1 ? 1.0 : 0.7;

    const response = await executeWithRotation(
      { title: article.title || '', content: fullText },
      async (key, modelName) => {
        const isTunedModel = modelName.startsWith('tunedModels/');
        const modelPath = isTunedModel ? modelName : `models/${modelName}`;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:streamGenerateContent?key=${key}`;
        
        const res = await fetchGeminiWithRetry(geminiUrl, {
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

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`[Gemini API Error] Status: ${res.status}, Body: ${errorText}`);
        }

        return res;
      }
    );

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
            // author_profile_id: chỉ thêm nếu cột tồn tại (migration US-2.09 đã chạy)
            // TODO: Thêm lại khi migration 20260701_us2_09_author_profiles.sql được áp dụng
            // if (authorProfileId) insertPayload.author_profile_id = authorProfileId;

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
