"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { useParams, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast, useToast } from '@/components/Toast';
import PopupDialog, { PopupType } from '@/components/PopupDialog';

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

function parseCustomDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  // Try default constructor first
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Match dd/mm/yyyy hh:mm or dd/mm/yyyy, hh:mm
  const match = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second);
  }
  
  return new Date();
}

function formatRelativeTime(dateInput: any, lang: string, platform: 'facebook' | 'threads') {
  if (!dateInput) {
    return lang === 'vi' ? 'Vừa xong' : 'Just now';
  }
  
  const date = parseCustomDate(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return lang === 'vi' ? 'Vừa xong' : 'Just now';
  }
  if (diffMin < 60) {
    if (platform === 'facebook') {
      return lang === 'vi' ? `${diffMin} phút` : `${diffMin} mins`;
    } else {
      return lang === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
    }
  }
  if (diffHr < 24) {
    if (platform === 'facebook') {
      return lang === 'vi' ? `${diffHr} giờ` : `${diffHr} hrs`;
    } else {
      return lang === 'vi' ? `${diffHr} giờ trước` : `${diffHr}h ago`;
    }
  }
  if (diffDay < 7) {
    if (platform === 'facebook') {
      return lang === 'vi' ? `${diffDay} ngày` : `${diffDay} days`;
    } else {
      return lang === 'vi' ? `${diffDay} ngày trước` : `${diffDay}d ago`;
    }
  }
  return date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function ArticleDetailView() {
  const { t, language } = useLanguage();
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const captionIdParam = searchParams?.get('captionId');
  const supabase = createClient();
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<any>(articleData);
  const [captions, setCaptions] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'threads'>('facebook');
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [reverting, setReverting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isFbExpanded, setIsFbExpanded] = useState(false);
  const [isThreadsExpanded, setIsThreadsExpanded] = useState(false);
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [versionTrigger, setVersionTrigger] = useState(0);

  // PopupDialog State
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMsg, setPopupMsg] = useState('');
  const [popupType, setPopupType] = useState<PopupType>('info');

  // Helper to get active caption prioritizing posted > scheduled > draft
  const getActiveCaption = (plat: 'facebook' | 'threads') => {
    const platCaps = captions.filter(c => c.platform === plat);
    if (platCaps.length === 0) return null;

    // First try to find posted status
    const postedCap = platCaps.find(c => {
      if (c.status === 'posted') return true;
      const sched = scheduledPosts.find(s => s.caption_id === c.id);
      return sched?.status === 'posted';
    });
    if (postedCap) return postedCap;

    // Then try scheduled/pending
    const scheduledCap = platCaps.find(c => {
      if (c.status === 'scheduled' || c.status === 'pending') return true;
      const sched = scheduledPosts.find(s => s.caption_id === c.id);
      return sched?.status === 'scheduled' || sched?.status === 'pending';
    });
    if (scheduledCap) return scheduledCap;

    // Fallback to the latest updated one
    return platCaps.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
  };

  // Automatically toggle platform and highlight mockup if captionId query param is provided
  useEffect(() => {
    if (captionIdParam && captions.length > 0) {
      const matchingCap = captions.find(c => c.id === captionIdParam);
      if (matchingCap) {
        if (matchingCap.platform === 'facebook' || matchingCap.platform === 'threads') {
          setSelectedPlatform(matchingCap.platform);
        }
        setIsHighlighted(true);
        const timer = setTimeout(() => setIsHighlighted(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [captionIdParam, captions]);

  function loadMockData() {
    const fbText = "Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.\n\nSau 10 năm tích cóp mua vàng, hai vợ chồng cuối cùng cũng chạm tay vào ước mơ sở hữu căn hộ riêng tại Hà Nội. Đọc chi tiết hành trình đầy cảm hứng này tại AntBiz!";
    const threadsText = "10 năm mua vàng mua nhà: Hành trình thoát cảnh đi thuê trọ của vợ chồng trẻ. 🏠\n\nTừ hai bàn tay trắng, tích lũy từng chỉ vàng mỗi tháng làm quỹ mua nhà. Sau một thập kỷ kiên trì, giấc mơ an cư đã thành hiện thực. Bạn có đang tích lũy vàng để mua nhà không?";

    setCaptions([
      { id: 'mock-fb', platform: 'facebook', content: fbText, created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() },
      { id: 'mock-threads', platform: 'threads', content: threadsText, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
    ]);

    setScheduledPosts([
      {
        caption_id: 'mock-fb',
        status: 'posted',
        posted_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        scheduled_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
      },
      {
        caption_id: 'mock-threads',
        status: 'pending',
        posted_at: null,
        scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      }
    ]);

    setActiveArticle(articleData);

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

        // Derive full_text từ body blocks nếu full_text rỗng (bài cũ chưa re-crawl)
        const bodyText = Array.isArray(art.body)
          ? art.body
            .filter((b: any) => b.type !== 'image' && b.text)
            .map((b: any) => b.text)
            .join('\n')
          : '';

        const mappedArticle = {
          url: art.url || '',
          title: art.title || 'Không có tiêu đề',
          // Đảm bảo category luôn có dấu # (bài cũ DB có thể lưu không có #)
          category: art.category
            ? (art.category.startsWith('#') ? art.category : `#${art.category}`)
            : '#Chưa phân loại',
          description: art.description || '',
          author: art.author || 'Không rõ',
          published_at: art.published_at || 'Vừa xong',
          // Giữ nguyên chuỗi views thô cào được (ví dụ: "1.0K lượt xem", "996 lượt xem")
          views: art.views || '0 lượt xem',
          // Ưu tiên full_text từ DB, fallback derive từ body blocks
          full_text: art.full_text || bodyText,
          // body: JSONB array of blocks [{type:'image'|'text', url?, caption?, text?}]
          body: Array.isArray(art.body) ? art.body : [],
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
          
          // 4. Fetch scheduled posts for these captions
          const captionIds = dbCaptions.map(c => c.id);
          const { data: schedData } = await supabase
            .from('scheduled_posts')
            .select('*')
            .in('caption_id', captionIds);
          if (schedData) {
            setScheduledPosts(schedData);
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

  useEffect(() => {
    const fetchVersions = async () => {
      const activeCap = getActiveCaption(selectedPlatform) || captions[0];
      if (!activeCap || !activeCap.id) return;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(activeCap.id)) return; // Skip mock caption

      try {
        const { data: dbVersions, error } = await supabase
          .from('caption_versions')
          .select('*')
          .eq('caption_id', activeCap.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (dbVersions && dbVersions.length > 0) {
          const mappedVersions = dbVersions.map((v: any, index: number) => ({
            id: v.id,
            caption_id: v.caption_id,
            version: `v${dbVersions.length - index}`,
            created_at: new Date(v.created_at).toLocaleString('vi-VN'),
            content: v.content,
            platform: selectedPlatform
          }));
          setCheckpoints(mappedVersions);
        } else {
          setCheckpoints([
            {
              id: 'curr',
              caption_id: activeCap.id,
              version: 'v1',
              created_at: new Date(activeCap.created_at || new Date()).toLocaleString('vi-VN'),
              content: activeCap.edited_content || activeCap.ai_content || activeCap.content || '',
              platform: selectedPlatform
            }
          ]);
        }
      } catch (err) {
        console.error("Error loading caption versions:", err);
      }
    };

    if (captions.length > 0) {
      fetchVersions();
    }
  }, [selectedPlatform, captions, versionTrigger]);

  // Refs to prevent Realtime WebSocket reconnect on every key stroke
  const isEditingRef = useRef(isEditing);
  const editTextRef = useRef(editText);
  const selectedPlatformRef = useRef(selectedPlatform);
  const captionsRef = useRef(captions);
  const userIdRef = useRef(userId);
  const articleTitleRef = useRef(activeArticle.title);
  const languageRef = useRef(language);

  useEffect(() => {
    isEditingRef.current = isEditing;
    editTextRef.current = editText;
    selectedPlatformRef.current = selectedPlatform;
    captionsRef.current = captions;
    userIdRef.current = userId;
    articleTitleRef.current = activeArticle.title;
    languageRef.current = language;
  }, [isEditing, editText, selectedPlatform, captions, userId, activeArticle.title, language]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return; // Skip if mock route

    const channel = supabase
      .channel(`article-detail-schedule-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scheduled_posts'
        },
        async (payload) => {
          const newPost = payload.new;
          
          // Check if this post belongs to one of the captions in our list
          const matchedCaption = captionsRef.current.find(c => c.id === newPost.caption_id);
          if (!matchedCaption) return;

          // Update local scheduledPosts state
          setScheduledPosts(prev => prev.map(s => s.id === newPost.id ? newPost : s));

          if (newPost.status === 'posted') {
            // Update local captions state
            setCaptions(prev => prev.map(c => c.id === newPost.caption_id ? { ...c, status: 'posted' } : c));

            // Find the caption corresponding to the platform of the published post
            const activeCap = captionsRef.current.find(c => c.id === newPost.caption_id);
            const activePlat = activeCap?.platform?.toLowerCase() || 'facebook';
            
            if (isEditingRef.current && activeCap && selectedPlatformRef.current.toLowerCase() === activePlat) {
              const originalText = activeCap.edited_content || activeCap.ai_content || activeCap.content || '';
              
              if (editTextRef.current.trim() !== originalText.trim()) {
                try {
                  // 1. Get next version number
                  const { data: existingVersions } = await supabase
                    .from('caption_versions')
                    .select('version_number')
                    .eq('caption_id', activeCap.id);

                  let nextVersionNumber = 1;
                  if (existingVersions && existingVersions.length > 0) {
                    const maxVersion = Math.max(...existingVersions.map((v: any) => v.version_number));
                    nextVersionNumber = maxVersion + 1;
                  }

                  // 2. Insert unsaved editTextRef.current as new version
                  await supabase
                    .from('caption_versions')
                    .insert({
                      caption_id: activeCap.id,
                      version_number: nextVersionNumber,
                      content: editTextRef.current,
                      source: 'human',
                      created_at: new Date().toISOString()
                    });

                  // 3. Send in-app notification to user
                  if (userIdRef.current) {
                    await fetch('/api/notifications', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        userId: userIdRef.current,
                        type: 'info',
                        title: languageRef.current === 'vi' ? 'Tự động lưu bản nháp khi đăng bài' : 'Auto-saved draft on publish',
                        message: languageRef.current === 'vi'
                          ? `Bài viết '${articleTitleRef.current}' đã được đăng theo lịch hẹn. Nội dung chỉnh sửa chưa lưu đã được tự động lưu thành phiên bản v${nextVersionNumber}.`
                          : `The post '${articleTitleRef.current}' has been published. Your unsaved changes have been auto-saved as version v${nextVersionNumber}.`
                      }),
                    });
                  }

                  // 4. Trigger version list update
                  setVersionTrigger(prev => prev + 1);

                  // 5. Open PopupDialog notification
                  setPopupTitle(languageRef.current === 'vi' ? 'Đã đến giờ đăng bài' : 'Scheduled Posting Time Reached');
                  setPopupMsg(languageRef.current === 'vi' 
                    ? `Đã đến giờ đăng bài theo lịch hẹn! Bài viết gốc đã được đăng lên mạng xã hội thành công. Bản phác thảo chưa lưu bạn đang chỉnh sửa đã được tự động lưu lại vào Lịch sử phiên bản dưới dạng bản nháp v${nextVersionNumber}.`
                    : `The scheduled posting time has arrived! The original content was successfully published. Your unsaved draft has been automatically archived as version v${nextVersionNumber}.`
                  );
                  setPopupType('info');
                  setPopupOpen(true);
                } catch (err) {
                  console.error("Error auto-saving draft version:", err);
                }
              } else {
                // If there are no changes, just notify about publish
                setPopupTitle(languageRef.current === 'vi' ? 'Đã đến giờ đăng bài' : 'Scheduled Posting Time Reached');
                setPopupMsg(languageRef.current === 'vi'
                  ? 'Bài viết đã được đăng thành công theo lịch trình.'
                  : 'The post has been successfully published according to the schedule.'
                );
                setPopupType('info');
                setPopupOpen(true);
              }
              // Exit editing mode
              setIsEditing(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, supabase]);

  const getDisplayContent = () => {
    if (selectedCheckpoint) {
      if (typeof selectedCheckpoint.content === 'object') {
        return selectedCheckpoint.content[selectedPlatform] || '';
      }
      return selectedCheckpoint.content || '';
    }

    const activeCap = getActiveCaption(selectedPlatform);
    if (activeCap) {
      return activeCap.edited_content || activeCap.ai_content || activeCap.content || '';
    }

    if (captions.length > 0) {
      const firstCap = captions[0];
      return firstCap.edited_content || firstCap.ai_content || firstCap.content || '';
    }
    return '';
  };

  const getMockupDisplayTime = () => {
    if (selectedCheckpoint) {
      return formatRelativeTime(selectedCheckpoint.created_at, language, selectedPlatform);
    }
    const activeCap = getActiveCaption(selectedPlatform);
    if (!activeCap) {
      return language === 'vi' ? 'Chưa đăng' : 'Not published';
    }
    const sched = scheduledPosts.find(s => s.caption_id === activeCap.id);
    if (sched) {
      if (sched.status === 'posted') {
        const postTime = sched.posted_at || sched.scheduled_at || activeCap.created_at;
        return formatRelativeTime(postTime, language, selectedPlatform);
      } else {
        const schedTime = sched.scheduled_at;
        if (schedTime && new Date(schedTime) > new Date()) {
          // If scheduled for the future
          const formatted = new Date(schedTime).toLocaleString('vi-VN');
          return language === 'vi' ? `Lên lịch lúc ${formatted}` : `Scheduled at ${formatted}`;
        }
        return language === 'vi' ? 'Chưa đăng' : 'Not published';
      }
    }
    if (activeCap.status === 'posted') {
      return formatRelativeTime(activeCap.created_at, language, selectedPlatform);
    }
    return language === 'vi' ? 'Chưa đăng' : 'Not published';
  };

  const isPublished = captions.some(c => c.status === 'posted') || scheduledPosts.some(s => s.status === 'posted');

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPublished) {
      showToast(
        language === 'vi'
          ? 'Không thể chỉnh sửa bài viết đã được đăng lên mạng xã hội.'
          : 'Cannot edit a post that has already been published.',
        'error'
      );
      return;
    }
    const currentText = getDisplayContent();
    setEditText(currentText);
    setIsEditing(true);
  };

  const handleSaveToVersion = async () => {
    const activeCap = getActiveCaption(selectedPlatform) || captions[0];
    if (!activeCap) {
      showToast(language === 'vi' ? 'Không có caption nào để lưu.' : 'No caption found to save.', 'error');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(activeCap.id)) {
      try {
        const { data: existingVersions, error: fetchErr } = await supabase
          .from('caption_versions')
          .select('version_number')
          .eq('caption_id', activeCap.id);

        if (fetchErr) throw fetchErr;

        let nextVersionNumber = 1;
        if (existingVersions && existingVersions.length > 0) {
          const maxVersion = Math.max(...existingVersions.map((v: any) => v.version_number));
          nextVersionNumber = maxVersion + 1;
        }

        const { error: insertErr } = await supabase
          .from('caption_versions')
          .insert({
            caption_id: activeCap.id,
            version_number: nextVersionNumber,
            content: editText,
            source: 'human',
            created_at: new Date().toISOString()
          });

        if (insertErr) throw insertErr;

        showToast(
          language === 'vi'
            ? 'Đã lưu thay đổi vào lịch sử phiên bản thành công!'
            : 'Changes saved to version history successfully!',
          'success'
        );
        setVersionTrigger(prev => prev + 1);
        setIsEditing(false);
      } catch (err: any) {
        console.error("Error saving version:", err);
        showToast(err.message || 'Lỗi không xác định', 'error');
      }
    } else {
      // Mock mode
      const nextVerNum = checkpoints.length + 1;
      setCheckpoints(prev => [
        {
          id: `cp-mock-${Date.now()}`,
          caption_id: activeCap.id,
          version: `v${nextVerNum}`,
          created_at: new Date().toLocaleString('vi-VN'),
          content: editText,
          platform: selectedPlatform
        },
        ...prev
      ]);
      showToast(
        language === 'vi'
          ? 'Đã lưu thay đổi vào lịch sử phiên bản thành công!'
          : 'Changes saved to version history successfully!',
        'success'
      );
      setIsEditing(false);
    }
  };

  const handleSaveAndReplaceOriginal = async () => {
    const activeCap = getActiveCaption(selectedPlatform) || captions[0];
    if (!activeCap) {
      showToast(language === 'vi' ? 'Không có caption nào để lưu.' : 'No caption found to save.', 'error');
      return;
    }

    const originalText = activeCap.edited_content || activeCap.ai_content || activeCap.content || '';

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(activeCap.id)) {
      try {
        const { data: existingVersions, error: fetchErr } = await supabase
          .from('caption_versions')
          .select('version_number')
          .eq('caption_id', activeCap.id);

        if (fetchErr) throw fetchErr;

        let nextVersionNumber = 1;
        if (existingVersions && existingVersions.length > 0) {
          const maxVersion = Math.max(...existingVersions.map((v: any) => v.version_number));
          nextVersionNumber = maxVersion + 1;
        }

        const { error: insertErr } = await supabase
          .from('caption_versions')
          .insert({
            caption_id: activeCap.id,
            version_number: nextVersionNumber,
            content: originalText,
            source: 'human',
            created_at: new Date().toISOString()
          });

        if (insertErr) throw insertErr;

        const { error: updateErr } = await supabase
          .from('captions')
          .update({
            edited_content: editText,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeCap.id);

        if (updateErr) throw updateErr;

        setCaptions(prev => prev.map(c => c.id === activeCap.id ? { ...c, edited_content: editText } : c));
        showToast(
          language === 'vi'
            ? 'Đã lưu thay thế bản gốc và chuyển bản cũ vào lịch sử phiên bản thành công!'
            : 'Original replaced and archived successfully!',
          'success'
        );
        setVersionTrigger(prev => prev + 1);
        setIsEditing(false);
      } catch (err: any) {
        console.error("Error saving and replacing original:", err);
        showToast(err.message || 'Lỗi không xác định', 'error');
      }
    } else {
      // Mock mode
      const nextVerNum = checkpoints.length + 1;
      const archivedCheckpoint = {
        id: `cp-mock-orig-${Date.now()}`,
        caption_id: activeCap.id,
        version: `v${nextVerNum}`,
        created_at: new Date().toLocaleString('vi-VN'),
        content: originalText,
        platform: selectedPlatform
      };

      setCaptions(prev => prev.map(c => c.id === activeCap.id ? { ...c, edited_content: editText, content: editText } : c));
      setCheckpoints(prev => [archivedCheckpoint, ...prev]);

      showToast(
        language === 'vi'
          ? 'Đã lưu thay thế bản gốc và chuyển bản cũ vào lịch sử phiên bản thành công!'
          : 'Original replaced and archived successfully!',
        'success'
      );
      setIsEditing(false);
    }
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
          .update({ edited_content: textToRestore, updated_at: new Date().toISOString() })
          .eq('id', selectedCheckpoint.caption_id);

        if (error) throw error;

        setCaptions(prev => prev.map(c => c.id === selectedCheckpoint.caption_id ? { ...c, edited_content: textToRestore, content: textToRestore } : c));
      } catch (err) {
        console.error("Database revert error:", err);
      }
    } else {
      // Mock mode rollback
      setCaptions(prev => prev.map(c => c.platform === selectedPlatform ? { ...c, content: textToRestore, edited_content: textToRestore } : c));
    }

    setSuccessMsg(language === 'vi'
      ? `Đã khôi phục thành công về bản lưu ${selectedCheckpoint.version}!`
      : `Reverted successfully to version ${selectedCheckpoint.version}!`);

    // Gửi thông báo in-app
    if (userId) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            type: 'info',
            title: 'Khôi phục phiên bản lưu trữ',
            message: `Bạn đã khôi phục thành công phiên bản nội dung bài viết '${activeArticle.title}' về bản lưu ${selectedCheckpoint.version}.`,
          }),
        });
      } catch (err) {
        console.error('Lỗi khi gửi thông báo khôi phục phiên bản:', err);
      }
    }

    setSelectedCheckpoint(null);
    setReverting(false);

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-text-muted dark:text-zinc-400">
          <Link href="/archive" className="hover:text-text dark:hover:text-white transition-colors p-1 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/archive" className="hover:text-text dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded">{t('articleDetail.contentList')}</Link>
            <span>/</span>
            <span className="text-text dark:text-zinc-200 max-w-[200px] truncate" title={activeArticle.title}>
              {activeArticle.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800 shadow-sm flex items-center justify-center text-text-muted dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <Share2 size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800 shadow-sm flex items-center justify-center text-text-muted dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <LinkIcon size={18} />
          </button>
          <button
            onClick={handleEditClick}
            disabled={isEditing || isPublished}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isPublished
                ? 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed shadow-none'
                : isEditing
                ? 'bg-primary/10 text-primary/70 border border-primary/20 cursor-default shadow-none'
                : 'bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 cursor-pointer'
            }`}
          >
            <Edit3 size={16} />
            {isEditing 
              ? (language === 'vi' ? 'Đang chỉnh sửa' : 'Editing') 
              : t('articleDetail.editPost')}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (Main Article Details & Mockups) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

          {/* Title & Author Card */}
          <div className="bg-slate-50 dark:bg-zinc-900/40 rounded-2xl p-8 flex flex-col gap-5 border border-slate-200/60 dark:border-zinc-800/60 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-primary bg-white dark:bg-zinc-900 px-4 py-1.5 rounded-full w-fit shadow-sm border border-slate-200/60 dark:border-zinc-800">
              <span>🏠</span>
              {activeArticle.category}
            </div>

            <h1 className="text-4xl font-extrabold text-text dark:text-zinc-100 leading-[1.15] tracking-tight pr-10">
              {activeArticle.title}
            </h1>

            <div className="flex items-center gap-6 mt-3 pt-6 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-text-muted dark:text-zinc-400 text-sm font-semibold">
                <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                  <User size={12} />
                </div>
                {activeArticle.author}
              </div>
              <div className="flex items-center gap-2 text-text-muted dark:text-zinc-400 text-sm font-semibold">
                <Calendar size={16} />
                {activeArticle.published_at}
              </div>
            </div>
          </div>

          {/* High-Fidelity Platform Mockup Viewport */}
          <div className="bg-white/80 dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-3.5">
              <h3 className="text-xs font-extrabold text-text dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={16} className="text-primary" />
                {language === 'vi' ? 'Bản xem trước mạng xã hội' : 'Social Media Preview'}
              </h3>

              <div className="flex bg-slate-50 dark:bg-zinc-950 rounded-full p-1 border border-slate-200/60 dark:border-zinc-800">
                <button
                  onClick={() => setSelectedPlatform('facebook')}
                  className={`text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${selectedPlatform === 'facebook'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-text-muted dark:text-zinc-400 hover:text-text dark:hover:text-zinc-200'
                    }`}
                >
                  <ThumbsUp size={11} className={selectedPlatform === 'facebook' ? 'fill-white' : ''} />
                  Facebook
                </button>
                <button
                  onClick={() => setSelectedPlatform('threads')}
                  className={`text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${selectedPlatform === 'threads'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-text-muted dark:text-zinc-400 hover:text-text dark:hover:text-zinc-200'
                    }`}
                >
                  <ThreadsIcon size={11} />
                  Threads
                </button>
              </div>
            </div>

            {/* Warning Checkpoint Banner */}
            {selectedCheckpoint && (
              <div className="bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-amber-850 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    {language === 'vi'
                      ? `Bạn đang xem bản lưu cũ (${selectedCheckpoint.version}) tạo lúc ${selectedCheckpoint.created_at}`
                      : `Viewing historical checkpoint (${selectedCheckpoint.version}) from ${selectedCheckpoint.created_at}`}
                  </span>
                </div>
                {!isPublished && (
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
                )}
              </div>
            )}

            {/* Post Layout Display */}
            <div className={`border border-gray-100 dark:border-zinc-800 rounded-2xl bg-gray-50/10 overflow-hidden shadow-inner/5 transition-all duration-500 ${isHighlighted ? 'ring-4 ring-primary/40 border-primary bg-primary/5 animate-pulse' : ''}`}>
              {selectedPlatform === 'facebook' ? (
                /* Facebook Preview Mockup */
                <div className="flex flex-col bg-white dark:bg-zinc-900">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                        AB
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text dark:text-zinc-200 flex items-center gap-1 select-none">
                          AntBiz Official
                          <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                        </span>
                        <span className="text-[9px] text-text-muted dark:text-zinc-400">{getMockupDisplayTime()} · 🌍</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 text-xs text-text leading-relaxed flex flex-col gap-2">
                    {/* Title & Category block */}
                    <div className="font-extrabold text-[13px] text-text mb-0.5">
                      [{activeArticle.category.replace('#', '')}] {activeArticle.title}
                    </div>

                    {/* Caption content */}
                    <div className="whitespace-pre-wrap">
                      {isEditing ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full min-h-[160px] p-3 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium leading-relaxed bg-white dark:bg-zinc-955 text-text dark:text-zinc-200 resize-y"
                          placeholder={language === 'vi' ? 'Nhập nội dung bài đăng...' : 'Enter post content...'}
                        />
                      ) : (
                        (() => {
                          const content = getDisplayContent();
                          const shouldTruncate = content.length > 200;
                          const displayedText = shouldTruncate && !isFbExpanded
                            ? `${content.slice(0, 200)}...`
                            : content;
                          return (
                            <>
                              {displayedText}
                              {shouldTruncate && (
                                <button
                                  onClick={() => setIsFbExpanded(!isFbExpanded)}
                                  className="text-primary font-extrabold ml-1.5 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded inline-block bg-transparent border-0 p-0"
                                >
                                  {isFbExpanded
                                    ? (language === 'vi' ? 'Ẩn bớt' : 'Xem thêm')
                                    : (language === 'vi' ? 'Xem thêm' : 'Read more')}
                                </button>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* All images - Facebook style */}
                  {activeArticle.images && activeArticle.images.length > 0 && (
                    <div className={`w-full border-y border-gray-100 dark:border-zinc-800 ${activeArticle.images.length === 1 ? '' : 'grid grid-cols-2 gap-0.5 bg-gray-100 dark:bg-zinc-950'}`}>
                      {activeArticle.images.map((img: any, idx: number) => (
                        <div
                          key={idx}
                          className={`relative overflow-hidden bg-gray-50 dark:bg-zinc-950 ${activeArticle.images.length === 1 ? 'aspect-[1.91/1]' : 'aspect-square'}`}
                        >
                          <img
                            src={img.url}
                            alt={img.caption || `Ảnh ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {img.caption && activeArticle.images.length === 1 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                              <p className="text-white text-[9px] font-semibold line-clamp-1">{img.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-2 py-1.5 flex border-t border-gray-100 dark:border-zinc-850 text-[10px] text-text-muted dark:text-zinc-400 font-bold justify-between select-none bg-white dark:bg-zinc-900">
                    <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-text-muted dark:text-zinc-450">
                      <ThumbsUp size={12} /> {language === 'vi' ? 'Thích' : 'Like'}
                    </button>
                    <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-text-muted dark:text-zinc-455">
                      <MessageSquare size={12} /> {language === 'vi' ? 'Bình luận' : 'Comment'}
                    </button>
                    <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-text-muted dark:text-zinc-455">
                      <Share2 size={12} /> {language === 'vi' ? 'Chia sẻ' : 'Share'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Threads Preview Mockup */
                <div className="bg-white dark:bg-zinc-900 p-5 flex flex-col gap-0 text-text dark:text-zinc-150">
                  {/* Threads Post 1/2 */}
                  <div className="flex gap-3.5 items-stretch">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="relative w-9 h-9">
                        <div className="w-9 h-9 rounded-full bg-[#1E293B] dark:bg-black flex items-center justify-center text-white dark:text-slate-100 font-extrabold text-sm shadow-sm select-none">
                          T
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center text-white font-bold text-[8px] leading-none select-none">
                          +
                        </div>
                      </div>
                      <div className="w-0.5 bg-gray-200 dark:bg-zinc-800 grow my-2"></div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2.5 min-w-0 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text dark:text-zinc-200 select-none">antbiz_official</span>
                        <span className="text-[10px] text-text-muted dark:text-zinc-400 select-none">{getMockupDisplayTime()}</span>
                      </div>

                      <div className="text-xs text-text dark:text-zinc-150 leading-relaxed flex flex-col gap-2">
                        {/* Title & Category block */}
                        <div className="font-extrabold text-[12px] text-text dark:text-zinc-200">
                          [{activeArticle.category.replace('#', '')}] {activeArticle.title}
                        </div>

                        {/* Caption content */}
                        <div className="whitespace-pre-wrap">
                          {isEditing ? (
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full min-h-[160px] p-3 border border-gray-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium leading-relaxed bg-white dark:bg-zinc-955 text-text dark:text-zinc-200 resize-y"
                              placeholder={language === 'vi' ? 'Nhập nội dung bài đăng...' : 'Enter post content...'}
                            />
                          ) : (
                            (() => {
                              const content = getDisplayContent();
                              const shouldTruncate = content.length > 200;
                              const displayedText = shouldTruncate && !isThreadsExpanded
                                ? `${content.slice(0, 200)}...`
                                : content;
                              return (
                                <>
                                  {displayedText}
                                  {shouldTruncate && (
                                    <button
                                      onClick={() => setIsThreadsExpanded(!isThreadsExpanded)}
                                      className="text-primary font-black ml-1.5 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded inline-block bg-transparent border-0 p-0"
                                    >
                                      {isThreadsExpanded
                                        ? (language === 'vi' ? 'Ẩn bớt' : 'Xem thêm')
                                        : (language === 'vi' ? 'Xem thêm' : 'Read more')}
                                    </button>
                                  )}
                                </>
                              );
                            })()
                          )}
                          {!isEditing && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-150 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-medium text-[8px] ml-1.5 align-middle select-none">1/2</span>}
                        </div>
                      </div>

                      {/* All images - Threads stacked style */}
                      {activeArticle.images && activeArticle.images.length > 0 && (
                        <div className="flex flex-col gap-2 mt-1">
                          {activeArticle.images.map((img: any, idx: number) => (
                            <div key={idx} className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm">
                              <img
                                src={img.url}
                                alt={img.caption || `Ảnh ${idx + 1}`}
                                className="w-full object-cover"
                                loading="lazy"
                              />
                              {img.caption && (
                                <p className="text-[9px] text-text-muted dark:text-zinc-400 font-semibold px-3 py-1.5 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-105 dark:border-zinc-800">
                                  {img.caption}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-gray-400 mt-2 select-none">
                        <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                        <MessageCircle size={14} className="hover:text-primary cursor-pointer transition-colors" />
                        <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                        <Share2 size={14} className="hover:text-primary cursor-pointer transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Threads Post 2/2 */}
                  <div className="flex gap-3.5 items-stretch mt-4 pt-4 border-t border-gray-100 dark:border-zinc-850">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[#1E293B] dark:bg-black flex items-center justify-center text-white dark:text-slate-100 font-extrabold text-sm shadow-sm select-none">
                        T
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text dark:text-zinc-200 select-none">antbiz_official</span>
                        <span className="text-[10px] text-text-muted dark:text-zinc-400 select-none">{getMockupDisplayTime()}</span>
                      </div>

                      <div className="text-xs text-text dark:text-zinc-150 leading-relaxed mt-0.5">
                        <span className="text-blue-500 dark:text-blue-400 hover:underline cursor-pointer font-medium break-all">
                          &gt;&gt;&gt; {language === 'vi' ? 'Xem chi tiết:' : 'View details:'} {activeArticle.url}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-150 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-medium text-[8px] ml-1.5 align-middle select-none">2/2</span>
                      </div>

                      <div className="flex items-center gap-4 text-gray-400 mt-2 select-none">
                        <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                        <MessageCircle size={14} className="hover:text-primary cursor-pointer transition-colors" />
                        <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                        <Share2 size={14} className="hover:text-primary cursor-pointer transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 mt-1">
                <button
                  onClick={handleSaveToVersion}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1.5 cursor-pointer border-0"
                >
                  <span>💾</span>
                  {language === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}
                </button>
                <button
                  onClick={handleSaveAndReplaceOriginal}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer border-0"
                >
                  <span>🔄</span>
                  {language === 'vi' ? 'Lưu thay thế bản gốc' : 'Save & Replace Original'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border-0"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
              </div>
            )}
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-primary/5 to-cyan-500/5 rounded-2xl p-8 border border-primary/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 text-primary font-bold text-lg mb-4">
              <Quote size={20} className="fill-current opacity-5 absolute top-6 right-6 w-32 h-32" />
              <Quote size={20} />
              <h2>{t('articleDetail.summary')}</h2>
            </div>
            <p className="text-text-muted font-semibold leading-relaxed relative z-10 text-[15px] pr-12">
              {activeArticle.description}
            </p>
          </div>

          {/* Nội dung bài viết đầy đủ (body blocks: text + ảnh xen kẽ) */}
          {Array.isArray(activeArticle.body) && activeArticle.body.length > 0 ? (
            <div className="bg-white/80 dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-2xl p-8 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-gray-105 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2 text-text dark:text-zinc-200 font-bold text-lg">
                  <span className="text-2xl">📄</span>
                  <h2>{language === 'vi' ? 'Nội dung bài viết đầy đủ' : 'Full Article Content'}</h2>
                </div>
              </div>
              <div className="flex flex-col gap-4 max-w-[72ch]">
                {(() => {
                  const blocks = activeArticle.body;
                  const shouldTruncate = blocks.length > 3;
                  const displayedBlocks = shouldTruncate && !isBodyExpanded
                    ? blocks.slice(0, 3)
                    : blocks;

                  return (
                    <>
                      {displayedBlocks.map((block: any, idx: number) => {
                        if (block.type === 'image' && block.url) {
                          return (
                            <figure key={idx} className="w-full rounded-2xl overflow-hidden border border-gray-105 dark:border-zinc-800 shadow-sm">
                              <img
                                src={block.url}
                                alt={block.caption || `Hình ảnh ${idx + 1}`}
                                className="w-full object-cover"
                                loading="lazy"
                              />
                              {block.caption && (
                                <figcaption className="text-[11px] text-text-muted dark:text-zinc-400 font-semibold text-center px-4 py-2 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-105 dark:border-zinc-800">
                                  {block.caption}
                                </figcaption>
                              )}
                            </figure>
                          );
                        }
                        if (block.text) {
                          return (
                            <p key={idx} className="text-[14px] text-text leading-[1.9] font-medium whitespace-pre-wrap">
                              {block.text}
                            </p>
                          );
                        }
                        return null;
                      })}

                      {shouldTruncate && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-6 py-2 rounded-full font-bold text-xs transition-all active:scale-95 cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            {isBodyExpanded
                              ? (language === 'vi' ? 'Ẩn bớt nội dung' : 'Xem thêm nội dung')
                              : (language === 'vi' ? 'Xem thêm nội dung' : 'Read more')}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : activeArticle.full_text ? (
            /* Fallback: hiển thị full_text nếu không có body */
            <div className="bg-white border border-gray-200/80 rounded-2xl p-8 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 text-text font-bold text-lg border-b border-gray-100 pb-4">
                <span className="text-2xl">📄</span>
                <h2>{language === 'vi' ? 'Nội dung bài viết đầy đủ' : 'Full Article Content'}</h2>
              </div>
              <div className="text-[14px] text-text leading-[1.9] whitespace-pre-wrap font-medium max-w-[72ch]">
                {(() => {
                  const text = activeArticle.full_text;
                  const shouldTruncate = text.length > 500;
                  const displayedText = shouldTruncate && !isBodyExpanded
                    ? `${text.slice(0, 500)}...`
                    : text;
                  return (
                    <>
                      {displayedText}
                      {shouldTruncate && (
                        <div className="flex justify-center pt-4">
                          <button
                            onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-6 py-2 rounded-full font-bold text-xs transition-all active:scale-95 cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            {isBodyExpanded
                              ? (language === 'vi' ? 'Ẩn bớt nội dung' : 'Xem thêm nội dung')
                              : (language === 'vi' ? 'Xem thêm nội dung' : 'Read more')}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : null}

          {/* Image Gallery */}
          {activeArticle.images && activeArticle.images.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-text font-bold text-base">
                <span className="text-xl">🖼️</span>
                <h2>{language === 'vi' ? 'Hình ảnh bài viết' : 'Article Images'}</h2>
              </div>
              <div className="grid grid-cols-2 gap-5">
                {activeArticle.images.map((img: any, idx: number) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-gray-200">
                    <img
                      src={img.url}
                      alt={img.caption || `Image ${idx + 1}`}
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
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
          )}



        </div>

        {/* Right Column (Sidebar metrics, checkpoints, tags) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

          {/* Performance Metrics Card */}
          <div className="bg-amber-50/20 dark:bg-amber-950/15 border border-amber-200/30 dark:border-amber-900/20 rounded-2xl p-7 shadow-sm">
            <h3 className="text-[11px] font-bold tracking-[0.1em] text-amber-800 dark:text-amber-400 uppercase mb-5">
              {t('articleDetail.performanceMetrics')}
            </h3>

            <div className="bg-white dark:bg-[#1A1D27] rounded-2xl p-5 shadow-sm border border-amber-200/30 dark:border-white/5 flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Eye size={24} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-text-muted">{t('articleDetail.totalViews')}</span>
                {/* Lấy phần số từ chuỗi views thô (ví dụ: "1.0K lượt xem" → "1.0K", "996 lượt xem" → "996") */}
                <span className="text-3xl font-extrabold text-text">{activeArticle.views ? (activeArticle.views.split(' ')[0] || '0') : '0'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="w-full bg-gray-200/50 dark:bg-black h-2 rounded-full overflow-hidden">
                <div className="bg-amber-600 dark:bg-amber-500 w-[85%] h-full rounded-full"></div>
              </div>
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 text-right mt-1">
                {t('articleDetail.topPercent')}
              </p>
            </div>
          </div>

          {/* Checkpoint Version History Card */}
          <div className="bg-white/80 dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-[11px] font-bold tracking-[0.1em] text-text-muted dark:text-zinc-400 uppercase border-b border-gray-100 dark:border-zinc-800 pb-3 flex items-center gap-1.5 select-none">
              <RotateCcw size={13} className="text-primary" />
              {language === 'vi' ? 'Lịch sử Checkpoint' : 'Checkpoint History'}
            </h3>

            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {checkpoints.length > 0 ? (
                checkpoints.map((cp) => {
                  const isViewing = selectedCheckpoint?.id === cp.id;

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
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-1.5 cursor-pointer relative overflow-hidden bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isViewing
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                        : 'border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-gray-50/10 dark:bg-zinc-950/20 hover:bg-gray-50/30'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-extrabold ${isViewing ? 'text-primary' : 'text-text'}`}>
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

                      <div className="text-[8px] text-primary font-bold text-right pt-0.5 mt-0.5 border-t border-gray-100/50">
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
          <div className="bg-white/80 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/80 backdrop-blur-md rounded-2xl p-7 shadow-sm">
            <div className="flex items-center gap-2 text-text dark:text-zinc-200 font-bold text-sm mb-5">
              <Tag size={18} className="text-text-muted dark:text-zinc-400" />
              <h3>{t('articleDetail.metadataTags')}</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeArticle.tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-[13px] font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </AnimatePresence>

      <PopupDialog
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        title={popupTitle}
        message={popupMsg}
        type={popupType}
      />
    </div>
  );
}

