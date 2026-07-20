import { useState } from 'react';

export interface DuplicateWarning {
  isDuplicate: boolean;
  maxSimilarity: number;
  similarPostId: string | null;
}

export function useDuplicateCheck() {
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  /**
   * Kiểm tra đạo văn / trùng lặp nội dung
   * @param text Nội dung cần kiểm tra
   * @param threshold Mức độ giống nhau tối thiểu để báo lỗi (mặc định 0.75 = 75%)
   */
  const checkDuplicate = async (text: string, threshold: number = 0.75): Promise<DuplicateWarning | null> => {
    if (!text || text.trim() === '') return null;
    
    setIsCheckingDuplicate(true);
    setDuplicateWarning(null);

    try {
      const res = await fetch('/api/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, threshold })
      });
      
      if (!res.ok) {
        throw new Error('API return error');
      }

      const data = await res.json();
      if (data && data.isDuplicate) {
        setDuplicateWarning(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error checking duplicate:', err);
      return null;
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const clearDuplicateWarning = () => {
    setDuplicateWarning(null);
  };

  return {
    duplicateWarning,
    isCheckingDuplicate,
    checkDuplicate,
    clearDuplicateWarning
  };
}
