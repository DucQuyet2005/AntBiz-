// Khớp với bảng `public.articles` trong database.sql
export interface Article {
  id: string;
  url: string;
  title: string | null;
  category: string | null;
  category_confidence: number | null;
  description: string | null;
  author: string | null;
  published_at: string | null;
  views: string | null;
  images: { url: string; caption?: string }[];
  body: { type: string; text?: string; url?: string; caption?: string }[];
  full_text: string | null;
  tags: string[];
  crawled_at: string | null;
  created_at: string;
}

export interface CategoryResult {
  category: string;
  confidence: number;
}
