"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Link2, 
  Globe, 
  Check, 
  Facebook, 
  Sparkles, 
  MoreHorizontal, 
  ThumbsUp, 
  MessageSquare, 
  Share2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  User,
  Calendar,
  Layers,
  Send,
  Loader2,
  Plus,
  Edit2,
  Smartphone,
  Heart,
  MessageCircle,
  Repeat2,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';


// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

interface SocialVariant {
  id: string; // A, B, C...
  facebook: string;
  threads: string;
  title: string;
  author: string;
  tags: string;
}

export default function AiCreatorView() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [facebookDate, setFacebookDate] = useState<string>("2026-06-17");
  const [facebookTime, setFacebookTime] = useState<string>("20:00");
  const [threadsDate, setThreadsDate] = useState<string>("2026-06-18");
  const [threadsTime, setThreadsTime] = useState<string>("18:00");
  const [facebookError, setFacebookError] = useState<string>("");
  const [threadsError, setThreadsError] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [activeWeek, setActiveWeek] = useState<0 | 1 | 2>(0);
  const [fbResetTrigger, setFbResetTrigger] = useState(0);
  const [threadsResetTrigger, setThreadsResetTrigger] = useState(0);


  const existingPosts = [
    // Week 1
    { date: "2026-06-17", hour: 16, title: "ĐỘNG VIÊN", category: "facebook" }, // Wed 16:00
    { date: "2026-06-20", hour: 16, title: "ĐỘNG VIÊN", category: "facebook" }, // Sat 16:00
    { date: "2026-06-16", hour: 18, title: "INSPIRATION", category: "threads" }, // Tue 18:00
    { date: "2026-06-19", hour: 18, title: "INSPIRATION", category: "threads" }, // Fri 18:00
    { date: "2026-06-15", hour: 20, title: "BLOGS", category: "facebook" }, // Mon 20:00
    { date: "2026-06-20", hour: 20, title: "BLOGS", category: "facebook" }, // Sat 20:00
    { date: "2026-06-21", hour: 20, title: "TÍNH NĂNG", category: "threads" }, // Sun 20:00
    
    // Week 2
    { date: "2026-06-24", hour: 17, title: "PRODUCT", category: "threads" },
    { date: "2026-06-26", hour: 19, title: "PROMO", category: "facebook" },
    
    // Week 3
    { date: "2026-07-01", hour: 16, title: "ARTICLE", category: "facebook" },
    { date: "2026-07-03", hour: 21, title: "Q&A", category: "threads" }
  ];

  const isCellOccupied = (dateStr: string, hour: number) => {
    return existingPosts.some(p => p.date === dateStr && p.hour === hour);
  };

  const weekDays = Array.from({ length: 21 }, (_, index) => {
    const start = new Date(2026, 5, 15); // June 15, 2026 (Mon)
    start.setDate(start.getDate() + index);
    const dateStr = start.toISOString().split('T')[0];
    
    const daysNameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const name = daysNameMap[start.getDay()];
    const label = start.getDate().toString();
    const isToday = dateStr === '2026-06-17';
    
    return { name, date: dateStr, label, isToday };
  });

  const handleFacebookDateChange = (val: string) => {
    const activeHour = parseInt(facebookTime.split(':')[0]) || 16;
    if (isCellOccupied(val, activeHour)) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${activeHour}:00 ngày ${val} đã có bài.` : `Slot blocked! A post is already scheduled at ${activeHour}:00 on ${val}.`);
    } else {
      setFacebookError("");
      setFacebookDate(val);
      // Auto-update activeWeek tab
      const dayIdx = weekDays.findIndex(d => d.date === val);
      if (dayIdx >= 0) {
        const weekIdx = Math.floor(dayIdx / 7) as 0 | 1 | 2;
        setActiveWeek(weekIdx);
      }
    }
  };

  const handleFacebookTimeChange = (val: string) => {
    const hour = parseInt(val.split(':')[0]) || 16;
    const clampedHour = Math.max(16, Math.min(23, hour));
    const clampedTime = `${clampedHour.toString().padStart(2, '0')}:00`;
    
    if (isCellOccupied(facebookDate, clampedHour)) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${clampedTime} ngày ${facebookDate} đã có bài.` : `Slot blocked! A post is already scheduled at ${clampedTime} on ${facebookDate}.`);
    } else {
      setFacebookError("");
      setFacebookTime(clampedTime);
    }
  };

  const handleThreadsDateChange = (val: string) => {
    const activeHour = parseInt(threadsTime.split(':')[0]) || 16;
    if (isCellOccupied(val, activeHour)) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${activeHour}:00 ngày ${val} đã có bài.` : `Slot blocked! A post is already scheduled at ${activeHour}:00 on ${val}.`);
    } else {
      setThreadsError("");
      setThreadsDate(val);
      // Auto-update activeWeek tab
      const dayIdx = weekDays.findIndex(d => d.date === val);
      if (dayIdx >= 0) {
        const weekIdx = Math.floor(dayIdx / 7) as 0 | 1 | 2;
        setActiveWeek(weekIdx);
      }
    }
  };

  const handleThreadsTimeChange = (val: string) => {
    const hour = parseInt(val.split(':')[0]) || 16;
    const clampedHour = Math.max(16, Math.min(23, hour));
    const clampedTime = `${clampedHour.toString().padStart(2, '0')}:00`;
    
    if (isCellOccupied(threadsDate, clampedHour)) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${clampedTime} ngày ${threadsDate} đã có bài.` : `Slot blocked! A post is already scheduled at ${clampedTime} on ${threadsDate}.`);
    } else {
      setThreadsError("");
      setThreadsTime(clampedTime);
    }
  };

  const handleFacebookDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setFacebookError(
      language === 'vi' 
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã có bài.` 
        : `Slot blocked! A post is already scheduled at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setFacebookError(""), 4500);
  };

  const handleThreadsDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setThreadsError(
      language === 'vi' 
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã có bài.` 
        : `Slot blocked! A post is already scheduled at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setThreadsError(""), 4500);
  };

  const handleFbDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;
    
    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 8));
    
    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(7, row));
    
    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = 16 + clampedRow;
    
    // Check occupancy against existing posts AND threads active post
    const threadsHour = parseInt(threadsTime.split(':')[0]) || 18;
    const isOccupied = isCellOccupied(targetDate, targetHour) || (targetDate === threadsDate && targetHour === threadsHour);
    
    if (isOccupied) {
      handleFacebookDragError(targetDate, targetHour);
      setFbResetTrigger(prev => prev + 1);
    } else {
      setFacebookError("");
      setFacebookDate(targetDate);
      setFacebookTime(`${targetHour.toString().padStart(2, '0')}:00`);
    }
  };

  const handleThreadsDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;
    
    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 8));
    
    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(7, row));
    
    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = 16 + clampedRow;
    
    // Check occupancy against existing posts AND facebook active post
    const facebookHour = parseInt(facebookTime.split(':')[0]) || 20;
    const isOccupied = isCellOccupied(targetDate, targetHour) || (targetDate === facebookDate && targetHour === facebookHour);
    
    if (isOccupied) {
      handleThreadsDragError(targetDate, targetHour);
      setThreadsResetTrigger(prev => prev + 1);
    } else {
      setThreadsError("");
      setThreadsDate(targetDate);
      setThreadsTime(`${targetHour.toString().padStart(2, '0')}:00`);
    }
  };

  const getDayLabel = (dayName: string) => {
    if (language === 'vi') {
      switch(dayName) {
        case 'Mon': return 'Thứ hai';
        case 'Tue': return 'Thứ ba';
        case 'Wed': return 'Thứ tư';
        case 'Thu': return 'Thứ năm';
        case 'Fri': return 'Thứ sáu';
        case 'Sat': return 'Thứ bảy';
        case 'Sun': return 'Chủ nhật';
        default: return dayName;
      }
    } else {
      switch(dayName) {
        case 'Mon': return 'Monday';
        case 'Tue': return 'Tuesday';
        case 'Wed': return 'Wednesday';
        case 'Thu': return 'Thursday';
        case 'Fri': return 'Friday';
        case 'Sat': return 'Saturday';
        case 'Sun': return 'Sunday';
        default: return dayName;
      }
    }
  };

  const [url, setUrl] = useState('https://gocnhinmoi.com.vn/10-nam-mua-vang-va-hanh-trinh-thoat-canh-o-tro-80861');
  const [isFetching, setIsFetching] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'threads'>('facebook');

  // Gocnhinmoi Explorer Modal State
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState('https://gocnhinmoi.com.vn/');
  const [iframeSrc, setIframeSrc] = useState('/api/proxy?url=' + encodeURIComponent('https://gocnhinmoi.com.vn/'));
  const [iframeKey, setIframeKey] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setIframeSrc(`/api/proxy?url=${encodeURIComponent(explorerUrl)}`);
    setIframeKey(k => k + 1);
  };

  // Manual Ingestion Form State
  const [postData, setPostData] = useState({
    title: '10 năm mua vàng và hành trình thoát cảnh ở trọ',
    category: '#Tổ ấm 4.0',
    description: 'Đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.',
    author: 'Linh Trang',
    published_at: '26/04/2026 08:00',
    views: '51.1K lượt xem',
    tags: '#Tiết kiệm tài chính, #Mua nhà, #Cuộc sống đô thị, #Đầu tư',
    imageUrl: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80',
    full_text: 'Hành trình tích lũy 10 năm của một gia đình trẻ mua vàng để sở hữu căn hộ mơ ước...'
  });

  // Toggles for Custom Display Components in Social Previews
  const [toggles, setToggles] = useState({
    showTitle: true,
    showAuthor: true,
    showDescription: true,
    showTags: true,
    showImage: true
  });

  // State for Social Media Variants (A/B Test copies)
  const [variants, setVariants] = useState<SocialVariant[]>([
    {
      id: 'A',
      facebook: `Bộ Tư lệnh TPHCM phối hợp các đơn vị chuyên môn, nhóm nghiên cứu và nhân chứng lịch sử triển khai khảo sát tại Công viên Lê Thị Riêng (phường Hòa Hưng, TPHCM) nhằm xác định các khu vực nghi có hố chôn tập thể liệt sĩ, phục vụ công tác tìm kiếm, quy tập hài cốt.\n\nĐợt khảo sát diễn ra từ ngày 15 đến 18/6, là bước tiếp theo sau quá trình nhiều năm thu thập tư liệu lịch sử, đối chiếu không ảnh và khảo sát thực địa liên quan đến khu vực được cho là nơi chôn cất các liệt sĩ hy sinh trong cuộc Tổng tiến công và nổi dậy Xuân Mậu Thân 1968.`,
      threads: `Choi Won Jun, 33 tuổi, quê ở Jeju, Hàn Quốc. Năm 2009, bố anh sang Việt Nam công tác nên đưa con theo cùng. Jun được học lớp 11 và 12 ở TP HCM.\n\nHoàn thành cấp 3, Jun về Hàn Quốc đi nghĩa vụ quân sự, học đại học và làm việc trong một công ty bất động sản ở Seoul. Sau 6 năm, anh trở thành trưởng phòng với mức lương nhiều người ao ước.\n\n"Nhưng tôi không thấy hạnh phúc, mỗi ngày như một vòng lặp tẻ nhạt", anh nói.`,
      title: '10 năm mua vàng và hành trình thoát cảnh ở trọ',
      author: 'Linh Trang',
      tags: '#Tiết kiệm tài chính #Mua nhà #Cuộc sống đô thị #Đầu tư'
    },
    {
      id: 'B',
      facebook: `Quyết định mua vàng tích lũy thay vì gửi tiết kiệm, liệu có đúng đắn? Câu chuyện thực tế của anh H. đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.`,
      threads: `Scale your content publishing effortlessly with AntBiz. Our AI-driven content generation and multi-channel scheduler automate your workflows. Connect your ecommerce or blog directly and start scaling today!`,
      title: '10 năm mua vàng và hành trình thoát cảnh ở trọ',
      author: 'Linh Trang',
      tags: '#Tiết kiệm tài chính #Mua nhà #Cuộc sống đô thị #Đầu tư'
    }
  ]);

  // Inline Editing Active States
  const [editState, setEditState] = useState<{ variantId: string; field: string } | null>(null);

  // Handle URL change postMessage from Iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'URL_CHANGE') {
        const proxiedUrl = event.data.url;
        try {
          const urlObj = new URL(proxiedUrl);
          const original = urlObj.searchParams.get('url');
          if (original) {
            setExplorerUrl(original);
          } else if (proxiedUrl.startsWith('http')) {
            setExplorerUrl(proxiedUrl);
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch / Scrape Handler for original URL
  const handleFetch = async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setPostData({
            title: data.title || '',
            category: data.category || '',
            description: data.description || '',
            author: data.author || '',
            published_at: '26/04/2026 08:00',
            views: '51.1K lượt xem',
            tags: data.tags || '',
            imageUrl: data.imageUrl || '',
            full_text: data.description || ''
          });
          
          const tagsStr = data.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');
          setVariants([
            {
              id: 'A',
              facebook: `🏠 [${data.category.replace('#', '')}] ${data.title} \n\n"${data.description}" \n\nMột câu chuyện đầy cảm hứng từ tác giả ${data.author}. Hãy đọc ngay hành trình chi tiết để có thêm kinh nghiệm tích lũy!`,
              threads: `Choi Won Jun, 33 tuổi, quê ở Jeju, Hàn Quốc. Năm 2009, bố anh sang Việt Nam công tác nên đưa con theo cùng. Jun được học lớp 11 và 12 ở TP HCM.\n\nHoàn thành cấp 3, Jun về Hàn Quốc đi nghĩa vụ quân sự, học đại học và làm việc trong một công ty bất động sản ở Seoul. Sau 6 năm, anh trở thành trưởng phòng với mức lương nhiều người ao ước.\n\n"Nhưng tôi không thấy hạnh phúc, mỗi ngày như một vòng lặp tẻ nhạt", anh nói.`,
              title: data.title,
              author: data.author,
              tags: tagsStr
            },
            {
              id: 'B',
              facebook: `🔥 BÀI HỌC TỪ ${data.author.toUpperCase()}: ${data.title} \n\nLàm thế nào để thoát cảnh trọ? Trải nghiệm thực tế: "${data.description}"`,
              threads: `Scale your content publishing effortlessly with AntBiz. Our AI-driven content generation and multi-channel scheduler automate your workflows. Connect your ecommerce or blog directly and start scaling today!`,
              title: data.title,
              author: data.author,
              tags: tagsStr
            }
          ]);
          setIsFetching(false);
          return;
        }
      }
    } catch (e) {
      console.error("Scraper fetch error:", e);
    }

    // Fallback if live scrape fails
    setTimeout(() => {
      setPostData({
        title: 'Cơn sốt đất nền vùng ven và bài học đắt giá',
        category: '#Bất động sản',
        description: 'Những lô đất từng được định giá hàng tỷ đồng nay nằm phơi sương không người hỏi mua. Bài học về đòn bẩy tài chính và tâm lý đám đông.',
        author: 'Nguyễn Văn Nam',
        published_at: '17/06/2026 09:30',
        views: '12.4K lượt xem',
        tags: '#Đất nền, #Sốt đất, #Tài chính cá nhân, #Rủi ro',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
        full_text: 'Toàn cảnh cơn sốt đất nền và bài học thức tỉnh nhà đầu tư cá nhân...'
      });
      
      const newTags = '#Đất nền #Sốt đất #Tài chính #Rủi ro';
      setVariants([
        {
          id: 'A',
          facebook: `Những lô đất từng được định giá hàng tỷ đồng nay nằm phơi sương không người hỏi mua. Bài học về đòn bẩy tài chính và tâm lý đám đông từ đợt khảo sát thực tế.`,
          threads: `Những lô đất từng được định giá hàng tỷ đồng nay nằm phơi sương không người hỏi mua. Bài học về đòn bẩy tài chính và tâm lý đám đông.`,
          title: 'Cơn sốt đất nền vùng ven và bài học đắt giá',
          author: 'Nguyễn Văn Nam',
          tags: newTags
        },
        {
          id: 'B',
          facebook: `Đóng băng thị trường đất nền vùng ven và những bài học đắt giá cho nhà đầu tư cá nhân khi lạm dụng đòn bẩy tài chính.`,
          threads: `Đóng băng thị trường đất nền vùng ven và bài học đắt giá cho nhà đầu tư.`,
          title: 'Cơn sốt đất nền vùng ven và bài học đắt giá',
          author: 'Nguyễn Văn Nam',
          tags: newTags
        }
      ]);
      setIsFetching(false);
    }, 1200);
  };

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Add a new variant copy dynamically
  const handleAddVariant = () => {
    const nextLetter = String.fromCharCode(65 + variants.length); // C, D, E...
    const firstTags = variants[0]?.tags || '';
    const newVariant: SocialVariant = {
      id: nextLetter,
      facebook: `[Phiên bản đặc biệt ${nextLetter}] ${postData.description}`,
      threads: `[Phiên bản đặc biệt ${nextLetter}] ${postData.description}`,
      title: postData.title,
      author: postData.author,
      tags: firstTags
    };
    setVariants([...variants, newVariant]);
  };

  // Update variant field state on inline edit
  const handleUpdateVariantField = (variantId: string, field: keyof SocialVariant, value: string) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
  };

  // Import from Live Explorer
  const handleImportFromExplorer = async () => {
    setIsScraping(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(explorerUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setPostData({
            title: data.title || '',
            category: data.category || '',
            description: data.description || '',
            author: data.author || '',
            published_at: '26/04/2026 08:00',
            views: '51.1K lượt xem',
            tags: data.tags || '',
            imageUrl: data.imageUrl || '',
            full_text: data.description || ''
          });
          setUrl(explorerUrl);

          const tagsStr = data.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');
          setVariants([
            {
              id: 'A',
              facebook: `🏠 [${data.category.replace('#', '')}] ${data.title} \n\n"${data.description}" \n\nMột câu chuyện đầy cảm hứng từ tác giả ${data.author}. Hãy đọc ngay hành trình chi tiết để có thêm kinh nghiệm tích lũy!`,
              threads: `Choi Won Jun, 33 tuổi, quê ở Jeju, Hàn Quốc. Năm 2009, bố anh sang Việt Nam công tác nên đưa con theo cùng. Jun được học lớp 11 và 12 ở TP HCM.\n\nHoàn thành cấp 3, Jun về Hàn Quốc đi nghĩa vụ quân sự, học đại học và làm việc trong một công ty bất động sản ở Seoul. Sau 6 năm, anh trở thành trưởng phòng với mức lương nhiều người ao ước.\n\n"Nhưng tôi không thấy hạnh phúc, mỗi ngày như một vòng lặp tẻ nhạt", anh nói.`,
              title: data.title,
              author: data.author,
              tags: tagsStr
            },
            {
              id: 'B',
              facebook: `🔥 BÀI HỌC TỪ ${data.author.toUpperCase()}: ${data.title} \n\nLàm thế nào để thoát cảnh trọ? Trải nghiệm thực tế: "${data.description}"`,
              threads: `Scale your content publishing effortlessly with AntBiz. Our AI-driven content generation and multi-channel scheduler automate your workflows. Connect your ecommerce or blog directly and start scaling today!`,
              title: data.title,
              author: data.author,
              tags: tagsStr
            }
          ]);
          setIsExplorerOpen(false);
        }
      }
    } catch (e) {
      console.error("Scraper explorer error:", e);
    } finally {
      setIsScraping(false);
    }
  };

  // Back navigation for live proxy iframe
  const handleIframeBack = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (e) {
        console.error("Failed to navigate back:", e);
      }
    }
  };

  // Inline editable wrapper component that prevents layout shifts
  const EditableText = ({ 
    variantId, 
    field, 
    value, 
    textarea = false,
    className = "" 
  }: { 
    variantId: string; 
    field: keyof SocialVariant; 
    value: string; 
    textarea?: boolean;
    className?: string;
  }) => {
    const isEditing = editState?.variantId === variantId && editState?.field === field;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing) {
        if (textarea && textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }
    }, [isEditing, value, textarea]);

    if (isEditing) {
      return (
        <div className="w-full relative">
          {textarea ? (
            <textarea
              ref={textareaRef}
              autoFocus
              value={value}
              onChange={(e) => {
                handleUpdateVariantField(variantId, field, e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={() => setEditState(null)}
              className="w-full text-inherit bg-transparent p-0 border-0 outline-none resize-none focus:ring-0 focus:outline-none leading-relaxed transition-all"
            />
          ) : (
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={value}
              onChange={(e) => handleUpdateVariantField(variantId, field, e.target.value)}
              onBlur={() => setEditState(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditState(null);
              }}
              className="w-full text-inherit bg-transparent p-0 border-0 outline-none focus:ring-0 focus:outline-none font-inherit transition-all"
            />
          )}
        </div>
      );
    }

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setEditState({ variantId, field });
        }}
        className={`group relative cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-all duration-200 border border-transparent hover:border-primary/10 ${className}`}
      >
        <span className="whitespace-pre-wrap">{value || <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>}</span>
        <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
          <Edit2 size={10} className="text-primary" />
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight">{t('aiCreator.title')}</h1>
          <p className="text-sm text-text-muted mt-1">{t('aiCreator.subtitle')}</p>
        </div>
        
        {/* Step Indicator Wizard */}
        <div className="flex items-center gap-2 bg-sidebar rounded-2xl p-1.5 border border-gray-200/50 shadow-sm">
          <button 
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
              step === 1 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            {t('aiCreator.step1')}
          </button>
          <button 
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
              step === 2 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            {t('aiCreator.step2')}
          </button>
          <button 
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
              step === 3 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            {t('aiCreator.step3')}
          </button>
        </div>
      </div>

      {/* Unified layout grid allowing shared layout morphing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        
        {/* STEP 1: Left column inputs form */}
        {step === 1 && (
          <motion.div 
            layout
            key="step1-inputs"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="lg:col-span-8 flex flex-col gap-6 order-1"
          >
            {/* URL Context Importer */}
            <div className="bg-[#C4F0E1]/40 border border-[#C4F0E1] rounded-[28px] p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#34D399]/20 flex items-center justify-center text-[#059669] shadow-sm">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text">{t('aiCreator.sourceUrl')}</h2>
                    <p className="text-[11px] text-text-muted">{t('aiCreator.searchPlace')}</p>
                  </div>
                </div>
                
                {/* Search on Site Button */}
                <button 
                  onClick={() => {
                    setExplorerUrl('https://gocnhinmoi.com.vn/');
                    setIframeSrc('/api/proxy?url=' + encodeURIComponent('https://gocnhinmoi.com.vn/'));
                    setIsExplorerOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                >
                  <Search size={14} />
                  {t('aiCreator.searchGocNhinMoi')}
                </button>
              </div>
              
              <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="text-gray-400 pl-2">
                  <Link2 size={16} />
                </span>
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-transparent px-2 py-1.5 text-xs text-text focus:outline-none"
                  placeholder={t('aiCreator.searchPlace')}
                />
                <button 
                  onClick={handleFetch}
                  disabled={isFetching}
                  className="bg-[#4A6B5D] hover:bg-[#3A5B4D] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isFetching ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {t('aiCreator.fetching')}
                    </>
                  ) : (
                    t('aiCreator.importButton')
                  )}
                </button>
              </div>
            </div>

            {/* Manual Edit Form */}
            <div className="bg-white border border-gray-200/80 rounded-[28px] p-8 flex flex-col gap-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                <Layers size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-text">{t('aiCreator.editPostFields')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelTitle')}</label>
                  <input 
                    type="text"
                    value={postData.title}
                    onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder={t('aiCreator.labelTitle')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelCategory')}</label>
                  <input 
                    type="text"
                    value={postData.category}
                    onChange={(e) => setPostData({ ...postData, category: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelAuthor')}</label>
                  <input 
                    type="text"
                    value={postData.author}
                    onChange={(e) => setPostData({ ...postData, author: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelPublishedAt')}</label>
                  <input 
                    type="text"
                    value={postData.published_at}
                    onChange={(e) => setPostData({ ...postData, published_at: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelViews')}</label>
                  <input 
                    type="text"
                    value={postData.views}
                    onChange={(e) => setPostData({ ...postData, views: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelImageUrl')}</label>
                  <input 
                    type="text"
                    value={postData.imageUrl}
                    onChange={(e) => setPostData({ ...postData, imageUrl: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelTags')}</label>
                  <input 
                    type="text"
                    value={postData.tags}
                    onChange={(e) => setPostData({ ...postData, tags: e.target.value })}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelShortDesc')}</label>
                  <textarea 
                    value={postData.description}
                    onChange={(e) => setPostData({ ...postData, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SHARED PREVIEW COLUMN (Physically slides right-to-left between Step 1 and Step 2) */}
        {(step === 1 || step === 2) && (
          <motion.div 
            layout
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className={`lg:col-span-4 flex flex-col gap-6 sticky top-6 ${
              step === 1 ? 'order-2' : 'order-1'
            }`}
          >
          {/* Article Live Preview Card */}
          <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={16} className="text-primary" />
                {t('aiCreator.articlePreview')}
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                {language === 'vi' ? 'Trực tiếp' : 'Live'}
              </span>
            </div>

            <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col bg-white">
              <div className="h-44 bg-gray-100 relative">
                {postData.imageUrl ? (
                  <img 
                    src={postData.imageUrl} 
                    alt={postData.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                )}
                {postData.category && (
                  <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {postData.category}
                  </span>
                )}
              </div>

              <div className="p-5 flex flex-col gap-3.5">
                <h4 className="text-base font-extrabold text-[#1E293B] leading-tight">
                  {postData.title || (language === 'vi' ? 'Chưa có tiêu đề' : 'Untitled Post')}
                </h4>

                <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {postData.author || (language === 'vi' ? 'Không rõ' : 'Unknown')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {postData.published_at || (language === 'vi' ? 'Không có ngày' : 'No Date')}
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed font-medium line-clamp-3">
                  {postData.description || (language === 'vi' ? 'Không có mô tả.' : 'No description provided.')}
                </p>

                <div className="flex flex-wrap gap-1 mt-1">
                  {postData.tags.split(',').map((tag, idx) => {
                    const trimmed = tag.trim();
                    if (!trimmed) return null;
                    return (
                      <span key={idx} className="bg-[#F3F4FD] text-primary px-2.5 py-1 rounded-full text-[10px] font-bold">
                        {trimmed}
                      </span>
                    );
                  })}
                </div>

                <div className="border-t border-gray-100 pt-3 mt-1 flex items-center justify-between text-[11px] font-bold text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} className="text-amber-500" />
                    {postData.views || (language === 'vi' ? '0 lượt xem' : '0 views')}
                  </span>
                </div>
              </div>
            </div>

            {/* Next step button */}
            {step === 1 && (
              <motion.button 
                layout
                onClick={() => setStep(2)}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-sm cursor-pointer"
              >
                {t('aiCreator.proceedToAb')}
                <ArrowRight size={16} />
              </motion.button>
            )}
          </div>

          {/* Toggles Customizer */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-4"
            >
              <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-3">
                <Layers size={16} className="text-primary" />
                {t('aiCreator.customDisplay')}
              </h3>

              <div className="flex flex-col gap-3">
                {Object.entries({
                  showTitle: t('aiCreator.showTitle'),
                  showAuthor: t('aiCreator.showAuthor'),
                  showDescription: t('aiCreator.showDescription'),
                  showTags: t('aiCreator.showTags'),
                  showImage: t('aiCreator.showImage')
                }).map(([key, label]) => {
                  const isChecked = toggles[key as keyof typeof toggles];
                  return (
                    <button 
                      key={key}
                      onClick={() => handleToggle(key as keyof typeof toggles)}
                      className="flex items-center justify-between py-1.5 text-left text-xs font-semibold text-text hover:bg-gray-50/50 rounded-lg px-1 transition-all"
                    >
                      <span>{label}</span>
                      <div className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                        isChecked ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'
                      }`}>
                        <motion.div 
                          layout 
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="bg-white w-4 h-4 rounded-full shadow-md"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* STEP 2: Right column A/B testing variants workspace */}
        {step === 2 && (
          <motion.div 
            layout
            key="step2-variants"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="lg:col-span-8 flex flex-col gap-6 order-2"
          >
            {/* Platform Selector */}
            <div className="bg-white border border-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
                <h3 className="text-base font-extrabold text-text">{t('aiCreator.multiChannelAb')}</h3>
              </div>

              <div className="flex bg-sidebar rounded-full p-1 border border-primary/5 shadow-inner">
                {(['facebook', 'threads'] as const).map((platform) => {
                  const isActive = selectedPlatform === platform;
                  return (
                    <button 
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`text-xs font-extrabold px-5 py-2 rounded-full uppercase tracking-wider transition-all duration-300 ${
                        isActive 
                          ? 'bg-primary text-white shadow-sm' 
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      {platform === 'facebook' && t('aiCreator.fbLabel')}
                      {platform === 'threads' && t('aiCreator.threadsLabel')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Displaying Variants in 2-Columns grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <AnimatePresence mode="popLayout">
                {variants.map((v) => {
                  const iconBg = selectedPlatform === 'facebook' ? 'bg-blue-600' : 'bg-black';
                  const platformLabel = selectedPlatform === 'facebook' ? t('aiCreator.fbPreview') : t('aiCreator.threadsFeed');

                  return (
                    <motion.div 
                      key={v.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative overflow-hidden"
                    >
                      {/* Variant Badge & Platform Header */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center text-white shadow-sm`}>
                            {selectedPlatform === 'facebook' && <Facebook size={12} className="fill-white" />}
                            {selectedPlatform === 'threads' && <ThreadsIcon size={12} />}
                          </div>
                          <span className="text-xs font-extrabold text-text">{platformLabel}</span>
                        </div>
                        <span className="text-xs bg-primary/10 text-primary font-black px-3 py-1 rounded-full border border-primary/10 select-none">
                          {language === 'vi' ? 'Biến thể' : 'Variant'} {v.id}
                        </span>
                      </div>

                      {/* Mockup */}
                      {selectedPlatform === 'threads' ? (
                        /* Connected multi-post threads markup */
                        <div className="flex flex-col gap-0 text-text">
                          
                          {/* Thread Post 1/2 */}
                          <div className="flex gap-3 items-stretch">
                            <div className="flex flex-col items-center shrink-0">
                              <div className="relative w-9 h-9">
                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                                  {v.id}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center text-white font-bold text-[8px] leading-none select-none">
                                  +
                                </div>
                              </div>
                              <div className="w-0.5 bg-gray-200 grow my-2"></div>
                            </div>

                            <div className="flex-1 flex flex-col gap-2 pb-5 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-text">antbiz_official</span>
                                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                  <span>24/03/2025</span>
                                  <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
                                </div>
                              </div>

                              <div className="flex flex-col gap-2.5 text-[11px] text-text leading-relaxed">
                                {toggles.showTitle && (
                                  <div className="font-extrabold text-xs text-text">
                                    🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                                  </div>
                                )}

                                {toggles.showDescription && (
                                  <div className="whitespace-pre-wrap">
                                    <EditableText 
                                      variantId={v.id} 
                                      field="threads" 
                                      value={v.threads} 
                                      textarea 
                                    />
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle select-none">1/2</span>
                                  </div>
                                )}

                                {(toggles.showAuthor || toggles.showTags) && (
                                  <div className="text-[10px] text-text-muted flex flex-col gap-1 border-t border-gray-100 pt-1.5 mt-0.5">
                                    {toggles.showAuthor && (
                                      <div className="flex items-center gap-1 font-semibold text-gray-500">
                                        <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                        <EditableText variantId={v.id} field="author" value={v.author} />
                                      </div>
                                    )}
                                    {toggles.showTags && (
                                      <div className="text-primary font-bold">
                                        <EditableText variantId={v.id} field="tags" value={v.tags} />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {toggles.showImage && postData.imageUrl && (
                                <div className="aspect-[1.91/1] w-full rounded-2xl overflow-hidden border border-gray-100 mt-1.5 shadow-sm">
                                  <img src={postData.imageUrl} alt="Threads content" className="w-full h-full object-cover" />
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-gray-400 mt-2.5">
                                <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                                <MessageCircle size={14} className="hover:text-primary cursor-pointer transition-colors" />
                                <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                                <Share2 size={14} className="hover:text-primary cursor-pointer transition-colors" />
                              </div>
                            </div>
                          </div>

                          {/* Thread Post 2/2 */}
                          <div className="flex gap-3 items-stretch">
                            <div className="flex flex-col items-center shrink-0">
                              <div className="relative w-9 h-9">
                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                                  {v.id}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center text-white font-bold text-[8px] leading-none select-none">
                                  +
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-text">antbiz_official</span>
                                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                  <span>24/03/2025</span>
                                  <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
                                </div>
                              </div>

                              <div className="text-[11px] text-text leading-relaxed mt-0.5">
                                <span className="text-blue-500 hover:underline cursor-pointer font-medium">
                                  &gt;&gt;&gt; {language === 'vi' ? 'Xem chi tiết:' : 'View details:'} {url.length > 30 ? `${url.substring(0, 30)}...` : url}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle select-none">2/2</span>
                              </div>

                              <div className="flex items-center gap-4 text-gray-400 mt-2">
                                <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                                <MessageCircle size={14} className="hover:text-primary cursor-pointer transition-colors" />
                                <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                                <Share2 size={14} className="hover:text-primary cursor-pointer transition-colors" />
                              </div>
                            </div>
                          </div>

                        </div>
                      ) : (
                        /* Facebook Mockup */
                        <div className="border border-gray-200/60 rounded-2xl overflow-hidden flex flex-col bg-white shadow-inner/5">
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                {v.id}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-text flex items-center gap-1">
                                  AntBiz Official
                                  <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                                </span>
                                <span className="text-[9px] text-text-muted">{language === 'vi' ? '7 giờ' : '7 hrs'} · 🌍</span>
                              </div>
                            </div>
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </div>

                          <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text leading-relaxed flex flex-col gap-2.5">
                            {toggles.showTitle && (
                              <div className="font-extrabold text-xs text-text mb-0.5">
                                🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                              </div>
                            )}

                            {toggles.showDescription && (
                              <div className="whitespace-pre-wrap">
                                <EditableText 
                                  variantId={v.id} 
                                  field="facebook" 
                                  value={v.facebook} 
                                  textarea 
                                />
                              </div>
                            )}

                            {(toggles.showAuthor || toggles.showTags) && (
                              <div className="text-[10px] text-text-muted mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col gap-1.5">
                                {toggles.showAuthor && (
                                  <div className="flex items-center gap-1 font-semibold text-gray-500">
                                    <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                    <EditableText variantId={v.id} field="author" value={v.author} />
                                  </div>
                                )}
                                {toggles.showTags && (
                                  <div className="text-primary font-bold">
                                    <EditableText variantId={v.id} field="tags" value={v.tags} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {toggles.showImage && postData.imageUrl && (
                            <div className="aspect-square w-full bg-gray-50 relative overflow-hidden border-t border-gray-100">
                              <img src={postData.imageUrl} alt="Post asset" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="px-1.5 py-1.5 flex border-t border-gray-100 text-[10px] text-text-muted font-bold justify-between">
                            <button className="flex-1 py-1.5 hover:bg-gray-50 rounded flex items-center justify-center gap-1 transition-colors">
                              <ThumbsUp size={11} /> {language === 'vi' ? 'Thích' : 'Like'}
                            </button>
                            <button className="flex-1 py-1.5 hover:bg-gray-50 rounded flex items-center justify-center gap-1 transition-colors">
                              <MessageSquare size={11} /> {language === 'vi' ? 'Bình luận' : 'Comment'}
                            </button>
                            <button className="flex-1 py-1.5 hover:bg-gray-50 rounded flex items-center justify-center gap-1 transition-colors">
                              <Share2 size={11} /> {language === 'vi' ? 'Chia sẻ' : 'Share'}
                            </button>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add Variant Card */}
              <motion.button 
                onClick={handleAddVariant}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="border-2 border-dashed border-gray-200 hover:border-primary/40 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50/20 hover:bg-primary/5 transition-all text-text-muted hover:text-primary group min-h-[300px]"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200 group-hover:border-primary/20 flex items-center justify-center shadow-sm text-text-muted group-hover:text-primary transition-all">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">{t('aiCreator.generateNewVariant')}</h4>
                  <p className="text-[10px] text-text-muted mt-1 max-w-[200px]">{t('aiCreator.generateNewVariantDesc')}</p>
                </div>
              </motion.button>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
                {t('aiCreator.backToIngestion')}
              </button>

              <button 
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white py-3.5 px-8 rounded-2xl font-extrabold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs cursor-pointer"
              >
                {t('aiCreator.step3')}
                <ArrowRight size={15} />
              </button>
            </div>

          </motion.div>
        )}

        {/* STEP 3: Lên lịch đăng bài (2D Calendar Scheduler) */}
        {step === 3 && (
          <motion.div 
            key="step3-scheduler"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full"
          >
            {/* Left Column - Decoupled Schedulers Form (col-span-3) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Calendar size={18} className="text-primary" />
                  <h3 className="text-xs font-extrabold text-text uppercase tracking-wider">
                    {t('aiCreator.scheduleTitle')}
                  </h3>
                </div>

                <p className="text-xs text-text-muted font-semibold leading-relaxed">
                  {t('aiCreator.scheduleIntro')}
                </p>

                {/* 1. Facebook Scheduler Inputs */}
                <div className="border border-blue-100 bg-blue-50/10 rounded-2xl p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#1877F2]">
                    <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px]">
                      <Facebook size={10} className="fill-white" />
                    </div>
                    <span>Facebook Publication</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 font-sans">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                        {t('aiCreator.dateInputLabel')}
                      </label>
                      <input 
                        type="date"
                        min="2026-06-15"
                        max="2026-07-05"
                        value={facebookDate}
                        onChange={(e) => handleFacebookDateChange(e.target.value)}
                        className={`w-full bg-white border ${facebookError ? 'border-red-400 focus:ring-red-200' : 'border-[#E4E6F8] focus:ring-primary/20'} rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 transition-all font-semibold`}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-sans">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                        {t('aiCreator.timeInputLabel')}
                      </label>
                      <input 
                        type="time"
                        value={facebookTime}
                        onChange={(e) => handleFacebookTimeChange(e.target.value)}
                        className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {facebookError && (
                    <div className="text-[10px] text-red-500 font-bold leading-normal font-sans">
                      ⚠️ {facebookError}
                    </div>
                  )}
                </div>

                {/* 2. Threads Scheduler Inputs */}
                <div className="border border-gray-200 bg-gray-50/10 rounded-2xl p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-2 font-bold text-xs text-black">
                    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white">
                      <ThreadsIcon size={10} />
                    </div>
                    <span>Threads Publication</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 font-sans">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                        {t('aiCreator.dateInputLabel')}
                      </label>
                      <input 
                        type="date"
                        min="2026-06-15"
                        max="2026-07-05"
                        value={threadsDate}
                        onChange={(e) => handleThreadsDateChange(e.target.value)}
                        className={`w-full bg-white border ${threadsError ? 'border-red-400 focus:ring-red-200' : 'border-[#E4E6F8] focus:ring-primary/20'} rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 transition-all font-semibold`}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 font-sans">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                        {t('aiCreator.timeInputLabel')}
                      </label>
                      <input 
                        type="time"
                        value={threadsTime}
                        onChange={(e) => handleThreadsTimeChange(e.target.value)}
                        className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {threadsError && (
                    <div className="text-[10px] text-red-500 font-bold leading-normal font-sans">
                      ⚠️ {threadsError}
                    </div>
                  )}
                </div>

                {/* Drag instruction warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-800 leading-relaxed font-semibold">
                  {t('aiCreator.dragInstruction')}
                </div>
              </div>
            </div>

            {/* Right Column - 2D Calendar Grid (col-span-9) */}
            <div className="lg:col-span-9 bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col min-h-[500px]">
              
              {/* Header Title & Dropdown mimicking PostLab */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-text flex items-center gap-2">
                    {language === 'vi' ? 'Kế hoạch đăng bài' : 'Publication Plan'}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {language === 'vi' 
                      ? 'Kéo thả thẻ bài viết màu sắc trên lịch 2D để đổi ngày/giờ đăng. Bài đăng cũ có màu xám.' 
                      : 'Drag and drop colored cards on the 2D grid to change dates/hours. Old posts are gray.'}
                  </p>
                </div>
                
                {/* Active Week Selectors / Tabs */}
                <div className="flex bg-[#F1F3F9] p-1 rounded-xl border border-gray-250 select-none font-sans gap-1">
                  {[
                    { id: 0, label: language === 'vi' ? 'Tuần 1 (15/06 - 21/06)' : 'Wk 1 (15/06 - 21/06)' },
                    { id: 1, label: language === 'vi' ? 'Tuần 2 (22/06 - 28/06)' : 'Wk 2 (22/06 - 28/06)' },
                    { id: 2, label: language === 'vi' ? 'Tuần 3 (29/06 - 05/07)' : 'Wk 3 (29/06 - 05/07)' }
                  ].map((wk) => (
                    <button
                      key={wk.id}
                      onClick={() => setActiveWeek(wk.id as 0 | 1 | 2)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeWeek === wk.id
                          ? 'bg-white text-primary shadow-sm font-extrabold border border-gray-250'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      {wk.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2D Calendar Board Wrapper */}
              <div className="w-full overflow-x-auto relative border border-gray-150 rounded-2xl p-1 bg-white select-none">
                <div className="min-w-[760px] flex flex-col">
                  
                  {/* Days of the Week Header Row */}
                  <div 
                    className="grid border-b border-gray-200 pb-2.5 mb-1 font-sans text-center text-xs font-extrabold"
                    style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}
                  >
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider text-left pl-3 flex items-center">
                      {language === 'vi' ? 'Giờ' : 'Time'}
                    </span>
                    {weekDays.slice(activeWeek * 7, activeWeek * 7 + 7).map((day) => {
                      const isFbScheduled = facebookDate === day.date;
                      const isThreadsScheduled = threadsDate === day.date;
                      const isAnyActive = isFbScheduled || isThreadsScheduled;
                      
                      return (
                        <div 
                          key={day.date} 
                          className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${
                            isAnyActive 
                              ? 'text-primary font-black bg-primary/5 border border-primary/20 shadow-sm' 
                              : day.isToday 
                                ? 'text-text font-black bg-gray-50 border border-gray-255' 
                                : 'text-text-muted font-bold'
                          }`}
                        >
                          <span className="text-[10px] tracking-wide">{getDayLabel(day.name)}</span>
                          <span className="text-[11px] mt-0.5 font-bold opacity-80">{day.label} / 06</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2D Grid with Time Labels */}
                  <div className="flex relative w-full" style={{ height: '576px' }}>
                    
                    {/* Hour Column (Left) */}
                    <div className="w-[80px] grid grid-rows-8 h-full pr-2 font-sans border-r border-gray-100/60 bg-gray-50/50 rounded-l-2xl select-none">
                      {[16, 17, 18, 19, 20, 21, 22, 23].map((hr) => (
                        <div key={hr} className="flex flex-col justify-start pt-2 items-center text-[11px] font-extrabold text-text-muted">
                          <span>{hr}:00</span>
                        </div>
                      ))}
                    </div>

                    {/* Draggable Area Relative Board (Right 7 Columns x 8 Rows) */}
                    <div 
                      ref={boardRef}
                      className="flex-1 relative h-full bg-white select-none overflow-hidden"
                    >
                      {/* Background Grid Lines */}
                      <div className="absolute inset-0 grid grid-cols-7 grid-rows-8 pointer-events-none">
                        {Array.from({ length: 56 }).map((_, idx) => {
                          const isLastCol = (idx + 1) % 7 === 0;
                          const isLastRow = idx >= 49;
                          return (
                            <div 
                              key={idx} 
                              className={`border-gray-250/55 ${!isLastCol ? 'border-r' : ''} ${!isLastRow ? 'border-b' : ''}`}
                            />
                          );
                        })}
                      </div>

                      {/* 1. Existing Posts (Grayscale) */}
                      {existingPosts.map((post, index) => {
                        const dayIdx = weekDays.findIndex(d => d.date === post.date);
                        if (dayIdx < 0) return null;
                        const weekIdx = Math.floor(dayIdx / 7);
                        if (weekIdx !== activeWeek) return null;
                        
                        const colIndex = dayIdx % 7;
                        const rowIndex = post.hour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <div
                            key={`existing-${index}`}
                            className="absolute p-2.5 rounded-xl bg-[#FAFBFD] border border-gray-255/70 shadow-sm flex flex-col justify-between select-none pointer-events-none grayscale opacity-60"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider truncate">
                                {post.title}
                              </span>
                              <span className="text-[8px] text-gray-400 font-medium mt-0.5">
                                {language === 'vi' ? 'Thời gian dự kiến:' : 'Estimated time:'}
                              </span>
                              <span className="text-[9px] text-gray-400 font-semibold truncate leading-tight mt-0.5">
                                {post.hour}:00 - {post.hour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-auto pt-1 text-gray-400">
                              {post.category === 'facebook' ? (
                                <Facebook size={10} className="fill-gray-400 stroke-none" />
                              ) : (
                                <ThreadsIcon size={10} />
                              )}
                              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">
                                {post.category}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* 2. Active Facebook Pill (Draggable) */}
                      {(() => {
                        const fbIdx = weekDays.findIndex(d => d.date === facebookDate);
                        if (fbIdx < 0) return null;
                        const fbWeek = Math.floor(fbIdx / 7);
                        if (fbWeek !== activeWeek) return null;
                        
                        const colIndex = fbIdx % 7;
                        const fbHour = parseInt(facebookTime.split(':')[0]) || 20;
                        const rowIndex = fbHour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <motion.div
                            key={`fb-active-${fbResetTrigger}-${facebookDate}-${facebookTime}`}
                            drag
                            dragConstraints={boardRef}
                            dragElastic={0.05}
                            dragMomentum={false}
                            onDragEnd={handleFbDragEnd}
                            className="absolute p-2.5 rounded-2xl bg-white border-2 border-[#1877F2] shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-20 hover:shadow-2xl transition-shadow select-none"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col relative w-full">
                              {/* Blinking pulse dot */}
                              <span className="absolute top-0 right-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1877F2]"></span>
                              </span>
                              
                              <span className="text-[9px] font-black text-[#1877F2] uppercase tracking-wider truncate">
                                FACEBOOK
                              </span>
                              <span className="text-[8px] text-gray-500 font-medium mt-0.5">
                                {language === 'vi' ? 'Thời gian dự kiến:' : 'Estimated time:'}
                              </span>
                              <span className="text-[9px] text-text font-black truncate leading-tight mt-0.5">
                                {fbHour}:00 - {fbHour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-1">
                              <div className="flex items-center gap-1 text-[#1877F2]">
                                <Facebook size={10} className="fill-[#1877F2] stroke-none" />
                                <span className="text-[8px] font-black uppercase tracking-wider">
                                  FB Active
                                </span>
                              </div>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest hidden sm:inline select-none">
                                {language === 'vi' ? 'Kéo' : 'Drag'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })()}

                      {/* 3. Active Threads Pill (Draggable) */}
                      {(() => {
                        const threadsIdx = weekDays.findIndex(d => d.date === threadsDate);
                        if (threadsIdx < 0) return null;
                        const threadsWeek = Math.floor(threadsIdx / 7);
                        if (threadsWeek !== activeWeek) return null;
                        
                        const colIndex = threadsIdx % 7;
                        const threadsHour = parseInt(threadsTime.split(':')[0]) || 18;
                        const rowIndex = threadsHour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <motion.div
                            key={`threads-active-${threadsResetTrigger}-${threadsDate}-${threadsTime}`}
                            drag
                            dragConstraints={boardRef}
                            dragElastic={0.05}
                            dragMomentum={false}
                            onDragEnd={handleThreadsDragEnd}
                            className="absolute p-2.5 rounded-2xl bg-white border-2 border-black shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-20 hover:shadow-2xl transition-shadow select-none"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col relative w-full">
                              {/* Blinking pulse dot */}
                              <span className="absolute top-0 right-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                              </span>
                              
                              <span className="text-[9px] font-black text-black uppercase tracking-wider truncate">
                                THREADS
                              </span>
                              <span className="text-[8px] text-gray-500 font-medium mt-0.5">
                                {language === 'vi' ? 'Thời gian dự kiến:' : 'Estimated time:'}
                              </span>
                              <span className="text-[9px] text-text font-black truncate leading-tight mt-0.5">
                                {threadsHour}:00 - {threadsHour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-1">
                              <div className="flex items-center gap-1 text-black">
                                <ThreadsIcon size={10} />
                                <span className="text-[8px] font-black uppercase tracking-wider">
                                  TH Active
                                </span>
                              </div>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest hidden sm:inline select-none">
                                {language === 'vi' ? 'Kéo' : 'Drag'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })()}

                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Actions inside Step 3 */}
              <div className="flex items-center justify-between border-t border-gray-150 pt-6 mt-6 font-sans">
                <button 
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  {t('aiCreator.backToAb')}
                </button>

                <button 
                  onClick={() => {
                    if (facebookError || threadsError) return;
                    setIsScheduled(true);
                  }}
                  disabled={!!facebookError || !!threadsError}
                  className={`py-3.5 px-8 rounded-2xl font-extrabold shadow-lg flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs cursor-pointer font-sans ${
                    (facebookError || threadsError) 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  {t('aiCreator.confirmSchedule')}
                </button>
              </div>

            </div>
          </motion.div>
        )}

      </div>

      {/* LIVE GOCNHINMOI PORTAL BROWSER PROXY MODAL */}
      <AnimatePresence>
        {isExplorerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-[32px] border border-gray-200 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            >
              
              {/* Browser Header Bar */}
              <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 gap-4">
                
                {/* Browser controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={handleIframeBack}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-text-muted transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button 
                    onClick={handleRefresh}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-text-muted transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>

                {/* Address Bar showing live URL */}
                <div className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2 text-xs text-text-muted flex items-center gap-2 shadow-inner">
                  <Globe size={14} className="text-gray-400" />
                  <span className="font-semibold text-text truncate">
                    {explorerUrl}
                  </span>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setIsExplorerOpen(false)}
                  className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Portal Live Content Area */}
              <div className="flex-1 bg-white relative flex flex-col">
                
                {/* Sticky banner to Import Current Page */}
                <div className="bg-primary/5 border-b border-primary/20 py-3.5 px-8 flex items-center justify-between shrink-0 gap-4 z-10 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">{language === 'vi' ? 'Trình duyệt trực tiếp hoạt động' : 'Live Explorer Active'}</span>
                    <span className="text-[11px] text-text-muted truncate max-w-lg mt-0.5">
                      {language === 'vi' ? 'Đang xem:' : 'Viewing:'} {explorerUrl}
                    </span>
                  </div>

                  <button 
                    onClick={handleImportFromExplorer}
                    disabled={isScraping}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        {language === 'vi' ? 'Đang nạp dữ liệu...' : 'Scraping...'}
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        {language === 'vi' ? 'Sử dụng bài viết này cho Importer' : 'Use this article for Importer'}
                      </>
                    )}
                  </button>
                </div>

                {/* Iframe loading the proxied live website */}
                <iframe 
                  key={iframeKey}
                  ref={iframeRef}
                  src={iframeSrc}
                  className="w-full flex-1 border-0"
                  title="gocnhinmoi Explorer"
                />

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* SUCCESS CONFIRMATION DIALOG */}
      <AnimatePresence>
        {isScheduled && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] border border-gray-200 shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-text">
                  {t('aiCreator.scheduleSuccess')}
                </h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  {language === 'vi' 
                    ? `Bài đăng của bạn đã được lên lịch xuất bản thành công trên cả hai kênh Facebook và Threads.`
                    : `Your posts have been successfully scheduled on both Facebook and Threads channels.`}
                </p>
              </div>

              <div className="bg-[#F8FAFC] border border-gray-150 rounded-2xl p-4 w-full text-left flex flex-col gap-3 font-sans">
                <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider font-sans">
                  {language === 'vi' ? 'Thông tin xuất bản' : 'Publication details'}
                </div>
                
                <div className="text-xs font-bold text-text truncate border-b border-gray-100 pb-2 font-sans">
                  {postData.title}
                </div>

                <div className="flex flex-col gap-2.5 font-sans">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">Facebook</span>
                    <span className="font-semibold text-text-muted">{facebookDate} @ {facebookTime}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-text text-[10px] font-bold">Threads</span>
                    <span className="font-semibold text-text-muted">{threadsDate} @ {threadsTime}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsScheduled(false);
                  setStep(1);
                }}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-2xl font-bold shadow-md shadow-primary/20 transition-all text-xs cursor-pointer font-sans"
              >
                {language === 'vi' ? 'Bắt đầu chiến dịch mới' : 'Start new campaign'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


