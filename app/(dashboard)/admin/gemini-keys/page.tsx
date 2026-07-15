"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PopupDialog, { PopupType } from '@/components/PopupDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import AdminAccessDenied from '@/app/(dashboard)/admin/AdminAccessDenied';

type GeminiKey = {
  id: string;
  masked_value: string;
  label: string;
  status: 'active' | 'rate_limited' | 'invalid';
  rate_limited_until: string | null;
  error_count: number;
  last_used_at: string | null;
  created_at: string;
};

export default function AdminGeminiKeysPage() {
  const { language } = useLanguage();
  const supabase = createClient();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<GeminiKey[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Toast states
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: PopupType }>({
    isOpen: false, message: '', type: 'info'
  });
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newKey, setNewKey] = useState({ key_value: '', label: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; keyId: string; keyLabel: string }>({
    isOpen: false, keyId: '', keyLabel: ''
  });

  // Verify Admin role client-side
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
      setIsAdmin(data?.role === 'admin');
    };
    checkRole();
  }, [supabase]);

  const fetchKeys = useCallback(async () => {
    if (isAdmin === false) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gemini-keys');
      if (!res.ok) throw new Error('Failed to fetch Gemini API Keys');
      const json = await res.json();
      setKeys(json.data || []);
    } catch {
      setToast({
        isOpen: true,
        message: language === 'vi' ? 'Không thể tải danh sách API Key' : 'Failed to fetch API Keys',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, language]);

  useEffect(() => {
    if (isAdmin === true) {
      void Promise.resolve().then(fetchKeys);
    }
  }, [isAdmin, fetchKeys]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.key_value.trim() || !newKey.label.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to add key');

      setToast({
        isOpen: true,
        message: language === 'vi' ? 'Thêm API Key thành công!' : 'API Key added successfully!',
        type: 'success'
      });
      setAddModalOpen(false);
      setNewKey({ key_value: '', label: '' });
      fetchKeys();
    } catch (error: unknown) {
      setToast({
        isOpen: true,
        message: errorMessage(error, 'Failed to add key'),
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteModal.keyId) return;

    try {
      const res = await fetch(`/api/admin/gemini-keys/${deleteModal.keyId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to delete key');

      setToast({
        isOpen: true,
        message: language === 'vi' ? 'Đã xóa API Key!' : 'API Key deleted successfully!',
        type: 'success'
      });
      setDeleteModal({ isOpen: false, keyId: '', keyLabel: '' });
      fetchKeys();
    } catch (error: unknown) {
      setToast({
        isOpen: true,
        message: errorMessage(error, 'Failed to delete key'),
        type: 'error',
      });
    }
  };

  const handleToggleStatus = async (key: GeminiKey) => {
    const nextStatus = key.status === 'active' ? 'invalid' : 'active';
    
    // Optimistic UI update
    setKeys(prev => prev.map(k => k.id === key.id
      ? { ...k, status: nextStatus, error_count: nextStatus === 'active' ? 0 : k.error_count }
      : k));

    try {
      const res = await fetch(`/api/admin/gemini-keys/${key.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update key');
      fetchKeys();
    } catch (error: unknown) {
      setToast({
        isOpen: true,
        message: errorMessage(error, 'Failed to update key'),
        type: 'error',
      });
      fetchKeys();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 size={12} /> {language === 'vi' ? 'Hoạt động' : 'Active'}</span>;
      case 'rate_limited':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold border border-amber-200 flex items-center gap-1.5"><AlertTriangle size={12} /> {language === 'vi' ? 'Giới hạn (429)' : 'Rate limited'}</span>;
      case 'invalid':
      default:
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold border border-rose-200 flex items-center gap-1.5"><ShieldAlert size={12} /> {language === 'vi' ? 'Lỗi/Vô hiệu' : 'Invalid'}</span>;
    }
  };

  // Render check
  if (isAdmin === null || (loading && keys.length === 0)) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8 mb-3" />
        <span className="text-xs font-semibold text-slate-500">{language === 'vi' ? 'Đang kiểm tra quyền truy cập...' : 'Loading access controls...'}</span>
      </div>
    );
  }

  if (isAdmin === false) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center border border-purple-250">
            <Key className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">{language === 'vi' ? 'Quản lý Gemini API Keys' : 'Gemini Keys Rotation'}</h2>
            <p className="text-xs text-slate-500 font-medium">{language === 'vi' ? 'Xem, cấu hình và giám sát sức khỏe của hệ thống khóa API xoay vòng.' : 'View, configure, and monitor API keys health & rotation system.'}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus size={16} />
          {language === 'vi' ? 'Thêm API Key' : 'Add API Key'}
        </button>
      </div>

      {/* Keys Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-extrabold">
                <th className="p-5 pl-6">{language === 'vi' ? 'Nhãn / Tên' : 'Label'}</th>
                <th className="p-5">{language === 'vi' ? 'Giá trị API Key' : 'Key Value'}</th>
                <th className="p-5">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th className="p-5">{language === 'vi' ? 'Lỗi liên tiếp' : 'Consecutive Errors'}</th>
                <th className="p-5">{language === 'vi' ? 'Dùng gần nhất' : 'Last Used'}</th>
                <th className="p-5 pr-6 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    {language === 'vi' 
                      ? 'Chưa cấu hình API Key nào trong Database. Hệ thống đang dùng Key dự phòng từ file .env.'
                      : 'No API Keys configured in the database. Falling back to key from environment (.env).'}
                  </td>
                </tr>
              ) : (
                keys.map(key => (
                  <tr key={key.id} className="hover:bg-slate-50/50 transition-colors h-[65px]">
                    <td className="p-5 pl-6 font-bold text-slate-800 text-sm">
                      {key.label}
                    </td>
                    <td className="p-5 font-mono text-sm text-slate-600">
                      <span>{key.masked_value}</span>
                    </td>
                    <td className="p-5">
                      {getStatusBadge(key.status)}
                    </td>
                    <td className="p-5 text-sm text-slate-500 font-bold text-center pl-10 md:text-left md:pl-8">
                      <span className={key.error_count > 0 ? 'text-rose-500' : 'text-slate-500'}>
                        {key.error_count}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-500 font-medium">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(key)}
                          className={`p-2 rounded-xl transition-all duration-150 border ${
                            key.status === 'invalid' 
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200' 
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
                          }`}
                          title={key.status === 'invalid' ? 'Kích hoạt lại Key' : 'Vô hiệu hóa Key'}
                        >
                          <RefreshCcw size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, keyId: key.id, keyLabel: key.label })}
                          className="p-2 bg-slate-50 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-650 hover:border-red-200 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add API Key Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setAddModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">{language === 'vi' ? 'Thêm Gemini API Key' : 'Add Gemini Key'}</h2>
              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                {language === 'vi' ? 'Vui lòng điền thông tin chi tiết của API Key mới. Khóa này sẽ được thêm vào danh sách luân chuyển.' : 'Add a new API key to the active rotation pool.'}
              </p>

              <form onSubmit={handleAddKey} className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{language === 'vi' ? 'Nhãn định danh' : 'Label / Name'}</label>
                  <input 
                    type="text"
                    required
                    value={newKey.label}
                    onChange={e => setNewKey(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-all"
                    placeholder="Ví dụ: Account Marketing 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">API Key</label>
                  <input 
                    type="text"
                    required
                    value={newKey.key_value}
                    onChange={e => setNewKey(prev => ({ ...prev, key_value: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none transition-all font-mono"
                    placeholder="AIzaSy..."
                  />
                </div>

                <div className="flex gap-3 w-full mt-4">
                  <button 
                    type="button"
                    onClick={() => setAddModalOpen(false)} 
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                  >
                    {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="animate-spin w-4 h-4" />}
                    {language === 'vi' ? 'Lưu lại' : 'Save Key'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setDeleteModal({ isOpen: false, keyId: '', keyLabel: '' })} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mb-5 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">{language === 'vi' ? 'Xác nhận xóa API Key' : 'Confirm Delete'}</h2>
              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                {language === 'vi' 
                  ? `Bạn có chắc chắn muốn xóa API Key "${deleteModal.keyLabel}"? Thao tác này không thể khôi phục.`
                  : `Are you sure you want to delete API Key "${deleteModal.keyLabel}"? This action cannot be undone.`}
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, keyId: '', keyLabel: '' })} 
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors focus-visible:ring-2"
                >
                  {language === 'vi' ? 'Quay lại' : 'Cancel'}
                </button>
                <button 
                  onClick={handleDeleteKey}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-600/20 focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  {language === 'vi' ? 'Đồng ý xóa' : 'Delete Key'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PopupDialog 
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
