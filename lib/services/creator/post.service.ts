import { simulateRequest, ApiResponse } from './apiClient';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  quotedText?: string;
  timestamp: string;
  modelUsed?: 'Gemini 2.5 Flash' | 'Gemini 3.1 Flash Lite';
  postContentSnapshot?: string;
  isSavedState?: boolean;
}

export interface GeneratedPost {
  id: string;
  platform: string;
  title: string;
  content: string;
  mediaUrl?: string;
  status: 'draft' | 'edited' | 'approved';
}

export const postService = {
  async generatePost(
    platform: string,
    articleContext: { title: string; summary: string; keywords: string[] },
    _presetId: string | null
  ): Promise<ApiResponse<GeneratedPost>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _presetId;
    let content = '';
    const keywordsStr = articleContext.keywords.map(k => `#${k.replace(/\s+/g, '')}`).join(' ');

    if (platform === 'facebook') {
      content = `40 năm sau "Bàn tay của Chúa" và "Bàn thắng thế kỷ" của Maradona, Lionel Messi đã tái hiện lịch sử một cách không tưởng, dẫn dắt Argentina ngược dòng thắng Anh trong một trận đấu không chỉ là bóng đá, mà là sứ mệnh dân tộc! AR 🔥\n\nỞ tuổi 39, khi gánh nặng của cả một quốc gia và di sản vĩ đại của Maradona đè nặng lên đôi vai, Messi vẫn kiên cường hơn bao giờ hết. Chiến thắng đầy cảm xúc trước người Anh không chỉ mở ra cánh cửa đến trận chung kết World Cup thứ hai liên tiếp, mà còn là minh chứng cho ý chí sắt đá của một người đội trưởng vĩ đại.\n\nĐây không chỉ là một trận đấu. Đây là chương cuối cùng của một câu chuyện huyền thoại. Đây có thể...`;
    } else if (platform === 'threads') {
      content = `40 năm sau "Bàn tay của Chúa", Lionel Messi tái hiện lịch sử trước người Anh! 🇦🇷\n\nQuyết tâm và ý chí sắt đá ở tuổi 39 đưa Argentina bước thẳng vào chung kết World Cup! 🏆\n\n${keywordsStr}`;
    } else {
      content = `🇦🇷 LIONEL MESSI - HUYỀN THOẠI SỐNG 🇦🇷\n\nMàn trình diễn siêu phàm tái hiện lại lịch sử World Cup. Argentina chính thức vào chung kết sau chiến thắng nghẹt thở trước đội tuyển Anh!\n\n---\n${keywordsStr}`;
    }

    const post: GeneratedPost = {
      id: `post_${Math.random().toString(36).substring(2, 9)}`,
      platform,
      title: articleContext.title,
      content,
      mediaUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=60',
      status: 'draft'
    };

    return simulateRequest(post, 1500); // 1.5s delay to simulate Gemini 2.5 Flash generating
  },

  async editHighlightedSection(
    _postId: string,
    selectedText: string,
    instruction: string
  ): Promise<ApiResponse<{ editedText: string; modelUsed: string }>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _postId;
    // Simulate AI editing based on instruction using Gemini 2.5 Flash
    let editedText = selectedText;
    
    if (instruction.toLowerCase().includes('ngắn') || instruction.toLowerCase().includes('short')) {
      editedText = `Tây Ban Nha chính thức vào chung kết World Cup 2026 sau 36 năm chờ đợi nhờ Lamine Yamal!`;
    } else if (instruction.toLowerCase().includes('vui') || instruction.toLowerCase().includes('funny')) {
      editedText = `🎉 Tây Ban Nha bay thẳng vào Chung kết World Cup 2026! Lamine Yamal 19 tuổi nhảy múa làm nên lịch sử cực cháy! 💃🇪🇸`;
    } else {
      editedText = `[Đã sửa: ${instruction}] ${selectedText}`;
    }

    return simulateRequest({
      editedText,
      modelUsed: 'Gemini 2.5 Flash'
    }, 1200); // 1.2s delay for Gemini 2.5 Flash
  },

  async regeneratePost(_postId: string): Promise<ApiResponse<{ newContent: string; modelUsed: string }>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _postId;
    const newContent = `🔥 CẬP NHẬT: TÂY BAN NHA CHẠM TAY VÀO TRẬN ĐẤU CUỐI CÙNG WORLD CUP 2026! 🔥\n\n` +
      `Một trận bán kết điên rồ đưa La Roja lọt vào chung kết sau 36 năm lịch sử. Những đôi chân trẻ tuổi đầy quả cảm của Lamine Yamal và đồng đội đang viết tiếp câu chuyện cổ tích tại sân chơi lớn nhất hành tinh.\n\n` +
      `Cả nước Tây Ban Nha đang sống trong lễ hội. Cúp vàng đang ở rất gần! 🏆🇪🇸\n\n` +
      `#Spain #WorldCup #LamineYamal #Finals`;

    return simulateRequest({
      newContent,
      modelUsed: 'Gemini 2.5 Flash'
    }, 1800); // 1.8s delay
  },

  async sendChatMessage(
    _postId: string,
    message: string,
    _history: ChatMessage[]
  ): Promise<ApiResponse<ChatMessage>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _postId;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _history;
    // Generate AI assistant response using Gemini 3.1 Flash Lite
    let replyText = '';
    const cleanMsg = message.toLowerCase();

    if (cleanMsg.includes('nền tảng') || cleanMsg.includes('platform')) {
      replyText = `Hiện tại tôi đang hỗ trợ các nền tảng: Facebook, Threads và Instagram. Bạn có thể chọn cấu hình riêng cho từng kênh trong luồng này đấy.`;
    } else if (cleanMsg.includes('context') || cleanMsg.includes('nguồn')) {
      replyText = `Context tổng hợp gồm link bài viết gốc cùng các Presets bạn đã áp dụng. Bạn có thể bấm nút "CONTEXT TỔNG" ở góc trên bên phải để xem chi tiết.`;
    } else if (cleanMsg.includes('sửa') || cleanMsg.includes('bôi đen')) {
      replyText = `Để chỉnh sửa nội dung bài đăng, bạn chỉ cần dùng chuột bôi đen đoạn văn bản muốn thay đổi bên khung Canvas trái, sau đó nhấn "Gửi AI sửa" và nhập yêu cầu của mình nhé!`;
    } else {
      replyText = `Chào bạn, tôi là AI Trợ lý. Tôi đang sử dụng mô hình **Gemini 3.1 Flash Lite** để trò chuyện và tiếp nhận chỉ dẫn từ bạn. Bạn có muốn tôi giúp tối ưu hóa tone giọng hay bổ sung hashtag cho bài viết không?`;
    }

    const reply: ChatMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      sender: 'ai',
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Gemini 3.1 Flash Lite'
    };

    return simulateRequest(reply, 800); // Fast response representing 3.1 Flash Lite
  }
};
