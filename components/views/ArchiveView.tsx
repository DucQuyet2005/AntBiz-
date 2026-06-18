"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';

import { 
  Facebook, 
  Instagram, 
  Globe, 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  Search, 
  ChevronDown, 
  ArrowUpDown,
  Download,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function ArchiveView() {
  const { t, language } = useLanguage();
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [sortBy, setSortBy] = useState('Publish Date');
  const [activeTab, setActiveTab] = useState<'posts' | 'preview' | 'history'>('posts');
  const [isExporting, setIsExporting] = useState(false);
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
        setUserRole(data?.role || null);
      }
    }
    checkRole();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchExportJobs();
    } else if (activeTab === 'preview') {
      fetchPreviewData();
    }
  }, [activeTab, platformFilter]);

  const fetchExportJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch('/api/export-jobs');
      const json = await res.json();
      if (json.data) setExportJobs(json.data);
    } catch (error) {
      console.error('Failed to fetch export jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const fetchPreviewData = async () => {
    setIsFetchingPreview(true);
    try {
      const params = new URLSearchParams({
        platform: platformFilter,
        limit: '15'
      });
      // We can use a query to a general captions list or a specific preview endpoint
      const { data, error } = await supabase
        .from('captions')
        .select(`
          id,
          platform,
          ai_content,
          status,
          created_at,
          articles (title, category)
        `)
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (data) setPreviewData(data);
    } catch (error) {
      console.error('Failed to fetch preview data:', error);
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleExport = async () => {
    if (userRole === 'viewer') {
      alert(language === 'vi' ? 'Bạn không có quyền xuất dữ liệu.' : 'You do not have permission to export data.');
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        platform: platformFilter,
        format: 'csv'
      });
      
      const response = await fetch(`/api/captions/export?${params.toString()}`);
      
      if (response.status === 202) {
        alert(language === 'vi' 
          ? `Yêu cầu xuất CSV đã được tiếp nhận! Hệ thống đang xử lý và sẽ gửi file vào email của bạn trong ít phút.` 
          : `Export request received! We are processing it and will send the CSV file to your email shortly.`);
        setActiveTab('history');
        // Cho hệ thống load lại job mới
        setTimeout(() => fetchExportJobs(), 500);
      } else {
        const error = await response.json();
        alert(`Export failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('An unexpected error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMockCompleteJob = async (jobId: string) => {
    // This is for DEMO purposes to show the email/link flow
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/test/complete-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, userEmail: user?.email })
      });
      if (res.ok) {
        alert('Demo: Job marked as complete. Check console for mock email.');
        fetchExportJobs();
      }
    } catch (error) {
      console.error('Mock error:', error);
    }
  };

  const archiveItems = [
    {
      id: 1,
      type: 'TỔ ẤM 4.0',
      platform: 'blog',
      image: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80',
      title: '10 năm mua vàng và hành trình thoát cảnh ở trọ',
      description: 'Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.',
      reach: '51.1k',
      conversions: '3.2k',
      likes: 1240,
      comments: 185,
      nodeType: 'Case Study',
      link: '/archive/80861'
    },
    {
      id: 2,
      type: 'TÀI CHÍNH',
      platform: 'facebook',
      image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
      title: 'Quy tắc 50/30/20: Cách phân bổ lương 15 triệu',
      description: 'Bí quyết giúp người trẻ ở thành phố lớn không chỉ đủ sống mà còn có khoản tiết kiệm phòng thân với mức thu nhập cơ bản.',
      reach: '120k',
      conversions: '4.5k',
      likes: 3400,
      comments: 420,
      nodeType: 'Guide',
      link: '#'
    },
    {
      id: 3,
      type: 'BẤT ĐỘNG SẢN',
      platform: 'instagram',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      title: 'Sốt ảo vùng ven: Dấu hiệu nhận biết và cách né',
      description: 'Phân tích các dự án đất nền vùng ven đang bị đẩy giá lên cao bất thường. Đừng để dính bẫy tâm lý đám đông.',
      reach: '85k',
      conversions: '1.2k',
      likes: 850,
      comments: 95,
      nodeType: 'Analysis',
      link: '#'
    },
    {
      id: 4,
      type: 'THREAD',
      platform: 'threads',
      gradient: 'from-[#6366F1] via-[#D946EF] to-[#EC4899]',
      title: 'Chuyện gen Z bỏ việc lương cao để... bán trà sữa',
      description: 'Làm văn phòng thu nhập 30 triệu/tháng nhưng stress tột độ. Đánh đổi lấy sự tự do tài chính và tinh thần, liệu có đáng?',
      reach: '450k',
      conversions: '2.1k',
      likes: 432,
      comments: 37,
      nodeType: 'Organic Content Node',
      link: '#'
    }
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('archive.statusPending');
      case 'processing': return t('archive.statusProcessing');
      case 'completed': return t('archive.statusCompleted');
      case 'failed': return t('archive.statusFailed');
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} className="text-amber-500" />;
      case 'processing': return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'failed': return <AlertCircle size={14} className="text-rose-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Title & Subtitle */}
      <div className="mt-2 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('archive.title')}</h1>
          <p className="text-text-muted">{t('archive.subtitle')}</p>
        </div>
        
        {/* Export Button (Only if not Viewer) */}
        {userRole !== 'viewer' && (
          <button 
            onClick={handleExport}
            disabled={isExporting}
            title={t('archive.exportTooltip')}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-sm font-extrabold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none group"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />}
            <span>{isExporting ? t('common.loading') : t('archive.exportCta')}</span>
          </button>
        )}
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 text-sm font-extrabold transition-all relative ${activeTab === 'posts' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          {t('archive.tabPosts')}
          {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`px-6 py-3 text-sm font-extrabold transition-all relative ${activeTab === 'preview' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          {t('archive.tabPreview')}
          {activeTab === 'preview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-sm font-extrabold transition-all relative ${activeTab === 'history' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          {t('archive.tabHistory')}
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'posts' ? (
        <>
          {/* Search & Filters Controls Row */}
          <div className="flex justify-between items-center gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
              <input 
                type="text" 
                placeholder={t('archive.searchPlaceholder')} 
                className="w-full bg-sidebar/50 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted border border-gray-200/50 shadow-sm"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-3">
              
              {/* Platform Filter */}
              <div className="relative">
                <button className="bg-white border border-gray-200 text-text px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer select-none">
                  <span>{platformFilter === 'All Platforms' ? t('archive.allPlatforms') : platformFilter}</span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>
              </div>

              {/* Sort By */}
              <div className="relative">
                <button className="bg-white border border-gray-200 text-text px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer select-none">
                  <ArrowUpDown size={14} className="text-text-muted" />
                  <span>{sortBy === 'Publish Date' ? t('archive.publishDate') : sortBy}</span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>
              </div>

            </div>

          </div>

          {/* 3-Column Grid Cards */}
          <div className="grid grid-cols-3 gap-6 mt-2">
            {archiveItems.map((item) => (
              <Link 
                href={item.link}
                key={item.id} 
                className="bg-white border border-gray-200/60 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer flex flex-col justify-between"
              >
                
                {/* Top Visual Banner */}
                <div className="h-44 w-full relative shrink-0 bg-gray-100">
                  
                  {/* Image if available */}
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Gradient background for text/thread card */
                    <div className={`w-full h-full bg-gradient-to-tr ${item.gradient}`}></div>
                  )}

                  {/* Overlay Badges */}
                  
                  {/* Type Badge (Left) */}
                  <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
                    {item.type}
                  </span>

                  {/* Platform Icon Badge (Right) */}
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-sm select-none">
                    {item.platform === 'facebook' && <Facebook size={14} className="fill-white" />}
                    {item.platform === 'instagram' && <Instagram size={14} />}
                    {item.platform === 'blog' && <Globe size={14} />}
                    {item.platform === 'threads' && <ThreadsIcon size={14} />}
                  </div>

                </div>

                {/* Card Content Area */}
                <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                  
                  {/* Title & Desc */}
                  <div>
                    {item.nodeType && (
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1">
                        {item.nodeType}
                      </span>
                    )}
                    <h3 className="text-lg font-extrabold text-text tracking-tight mb-2 hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed font-medium">
                      {item.description}
                    </p>
                  </div>

                  {/* Metrics & Reactions */}
                  <div>
                    {/* Horizontal divider */}
                    <div className="border-t border-gray-100/80 my-4"></div>

                    {/* Reach & Conversions */}
                    <div className="flex gap-10">
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">{t('archive.totalReach')}</span>
                        <span className="text-sm font-extrabold text-text flex items-center gap-1">
                          <TrendingUp size={14} className="text-emerald-500" />
                          {item.reach}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">{t('archive.conversions')}</span>
                        <span className="text-sm font-extrabold text-text">
                          {item.conversions}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Reactions */}
                    <div className="flex items-center gap-4 text-xs font-semibold text-text-muted mt-5">
                      <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                        <Heart size={14} className="text-rose-400 fill-rose-50" />
                        <span>{item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}k` : item.likes}</span>
                      </div>
                      <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <MessageSquare size={14} />
                        <span>{item.comments}</span>
                      </div>
                    </div>

                  </div>

                </div>

              </Link>
            ))}
          </div>
        </>
      ) : activeTab === 'preview' ? (
        /* Data Preview Tab */
        <div className="flex flex-col gap-4">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <FileText size={18} />
            </div>
            <p className="text-xs text-emerald-800 font-bold">
              {language === 'vi' 
                ? 'Đây là 15 bản ghi mới nhất sẽ có trong tệp CSV của bạn.' 
                : 'These are the 15 latest records that will be in your CSV file.'}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-black text-text-muted uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 font-black text-text-muted uppercase tracking-wider">{language === 'vi' ? 'Tiêu đề bài viết' : 'Article Title'}</th>
                  <th className="px-4 py-3 font-black text-text-muted uppercase tracking-wider">{language === 'vi' ? 'Nền tảng' : 'Platform'}</th>
                  <th className="px-4 py-3 font-black text-text-muted uppercase tracking-wider">{language === 'vi' ? 'Nội dung AI' : 'AI Content'}</th>
                  <th className="px-4 py-3 font-black text-text-muted uppercase tracking-wider">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                  <th className="px-4 py-3 font-black text-text-muted uppercase tracking-wider">{language === 'vi' ? 'Ngày tạo' : 'Created At'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isFetchingPreview ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <Loader2 className="animate-spin inline-block mr-2" size={16} />
                      <span className="font-bold">{t('common.loading')}</span>
                    </td>
                  </tr>
                ) : previewData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-text-muted italic">No data found.</td>
                  </tr>
                ) : (
                  previewData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-gray-400">{row.id.substring(0, 8)}...</td>
                      <td className="px-4 py-3 font-bold text-text truncate max-w-[200px]">{row.articles?.title}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100 font-black text-[9px]">{row.platform}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted truncate max-w-[250px]">{row.ai_content}</td>
                      <td className="px-4 py-3 font-black text-[10px]">{row.status}</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(row.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Export History Tab */
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-extrabold text-text-muted uppercase text-[10px] tracking-wider">{t('archive.jobId')}</th>
                  <th className="px-6 py-4 font-extrabold text-text-muted uppercase text-[10px] tracking-wider">{t('archive.jobStatus')}</th>
                  <th className="px-6 py-4 font-extrabold text-text-muted uppercase text-[10px] tracking-wider">{t('archive.jobCreated')}</th>
                  <th className="px-6 py-4 font-extrabold text-text-muted uppercase text-[10px] tracking-wider text-right">{t('archive.jobDownload')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingJobs ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-text-muted">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="font-bold">{t('common.loading')}</span>
                      </div>
                    </td>
                  </tr>
                ) : exportJobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-text-muted italic font-medium">
                      {language === 'vi' ? 'Chưa có yêu cầu xuất dữ liệu nào.' : 'No export requests yet.'}
                    </td>
                  </tr>
                ) : (
                  exportJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-text-muted">{job.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-extrabold text-xs">
                          {getStatusIcon(job.status)}
                          <span>{getStatusLabel(job.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text-muted">
                        {new Date(job.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {job.status === 'pending' && (
                          <button 
                            onClick={() => handleMockCompleteJob(job.id)}
                            className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 underline"
                          >
                            Demo Complete
                          </button>
                        )}
                        {job.status === 'completed' && job.download_url ? (
                          <a 
                            href={job.download_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                          >
                            <Download size={14} />
                            {t('archive.jobDownload')}
                          </a>
                        ) : (
                          <span className="text-gray-300">
                            <Download size={14} className="inline" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center gap-3 p-5 bg-blue-50/50 border border-blue-100 rounded-3xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Clock size={20} />
            </div>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              {language === 'vi' 
                ? 'Các yêu cầu xuất dữ liệu lớn (>1000 dòng) được xử lý dưới nền. Link tải sẽ được gửi qua email sau khi hoàn tất và tồn tại trong 24h.' 
                : 'Large export requests (>1000 rows) are processed in the background. Download links will be sent via email once finished and expire after 24 hours.'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
