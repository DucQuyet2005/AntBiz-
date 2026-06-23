import { createAdminClient } from '@/utils/supabase/admin';
import { createNotification } from './notificationService';

/**
 * Hoàn thành chiến dịch A/B Test:
 * 1. Tìm biến thể có CTR cao nhất.
 * 2. Đánh dấu biến thể đó là winner.
 * 3. Cập nhật A/B Test sang 'completed' và lưu winner.
 * 4. Tạo thông báo in-app gửi cho người tạo chiến dịch.
 */
export async function completeABTest(abTestId: string) {
  const supabase = createAdminClient();

  // 1. Lấy thông tin A/B Test kèm tiêu đề bài viết
  const { data: abTest, error: abTestError } = await supabase
    .from('ab_tests')
    .select('*, articles(title)')
    .eq('id', abTestId)
    .single();

  if (abTestError || !abTest) {
    throw new Error(`Không tìm thấy A/B Test với ID: ${abTestId}`);
  }

  // 2. Lấy danh sách các biến thể
  const { data: variants, error: variantsError } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('ab_test_id', abTestId);

  if (variantsError || !variants || variants.length === 0) {
    throw new Error(`Không tìm thấy biến thể nào cho A/B Test ID: ${abTestId}`);
  }

  // 3. Chọn biến thể chiến thắng (có CTR cao nhất)
  let winner = variants[0];
  for (const v of variants) {
    if (v.ctr > winner.ctr) {
      winner = v;
    }
  }

  // 4. Cập nhật trạng thái winner cho biến thể
  const { error: variantUpdateError } = await supabase
    .from('ab_test_variants')
    .update({ is_winner: true, updated_at: new Date().toISOString() })
    .eq('id', winner.id);

  if (variantUpdateError) {
    throw variantUpdateError;
  }

  // 5. Cập nhật A/B Test sang trạng thái hoàn thành
  const { error: testUpdateError } = await supabase
    .from('ab_tests')
    .update({
      status: 'completed',
      winner_caption_id: winner.caption_id,
      winner_selected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', abTestId);

  if (testUpdateError) {
    throw testUpdateError;
  }

  // 6. Gửi thông báo in-app
  const articleTitle = abTest.articles?.title || 'Bài viết không tên';
  const messageVi = `Thử nghiệm A/B Test cho bài viết "${articleTitle}" đã hoàn thành. Biến thể chiến thắng có CTR ${winner.ctr}%.`;
  const titleVi = 'Thử nghiệm A/B Test hoàn thành';

  // Lấy role của user để kiểm tra
  const { data: creatorProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', abTest.created_by)
    .single();

  if (!creatorProfile || creatorProfile.role !== 'admin') {
    await createNotification({
      userId: abTest.created_by,
      type: 'ab_test_complete',
      title: titleVi,
      message: messageVi,
      metadata: {
        ab_test_id: abTestId,
        winner_caption_id: winner.caption_id,
        winner_ctr: winner.ctr,
      }
    });
  }

  return { winner, abTest };
}
