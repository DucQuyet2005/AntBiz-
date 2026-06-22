import React from 'react';

interface HeroConfig {
  tagline: string;
  description: string;
  ctaText: string;
  bgImageUrl: string;
}

interface Props {
  config: HeroConfig;
  onChange: (key: string, value: any) => void;
}

export default function HeroForm({ config, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          Nội dung Hero
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Tagline (Tiêu đề chính)</label>
            <textarea 
              value={config.tagline}
              onChange={(e) => onChange('tagline', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none resize-none h-20"
              placeholder="Nhập tiêu đề chính..."
            />
            <p className="text-[10px] text-slate-400 font-medium text-right">{config.tagline.length}/80 ký tự</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Description (Mô tả phụ)</label>
            <textarea 
              value={config.description}
              onChange={(e) => onChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none resize-none h-24"
              placeholder="Nhập đoạn mô tả ngắn gọn..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Text nút Call-To-Action</label>
            <input 
              type="text" 
              value={config.ctaText}
              onChange={(e) => onChange('ctaText', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none"
              placeholder="VD: Trải Nghiệm Ngay"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          Hình ảnh Hero (Background)
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Image URL</label>
          <input 
            type="text" 
            value={config.bgImageUrl}
            onChange={(e) => onChange('bgImageUrl', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none"
            placeholder="https://..."
          />
          <div className="mt-2 w-full h-32 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative group">
            {config.bgImageUrl ? (
              <img 
                src={config.bgImageUrl} 
                alt="Hero Background Preview" 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                Không có ảnh
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Nhập URL ảnh nền Hero. Khuyến nghị tỷ lệ 16:9, độ phân giải cao (ví dụ: 1920x1080).</p>
        </div>
      </div>
    </div>
  );
}
