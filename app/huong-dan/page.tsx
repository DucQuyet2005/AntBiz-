import type { Metadata } from 'next';
import UserGuideView from '@/components/views/UserGuideView';

export const metadata: Metadata = {
  title: 'Hướng dẫn sử dụng AntBiz — Nền tảng xuất bản nội dung AI đa kênh',
  description:
    'Hướng dẫn chi tiết cách sử dụng AntBiz từng bước: tạo tài khoản, nhập bài viết, sinh caption AI, lên lịch Gantt và xem báo cáo.',
  alternates: {
    canonical: '/huong-dan',
  },
  openGraph: {
    title: 'Hướng dẫn sử dụng AntBiz',
    description:
      'Làm chủ quy trình xuất bản nội dung AI đa kênh trong 6 bước đơn giản.',
    url: '/huong-dan',
    siteName: 'AntBiz',
    locale: 'vi_VN',
    type: 'website',
  },
};

export default function UserGuidePage() {
  return <UserGuideView />;
}
