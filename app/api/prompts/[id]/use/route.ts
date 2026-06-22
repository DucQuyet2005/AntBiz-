import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

/**
 * POST /api/prompts/:id/use
 *
 * T-1.19.1 – Increment usage_count của prompt khi user chọn dùng nó.
 * Gọi từ client khi user chọn "Dùng prompt này" từ PromptSuggestionSection.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Missing prompt id' },
      { status: 400 }
    );
  }

  try {
    // Get current usage_count
    const { data: prompt, error: selectError } = await supabase
      .from('prompts')
      .select('usage_count')
      .eq('id', id)
      .single();

    if (selectError || !prompt) {
      return NextResponse.json(
        { error: 'Prompt không tìm thấy' },
        { status: 404 }
      );
    }

    // Increment usage_count
    const newCount = (prompt.usage_count ?? 0) + 1;
    const { error: updateError } = await supabase
      .from('prompts')
      .update({ usage_count: newCount })
      .eq('id', id);

    if (updateError) {
      console.error('[POST /api/prompts/:id/use] update error:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật usage_count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newCount,
    });
  } catch (err) {
    console.error('[POST /api/prompts/:id/use] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
