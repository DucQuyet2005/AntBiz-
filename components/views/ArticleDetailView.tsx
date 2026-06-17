"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  Link as LinkIcon, 
  Edit3, 
  Eye, 
  Quote, 
  Tag, 
  Calendar, 
  User,
  ThumbsUp,
  MessageSquare,
  Heart,
  MessageCircle,
  Repeat2,
  Check,
  Loader2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

// Mock data based on the provided JSON
const articleData = {
  url: "https://gocnhinmoi.com.vn/10-nam-mua-vang-va-hanh-trinh-thoat-canh-o-tro-80861",
  title: "10 năm mua vàng và hành trình thoát cảnh ở trọ",
  category: "#Tổ ấm 4.0",
  description: "Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. (sinh năm 1990, Nghệ An) lại thấy lòng mình nhẹ nhõm đến lạ.",
  author: "Linh Trang",
  published_at: "26/04/2026 08:00",
  views: "51.1K lượt xem",
  tags: [
    "#Tiết kiệm tài chính",
    "#Mua nhà",
    "#Cuộc sống đô thị",
    "#Chiến lược đầu tư",
    "#Người trẻ",
    "#Lạm phát"
  ],
  images: [
    {
      url: "https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80",
      caption: "Những ngày tháng tích cóp tại tiệm vàng..."
    },
    {
      url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
      caption: "Thành quả sau 10 năm không ngừng..."
    }
  ]
};

export default function ArticleDetailView() {
  const { t, language } = useLanguage();
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState<any>(articleData);
  const [captions, setCaptions] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'threads'>('facebook');
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [reverting, setReverting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  function loadMockData() {
    const fbText = "Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.\n\nSau 10 năm tích cóp mua vàng, hai vợ chồng cuối cùng cũng chạm tay vào ước mơ sở hữu căn hộ riêng tại Hà Nội. Đọc chi tiết hành trình đầy cảm hứng này tại AntBiz!";
    const threadsText = "10 năm mua vàng mua nhà: Hành trình thoát cảnh đi thuê trọ của vợ chồng trẻ. 🏠\n\nTừ hai bàn tay trắng, tích lũy từng chỉ vàng mỗi tháng làm quỹ mua nhà. Sau một thập kỷ kiên trì, giấc mơ an cư đã thành hiện thực. Bạn có đang tích lũy vàng để mua nhà không?";

    setCaptions([
      { id: 'mock-fb', platform: 'facebook', content: fbText },
      { id: 'mock-threads', platform: 'threads', content: threadsText }
    ]);

    setCheckpoints([
      {
        id: 'cp-3',
        version: 'v3',
        created_at: '17/06/2026 10:00',
        content: {
          facebook: fbText,
          threads: threadsText
        }
      },
      {
        id: 'cp-2',
        version: 'v2',
        created_at: '16/06/2026 14:30',
        content: {
          facebook: "Bật mí hành trình 10 năm mua vàng của cặp vợ chồng Nghệ An để thoát cảnh trọ tại Hà Nội. Tài khoản gần như cạn kiệt nhưng lòng nhẹ nhõm đến lạ. Hãy chia sẻ câu chuyện của bạn cùng AntBiz.",
          threads: "Cặp vợ chồng 9x Nghệ An mua vàng tích lũy trong 10 năm để sở hữu căn hộ chung cư 2 phòng ngủ đầu tiên. Hành trình kiên trì đáng khâm phục!"
        }
      },
      {
        id: 'cp-1',
        version: 'v1',
        created_at: '15/06/2026 09:00',
        content: {
          facebook: "10 năm mua vàng và hành trình thoát cảnh ở trọ của anh Phạm Quang H. Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, tài khoản ngân hàng thì cạn kiệt nhưng lòng thấy nhẹ nhõm.",
          threads: "10 năm mua vàng và hành trình thoát cảnh ở trọ. Câu chuyện thực tế của một gia đình trẻ."
        }
      }
    ]);
  }

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setLoading(false);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        loadMockData();
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Article
        const { data: art, error: artErr } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();

        if (artErr || !art) {
          loadMockData();
          setLoading(false);
          return;
        }

        const mappedArticle = {
          url: art.url || '',
          title: art.title || 'Không có tiêu đề',
          category: art.category || '#Chưa phân loại',
          description: art.description || '',
          author: art.author || 'Không rõ',
          published_at: art.published_at || 'Vừa xong',
          views: art.views || '0 lượt xem',
          tags: Array.isArray(art.tags) ? art.tags : (art.tags ? art.tags.split(',').map((t: string) => t.trim()) : []),
          images: Array.isArray(art.images) ? art.images : [{ url: art.images || 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80', caption: 'Hình ảnh bài viết' }]
        };
        setActiveArticle(mappedArticle);

        // 2. Fetch platform from ab_tests
        const { data: abTests } = await supabase
          .from('ab_tests')
          .select('platform')
          .eq('article_id', id);
        
        let dbPlatform: 'facebook' | 'threads' = 'facebook';
        if (abTests && abTests.length > 0) {
          const plat = abTests[0].platform;
          if (plat === 'threads' || plat === 'facebook') {
            dbPlatform = plat;
          }
        }
        setSelectedPlatform(dbPlatform);

        // 3. Fetch captions
        const { data: dbCaptions } = await supabase
          .from('captions')
          .select('*')
          .eq('article_id', id);

        if (dbCaptions && dbCaptions.length > 0) {
          setCaptions(dbCaptions);
          
          // 4. Fetch caption_versions for the first caption
          const mainCaption = dbCaptions[0];
          const { data: dbVersions } = await supabase
            .from('caption_versions')
            .select('*')
            .eq('caption_id', mainCaption.id)
            .order('created_at', { ascending: false });

          if (dbVersions && dbVersions.length > 0) {
            const mappedVersions = dbVersions.map((v: any, index: number) => ({
              id: v.id,
              caption_id: v.caption_id,
              version: `v${dbVersions.length - index}`,
              created_at: new Date(v.created_at).toLocaleString('vi-VN'),
              content: v.content,
              platform: mainCaption.platform || dbPlatform
            }));
            setCheckpoints(mappedVersions);
          } else {
            setCheckpoints([
              {
                id: 'curr',
                caption_id: mainCaption.id,
                version: 'v1',
                created_at: new Date().toLocaleString('vi-VN'),
                content: mainCaption.content,
                platform: dbPlatform
              }
            ]);
          }
        } else {
          loadMockData();
        }
      } catch (err) {
        console.error("Error loading Supabase data:", err);
        loadMockData();
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const getDisplayContent = () => {
    if (selectedCheckpoint) {
      if (typeof selectedCheckpoint.content === 'object') {
        return selectedCheckpoint.content[selectedPlatform] || '';
      }
      return selectedCheckpoint.content || '';
    }

    const activeCap = captions.find(c => c.platform === selectedPlatform);
    if (activeCap) return activeCap.content;

    if (captions.length > 0) {
      return captions[0].content;
    }
    return '';
  };

  const handleRevert = async () => {
    if (!selectedCheckpoint) return;
    setReverting(true);
    setSuccessMsg('');

    const textToRestore = typeof selectedCheckpoint.content === 'object'
      ? selectedCheckpoint.content[selectedPlatform]
      : selectedCheckpoint.content;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id) && selectedCheckpoint.caption_id) {
      try {
        const { error } = await supabase
          .from('captions')
          .update({ content: textToRestore, updated_at: new Date().toISOString() })
          .eq('id', selectedCheckpoint.caption_id);

        if (error) throw error;

        setCaptions(prev => prev.map(c => c.id === selectedCheckpoint.caption_id ? { ...c, content: textToRestore } : c));
      } catch (err) {
        console.error("Database revert error:", err);
      }
    } else {
      // Mock mode rollback
      setCaptions(prev => prev.map(c => c.platform === selectedPlatform ? { ...c, content: textToRestore } : c));
    }

    setSuccessMsg(language === 'vi' 
      ? `Đã khôi phục thành công về bản lưu ${selectedCheckpoint.version}!` 
      : `Reverted successfully to version ${selectedCheckpoint.version}!`);
    
    setSelectedCheckpoint(null);
    setReverting(false);

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#3F51B5] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/archive" className="hover:text-text transition-colors p-1 -ml-1">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/archive" className="hover:text-text transition-colors">{t('articleDetail.contentList')}</Link>
            <span>/</span>
            <span className="text-text max-w-[200px] truncate" title={activeArticle.title}>
              {activeArticle.title}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-white border border-[#E4E6F8] shadow-sm flex items-center justify-center text-text-muted hover:bg-gray-50 transition-colors">
            <Share2 size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-white border border-[#E4E6F8] shadow-sm flex items-center justify-center text-text-muted hover:bg-gray-50 transition-colors">
            <LinkIcon size={18} />
          </button>
          <button className="bg-[#3F51B5] hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-md shadow-[#3F51B5]/20 flex items-center gap-2">
            <Edit3 size={16} />
            {t('articleDetail.editPost')}
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 text-xs font-bold shadow-sm"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Check size={14} />
          </div>
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Main Article Details & Mockups) */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* Title & Author Card */}
          <div className="bg-[#F8F9FE] rounded-[32px] p-8 flex flex-col gap-5 border border-[#E4E6F8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3F51B5] bg-white px-4 py-1.5 rounded-full w-fit shadow-sm border border-[#E4E6F8]">
              <span>🏠</span>
              {activeArticle.category}
            </div>
            
            <h1 className="text-4xl font-extrabold text-[#1E293B] leading-[1.15] tracking-tight pr-10">
              {activeArticle.title}
            </h1>
            
            <div className="flex items-center gap-6 mt-3 pt-6 border-t border-[#E4E6F8]">
              <div className="flex items-center gap-2 text-text-muted text-sm font-semibold">
                <div className="w-6 h-6 rounded-full bg-[#E9EAF5] text-[#3F51B5] flex items-center justify-center">
                  <User size={12} />
                </div>
                {activeArticle.author}
              </div>
              <div className="flex items-center gap-2 text-text-muted text-sm font-semibold">
                <Calendar size={16} />
                {activeArticle.published_at}
              </div>
            </div>
          </div>

          {/* High-Fidelity Platform Mockup Viewport */}
          <div className="bg-white border border-gray-200/80 rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={16} className="text-[#3F51B5]" />
                {language === 'vi' ? 'Bản xem trước mạng xã hội' : 'Social Media Preview'}
              </h3>
              
              <div className="flex bg-[#F8F9FE] rounded-full p-1 border border-[#E4E6F8]">
                <button 
                  onClick={() => setSelectedPlatform('facebook')}
                  className={`text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${
                    selectedPlatform === 'facebook' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <ThumbsUp size={11} className={selectedPlatform === 'facebook' ? 'fill-white' : ''} />
                  Facebook
                </button>
                <button 
                  onClick={() => setSelectedPlatform('threads')}
                  className={`text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${
                    selectedPlatform === 'threads' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <ThreadsIcon size={11} />
                  Threads
                </button>
              </div>
            </div>

            {/* Warning Checkpoint Banner */}
            {selectedCheckpoint && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-amber-850">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    {language === 'vi' 
                      ? `Bạn đang xem bản lưu cũ (${selectedCheckpoint.version}) tạo lúc ${selectedCheckpoint.created_at}`
                      : `Viewing historical checkpoint (${selectedCheckpoint.version}) from ${selectedCheckpoint.created_at}`}
                  </span>
                </div>
                <button 
                  onClick={handleRevert}
                  disabled={reverting}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-[11px] font-extrabold shrink-0 disabled:opacity-50 cursor-pointer border-0"
                >
                  {reverting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCcw size={12} />
                  )}
                  {language === 'vi' ? 'Khôi phục bản này' : 'Revert to this'}
                </button>
              </div>
            )}

            {/* Post Layout Display */}
            <div className="border border-gray-100 rounded-2xl bg-gray-50/10 overflow-hidden shadow-inner/5">
              {selectedPlatform === 'facebook' ? (
                /* Facebook Preview Mockup */
                <div className="flex flex-col bg-white">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#3F51B5] flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                        AB
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text flex items-center gap-1 select-none">
                          AntBiz Official
                          <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                        </span>
                        <span className="text-[9px] text-text-muted">{language === 'vi' ? '7 giờ' : '7 hrs'} · 🌍</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 text-xs text-text leading-relaxed whitespace-pre-wrap">
                    {getDisplayContent()}
                  </div>

                  {activeArticle.images && activeArticle.images.length > 0 && (
                    <div className="aspect-[1.91/1] w-full bg-gray-50 relative overflow-hidden border-y border-gray-100">
                      <img src={activeArticle.images[0].url} alt="FB Post asset" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="px-2 py-1.5 flex border-t border-gray-100 text-[10px] text-text-muted font-bold justify-between select-none">
                    <button className="flex-1 py-2 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent">
                      <ThumbsUp size={12} /> {language === 'vi' ? 'Thích' : 'Like'}
                    </button>
                    <button className="flex-1 py-2 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent">
                      <MessageSquare size={12} /> {language === 'vi' ? 'Bình luận' : 'Comment'}
                    </button>
                    <button className="flex-1 py-2 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent">
                      <Share2 size={12} /> {language === 'vi' ? 'Chia sẻ' : 'Share'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Threads Preview Mockup */
                <div className="bg-white p-5 flex gap-3.5 text-text">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-9 h-9 rounded-full bg-[#1E293B] flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                      T
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text select-none">antbiz_official</span>
                      <span className="text-[10px] text-text-muted select-none">{language === 'vi' ? '2 giờ trước' : '2h ago'}</span>
                    </div>

                    <div className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                      {getDisplayContent()}
                    </div>

                    {activeArticle.images && activeArticle.images.length > 0 && (
                      <div className="aspect-[1.91/1] w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm mt-1">
                        <img src={activeArticle.images[0].url} alt="Threads content" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-gray-400 mt-2 select-none">
                      <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                      <MessageCircle size={14} className="hover:text-[#3F51B5] cursor-pointer transition-colors" />
                      <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                      <Share2 size={14} className="hover:text-[#3F51B5] cursor-pointer transition-colors" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-[#F3F4FD] to-[#EEF2FF] rounded-[32px] p-8 border border-[#E4E6F8] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 text-[#3F51B5] font-bold text-lg mb-4">
              <Quote size={20} className="fill-current opacity-5 absolute top-6 right-6 w-32 h-32" />
              <Quote size={20} />
              <h2>{t('articleDetail.summary')}</h2>
            </div>
            <p className="text-text-muted font-semibold leading-relaxed relative z-10 text-[15px] pr-12">
              {activeArticle.description}
            </p>
          </div>

          {/* Image Cards Row */}
          <div className="grid grid-cols-2 gap-5">
            {activeArticle.images.map((img: any, idx: number) => (
              <div key={idx} className="relative h-[240px] rounded-[32px] overflow-hidden group cursor-pointer shadow-sm border border-gray-200">
                <img 
                  src={img.url} 
                  alt={`Image ${idx}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {img.caption && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                    <p className="text-white font-bold text-sm line-clamp-2 drop-shadow-md">
                      {img.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Right Column (Sidebar metrics, checkpoints, tags) */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* Performance Metrics Card */}
          <div className="bg-[#FCF9F2] border border-[#F2E8D5] rounded-[32px] p-7 shadow-sm">
            <h3 className="text-[11px] font-bold tracking-[0.1em] text-amber-800/50 uppercase mb-5">
              {t('articleDetail.performanceMetrics')}
            </h3>
            
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#F2E8D5] flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Eye size={24} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-text-muted">{t('articleDetail.totalViews')}</span>
                <span className="text-3xl font-extrabold text-[#1E293B]">{activeArticle.views.replace(/[^0-9.]/g, '') || '51.1K'}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="w-full bg-gray-200/50 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-800/70 w-[85%] h-full rounded-full"></div>
              </div>
              <p className="text-[10px] font-bold text-amber-800/60 text-right mt-1">
                {t('articleDetail.topPercent')}
              </p>
            </div>
          </div>

          {/* Checkpoint Version History Card */}
          <div className="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-[11px] font-bold tracking-[0.1em] text-[#1E293B]/60 uppercase border-b border-gray-100 pb-3 flex items-center gap-1.5 select-none">
              <RotateCcw size={13} className="text-[#3F51B5]" />
              {language === 'vi' ? 'Lịch sử Checkpoint' : 'Checkpoint History'}
            </h3>

            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {checkpoints.length > 0 ? (
                checkpoints.map((cp) => {
                  const isViewing = selectedCheckpoint?.id === cp.id;
                  const isActive = !selectedCheckpoint && cp.version === `v${checkpoints.length}`;

                  return (
                    <button 
                      key={cp.id}
                      onClick={() => {
                        if (isViewing) {
                          setSelectedCheckpoint(null);
                        } else {
                          setSelectedCheckpoint(cp);
                        }
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-1.5 cursor-pointer relative overflow-hidden bg-transparent ${
                        isViewing 
                          ? 'border-[#3F51B5] bg-[#3F51B5]/5 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300 bg-gray-50/10 hover:bg-gray-50/30'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-[#3F51B5] text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-bl select-none">
                          {language === 'vi' ? 'Hiện tại' : 'Current'}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-extrabold ${isViewing ? 'text-[#3F51B5]' : 'text-text'}`}>
                          Checkpoint {cp.version}
                        </span>
                        <span className="text-[9px] text-text-muted font-semibold">
                          {cp.created_at.split(' ')[0]}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-text-muted truncate leading-relaxed">
                        {typeof cp.content === 'object' 
                          ? (cp.content[selectedPlatform] || cp.content['facebook'] || '')
                          : cp.content
                        }
                      </p>

                      <div className="text-[8px] text-[#3F51B5] font-bold text-right pt-0.5 mt-0.5 border-t border-gray-100/50">
                        {language === 'vi' ? 'Bấm để xem thử' : 'Click to preview'}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-text-muted italic">
                  {language === 'vi' ? 'Không có bản checkpoint nào.' : 'No checkpoints found.'}
                </div>
              )}
            </div>
          </div>

          {/* Metadata Tags Card */}
          <div className="bg-white border border-[#E4E6F8] rounded-[32px] p-7 shadow-sm">
            <div className="flex items-center gap-2 text-[#1E293B] font-bold text-sm mb-5">
              <Tag size={18} className="text-text-muted" />
              <h3>{t('articleDetail.metadataTags')}</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {activeArticle.tags.map((tag: string, idx: number) => (
                <span 
                  key={idx} 
                  className="bg-[#F3F4FD] text-[#3F51B5] px-4 py-2 rounded-full text-[13px] font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

