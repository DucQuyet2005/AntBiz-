import { useState, useRef } from 'react';

export interface DuplicateWarning {
  isDuplicate: boolean;
  maxSimilarity: number;
  similarPostId: string | null;
}

export function useDuplicateCheck() {
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Kiểm tra đạo văn / trùng lặp nội dung
   * @param text Nội dung cần kiểm tra
   * @param threshold Mức độ giống nhau tối thiểu để báo lỗi (mặc định 0.75 = 75%)
   */
  const checkDuplicate = async (text: string, threshold: number = 0.75): Promise<DuplicateWarning | null> => {
    if (!text || text.trim() === '') return null;
    
    // Hủy bỏ request trước đó nếu vẫn đang chạy (tránh race condition)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsCheckingDuplicate(true);
    setDuplicateWarning(null);

    try {
      const res = await fetch('/api/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, threshold }),
        signal: abortControllerRef.current.signal
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
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignored, this is just a cancelled request
        return null;
      }
      console.error('Error checking duplicate:', err);
      return null;
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const clearDuplicateWarning = () => {
    // Khi xóa thông báo, cũng nên hủy request đang chạy (nếu có)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setDuplicateWarning(null);
  };

  return {
    duplicateWarning,
    isCheckingDuplicate,
    checkDuplicate,
    clearDuplicateWarning
  };
}
