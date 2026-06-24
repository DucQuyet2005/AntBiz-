import React, { useEffect, useState } from 'react';
import { X, Clock, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';
import PopupDialog from '@/components/PopupDialog';

interface HistoryRecord {
  id: string;
  note: string;
  created_at: string;
  users: { email: string };
  config_snapshot: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (snapshot: any) => void;
}

export default function HistorySidebar({ isOpen, onClose, onRestore }: Props) {
  const { language } = useLanguage();
  const t = translations[language].landingEditor;
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({
    isOpen: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/landing-config/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (id: string, snapshot: any) => {
    if (!confirm(t.confirmRestore)) return;
    try {
      const res = await fetch(`/api/admin/landing-config/rollback/${id}`, {
        method: 'POST'
      });
      if (res.ok) {
        onRestore(snapshot);
        setPopup({ isOpen: true, message: t.restoreSuccess, type: 'success' });
      } else {
        setPopup({ isOpen: true, message: t.restoreFail, type: 'error' });
      }
    } catch (e) {
      setPopup({ isOpen: true, message: t.restoreError, type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-[300px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm tracking-tight uppercase">
          <Clock size={16} className="text-primary" />
          <h3>{t.historyTitle}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded p-0.5 transition-all duration-100 active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="text-xs text-slate-500 font-medium text-center py-8">{t.loading}</div>
        ) : history.length === 0 ? (
          <div className="text-xs text-slate-500 font-medium text-center py-8">{t.noHistory}</div>
        ) : (
          history.map((record) => (
            <div key={record.id} className="border border-slate-200 rounded-2xl p-3 hover:border-primary/30 transition-colors bg-white">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                  {new Date(record.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mb-1">
                {record.note || t.autoSaved}
              </p>
              <p className="text-[10px] text-slate-400 mb-3">
                {t.by}: {record.users?.email || 'Unknown'}
              </p>
              <button
                onClick={() => handleRollback(record.id, record.config_snapshot)}
                className="w-full flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all duration-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <RotateCcw size={12} /> {t.restore}
              </button>
            </div>
          ))
        )}
      </div>

      <PopupDialog
        isOpen={popup.isOpen}
        onClose={() => setPopup(p => ({ ...p, isOpen: false }))}
        message={popup.message}
        type={popup.type}
      />
    </div>
  );
}
