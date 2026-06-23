/**
 * T-1.19.6 – Classifier accuracy test
 * Tests classifyArticle with 30 sample articles expecting ≥75% accuracy (≥23/30 correct)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

let classifyArticle: (title: string, content: string) => Promise<{ category: string; confidence: number }>;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  delete process.env.GEMINI_API_KEY; // Use keyword fallback
  const mod = await import('@/lib/services/articleClassifier');
  classifyArticle = mod.classifyArticle;
});

// ── 30 sample articles với expected category
const testArticles = [
  // Bất động sản (5)
  {
    title: 'Mua nhà lần đầu: Hướng dẫn đầu tư bất động sản',
    content: 'Căn hộ, đất nền, chung cư là những lựa chọn phổ biến. Bạn nên xem xét giá cả, vị trí.',
    expected: 'Bất động sản',
  },
  {
    title: 'Thuê nhà trọ hay mua nhà?',
    content: 'So sánh chi phí thuê nhà trọ vs mua nhà riêng. Đất nền ở vùng ven đang tăng giá.',
    expected: 'Bất động sản',
  },
  {
    title: 'Thị trường bất động sản 2024',
    content: 'Chung cư hạng sang, căn hộ bình dân đều có nhu cầu cao.',
    expected: 'Bất động sản',
  },
  {
    title: 'Đầu tư đất nền sinh lời',
    content: 'Những thửa đất nền giá rẻ với tiềm năng phát triển cao.',
    expected: 'Bất động sản',
  },
  {
    title: 'Thoát cảnh ở trọ với mua nhà',
    content: 'Hành trình từ ở trọ đến có căn nhà riêng của người trẻ.',
    expected: 'Bất động sản',
  },
  // Tài chính (5)
  {
    title: 'Tiết kiệm tiền hiệu quả',
    content: 'Mở tài khoản ngân hàng lãi suất cao, quỹ mở là cách tích lũy vốn tốt.',
    expected: 'Tài chính',
  },
  {
    title: 'Quản lý tài chính cá nhân',
    content: 'Cách sử dụng tiền lương, tiết kiệm hàng tháng, quỹ khẩn cấp.',
    expected: 'Tài chính',
  },
  {
    title: 'Lãi suất ngân hàng tháng 6',
    content: 'Các ngân hàng tăng lãi suất tiết kiệm. So sánh lãi suất hiện nay.',
    expected: 'Tài chính',
  },
  {
    title: 'Bắt đầu hành trình tích lũy tài chính',
    content: 'Vốn ban đầu là bao nhiêu? Làm thế nào để tích lũy từ từ.',
    expected: 'Tài chính',
  },
  {
    title: 'Chứng khoán vs tiết kiệm',
    content: 'So sánh rủi ro giữa chứng khoán và gửi ngân hàng.',
    expected: 'Tài chính',
  },
  // Đầu tư (5)
  {
    title: 'Đầu tư cổ phiếu cho người mới',
    content: 'Hướng dẫn mở tài khoản chứng khoán, mua cổ phiếu lần đầu.',
    expected: 'Đầu tư',
  },
  {
    title: 'Lợi nhuận từ crypto',
    content: 'Bitcoin, Ethereum giới thiệu. Rủi ro khi đầu tư vào tiền ảo.',
    expected: 'Đầu tư',
  },
  {
    title: 'Vàng là tài sản an toàn',
    content: 'Tích lũy vàng, cầm cố vàng để kiếm tiền. Giá vàng hôm nay.',
    expected: 'Đầu tư',
  },
  {
    title: 'Kế hoạch tài chính dài hạn',
    content: 'Cách lập kế hoạch đầu tư 10 năm, lợi nhuận kỳ vọng.',
    expected: 'Đầu tư',
  },
  {
    title: 'Phân tán danh mục đầu tư',
    content: 'Làm thế nào để giảm rủi ro? Đầu tư vào nhiều tài sản khác nhau.',
    expected: 'Đầu tư',
  },
  // Kinh doanh (3)
  {
    title: 'Bắt đầu kinh doanh thương mại điện tử',
    content: 'Startup bán hàng online, doanh nghiệp nhỏ trên Shopee, Tiktok Shop.',
    expected: 'Kinh doanh',
  },
  {
    title: 'Kinh doanh nhỏ sinh lời',
    content: 'Bán hàng online, kinh doanh cạnh tranh, tăng doanh số.',
    expected: 'Kinh doanh',
  },
  {
    title: 'Mô hình kinh doanh mới',
    content: 'Startup công nghệ, thương mại điện tử thế hệ mới.',
    expected: 'Kinh doanh',
  },
  // Công nghệ (3)
  {
    title: 'AI thay đổi cuộc sống',
    content: 'Trí tuệ nhân tạo, app mới, phần mềm, digital transformation.',
    expected: 'Công nghệ',
  },
  {
    title: 'Tech trends 2024',
    content: 'Công nghệ mới nhất, AI, blockchain, digital marketing.',
    expected: 'Công nghệ',
  },
  {
    title: 'Ứng dụng di động mới ra mắt',
    content: 'App quản lý tài chính, phần mềm quản lý nhân sự, tech solutions.',
    expected: 'Công nghệ',
  },
  // Sức khỏe (2)
  {
    title: 'Sức khỏe tâm thần tuổi trẻ',
    content: 'Wellness, dinh dưỡng, thể thao, y tế cơ bản.',
    expected: 'Sức khỏe',
  },
  {
    title: 'Chế độ ăn uống lành mạnh',
    content: 'Dinh dưỡng cân bằng, thể thao hàng ngày, sức khỏe bệnh mạn tính.',
    expected: 'Sức khỏe',
  },
  // Du lịch (2)
  {
    title: 'Khám phá Việt Nam',
    content: 'Du lịch, tour du lịch, điểm đến hấp dẫn, resort 5 sao.',
    expected: 'Du lịch',
  },
  {
    title: 'Hành trình backpacking Đông Nam Á',
    content: 'Khám phá các điểm đến, tour giá rẻ, resort tiêu chuẩn quốc tế.',
    expected: 'Du lịch',
  },
  // Giáo dục (2)
  {
    title: 'Kỹ năng mềm cho người trẻ',
    content: 'Học giao tiếp, kỹ năng sống, đào tạo kỹ năng mới.',
    expected: 'Giáo dục',
  },
  {
    title: 'Đi học thêm hay không?',
    content: 'Trường học, sinh viên, khóa học online, học kỹ năng lập trình.',
    expected: 'Giáo dục',
  },
  // Cuộc sống / Tổ ấm 4.0 (2)
  {
    title: 'Hành trình gia đình hạnh phúc',
    content: 'Chia sẻ cuộc sống gia đình, cây cỏ, vợ chồng, con cái.',
    expected: 'Tổ ấm 4.0',
  },
  {
    title: 'Trải nghiệm sống tại thành phố mới',
    content: 'Câu chuyện cuộc sống, kỷ niệm, hành trình tìm tòi, chia sẻ trải nghiệm.',
    expected: 'Cuộc sống',
  },
];

describe('classifyArticle – accuracy with 30 samples', () => {
  it('should achieve ≥75% accuracy (≥23/30 correct)', async () => {
    const results = await Promise.all(
      testArticles.map(async (article) => {
        const result = await classifyArticle(article.title, article.content);
        const isCorrect = result.category === article.expected;
        return { ...article, result, isCorrect };
      })
    );

    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = (correctCount / results.length) * 100;

    console.log(`\n📊 Classifier Accuracy Report:\n`);
    console.log(`Correct: ${correctCount}/${results.length} (${accuracy.toFixed(1)}%)`);
    console.log(`Required: ≥23/30 (75%)\n`);

    results.forEach((r, idx) => {
      const status = r.isCorrect ? '✓' : '✗';
      console.log(`${status} [${idx + 1}] "${r.title}" → Got: ${r.result.category}, Expected: ${r.expected}`);
    });

    expect(correctCount).toBeGreaterThanOrEqual(23);
  });

  it('should handle mixed language articles', async () => {
    const mixed = await classifyArticle(
      'Startup AI công nghệ',
      'Công nghệ artificial intelligence và business solutions'
    );
    expect(mixed.category).toBeTruthy();
  });

  it('should handle English content with keyword fallback', async () => {
    const english = await classifyArticle(
      'Investment and Finance Guide',
      'Banking, savings, finance management for beginners'
    );
    expect(english.category).toBeTruthy();
  });
});
