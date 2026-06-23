"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FontInfo {
  id: string;
  name: string;
  family: string;
  isGoogleFont?: boolean;
  tag: string;           // Short personality tag
  descriptionVi: string;
  descriptionEn: string;
}

export const fonts: FontInfo[] = [
  {
    id: 'Inter',
    name: 'Inter',
    family: '"Inter", sans-serif',
    isGoogleFont: true,
    tag: 'UI · Tiêu chuẩn',
    descriptionVi: 'Thiết kế riêng cho màn hình pixel cao. Sắc nét ở mọi cỡ chữ — lựa chọn mặc định lý tưởng.',
    descriptionEn: 'Engineered for high-DPI screens. Sharp at every size — the ideal default.'
  },
  {
    id: 'Space Grotesk',
    name: 'Space Grotesk',
    family: '"Space Grotesk", sans-serif',
    isGoogleFont: true,
    tag: 'Tech · Khởi nghiệp',
    descriptionVi: 'Hình học hiện đại với nét đặc trưng bất đối xứng. Toát ra hơi thở của startup và công nghệ.',
    descriptionEn: 'Modern geometric with quirky asymmetry. Radiates startup and tech energy.'
  },
  {
    id: 'DM Sans',
    name: 'DM Sans',
    family: '"DM Sans", sans-serif',
    isGoogleFont: true,
    tag: 'Tối giản · Thanh lịch',
    descriptionVi: 'Tỉ lệ hoàn hảo, không thừa không thiếu. Chuẩn mực cho SaaS và dashboard cao cấp.',
    descriptionEn: 'Perfect proportions, nothing superfluous. The gold standard for premium SaaS.'
  },
  {
    id: 'Sora',
    name: 'Sora',
    family: '"Sora", sans-serif',
    isGoogleFont: true,
    tag: 'Hiện đại · Nổi bật',
    descriptionVi: 'Nét bo tròn đặc trưng của Nhật Bản kết hợp hình học phương Tây. Độc đáo và dễ nhận diện.',
    descriptionEn: 'Japanese-influenced roundness meets Western geometry. Distinctive and memorable.'
  },
  {
    id: 'Nunito',
    name: 'Nunito',
    family: '"Nunito", sans-serif',
    isGoogleFont: true,
    tag: 'Thân thiện · Vui vẻ',
    descriptionVi: 'Đầu nét bo tròn hoàn toàn, tạo cảm giác ấm áp và dễ gần. Phù hợp cho sản phẩm B2C.',
    descriptionEn: 'Fully rounded terminals, warm and approachable. Perfect for consumer-facing products.'
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    isGoogleFont: true,
    tag: 'Tạp chí · Sang trọng',
    descriptionVi: 'Tương phản nét đậm–nhạt cực rõ nét. Chuẩn mực của editorial và thương hiệu luxury.',
    descriptionEn: 'Dramatic thick-thin contrast. The editorial and luxury brand benchmark.'
  },
  {
    id: 'Lora',
    name: 'Lora',
    family: '"Lora", Georgia, serif',
    isGoogleFont: true,
    tag: 'Văn học · Đọc dài',
    descriptionVi: 'Serif cân đối với nét cọ tinh tế, tối ưu cho bài viết dài và nội dung báo chí.',
    descriptionEn: 'Balanced serif with brushed strokes. Optimized for long-form journalism.'
  },
  {
    id: 'Merriweather',
    name: 'Merriweather',
    family: '"Merriweather", Georgia, serif',
    isGoogleFont: true,
    tag: 'Học thuật · Tin cậy',
    descriptionVi: 'Nét dày và khoảng cách dòng lớn, chống mỏi mắt khi đọc dài trên màn hình phát sáng.',
    descriptionEn: 'Heavy strokes and generous leading to prevent eye fatigue on backlit screens.'
  },
  {
    id: 'Inconsolata',
    name: 'Inconsolata',
    family: '"Inconsolata", "Courier New", monospace',
    isGoogleFont: true,
    tag: 'Kỹ thuật · Code',
    descriptionVi: 'Monospace tối ưu hóa đặc biệt để đọc code và log. Phong cách terminal chuyên nghiệp.',
    descriptionEn: 'Monospace optimized for code and logs. Professional terminal aesthetic.'
  },
  {
    id: 'Fraunces',
    name: 'Fraunces',
    family: '"Fraunces", Georgia, serif',
    isGoogleFont: true,
    tag: 'Nghệ thuật · Cổ điển',
    descriptionVi: 'Serif biến thể quang học (optical axes) — nét chữ thay đổi theo cỡ, hiệu ứng thẩm mỹ độc đáo.',
    descriptionEn: 'Variable optical axis serif — stroke weight shifts with size. Visually unique.'
  },
];

interface FontContextType {
  font: string;
  setFont: (fontId: string) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export const FontProvider = ({ children }: { children: React.ReactNode }) => {
  const [font, setFontState] = useState<string>('Inter');

  const loadGoogleFont = (fontName: string) => {
    if (typeof window === 'undefined') return;
    const fontId = `google-font-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
  };

  const applyFont = (fontId: string) => {
    const fontObj = fonts.find(f => f.id === fontId);
    if (!fontObj) return;

    if (fontObj.isGoogleFont) {
      loadGoogleFont(fontObj.name);
    }

    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--font-sans', fontObj.family);
      document.body.style.fontFamily = fontObj.family;
    }
  };

  // Load font from localStorage on mount and apply it
  useEffect(() => {
    const savedFont = localStorage.getItem('app-font') || 'Inter';
    const validFontIds = fonts.map(f => f.id);
    const initialFont = validFontIds.includes(savedFont) ? savedFont : 'Inter';

    setFontState(initialFont);
    applyFont(initialFont);
  }, []);

  const setFont = (fontId: string) => {
    setFontState(fontId);
    localStorage.setItem('app-font', fontId);
    applyFont(fontId);
  };

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
};

export const useFont = () => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
};
