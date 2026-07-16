export type ExplorerSourceId = 'gocnhinmoi' | 'dantri' | 'tuoitre';

export interface ExplorerSourceCard {
  id: ExplorerSourceId;
  label: string;
  description: string;
  baseUrl: string;
  accent: string;
}

export const getExplorerSourceCards = (language: 'vi' | 'en' = 'vi'): ExplorerSourceCard[] => {
  const isVi = language === 'vi';

  return [
    {
      id: 'gocnhinmoi',
      label: isVi ? 'Góc Nhìn Mới' : 'Goc Nhin Moi',
      description: isVi
        ? 'Duyệt nguồn tin và chọn bài viết để crawl ngay trong cửa sổ web.'
        : 'Browse news sources and pick an article to crawl directly in the web view.',
      baseUrl: 'https://gocnhinmoi.com.vn/',
      accent: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'dantri',
      label: 'Dân Trí',
      description: isVi
        ? 'Mở trang báo Dân Trí để chọn một bài viết phù hợp.'
        : 'Open Dân Trí to pick a suitable article.',
      baseUrl: 'https://dantri.com.vn/',
      accent: 'from-green-600 to-emerald-500'
    },
    {
      id: 'tuoitre',
      label: 'Tuổi Trẻ',
      description: isVi
        ? 'Mở trang báo Tuổi Trẻ để chọn một bài viết phù hợp.'
        : 'Open Tuổi Trẻ to pick a suitable article.',
      baseUrl: 'https://tuoitre.vn/',
      accent: 'from-rose-500 to-red-500'
    }
  ];
};

export const getExplorerUrlForSource = (sourceId: ExplorerSourceId | string): string => {
  const card = getExplorerSourceCards('vi').find((item) => item.id === sourceId);
  return card?.baseUrl || 'https://gocnhinmoi.com.vn/';
};
