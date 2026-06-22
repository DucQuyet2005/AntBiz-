import React from 'react';
import { Trash2, Plus, GripVertical } from 'lucide-react';

interface Feature {
  icon: string;
  title: string;
  desc: string;
  image: string;
}

interface SectionsConfig {
  aboutTitle: string;
  aboutContent: string;
  featuresTitle: string;
  features: Feature[];
  footerText: string;
}

interface Props {
  config: SectionsConfig;
  onChange: (key: string, value: any) => void;
}

export default function SectionsForm({ config, onChange }: Props) {

  const addFeature = () => {
    onChange('features', [...config.features, { icon: 'Star', title: 'New Feature', desc: 'Description here', image: '' }]);
  };

  const updateFeature = (index: number, key: keyof Feature, value: string) => {
    const newFeatures = [...config.features];
    newFeatures[index] = { ...newFeatures[index], [key]: value };
    onChange('features', newFeatures);
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...config.features];
    newFeatures.splice(index, 1);
    onChange('features', newFeatures);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 1. About Section */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          Section Giới thiệu (About)
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Tiêu đề (H2)</label>
            <textarea 
              value={config.aboutTitle}
              onChange={(e) => onChange('aboutTitle', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none resize-none h-20"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Nội dung chi tiết</label>
            <textarea 
              value={config.aboutContent}
              onChange={(e) => onChange('aboutContent', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none resize-y min-h-[120px]"
            />
            <p className="text-[10px] text-slate-400 font-medium">Sử dụng plain text hoặc mã HTML cơ bản (như &lt;b&gt;, &lt;br&gt;) để định dạng.</p>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. Features Section */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2 flex justify-between items-center">
          <span>Section Tính năng (Features)</span>
          <button 
            onClick={addFeature}
            className="flex items-center gap-1 text-[10px] bg-[#5A5CDE]/10 text-[#5A5CDE] px-2 py-1 rounded font-bold hover:bg-[#5A5CDE]/20 transition-colors"
          >
            <Plus size={12} /> Thêm tính năng
          </button>
        </h3>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Tiêu đề (H2)</label>
            <input 
              type="text"
              value={config.featuresTitle}
              onChange={(e) => onChange('featuresTitle', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {config.features.map((feature, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
              <div className="absolute top-4 left-2 text-slate-300 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
              </div>
              <div className="pl-6 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tiêu đề Card</label>
                    <input 
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="w-24 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tên Icon</label>
                    <input 
                      type="text"
                      value={feature.icon}
                      onChange={(e) => updateFeature(idx, 'icon', e.target.value)}
                      placeholder="lucide-icon"
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Hình ảnh URL</label>
                  <input 
                    type="text"
                    value={feature.image}
                    onChange={(e) => updateFeature(idx, 'image', e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mô tả chi tiết</label>
                  <textarea 
                    value={feature.desc}
                    onChange={(e) => updateFeature(idx, 'desc', e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-medium outline-none h-16 resize-none"
                  />
                </div>
              </div>
              <button 
                onClick={() => removeFeature(idx)}
                className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 bg-red-50 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                title="Xóa thẻ"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 3. Footer Section */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          Footer
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Bản quyền (Copyright text)</label>
          <input 
            type="text" 
            value={config.footerText}
            onChange={(e) => onChange('footerText', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none"
          />
        </div>
      </div>
      
    </div>
  );
}
