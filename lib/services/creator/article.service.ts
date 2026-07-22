import { simulateRequest, ApiResponse } from './apiClient';

export interface ArticleContext {
  title: string;
  content: string;
  sourceUrl: string;
  summary: string;
  keywords: string[];
  entities: string[];
  thumbnail?: string;
  imageUrls?: string[];
  author?: string;
}

export interface CrawlJobResponse {
  jobId: string;
  status: 'crawling' | 'done' | 'error';
}

// In-memory mock database of crawled articles to simulate realistic outputs based on domain links
const MOCK_ARTICLE_DB: Record<string, Omit<ArticleContext, 'sourceUrl'>> = {
  gocnhinmoi: {
    title: 'Argentina ngược dòng thắng Anh: Messi tái hiện Bàn tay của Chúa và Bàn thắng thế kỷ',
    content: '40 năm sau "Bàn tay của Chúa" và "Bàn thắng thế kỷ" của Maradona, Lionel Messi đã tái hiện lịch sử một cách không tưởng, dẫn dắt Argentina ngược dòng thắng Anh trong một trận đấu không chỉ là bóng đá, mà là sứ mệnh dân tộc! AR 🔥\n\nỞ tuổi 39, khi gánh nặng của cả một quốc gia và di sản vĩ đại của Maradona đè nặng lên đôi vai, Messi vẫn kiên cường hơn bao giờ hết. Chiến thắng đầy cảm xúc trước người Anh không chỉ mở ra cánh cửa đến trận chung kết World Cup thứ hai liên tiếp, mà còn là minh chứng cho ý chí sắt đá của một người đội trưởng vĩ đại.\n\nĐây không chỉ là một trận đấu. Đây là chương cuối cùng của một câu chuyện huyền thoại. Đây có thể...',
    summary: 'Lionel Messi tái hiện lại hai khoảnh khắc lịch sử của huyền thoại Maradona tại kỳ World Cup lịch sử.',
    keywords: ['Argentina', 'Lionel Messi', 'Maradona', 'World Cup', 'Bóng đá'],
    entities: ['Argentina', 'Lionel Messi', 'Maradona', 'Anh'],
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=60',
    author: 'Ngọc Linh'
  },
  tuoitre: {
    title: 'Startup công nghệ Việt Nam bứt phá vượt bậc với làn sóng AI toàn cầu',
    content: 'Năm 2026 ghi nhận sự bùng nổ của các giải pháp trí tuệ nhân tạo (AI) Make-in-Vietnam phục vụ doanh nghiệp nội địa. Các startup Việt không chỉ giải bài toán bản địa hóa ngôn ngữ mà còn tối ưu hóa chi phí vận hành, cạnh tranh trực tiếp với các ông lớn SaaS toàn cầu trên các mảng dịch vụ chăm sóc khách hàng và xuất bản nội dung tự động.',
    summary: 'Làn sóng AI thúc đẩy sự bứt phá mạnh mẽ của các startup công nghệ Việt Nam trong năm 2026 nhờ tối ưu hóa ngôn ngữ bản địa và ứng dụng AI tự động hóa.',
    keywords: ['Startup Việt', 'Trí tuệ nhân tạo', 'AI Việt Nam', 'SaaS', 'Make-in-Vietnam'],
    entities: ['Việt Nam', 'SaaS', 'Make-in-Vietnam', 'Startup AI'],
    thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=60',
    author: 'Báo Tuổi Trẻ'
  },
  dantri: {
    title: 'Xu hướng Hybrid Work chiếm lĩnh văn phòng các đô thị lớn tại Việt Nam',
    content: 'Khảo sát mới nhất năm 2026 cho thấy hơn 70% doanh nghiệp công nghệ và sáng tạo tại TP.HCM và Hà Nội chính thức áp dụng mô hình làm việc linh hoạt Hybrid Work. Nhân viên được chọn ngày lên văn phòng, giảm áp lực giao thông và nâng cao chỉ số hạnh phúc nghề nghiệp rõ rệt, thúc đẩy năng suất lao động tăng trưởng thêm 15%.',
    summary: 'Mô hình làm việc kết hợp Hybrid Work trở thành tiêu chuẩn mới tại các thành phố lớn ở Việt Nam, giúp tăng năng suất lao động và cải thiện mức độ hài lòng của nhân viên.',
    keywords: ['Hybrid Work', 'Văn phòng số', 'Năng suất lao động', 'TP.HCM', 'Hà Nội'],
    entities: ['Việt Nam', 'TP.HCM', 'Hà Nội', 'Hybrid Work'],
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    author: 'Báo Dân Trí'
  }
};

// Tracks active job simulation statuses
const activeJobs: Map<string, { status: 'crawling' | 'done' | 'error'; startTime: number; articleKey: string; customUrl?: string }> = new Map();

export const articleService = {
  async crawlArticle(url: string): Promise<ApiResponse<{ jobId: string }>> {
    const jobId = `job_${Math.random().toString(36).substring(2, 9)}`;
    let articleKey = 'gocnhinmoi';
    if (url.includes('tuoitre.vn')) articleKey = 'tuoitre';
    else if (url.includes('dantri.com.vn')) articleKey = 'dantri';

    activeJobs.set(jobId, {
      status: 'crawling',
      startTime: Date.now(),
      articleKey,
      customUrl: url
    });

    return simulateRequest({ jobId }, 500);
  },

  async getCrawlStatus(jobId: string): Promise<ApiResponse<{ status: 'crawling' | 'done' | 'error'; articleContext?: ArticleContext }>> {
    const job = activeJobs.get(jobId);
    if (!job) {
      return simulateRequest({ status: 'error' as const }, 200, true);
    }

    // After 2.5 seconds, transition to 'done'
    const duration = Date.now() - job.startTime;
    if (duration >= 2500 && job.status === 'crawling') {
      job.status = 'done';
    }

    if (job.status === 'done') {
      const template = MOCK_ARTICLE_DB[job.articleKey] || MOCK_ARTICLE_DB.gocnhinmoi;
      const context: ArticleContext = {
        ...template,
        sourceUrl: job.customUrl || `https://${job.articleKey}.com.vn/sample-post`
      };
      return simulateRequest({
        status: 'done' as const,
        articleContext: context
      }, 300);
    }

    return simulateRequest({
      status: 'crawling' as const
    }, 200);
  },

  async submitManualArticle(title: string, content: string): Promise<ApiResponse<ArticleContext>> {
    // Generate context elements dynamically from manual input
    const summary = content.substring(0, 150) + '...';
    const keywords = ['Bài viết thủ công', 'Nhập tay', 'AI Content Creator'];
    const entities = ['AntBiz AI', 'Người dùng'];
    
    const context: ArticleContext = {
      title: title || 'Nội dung dán thủ công',
      content,
      sourceUrl: 'manual',
      summary,
      keywords,
      entities,
      thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=60',
      author: 'Ngọc Linh'
    };

    return simulateRequest(context, 1000);
  }
};
