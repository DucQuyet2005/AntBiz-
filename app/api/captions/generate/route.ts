import { NextRequest, NextResponse } from 'next/server';
import { captionGenerationInputSchema } from '@/backend/modules/caption-generation/caption-generation-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildCaptionGenerationModule,
  captionGenerationErrorResponse,
  encodeCaptionGenerationEvent,
} from './_adapter';

const CAPTION_GENERATION_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await requireUserWithRole([
      ...CAPTION_GENERATION_ROLES,
    ]);
    if (unauthorized) return unauthorized;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
    }

    const parsed = captionGenerationInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const session = await buildCaptionGenerationModule(supabase).generate(
      { id: user.id },
      parsed.data
    );
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of session.events) {
            controller.enqueue(encoder.encode(encodeCaptionGenerationEvent(event)));
            if (event.type === 'validation-error') {
              controller.close();
              return;
            }
            if (event.type === 'completed') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          }
          controller.close();
        } catch (error) {
          console.error('[Generate API] Error during streaming:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return captionGenerationErrorResponse(error);
  }
}
